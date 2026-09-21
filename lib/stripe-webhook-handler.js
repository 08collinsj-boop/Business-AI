import { billingPlanFromSubscription, stripeWebhookConfigured, verifyStripeSignature } from "./stripe.js";
import { activatePaidTrial, completeWebhookEvent, findBillingAccountByStripeReference, markWebhookEvent, saveBillingAccount } from "./billing.js";
import { recordAuditEvent } from "./audit.js";

export const config = { api: { bodyParser: false } };
async function rawBody(req) {
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  // Re-serializing an already parsed object cannot reproduce Stripe's signed
  // bytes. Reject it rather than accidentally weakening signature validation.
  if (req.body !== undefined && req.body !== null) throw new Error("Raw webhook body unavailable");
  const chunks = []; for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); return Buffer.concat(chunks).toString("utf8");
}
const stamp = (seconds) => Number.isFinite(Number(seconds)) ? new Date(Number(seconds) * 1000).toISOString() : null;
const billingStatus = (value) => ({ active: "active", trialing: "trialing", past_due: "past_due", unpaid: "past_due", canceled: "cancelled", incomplete_expired: "expired" }[value] || "inactive");
async function businessFor(object) {
  const direct = object?.metadata?.business_id || object?.client_reference_id;
  const suppliedBusinessId = typeof direct === "string" && /^[0-9a-f-]{36}$/i.test(direct) ? direct : null;
  const account = await findBillingAccountByStripeReference({ customerId: typeof object?.customer === "string" ? object.customer : null, subscriptionId: typeof object?.id === "string" && object?.object === "subscription" ? object.id : typeof object?.subscription === "string" ? object.subscription : null });
  if (account && suppliedBusinessId && account.business_id !== suppliedBusinessId) {
    const error = new Error("Webhook tenant mapping conflict"); error.status = 400; throw error;
  }
  return account?.business_id || suppliedBusinessId;
}
async function syncSubscription(subscription, businessId) {
  const plan = billingPlanFromSubscription(subscription); if (!plan) throw new Error("Unknown Stripe price");
  await saveBillingAccount({ business_id: businessId, stripe_customer_id: subscription.customer || null, stripe_subscription_id: subscription.id || null, plan, status: billingStatus(subscription.status), current_period_started_at: stamp(subscription.current_period_start), current_period_ends_at: stamp(subscription.current_period_end), cancel_at_period_end: Boolean(subscription.cancel_at_period_end), cancelled_at: subscription.canceled_at ? stamp(subscription.canceled_at) : null });
  await recordAuditEvent({ businessId, action: "billing.subscription_synced", resourceType: "billing", resourceId: subscription.id || plan, metadata: { plan, status: billingStatus(subscription.status), cancel_at_period_end: Boolean(subscription.cancel_at_period_end) } });
}

// The event processor deliberately starts after signature verification. It is
// shared by the Node compatibility handler and the Web Standard Vercel route
// so there is one idempotent billing implementation regardless of transport.
export async function processVerifiedStripeEvent(event) {
  let businessId;
  try { businessId = await businessFor(event.data.object); }
  catch (error) { return { status: error?.status === 400 ? 400 : 503, body: { error: error?.status === 400 ? "Webhook event rejected" : "Webhook unavailable" } }; }
  try {
    if (!(await markWebhookEvent(event.id, event.type, businessId))) {
      return { status: 200, body: { received: true, duplicate: true } };
    }
  } catch { return { status: 503, body: { error: "Webhook unavailable" } }; }
  try {
    const object = event.data.object;
    if (event.type === "checkout.session.completed" && object.payment_status === "paid" && object.metadata?.plan === "trial" && businessId) {
      // A second completed Checkout must never restart the seven-day window.
      // The unique event ledger handles retries; this durable account flag
      // also blocks a distinct session from granting another trial.
      const started = stamp(event.created) || new Date().toISOString(); const expires = new Date(new Date(started).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      if (await activatePaidTrial({ businessId, stripeCustomerId: object.customer || null, startedAt: started, expiresAt: expires })) {
        await recordAuditEvent({ businessId, action: "billing.trial_activated", resourceType: "billing", resourceId: object.id, metadata: { plan: "trial" } });
      }
    } else if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type) && businessId) {
      await syncSubscription(object, businessId);
    } else if (event.type === "invoice.payment_failed" && businessId) {
      const existing = await findBillingAccountByStripeReference({ subscriptionId: object.subscription || null, customerId: object.customer || null });
      if (existing) await saveBillingAccount({ business_id: existing.business_id, status: "past_due" });
      await recordAuditEvent({ businessId, action: "billing.payment_failed", resourceType: "billing", resourceId: String(object.subscription || object.id || "invoice"), metadata: {} });
    }
    await completeWebhookEvent(event.id); return { status: 200, body: { received: true } };
  } catch {
    try { await completeWebhookEvent(event.id, true); } catch {}
    return { status: 503, body: { error: "Webhook processing failed" } };
  }
}
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!stripeWebhookConfigured()) return res.status(503).json({ error: "Webhook unavailable" });
  let raw; try { raw = await rawBody(req); } catch { return res.status(400).json({ error: "Invalid webhook payload" }); }
  const signature = req.headers?.["stripe-signature"] || req.headers?.["Stripe-Signature"];
  if (!verifyStripeSignature(raw, signature)) return res.status(400).json({ error: "Invalid webhook signature" });
  let event; try { event = JSON.parse(raw); } catch { return res.status(400).json({ error: "Invalid webhook payload" }); }
  if (!event?.id || !event?.type || !event?.data?.object) return res.status(400).json({ error: "Invalid webhook payload" });
  const result = await processVerifiedStripeEvent(event);
  return res.status(result.status).json(result.body);
}
