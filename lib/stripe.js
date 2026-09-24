import crypto from "node:crypto";
import { BILLING_PLANS, billingPriceId, planFromStripePrice } from "./billing.js";
import { addonStripePriceId } from './addons.js';

const STRIPE_API = "https://api.stripe.com/v1";
const safeUrl = (value) => { try { const url = new URL(value); return url.protocol === "https:" ? url.origin : null; } catch { return null; } };
export function stripeConfigured() { return Boolean(process.env.STRIPE_SECRET_KEY && safeUrl(process.env.BILLING_APP_URL)); }
export function stripeWebhookConfigured() { return Boolean(process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY); }
function secret() { const value = process.env.STRIPE_SECRET_KEY; if (!value) throw new Error("Stripe is unavailable"); return value; }
function form(fields) { const values = new URLSearchParams(); for (const [key, value] of Object.entries(fields || {})) if (value !== undefined && value !== null && value !== "") values.set(key, String(value)); return values; }
export async function stripeRequest(path, { method = 'POST', fields = null } = {}) {
  const url = new URL(`${STRIPE_API}${path}`);
  const options = { method, headers: { Authorization: `Bearer ${secret()}` } };
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
export async function stripePost(path, fields) { return stripeRequest(path, { method: 'POST', fields }); }
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
export async function cancelSubscription(stripeSubscriptionId) { return stripePost(`/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`, { cancel_at_period_end: "true" }); }
export async function retrieveSubscription(stripeSubscriptionId) { return stripeRequest(`/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`, { method: 'GET' }); }
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
  if ((subscription?.items?.data || []).some(item => item?.price?.id === priceId)) return { already_present: true, subscription };
  await stripePost('/subscription_items', { subscription: stripeSubscriptionId, price: priceId, quantity: 1, proration_behavior: 'always_invoice', payment_behavior: 'error_if_incomplete' });
  return { already_present: false, subscription: await retrieveSubscription(stripeSubscriptionId) };
}
export async function removeSubscriptionAddon(stripeSubscriptionId, key) {
  const priceId = addonStripePriceId(key); if (!priceId) throw Object.assign(new Error('Selected add-on is not configured'), { status: 409 });
  const subscription = await retrieveSubscription(stripeSubscriptionId);
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
  const plans = (subscription?.items?.data || []).map(item => planFromStripePrice(item?.price?.id)).filter(plan => plan && plan !== 'trial');
  return plans.length === 1 ? plans[0] : null;
}
