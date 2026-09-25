const PLAN_DEFINITIONS = Object.freeze({
  trial: Object.freeze({ label: "7-day paid trial", enquiryAllowance: 100, staffAllowance: 1, recurring: false, features: Object.freeze(["leads", "history", "actions", "bookings", "basic_knowledge", "basic_analytics"]) }),
  starter: Object.freeze({ label: "Starter", enquiryAllowance: 250, staffAllowance: 2, recurring: true, features: Object.freeze(["leads", "history", "actions", "bookings", "basic_knowledge", "basic_analytics"]) }),
  pro: Object.freeze({ label: "Pro", enquiryAllowance: 1000, staffAllowance: 5, recurring: true, features: Object.freeze(["leads", "history", "actions", "bookings", "full_knowledge", "full_analytics", "priority_support"]) }),
  business: Object.freeze({ label: "Business", enquiryAllowance: 3000, staffAllowance: 15, recurring: true, features: Object.freeze(["leads", "history", "actions", "bookings", "advanced_knowledge", "advanced_analytics", "priority_support"]) })
});

export const BILLING_PLANS = Object.freeze(Object.keys(PLAN_DEFINITIONS));
export function isBillingEnabled() { return process.env.BILLING_ENABLED === "true"; }
export function billingPriceId(plan) {
  const names = { trial: "STRIPE_PRICE_TRIAL", starter: "STRIPE_PRICE_STARTER", pro: "STRIPE_PRICE_PRO", business: "STRIPE_PRICE_BUSINESS" };
  return names[plan] ? process.env[names[plan]] || null : null;
}
export function planFromStripePrice(priceId) {
  return BILLING_PLANS.find((plan) => billingPriceId(plan) === priceId) || null;
}

function connection() {
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/+$/, ""), key } : null;
}
async function request(path, options = {}) {
  const config = connection(); if (!config) throw new Error("Billing storage unavailable");
  const response = await fetch(`${config.url}/rest/v1/${path}`, { ...options, headers: { "Content-Type": "application/json", apikey: config.key, Authorization: `Bearer ${config.key}`, ...(options.headers || {}) } });
  const raw = await response.text(); let data = null; try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) { const error = new Error("Billing storage unavailable"); error.status = response.status; throw error; }
  return data;
}
const iso = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
const activeStatuses = new Set(["active", "trialing"]);
function nowMs(now = new Date()) { return now instanceof Date ? now.getTime() : new Date(now).getTime(); }

