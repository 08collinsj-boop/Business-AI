import { requireBusinessMember, sendAuthError } from "./auth.js";
import { getBillingAccount, getBusinessEntitlements, isBillingEnabled, saveBillingAccount } from "./billing.js";
import { createCheckout, createPortal, cancelSubscription, stripeConfigured, addonPriceDetails } from "./stripe.js";
import { ADDONS, addonDefinition, addonStripePriceId } from './addons.js';
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

async function validatedCheckoutAddons(plan, value) {
  const keys = Array.isArray(value) ? [...new Set(value)] : [];
  if (keys.length > 5 || keys.some(key => typeof key !== 'string')) throw Object.assign(new Error('Invalid add-on selection'), { status: 400 });
  if (plan === 'trial' && keys.length) throw conflict('Add-ons are available with recurring plans only');
  for (const key of keys) {
    const addon = addonDefinition(key);
    if (addon.status !== 'available' || !addonStripePriceId(key)) throw conflict('Selected add-on is not available for purchase');
    const price = await addonPriceDetails(key);
    if (!price) throw conflict('Pricing for the selected add-on has not been configured and approved yet');
  }
  return keys;
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  let auth; try { auth = await requireBusinessMember(req, ["owner"]); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced || !isBillingEnabled()) return res.status(503).json({ error: "Billing is not enabled" });
  try {
    const account = await getBillingAccount(auth.businessId);
    if (req.method === "GET") return res.status(200).json({ entitlements: await getBusinessEntitlements(auth.businessId), account: publicAccount(account) });
    const body = parse(req.body); if (!body || Object.keys(body).some((key) => !["action", "plan", "addons"].includes(key))) return res.status(400).json({ error: "Invalid billing request" });
    if (body.action === "checkout") {
      if (!validPlans.has(body.plan)) return res.status(400).json({ error: "Invalid plan" });
      if (!stripeConfigured()) return res.status(503).json({ error: "Billing is temporarily unavailable" });
      if (body.plan === "trial" && (account?.trial_purchased || account?.plan !== undefined && account.plan !== "none")) throw conflict("This business has already used its trial");
      if (body.plan !== "trial" && account?.stripe_subscription_id && activeSubscriptionStatuses.has(account.status)) throw conflict("Manage the existing subscription to change plans");
      const addonKeys = await validatedCheckoutAddons(body.plan, body.addons);
      const session = await createCheckout({ plan: body.plan, businessId: auth.businessId, stripeCustomerId: account?.stripe_customer_id || null, customerEmail: auth.email, addonKeys });
      if (!session?.url) throw new Error("Stripe is temporarily unavailable");
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: "billing.checkout_started", resourceType: "billing", resourceId: body.plan, metadata: { plan: body.plan, addon_count: addonKeys.length } });
      return res.status(200).json({ checkout_url: session.url });
    }
    if (body.action === "portal") {
      if (body.addons !== undefined || body.plan !== undefined) return res.status(400).json({ error: "Invalid billing request" });
      if (!stripeConfigured() || !account?.stripe_customer_id) return res.status(409).json({ error: "Billing management is unavailable" });
      const portal = await createPortal(account.stripe_customer_id); if (!portal?.url) throw new Error("Stripe is temporarily unavailable");
      return res.status(200).json({ portal_url: portal.url });
    }
    if (body.action === "cancel") {
      if (body.addons !== undefined || body.plan !== undefined) return res.status(400).json({ error: "Invalid billing request" });
      if (!stripeConfigured() || !account?.stripe_subscription_id) return res.status(409).json({ error: "No active subscription to cancel" });
      const subscription = await cancelSubscription(account.stripe_subscription_id);
      await saveBillingAccount({ business_id: auth.businessId, cancel_at_period_end: Boolean(subscription?.cancel_at_period_end), cancelled_at: new Date().toISOString() });
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: "billing.cancellation_requested", resourceType: "billing", resourceId: account.stripe_subscription_id, metadata: { at_period_end: true } });
      return res.status(200).json({ cancelled_at_period_end: true });
    }
    return res.status(400).json({ error: "Invalid billing request" });
  } catch (error) {
    if ([400, 409].includes(error?.status)) return res.status(error.status).json({ error: error.message || "Billing request could not be completed" });
    return res.status(503).json({ error: "Billing is temporarily unavailable" });
  }
}
