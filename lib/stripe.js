import crypto from "node:crypto";
import { BILLING_PLANS, billingPriceId, planFromStripePrice } from "./billing.js";
import { addonStripePriceId } from './addons.js';

const STRIPE_API = "https://api.stripe.com/v1";
const safeUrl = (value) => { try { const url = new URL(value); return url.protocol === "https:" ? url.origin : null; } catch { return null; } };
export function stripeConfigured() { return Boolean(process.env.STRIPE_SECRET_KEY && safeUrl(process.env.BILLING_APP_URL)); }
export function stripeWebhookConfigured() { return Boolean(process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY); }
function secret() { const value = process.env.STRIPE_SECRET_KEY; if (!value) throw new Error("Stripe is unavailable"); return value; }
function form(fields) { const values = new URLSearchParams(); for (const [key, value] of Object.entries(fields || {})) if (value !== undefined && value !== null && value !== "") values.set(key, String(value)); return values; }
export async function stripeRequest(path, { method = 'POST', fields = null, idempotencyKey = null } = {}) {
  const url = new URL(`${STRIPE_API}${path}`);
  const options = { method, headers: { Authorization: `Bearer ${secret()}`, ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) } };
  if (method === 'GET') {
    const query = form(fields); for (const [key, value] of query) url.searchParams.set(key, value);
  } else {
    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.body = form(fields);
  }
  const response = await fetch(url.toString(), options);
  const body = await response.json().catch(() => null);
  if (!response.ok) { const error = new Error("Stripe is temporarily unavailable"); error.status = response.status; throw error; }
  return body;
}
export async function stripePost(path, fields, options = {}) { return stripeRequest(path, { method: 'POST', fields, ...options }); }
export function checkoutReturnUrls() {
  const origin = safeUrl(process.env.BILLING_APP_URL); if (!origin) throw new Error("Stripe is unavailable");
  return { success: `${origin}/?billing=success`, cancel: `${origin}/?billing=cancelled`, return: `${origin}/?billing=manage` };
}
export async function createCheckout({ plan, businessId, stripeCustomerId, customerEmail, addonKeys = [] }) {
  if (!BILLING_PLANS.includes(plan) || !billingPriceId(plan)) throw new Error("Selected plan is unavailable");
  const uniqueAddons = [...new Set(Array.isArray(addonKeys) ? addonKeys : [])];
  if (plan === 'trial' && uniqueAddons.length) throw Object.assign(new Error('Add-ons are available with recurring plans only'), { status: 409 });
  const addonPrices = uniqueAddons.map(key => addonStripePriceId(key));
  if (addonPrices.some(value => !value)) throw Object.assign(new Error('Selected add-on is not available for purchase'), { status: 409 });
  const urls = checkoutReturnUrls(); const subscription = plan !== "trial";
  const fields = {
    mode: subscription ? "subscription" : "payment",
    "line_items[0][price]": billingPriceId(plan),
    "line_items[0][quantity]": 1,
    success_url: `${urls.success}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: urls.cancel,
    client_reference_id: businessId,
    "metadata[business_id]": businessId,
    "metadata[plan]": plan,
    "payment_method_types[0]": "card",
    submit_type: subscription ? "subscribe" : "pay",
    customer: stripeCustomerId || undefined,
    customer_email: stripeCustomerId ? undefined : customerEmail || undefined,
    customer_creation: subscription ? undefined : "always"
  };
  addonPrices.forEach((price, index) => { fields[`line_items[${index + 1}][price]`] = price; fields[`line_items[${index + 1}][quantity]`] = 1; });
  if (subscription) { fields["subscription_data[metadata][business_id]"] = businessId; fields["subscription_data[metadata][plan]"] = plan; }
  return stripePost("/checkout/sessions", fields);
}
export async function createPortal(stripeCustomerId) { return stripePost("/billing_portal/sessions", { customer: stripeCustomerId, return_url: checkoutReturnUrls().return }); }
const PLAN_RANK = { starter: 1, pro: 2, business: 3 };

async function retrieveSubscriptionSchedule(scheduleId) {
  return stripeRequest('/subscription_schedules/' + encodeURIComponent(scheduleId), { method: 'GET' });
}

export async function releaseSubscriptionSchedule(scheduleId) {
  if (!scheduleId) return null;
  return stripePost('/subscription_schedules/' + encodeURIComponent(scheduleId) + '/release', {});
}

function phaseItems(fields, phaseIndex, items) {
  items.forEach((item, index) => {
    const priceId = stripeObjectId(item?.price);
    if (!priceId) throw new Error('Subscription item price is unavailable');
    fields['phases[' + phaseIndex + '][items][' + index + '][price]'] = priceId;
    fields['phases[' + phaseIndex + '][items][' + index + '][quantity]'] = item?.quantity || 1;
  });
}

export async function getScheduledPlanChange(stripeSubscriptionId) {
  if (!stripeSubscriptionId) return null;
  const subscription = await retrieveSubscription(stripeSubscriptionId);
  const scheduleId = stripeObjectId(subscription?.schedule);
  if (!scheduleId) return null;
  const schedule = await retrieveSubscriptionSchedule(scheduleId);
  if (!['active', 'not_started'].includes(schedule?.status)) return null;
  const currentPlan = billingPlanFromSubscription(subscription);
  const currentEnd = Number(schedule?.current_phase?.end || subscriptionBillingPeriod(subscription).end);
  const futurePhase = (schedule?.phases || []).find(phase => Number(phase?.start_date) >= currentEnd);
  if (!futurePhase) return null;
  const futurePlans = (futurePhase.items || [])
    .map(item => planFromStripePrice(stripeObjectId(item?.price)))
    .filter(plan => plan && plan !== 'trial');
  const targetPlan = futurePlans.length === 1 ? futurePlans[0] : null;
  if (!targetPlan || targetPlan === currentPlan) return null;
  return { plan: targetPlan, effective_at: currentEnd ? new Date(currentEnd * 1000).toISOString() : null };
}

async function scheduleSubscriptionDowngrade(subscription, plan, businessId) {
  let working = subscription;
  const existingScheduleId = stripeObjectId(working?.schedule);
  if (existingScheduleId) {
    await releaseSubscriptionSchedule(existingScheduleId);
    working = await retrieveSubscription(working.id);
  }

  const currentPlan = billingPlanFromSubscription(working);
  if (!currentPlan || !PLAN_RANK[currentPlan] || !PLAN_RANK[plan] || PLAN_RANK[plan] >= PLAN_RANK[currentPlan]) {
    throw new Error('Selected plan is not a downgrade');
  }

  const currentItems = working.items?.data || [];
  const baseItems = currentItems.filter(item => {
    const resolved = planFromStripePrice(stripeObjectId(item.price));
    return Boolean(resolved && resolved !== 'trial');
  });
  if (baseItems.length !== 1) throw new Error('Subscription plan cannot be changed automatically');

  const currentPeriod = subscriptionBillingPeriod(working);
  const created = await stripePost('/subscription_schedules', { from_subscription: working.id });
  const schedule = created?.current_phase ? created : await retrieveSubscriptionSchedule(created?.id);
  const scheduleId = schedule?.id;
  const phaseStart = Number(schedule?.current_phase?.start || currentPeriod.start);
  const phaseEnd = Number(schedule?.current_phase?.end || currentPeriod.end);
  if (!scheduleId || !phaseStart || !phaseEnd) throw new Error('Subscription downgrade could not be scheduled');

  const targetPrice = billingPriceId(plan);
  const futureItems = currentItems.map(item => {
    const resolved = planFromStripePrice(stripeObjectId(item.price));
    return resolved && resolved !== 'trial' ? { ...item, price: { id: targetPrice } } : item;
  });

  const fields = {
    end_behavior: 'release',
    'phases[0][start_date]': phaseStart,
    'phases[0][end_date]': phaseEnd,
    'phases[0][proration_behavior]': 'none',
    'phases[0][metadata][business_id]': businessId,
    'phases[0][metadata][plan]': currentPlan,
    'phases[1][start_date]': phaseEnd,
    'phases[1][duration][interval]': 'month',
    'phases[1][duration][interval_count]': 1,
    'phases[1][proration_behavior]': 'none',
    'phases[1][metadata][business_id]': businessId,
    'phases[1][metadata][plan]': plan
  };
  phaseItems(fields, 0, currentItems);
  phaseItems(fields, 1, futureItems);
  try {
    await stripePost('/subscription_schedules/' + encodeURIComponent(scheduleId), fields);
  } catch (error) {
    try { await releaseSubscriptionSchedule(scheduleId); } catch {}
    throw error;
  }
  return { scheduled: true, plan, effective_at: new Date(phaseEnd * 1000).toISOString() };
}

export async function cancelScheduledPlanChange(stripeSubscriptionId) {
  const subscription = await retrieveSubscription(stripeSubscriptionId);
  const scheduleId = stripeObjectId(subscription?.schedule);
  if (!scheduleId) return { cancelled: false };
  await releaseSubscriptionSchedule(scheduleId);
  return { cancelled: true };
}

export async function changeSubscriptionPlan(stripeSubscriptionId, plan, businessId) {
  if (!['starter', 'pro', 'business'].includes(plan) || !billingPriceId(plan)) throw new Error('Selected plan is unavailable');
  let subscription = await retrieveSubscription(stripeSubscriptionId);
  const baseItems = (subscription?.items?.data || []).filter(item => {
    const resolved = planFromStripePrice(stripeObjectId(item.price));
    return Boolean(resolved && resolved !== 'trial');
  });
  if (baseItems.length !== 1 || !baseItems[0]?.id) throw new Error('Subscription plan cannot be changed automatically');
  const currentPlan = planFromStripePrice(stripeObjectId(baseItems[0].price));
  if (currentPlan === plan) return { subscription, already_current: true, scheduled: false };

  if (PLAN_RANK[plan] < PLAN_RANK[currentPlan]) return scheduleSubscriptionDowngrade(subscription, plan, businessId);

  const scheduleId = stripeObjectId(subscription?.schedule);
  if (scheduleId) {
    await releaseSubscriptionSchedule(scheduleId);
    subscription = await retrieveSubscription(stripeSubscriptionId);
  }
  const immediateBase = (subscription?.items?.data || []).filter(item => {
    const resolved = planFromStripePrice(stripeObjectId(item.price));
    return Boolean(resolved && resolved !== 'trial');
  });
  if (immediateBase.length !== 1 || !immediateBase[0]?.id) throw new Error('Subscription plan cannot be changed automatically');
  const updated = await stripePost('/subscriptions/' + encodeURIComponent(stripeSubscriptionId), {
    'items[0][id]': immediateBase[0].id,
    'items[0][price]': billingPriceId(plan),
    'items[0][quantity]': 1,
    proration_behavior: 'always_invoice',
    payment_behavior: 'error_if_incomplete',
    'metadata[business_id]': businessId,
    'metadata[plan]': plan
  });
  return { subscription: await completeSubscriptionItems(updated), already_current: false, scheduled: false };
}

export async function cancelSubscription(stripeSubscriptionId) {
  const subscription = await retrieveSubscription(stripeSubscriptionId);
  const scheduleId = stripeObjectId(subscription?.schedule);
  if (scheduleId) await releaseSubscriptionSchedule(scheduleId);
  return stripePost('/subscriptions/' + encodeURIComponent(stripeSubscriptionId), { cancel_at_period_end: 'true' });
}
export async function applyReferralRewardDiscount({ subscription, rewardId }) {
  if (!subscription?.id || !rewardId) throw new Error("Referral reward cannot be applied");
  const baseItems = (subscription.items?.data || []).filter((item) => {
    const plan = planFromStripePrice(stripeObjectId(item.price));
    return Boolean(plan && plan !== "trial");
  });
  if (baseItems.length !== 1 || !baseItems[0]?.id) throw new Error("Referral reward base plan is unavailable");

  const coupon = await stripePost("/coupons", {
    duration: "once",
    percent_off: 100,
    name: "Business AI referral reward",
    "metadata[referral_reward_id]": rewardId
  }, { idempotencyKey: "business-ai-referral-coupon-" + rewardId });
  if (!coupon?.id) throw new Error("Referral reward cannot be applied");

  const item = baseItems[0];
  const fields = {};
  const existingDiscounts = (Array.isArray(item.discounts) ? item.discounts : [])
    .map(stripeObjectId)
    .filter(Boolean)
    .slice(0, 19);
  existingDiscounts.forEach((discountId, index) => {
    fields["discounts[" + index + "][discount]"] = discountId;
  });
  fields["discounts[" + existingDiscounts.length + "][coupon]"] = coupon.id;

  await stripePost(
    "/subscription_items/" + encodeURIComponent(item.id),
    fields,
    { idempotencyKey: "business-ai-referral-apply-" + rewardId }
  );
  return { couponId: coupon.id, subscriptionItemId: item.id };
}
export const stripeObjectId = value => typeof value === 'string' ? value : value?.id || null;
export async function completeSubscriptionItems(subscription) {
  const items = [...(subscription?.items?.data || [])];
  let more = subscription?.items?.has_more;
  while (more) {
    const cursor = items.at(-1)?.id;
    if (!cursor || !subscription?.id) throw new Error('Incomplete Stripe subscription items');
    const page = await stripeRequest('/subscription_items', { method: 'GET', fields: { subscription: subscription.id, limit: 100, starting_after: cursor } });
    if (!Array.isArray(page?.data) || !page.data.length || page.data.at(-1)?.id === cursor) throw new Error('Incomplete Stripe subscription items');
    items.push(...page.data); more = page.has_more;
  }
  return { ...subscription, items: { ...subscription.items, data: items, has_more: false } };
}
export async function retrieveSubscription(stripeSubscriptionId) {
  return completeSubscriptionItems(await stripeRequest(`/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`, { method: 'GET' }));
}
export function subscriptionBillingPeriod(subscription) {
  const base = (subscription?.items?.data || []).filter(item => {
    const plan = planFromStripePrice(stripeObjectId(item.price));
    return plan && plan !== 'trial';
  });
  if (base.length !== 1) throw new Error('Unknown Stripe base price');
  return {
    start: base[0].current_period_start ?? subscription.current_period_start,
    end: base[0].current_period_end ?? subscription.current_period_end
  };
}
export async function stripePrice(priceId) { return stripeRequest(`/prices/${encodeURIComponent(priceId)}`, { method: 'GET' }); }
export async function addonPriceDetails(key) {
  const priceId = addonStripePriceId(key); if (!priceId || !stripeConfigured()) return null;
  const price = await stripePrice(priceId);
  if (!price?.active || price.currency !== 'gbp' || price.type !== 'recurring' || price.recurring?.interval !== 'month' || price.recurring?.interval_count !== 1 || price.unit_amount !== 1999) return null;
  return { amount: price.unit_amount, currency: 'GBP', interval: 'month' };
}
export async function addSubscriptionAddon(stripeSubscriptionId, key) {
  const priceId = addonStripePriceId(key); if (!priceId) throw Object.assign(new Error('Selected add-on is not available for purchase'), { status: 409 });
  const subscription = await retrieveSubscription(stripeSubscriptionId);
  if (stripeObjectId(subscription?.schedule)) throw Object.assign(new Error('Cancel the scheduled plan change before changing add-ons'), { status: 409 });
  if ((subscription?.items?.data || []).some(item => item?.price?.id === priceId)) return { already_present: true, subscription };
  await stripePost('/subscription_items', { subscription: stripeSubscriptionId, price: priceId, quantity: 1, proration_behavior: 'always_invoice', payment_behavior: 'error_if_incomplete' });
  return { already_present: false, subscription: await retrieveSubscription(stripeSubscriptionId) };
}
export async function removeSubscriptionAddon(stripeSubscriptionId, key) {
  const priceId = addonStripePriceId(key); if (!priceId) throw Object.assign(new Error('Selected add-on is not configured'), { status: 409 });
  const subscription = await retrieveSubscription(stripeSubscriptionId);
  if (stripeObjectId(subscription?.schedule)) throw Object.assign(new Error('Cancel the scheduled plan change before changing add-ons'), { status: 409 });
  const item = (subscription?.items?.data || []).find(value => value?.price?.id === priceId);
  if (!item?.id) return { already_absent: true, subscription };
  await stripeRequest(`/subscription_items/${encodeURIComponent(item.id)}`, { method: 'DELETE', fields: { proration_behavior: 'none' } });
  return { already_absent: false, subscription: await retrieveSubscription(stripeSubscriptionId) };
}
export function verifyStripeSignature(raw, header, nowSeconds = Math.floor(Date.now() / 1000)) {
  const secretValue = process.env.STRIPE_WEBHOOK_SECRET; if (!secretValue || typeof raw !== "string" || typeof header !== "string") return false;
  const fields = header.split(",").reduce((all, part) => { const [key, ...rest] = part.split("="); if (key && rest.length) all[key] = all[key] || []; all[key]?.push(rest.join("=")); return all; }, {});
  const timestamp = Number(fields.t?.[0]); if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 300 || !fields.v1?.length) return false;
  const expected = crypto.createHmac("sha256", secretValue).update(`${timestamp}.${raw}`, "utf8").digest("hex");
  return fields.v1.some((signature) => signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)));
}
export function billingPlanFromSubscription(subscription) {
  const plans = (subscription?.items?.data || []).map(item => planFromStripePrice(stripeObjectId(item?.price))).filter(plan => plan && plan !== 'trial');
  return plans.length === 1 ? plans[0] : null;
}
