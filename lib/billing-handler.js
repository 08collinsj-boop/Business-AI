import { requireBusinessMember, sendAuthError } from "./auth.js";
import { getBillingAccount, getBusinessEntitlements, isBillingEnabled, saveBillingAccount } from "./billing.js";
import { createCheckout, createPortal, cancelSubscription, stripeConfigured } from "./stripe.js";
import { recordAuditEvent } from "./audit.js";

const parse = (value) => { try { const body = typeof value === "string" ? JSON.parse(value) : value || {}; return body && typeof body === "object" && !Array.isArray(body) ? body : null; } catch { return null; } };
const validPlans = new Set(["trial", "starter", "pro", "business"]);
const activeSubscriptionStatuses = new Set(["active", "trialing", "past_due"]);
const publicAccount = (account) => account ? {
  plan: account.plan,
  status: account.status,
  trial_purchased: Boolean(account.trial_purchased),
  cancel_at_period_end: Boolean(account.cancel_at_period_end),
  has_customer: Boolean(account.stripe_customer_id),
  has_subscription: Boolean(account.stripe_subscription_id)
} : null;
const conflict = (message) => Object.assign(new Error(message), { status: 409 });

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  let auth; try { auth = await requireBusinessMember(req, ["owner"]); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced || !isBillingEnabled()) return res.status(503).json({ error: "Billing is not enabled" });
  try {
    const account = await getBillingAccount(auth.businessId);
    if (req.method === "GET") return res.status(200).json({ entitlements: await getBusinessEntitlements(auth.businessId), account: publicAccount(account) });
    const body = parse(req.body); if (!body || Object.keys(body).some((key) => !["action", "plan"].includes(key))) return res.status(400).json({ error: "Invalid billing request" });
    if (body.action === "checkout") {
      if (!validPlans.has(body.plan)) return res.status(400).json({ error: "Invalid plan" });
      if (!stripeConfigured()) return res.status(503).json({ error: "Billing is temporarily unavailable" });
      if (body.plan === "trial" && (account?.trial_purchased || account?.plan !== undefined && account.plan !== "none")) throw conflict("This business has already used its trial");
      if (body.plan !== "trial" && account?.stripe_subscription_id && activeSubscriptionStatuses.has(account.status)) throw conflict("Manage the existing subscription to change plans");
      const session = await createCheckout({ plan: body.plan, businessId: auth.businessId, stripeCustomerId: account?.stripe_customer_id || null, customerEmail: auth.email });
      if (!session?.url) throw new Error("Stripe is temporarily unavailable");
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: "billing.checkout_started", resourceType: "billing", resourceId: body.plan, metadata: { plan: body.plan } });
      return res.status(200).json({ checkout_url: session.url });
    }
    if (body.action === "portal") {
      if (!stripeConfigured() || !account?.stripe_customer_id) return res.status(409).json({ error: "Billing management is unavailable" });
      const portal = await createPortal(account.stripe_customer_id); if (!portal?.url) throw new Error("Stripe is temporarily unavailable");
      return res.status(200).json({ portal_url: portal.url });
    }
    if (body.action === "cancel") {
      if (!stripeConfigured() || !account?.stripe_subscription_id) return res.status(409).json({ error: "No active subscription to cancel" });
      const subscription = await cancelSubscription(account.stripe_subscription_id);
      await saveBillingAccount({ business_id: auth.businessId, cancel_at_period_end: Boolean(subscription?.cancel_at_period_end), cancelled_at: new Date().toISOString() });
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: "billing.cancellation_requested", resourceType: "billing", resourceId: account.stripe_subscription_id, metadata: { at_period_end: true } });
      return res.status(200).json({ cancelled_at_period_end: true });
    }
    return res.status(400).json({ error: "Invalid billing request" });
  } catch (error) {
    if (error?.status === 409) return res.status(409).json({ error: error.message || "Billing request could not be completed" });
    return res.status(503).json({ error: "Billing is temporarily unavailable" });
  }
}
