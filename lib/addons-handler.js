import { requireBusinessMember, sendAuthError } from './auth.js';
import { ADDONS, activeAddon, addonStripePriceId, getAddonEntitlements, validateAddonRequest, marketingAccess } from './addons.js';
import { getBillingAccount, getBusinessEntitlements, isBillingEnabled } from './billing.js';
import { addSubscriptionAddon, addonPriceDetails, removeSubscriptionAddon, stripeConfigured } from './stripe.js';
import { recordAuditEvent } from './audit.js';

function recurringAccountReady(account, entitlements) {
  return Boolean(account?.stripe_subscription_id && entitlements?.active && ['starter', 'pro', 'business'].includes(entitlements.plan) && ['active', 'trialing'].includes(account.status));
}

export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  let auth;
  try { auth = await requireBusinessMember(req, req.method === 'POST' ? ['owner'] : null); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: 'Authenticated business access is required' });
  if (Object.keys(req.query || {}).some(key => key !== 'operation')) return res.status(400).json({ error: 'Invalid additional feature query' });
  try {
    if (req.method === 'GET') {
      const rows = await getAddonEntitlements(auth.businessId);
      let account = null, entitlements = null;
      const marketingConfigured = Boolean(addonStripePriceId('ai_marketing') && stripeConfigured());
      if (isBillingEnabled()) {
        try { [account, entitlements] = await Promise.all([getBillingAccount(auth.businessId), getBusinessEntitlements(auth.businessId)]); } catch { account = null; entitlements = null; }
      }
      const addons = [];
      for (const addon of Object.values(ADDONS)) {
        let price = null;
        if (addon.key === 'ai_marketing' && addon.status === 'available' && marketingConfigured) {
          try { price = await addonPriceDetails(addon.key); } catch { price = null; }
        }
        const entitlement = addon.status === 'coming_soon' ? 'unavailable' : (addon.key === 'ai_marketing' && isBillingEnabled() ? marketingAccess(account, rows?.find(row => row.feature_key === addon.key)).active : activeAddon(addon.key, rows?.find(row => row.feature_key === addon.key))) ? 'active' : 'inactive';
        addons.push({
          ...addon,
          pricing: price ? { state: 'configured', ...price } : addon.pricing,
          entitlement,
          trial_included: addon.key === 'ai_marketing' && account?.plan === 'trial' && entitlement === 'active',
          generation_allowance: addon.key === 'ai_marketing' ? (account?.plan === 'trial' ? 10 : 100) : null,
          purchasable: Boolean(auth.role === 'owner' && addon.status === 'available' && price && recurringAccountReady(account, entitlements) && entitlement !== 'active'),
          cancellable: Boolean(auth.role === 'owner' && entitlement === 'active' && rows?.find(row => row.feature_key === addon.key)?.source === 'stripe')
        });
      }
      return res.status(200).json({ addons, can_manage: auth.role === 'owner', base_plan: entitlements?.plan || null, base_plan_active: Boolean(entitlements?.active) });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const addon = validateAddonRequest(req.body);
    if (addon.status === 'coming_soon') return res.status(409).json({ error: 'This feature is coming soon' });
    if (!addonStripePriceId(addon.key) || !stripeConfigured()) return res.status(409).json({ error: 'Pricing for this add-on has not been configured and approved yet' });
    const price = await addonPriceDetails(addon.key);
    if (!price) return res.status(409).json({ error: 'Pricing for this add-on has not been configured and approved yet' });
    const [rows, account, entitlements] = await Promise.all([getAddonEntitlements(auth.businessId), getBillingAccount(auth.businessId), getBusinessEntitlements(auth.businessId)]);
    if (!recurringAccountReady(account, entitlements)) return res.status(409).json({ error: 'An active Starter, Pro or Business subscription is required for paid add-ons' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (body.action === 'purchase') {
      const existing = rows?.find(row => row.feature_key === addon.key);
      if (activeAddon(addon.key, existing)) return res.status(409).json({ error: 'This add-on is already active' });
      await addSubscriptionAddon(account.stripe_subscription_id, addon.key);
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'addon.purchase_requested', resourceType: 'feature_entitlement', resourceId: addon.key, metadata: {} });
      return res.status(202).json({ pending: true, message: 'Stripe is updating the subscription. Access will activate after the verified webhook arrives.' });
    }
    if (body.action === 'cancel') {
      const existing = rows?.find(row => row.feature_key === addon.key);
      if (!activeAddon(addon.key, existing) || existing?.source !== 'stripe') return res.status(409).json({ error: 'This Stripe add-on is not active' });
      await removeSubscriptionAddon(account.stripe_subscription_id, addon.key);
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'addon.cancellation_requested', resourceType: 'feature_entitlement', resourceId: addon.key, metadata: {} });
      return res.status(202).json({ pending: true, message: 'Stripe is updating the subscription. Your already-paid Marketing access continues until the end of this billing period. No further Marketing charge will renew.' });
    }
    return res.status(400).json({ error: 'Invalid additional feature request' });
  } catch (error) {
    const status = [400, 403, 409].includes(error?.status) ? error.status : 503;
    return res.status(status).json({ error: status === 503 ? 'Additional features are temporarily unavailable' : error.message });
  }
}
