import { requireAal2, requireBusinessMember, sendAuthError } from "./auth.js";
import { getBillingAccount, getBusinessEntitlements, isBillingEnabled, isPilotFreeStarterMarketingEnabled, saveBillingAccount } from "./billing.js";
import { createCheckout, createPortal, changeSubscriptionPlan, cancelScheduledPlanChange, cancelSubscription, getScheduledPlanChange, stripeConfigured, addonPriceDetails } from "./stripe.js";
import { ADDONS, addonDefinition, addonStripePriceId } from './addons.js';
import { recordAuditEvent } from "./audit.js";

const parse = (value) => { try { const body = typeof value === "string" ? JSON.parse(value) : value || {}; return body && typeof body === "object" && !Array.isArray(body) ? body : null; } catch { return null; } };
const validPlans = new Set(["trial", "starter", "pro", "business"]);
const activeSubscriptionStatuses = new Set(["active", "trialing", "past_due"]);
const protectedBillingActions = new Set(["change_plan", "cancel_plan_change", "portal", "cancel"]);
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
  if (!auth.enforced) return res.status(503).json({ error: "Billing is not enabled" });
  if (isPilotFreeStarterMarketingEnabled()) {
    if (req.method !== "GET") return res.status(403).json({ error: "Billing is disabled during the Pilot. Starter and AI Marketing are included at no charge." });
    try { return res.status(200).json({ entitlements: await getBusinessEntitlements(auth.businessId), account: null, pending_plan_change: null, pilot_free_access: true }); }
    catch { return res.status(503).json({ error: "Pilot access is temporarily unavailable" }); }
  }
  if (!isBillingEnabled()) return res.status(503).json({ error: "Billing is not enabled" });
  try {
    const account = await getBillingAccount(auth.businessId);
    if (req.method === "GET") {
      let pendingPlanChange = null;
      if (stripeConfigured() && account?.stripe_subscription_id) {
        try { pendingPlanChange = await getScheduledPlanChange(account.stripe_subscription_id); } catch {}
      }
      return res.status(200).json({ entitlements: await getBusinessEntitlements(auth.businessId), account: publicAccount(account), pending_plan_change: pendingPlanChange });
    }
    const body = parse(req.body); if (!body || Object.keys(body).some((key) => !["action", "plan", "addons"].includes(key))) return res.status(400).json({ error: "Invalid billing request" });
    if (protectedBillingActions.has(body.action)) {
      try { await requireAal2(req); } catch (error) { return sendAuthError(res, error); }
    }
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
    if (body.action === "change_plan") {
      if (!['starter', 'pro', 'business'].includes(body.plan)) return res.status(400).json({ error: "Invalid plan" });
      if (body.addons !== undefined) return res.status(400).json({ error: "Invalid billing request" });
      if (!stripeConfigured() || !account?.stripe_subscription_id) return res.status(409).json({ error: "No active subscription to change" });
      if (!['active', 'trialing'].includes(account.status)) return res.status(409).json({ error: "Resolve the current billing issue before changing plans" });
      const changed = await changeSubscriptionPlan(account.stripe_subscription_id, body.plan, auth.businessId);
      const action = changed?.scheduled ? "billing.plan_downgrade_scheduled" : "billing.plan_change_requested";
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action, resourceType: "billing", resourceId: account.stripe_subscription_id, metadata: { from_plan: account.plan || null, to_plan: body.plan, already_current: Boolean(changed?.already_current), scheduled: Boolean(changed?.scheduled), effective_at: changed?.effective_at || null } });
      return res.status(200).json({
        changed: !changed?.already_current,
        scheduled: Boolean(changed?.scheduled),
        plan: body.plan,
        effective_at: changed?.effective_at || null,
        message: changed?.already_current
          ? "This plan is already active."
          : changed?.scheduled
            ? "Downgrade scheduled for your next renewal. Your current plan stays active until then."
            : "Plan updated. Your billing status will refresh shortly."
      });
    }
    if (body.action === "cancel_plan_change") {
      if (body.addons !== undefined || body.plan !== undefined) return res.status(400).json({ error: "Invalid billing request" });
      if (!stripeConfigured() || !account?.stripe_subscription_id) return res.status(409).json({ error: "No active subscription" });
      const result = await cancelScheduledPlanChange(account.stripe_subscription_id);
      if (result.cancelled) await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: "billing.plan_downgrade_cancelled", resourceType: "billing", resourceId: account.stripe_subscription_id, metadata: {} });
      return res.status(200).json({ cancelled: Boolean(result.cancelled), message: result.cancelled ? "Scheduled plan change cancelled." : "There is no scheduled plan change." });
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
