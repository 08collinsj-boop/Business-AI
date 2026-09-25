import { billingPlanFromSubscription, completeSubscriptionItems, retrieveSubscription, stripeObjectId, subscriptionBillingPeriod, stripeWebhookConfigured, verifyStripeSignature } from "./stripe.js";
import { activatePaidTrial, completeWebhookEvent, findBillingAccountByStripeReference, markWebhookEvent, syncBillingAccountFromStripe } from "./billing.js";
import { deactivateStripeAddonEntitlements, syncStripeAddonEntitlements } from './addons.js';
import { recordAuditEvent } from "./audit.js";

export const config = { api: { bodyParser: false } };
async function rawBody(req) {
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  if (req.body !== undefined && req.body !== null) throw new Error("Raw webhook body unavailable");
  const chunks = []; for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); return Buffer.concat(chunks).toString("utf8");
}
const stamp = (seconds) => seconds !== null && seconds !== undefined && Number(seconds) > 0 && Number.isFinite(Number(seconds)) ? new Date(Number(seconds) * 1000).toISOString() : null;
const billingStatus = (value) => ({ active: "active", trialing: "trialing", past_due: "past_due", unpaid: "past_due", canceled: "cancelled", incomplete_expired: "expired", incomplete: "inactive", paused: "inactive" }[value] || "inactive");
async function businessFor(object) {
  const direct = object?.metadata?.business_id || object?.client_reference_id;
  const suppliedBusinessId = typeof direct === "string" && /^[0-9a-f-]{36}$/i.test(direct) ? direct : null;
  // Metadata here is from a signature-verified Stripe event or authenticated Stripe retrieval,
  // never a browser request. Compare BOTH persisted Stripe references before using it.
  const customerId = stripeObjectId(object?.customer);
  const subscriptionId = object?.object === 'subscription' ? object.id : stripeObjectId(object?.subscription);
  const bySubscription = subscriptionId ? await findBillingAccountByStripeReference({ subscriptionId }) : null;
  const byCustomer = customerId ? await findBillingAccountByStripeReference({ customerId }) : null;
  const tenants = [bySubscription?.business_id, byCustomer?.business_id, suppliedBusinessId].filter(Boolean);
  if (new Set(tenants).size > 1 || (bySubscription?.stripe_customer_id && customerId && bySubscription.stripe_customer_id !== customerId)) {
    const error = new Error("Webhook tenant mapping conflict"); error.status = 400; throw error;
  }
  return tenants[0] || null;
}
async function syncSubscription(subscription, businessId, eventCreated) {
  subscription = await completeSubscriptionItems(subscription);
  const plan = billingPlanFromSubscription(subscription); if (!plan) throw new Error("Unknown Stripe price");
  const status = billingStatus(subscription.status);
  const period = subscriptionBillingPeriod(subscription);
  if (status === "active" && (!stamp(period.start) || !stamp(period.end))) throw new Error("Stripe billing period unavailable");
  const applied = await syncBillingAccountFromStripe({ business_id: businessId, stripe_customer_id: stripeObjectId(subscription.customer), stripe_subscription_id: subscription.id || null, plan, status, current_period_started_at: stamp(period.start), current_period_ends_at: stamp(period.end), cancel_at_period_end: Boolean(subscription.cancel_at_period_end), cancelled_at: subscription.canceled_at ? stamp(subscription.canceled_at) : null }, stamp(eventCreated));
  if (!applied) return false;
  await syncStripeAddonEntitlements({ businessId, subscription, enabled: status === 'active', eventCreatedAt: stamp(eventCreated) });
  await recordAuditEvent({ businessId, action: "billing.subscription_synced", resourceType: "billing", resourceId: subscription.id || plan, metadata: { plan, status, cancel_at_period_end: Boolean(subscription.cancel_at_period_end) } });
  return true;
}

export async function processVerifiedStripeEvent(event) {
  let businessId;
  try { businessId = await businessFor(event.data.object); }
  catch (error) { return { status: error?.status === 400 ? 400 : 503, body: { error: error?.status === 400 ? "Webhook event rejected" : "Webhook unavailable" } }; }
  try {
    if (!(await markWebhookEvent(event.id, event.type, businessId))) return { status: 200, body: { received: true, duplicate: true } };
  } catch { return { status: 503, body: { error: "Webhook unavailable" } }; }
  try {
    const object = event.data.object;
    if (event.type === "checkout.session.completed" && object.payment_status === "paid" && object.metadata?.plan === "trial" && businessId) {
      const started = stamp(event.created) || new Date().toISOString(); const expires = new Date(new Date(started).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      if (await activatePaidTrial({ businessId, stripeCustomerId: object.customer || null, startedAt: started, expiresAt: expires })) await recordAuditEvent({ businessId, action: "billing.trial_activated", resourceType: "billing", resourceId: object.id, metadata: { plan: "trial" } });
    } else if (event.type === "checkout.session.completed" && object.mode === "subscription" && object.payment_status === "paid" && businessId) {
      const subscriptionId = stripeObjectId(object.subscription);
      if (!subscriptionId) throw new Error('Stripe checkout subscription unavailable');
      const subscription = await retrieveSubscription(subscriptionId);
      const subscriptionBusiness = await businessFor(subscription);
      if (subscriptionBusiness !== businessId || stripeObjectId(subscription.customer) !== stripeObjectId(object.customer)) throw new Error('Webhook tenant mapping conflict');
      await syncSubscription(subscription, businessId, event.created);
    } else if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type) && businessId) {
      await syncSubscription(object, businessId, event.created);
    } else if (event.type === "invoice.payment_failed" && businessId) {
      const existing = await findBillingAccountByStripeReference({ subscriptionId: object.subscription || null, customerId: object.customer || null });
      if (existing) {
        const applied = await syncBillingAccountFromStripe({ ...existing, business_id: existing.business_id, status: "past_due" }, stamp(event.created));
        if (applied) await deactivateStripeAddonEntitlements(existing.business_id, stamp(event.created));
      }
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