export async function getBillingAccount(businessId) {
  if (!businessId) return null;
  const rows = await request(`business_billing_accounts?business_id=eq.${encodeURIComponent(businessId)}&select=business_id,stripe_customer_id,stripe_subscription_id,plan,status,trial_purchased,trial_started_at,trial_expires_at,current_period_started_at,current_period_ends_at,cancel_at_period_end,cancelled_at,last_stripe_event_created_at,updated_at&limit=1`);
  return Array.isArray(rows) ? rows[0] || null : null;
}
export async function findBillingAccountByStripeReference({ customerId = null, subscriptionId = null } = {}) {
  const filter = subscriptionId ? `stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}` : customerId ? `stripe_customer_id=eq.${encodeURIComponent(customerId)}` : null;
  if (!filter) return null;
  const rows = await request(`business_billing_accounts?${filter}&select=business_id,stripe_customer_id,stripe_subscription_id,plan,status,trial_purchased,trial_started_at,trial_expires_at,current_period_started_at,current_period_ends_at,cancel_at_period_end,cancelled_at,last_stripe_event_created_at&limit=1`);
  return Array.isArray(rows) ? rows[0] || null : null;
}
export async function getBillingUsage(businessId, periodStartedAt) {
  if (!businessId || !periodStartedAt) return 0;
  const rows = await request(`business_billing_usage?business_id=eq.${encodeURIComponent(businessId)}&period_started_at=eq.${encodeURIComponent(periodStartedAt)}&metric=eq.ai_enquiries&select=quantity&limit=1`);
  return Number(Array.isArray(rows) ? rows[0]?.quantity : 0) || 0;
}
export function entitlementFromAccount(account, usage = 0, now = new Date()) {
  if (!isBillingEnabled()) return { enforced: false, active: true, plan: "pilot", status: "pilot", enquiryAllowance: null, enquiriesUsed: 0, enquiriesRemaining: null, staffAllowance: null, features: [] };
  const definition = PLAN_DEFINITIONS[account?.plan];
  const isTrial = account?.plan === "trial";
  const expiry = isTrial ? iso(account?.trial_expires_at) : iso(account?.current_period_ends_at);
  const active = Boolean(definition && activeStatuses.has(account?.status) && expiry && nowMs(expiry) > nowMs(now));
  const allowance = definition?.enquiryAllowance ?? 0;
  const used = Math.max(0, Number(usage) || 0);
  return { enforced: true, active, plan: definition ? account.plan : "none", status: account?.status || "inactive", enquiryAllowance: allowance, enquiriesUsed: used, enquiriesRemaining: active ? Math.max(0, allowance - used) : 0, staffAllowance: definition?.staffAllowance ?? 0, features: definition?.features || [], trialExpiresAt: isTrial ? expiry : null, currentPeriodEndsAt: !isTrial ? expiry : null, cancelAtPeriodEnd: Boolean(account?.cancel_at_period_end) };
}
function billingPeriod(account) {
  return account?.plan === "trial" ? account?.trial_started_at : account?.current_period_started_at;
}
function billingExpiry(account) {
  return account?.plan === "trial" ? account?.trial_expires_at : account?.current_period_ends_at;
}
function billingDenialCode(account, entitlements, period, now = new Date()) {
  const definition = PLAN_DEFINITIONS[account?.plan];
  if (!account || !definition) return "SUBSCRIPTION_REQUIRED";
  if (account.status === "past_due") return "PAYMENT_REQUIRED";
  if (!activeStatuses.has(account.status)) return "SUBSCRIPTION_REQUIRED";
  const expiry = iso(billingExpiry(account));
  if (!period || !expiry) return "BILLING_CONFIGURATION_ERROR";
  if (nowMs(expiry) <= nowMs(now)) return "SUBSCRIPTION_REQUIRED";
  if (entitlements.enquiriesRemaining < 1) return "AI_ENQUIRY_ALLOWANCE_REACHED";
  return null;
}
export async function getBusinessEntitlements(businessId, now = new Date()) {
  if (!isBillingEnabled()) return entitlementFromAccount(null, 0, now);
  const account = await getBillingAccount(businessId);
  const period = billingPeriod(account);
  return entitlementFromAccount(account, await getBillingUsage(businessId, period), now);
}
export async function getAiEnquiryAccess(businessId, now = new Date()) {
  if (!isBillingEnabled()) return { allowed: true, code: null, entitlements: entitlementFromAccount(null, 0, now), period: null };
  try {
    const account = await getBillingAccount(businessId);
    const period = billingPeriod(account);
    const usage = period ? await getBillingUsage(businessId, period) : 0;
    const entitlements = entitlementFromAccount(account, usage, now);
    const code = billingDenialCode(account, entitlements, period, now);
    return { allowed: !code, code, entitlements, period };
  } catch {
    return { allowed: false, code: "BILLING_UNAVAILABLE", entitlements: entitlementFromAccount(null, 0, now), period: null };
  }
}
export async function reserveAiEnquiryAllowance(businessId, now = new Date()) {
  const access = await getAiEnquiryAccess(businessId, now);
  if (!access.allowed) return access;
  if (!access.entitlements.enforced) return { ...access, reservation: null };
  try {
    const allowed = await request("rpc/consume_billing_ai_enquiry_allowance", { method: "POST", body: JSON.stringify({ p_business_id: businessId, p_period_started_at: access.period, p_allowance: access.entitlements.enquiryAllowance }) });
    return { ...access, allowed: allowed === true, code: allowed === true ? null : "AI_ENQUIRY_ALLOWANCE_REACHED", reservation: allowed === true ? { periodStartedAt: access.period } : null };
  } catch {
    return { ...access, allowed: false, code: "BILLING_UNAVAILABLE", reservation: null };
  }
}
export async function releaseAiEnquiryAllowance(businessId, reservation) {
  if (!isBillingEnabled() || !businessId || !reservation?.periodStartedAt) return true;
  try {
    const released = await request("rpc/release_billing_ai_enquiry_allowance", { method: "POST", body: JSON.stringify({ p_business_id: businessId, p_period_started_at: reservation.periodStartedAt }) });
    return released === true;
  } catch {
    return false;
  }
}
export async function activatePaidTrial({ businessId, stripeCustomerId, startedAt, expiresAt }) {
  const result = await request("rpc/activate_paid_business_trial", { method: "POST", body: JSON.stringify({ p_business_id: businessId, p_stripe_customer_id: stripeCustomerId || null, p_started_at: startedAt, p_expires_at: expiresAt }) });
  return result === true;
}
export async function assertStaffSeatAvailable(businessId, currentSeats) {
  const entitlements = await getBusinessEntitlements(businessId);
  if (!entitlements.enforced) return entitlements;
  if (!entitlements.active) { const error = new Error("An active subscription is required to manage team access"); error.status = 402; throw error; }
  if (Number(currentSeats) >= entitlements.staffAllowance) { const error = new Error("Your plan's staff account allowance has been reached"); error.status = 409; throw error; }
  return entitlements;
}
export async function saveBillingAccount(account) {
  const allowed = ["business_id", "stripe_customer_id", "stripe_subscription_id", "plan", "status", "trial_purchased", "trial_started_at", "trial_expires_at", "current_period_started_at", "current_period_ends_at", "cancel_at_period_end", "cancelled_at", "updated_at"];
  const safe = Object.fromEntries(Object.entries(account || {}).filter(([key, value]) => allowed.includes(key) && (value === null || ["string", "boolean"].includes(typeof value))));
  if (!safe.business_id) throw new Error("Billing storage unavailable");
  safe.updated_at = new Date().toISOString();
  const rows = await request("business_billing_accounts?on_conflict=business_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(safe) });
  return Array.isArray(rows) ? rows[0] || null : rows;
}

export async function syncBillingAccountFromStripe(account, eventCreatedAt) {
  const payload = {
    p_business_id: account?.business_id || null,
    p_event_created_at: eventCreatedAt || null,
    p_stripe_customer_id: account?.stripe_customer_id || null,
    p_stripe_subscription_id: account?.stripe_subscription_id || null,
    p_plan: account?.plan || null,
    p_status: account?.status || null,
    p_current_period_started_at: account?.current_period_started_at || null,
    p_current_period_ends_at: account?.current_period_ends_at || null,
    p_cancel_at_period_end: Boolean(account?.cancel_at_period_end),
    p_cancelled_at: account?.cancelled_at || null
  };
  if (!payload.p_business_id || !payload.p_event_created_at || !payload.p_plan || !payload.p_status) throw new Error("Billing storage unavailable");
  const result = await request("rpc/sync_business_billing_from_stripe", { method: "POST", body: JSON.stringify(payload) });
  return result === true;
}

export async function markWebhookEvent(eventId, eventType, businessId = null) {
  try { await request("stripe_webhook_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ stripe_event_id: eventId, event_type: eventType, business_id: businessId }) }); return true; }
  catch (error) {
    if (error?.status !== 409) throw error;
    // Only one retry may reclaim a failed attempt. Completed/in-flight events stay idempotent.
    const rows = await request(`stripe_webhook_events?stripe_event_id=eq.${encodeURIComponent(eventId)}&processing_error=eq.true`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ processing_error: false, processed_at: null })
    });
    return Array.isArray(rows) && rows.length === 1;
  }
}
export async function completeWebhookEvent(eventId, failed = false) {
  await request(`stripe_webhook_events?stripe_event_id=eq.${encodeURIComponent(eventId)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ processed_at: new Date().toISOString(), processing_error: Boolean(failed) }) });
}
export { PLAN_DEFINITIONS };
