import crypto from "node:crypto";
import { BILLING_PLANS, billingPriceId, planFromStripePrice } from "./billing.js";

const STRIPE_API = "https://api.stripe.com/v1";
const safeUrl = (value) => { try { const url = new URL(value); return url.protocol === "https:" ? url.origin : null; } catch { return null; } };
export function stripeConfigured() { return Boolean(process.env.STRIPE_SECRET_KEY && safeUrl(process.env.BILLING_APP_URL)); }
export function stripeWebhookConfigured() { return Boolean(process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY); }
function secret() { const value = process.env.STRIPE_SECRET_KEY; if (!value) throw new Error("Stripe is unavailable"); return value; }
function form(fields) { const values = new URLSearchParams(); for (const [key, value] of Object.entries(fields)) if (value !== undefined && value !== null && value !== "") values.set(key, String(value)); return values; }
export async function stripePost(path, fields) {
  const response = await fetch(`${STRIPE_API}${path}`, { method: "POST", headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form(fields) });
  const body = await response.json().catch(() => null);
  if (!response.ok) { const error = new Error("Stripe is temporarily unavailable"); error.status = response.status; throw error; }
  return body;
}
export function checkoutReturnUrls() {
  const origin = safeUrl(process.env.BILLING_APP_URL); if (!origin) throw new Error("Stripe is unavailable");
  return { success: `${origin}/?billing=success`, cancel: `${origin}/?billing=cancelled`, return: `${origin}/?billing=manage` };
}
export async function createCheckout({ plan, businessId, stripeCustomerId, customerEmail }) {
  if (!BILLING_PLANS.includes(plan) || !billingPriceId(plan)) throw new Error("Selected plan is unavailable");
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
  if (subscription) { fields["subscription_data[metadata][business_id]"] = businessId; fields["subscription_data[metadata][plan]"] = plan; }
  return stripePost("/checkout/sessions", fields);
}
export async function createPortal(stripeCustomerId) { return stripePost("/billing_portal/sessions", { customer: stripeCustomerId, return_url: checkoutReturnUrls().return }); }
export async function cancelSubscription(stripeSubscriptionId) { return stripePost(`/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`, { cancel_at_period_end: "true" }); }
export function verifyStripeSignature(raw, header, nowSeconds = Math.floor(Date.now() / 1000)) {
  const secretValue = process.env.STRIPE_WEBHOOK_SECRET; if (!secretValue || typeof raw !== "string" || typeof header !== "string") return false;
  const fields = header.split(",").reduce((all, part) => { const [key, ...rest] = part.split("="); if (key && rest.length) all[key] = all[key] || []; all[key]?.push(rest.join("=")); return all; }, {});
  const timestamp = Number(fields.t?.[0]); if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 300 || !fields.v1?.length) return false;
  const expected = crypto.createHmac("sha256", secretValue).update(`${timestamp}.${raw}`, "utf8").digest("hex");
  return fields.v1.some((signature) => signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)));
}
export function billingPlanFromSubscription(subscription) {
  const explicit = subscription?.metadata?.plan; if (BILLING_PLANS.includes(explicit) && explicit !== "trial") return explicit;
  return planFromStripePrice(subscription?.items?.data?.[0]?.price?.id) || null;
}
