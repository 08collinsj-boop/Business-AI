import { getBillingAccount, isBillingEnabled } from './billing.js';
// Static definitions are server-owned; business rows store only entitlement state.
export const ADDONS = Object.freeze({
  ai_marketing: Object.freeze({ key: 'ai_marketing', name: 'AI Marketing', description: 'Create business-aware social content, save and edit posts, and connect your social accounts for publishing and scheduling.', status: 'available', pricing: Object.freeze({ state: 'approved', amount: 1999, currency: 'GBP', interval: 'month' }) }),
  ai_phone: Object.freeze({ key: 'ai_phone', name: 'AI Phone Calls', description: 'Future AI phone and receptionist capability.', status: 'coming_soon', pricing: Object.freeze({ state: 'unavailable', amount: null, currency: 'GBP', interval: null }) })
});
export const addonError = (status, message) => Object.assign(new Error(message), { status });
export async function addonStorage(path, options = {}) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw addonError(503, 'Additional features are temporarily unavailable');
  const response = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/${path}`, { ...options, headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}`, ...options.headers }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw addonError(503, 'Additional features are temporarily unavailable');
  const raw = await response.text();
  return raw ? JSON.parse(raw) : null;
}
export function addonDefinition(key) {
  if (typeof key !== 'string' || !Object.hasOwn(ADDONS, key)) throw addonError(400, 'Unknown additional feature');
  return ADDONS[key];
}
export function activeAddon(key, row, now = Date.now()) {
  return addonDefinition(key).status === 'available' && row?.status === 'active' && (!row.expires_at || Date.parse(row.expires_at) > now);
}
export async function getAddonEntitlements(businessId) {
  return addonStorage(`business_feature_entitlements?business_id=eq.${encodeURIComponent(businessId)}&select=feature_key,status,source,source_reference,expires_at&limit=100`);
}
export function marketingAccess(account, row, now = Date.now()) {
  const trial = account?.plan === 'trial';
  const start = trial ? account?.trial_started_at : account?.current_period_started_at;
  const end = trial ? account?.trial_expires_at : account?.current_period_ends_at;
  const baseActive = Boolean(account?.status === 'active' && Date.parse(start) <= now && Date.parse(end) > now);
  const active = baseActive && (trial ? account?.trial_purchased === true : ['starter','pro','business'].includes(account?.plan) && activeAddon('ai_marketing', row, now));
  return { active, allowance: trial ? 10 : 100, periodStartedAt: start || null, periodEndsAt: end || null, trial };
}
export async function requireAddon(businessId, key) {
  addonDefinition(key);
  const rows = await getAddonEntitlements(businessId);
  const row = rows?.find(row => row.feature_key === key);
  const active = key === 'ai_marketing' && isBillingEnabled()
    ? marketingAccess(await getBillingAccount(businessId), row).active
    : activeAddon(key, row);
  if (!active) throw addonError(403, 'AI Marketing is locked. An active base plan and Marketing access are required.');
}
export function validateAddonRequest(value) {
  let body;
  try { body = typeof value === 'string' ? JSON.parse(value) : value; } catch { throw addonError(400, 'Invalid additional feature request'); }
  if (!body || Array.isArray(body) || Object.keys(body).some(key => !['action', 'key'].includes(key)) || !['purchase','cancel'].includes(body.action)) throw addonError(400, 'Invalid additional feature request');
  return addonDefinition(body.key);
}


export function addonStripePriceId(key) {
  const names = { ai_marketing: 'STRIPE_PRICE_ADDON_AI_MARKETING' };
  return names[key] ? process.env[names[key]] || null : null;
}

export function addonFromStripePrice(priceId) {
  if (!priceId) return null;
  return Object.keys(ADDONS).find(key => addonStripePriceId(key) === priceId) || null;
}

export async function syncStripeAddonEntitlements({ businessId, subscription, enabled = true, eventCreatedAt = null }) {
  const configuredKeys = Object.keys(ADDONS).filter(key => ADDONS[key].status === 'available' && addonStripePriceId(key));
  if (!configuredKeys.length) return;
  const periodEnd = Number(subscription?.current_period_end) > 0 ? new Date(Number(subscription.current_period_end) * 1000).toISOString() : null;
  const items = Array.isArray(subscription?.items?.data) ? subscription.items.data : [];
  const present = new Map();
  for (const item of items) {
    const key = addonFromStripePrice(item?.price?.id);
    if (key && item?.id) present.set(key, item.id);
  }
  const existingRows = await getAddonEntitlements(businessId);
  for (const key of configuredKeys) {
    const itemId = present.get(key) || null;
    const existing = existingRows?.find(row => row.feature_key === key);
    if (!itemId && existing?.source !== 'stripe') continue; // never overwrite a manual Pilot entitlement
    // Cancellation removes future charges without refunding the already-paid period.
    const retained = enabled && !itemId && existing?.source === 'stripe' && activeAddon(key, existing);
    const active = Boolean(enabled && ((itemId && periodEnd) || retained));
    const expiresAt = retained ? existing.expires_at : periodEnd || new Date().toISOString();
    if (eventCreatedAt) {
      await addonStorage('rpc/sync_marketing_entitlement_from_stripe', { method: 'POST', body: JSON.stringify({
        p_business_id: businessId, p_event_created_at: eventCreatedAt,
        p_item_id: itemId, p_period_end: periodEnd, p_enabled: enabled
      }) });
      continue;
    }
    await addonStorage('business_feature_entitlements?on_conflict=business_id,feature_key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ business_id: businessId, feature_key: key, status: active ? 'active' : 'inactive', source: 'stripe', source_reference: itemId || existing?.source_reference || `subscription:${String(subscription?.id || 'unknown').slice(0, 170)}`, expires_at: expiresAt, updated_at: new Date().toISOString() })
    });
  }
}

export async function deactivateStripeAddonEntitlements(businessId, eventCreatedAt = null) {
  if (eventCreatedAt) return addonStorage('rpc/sync_marketing_entitlement_from_stripe', { method: 'POST', body: JSON.stringify({ p_business_id: businessId, p_event_created_at: eventCreatedAt, p_item_id: null, p_period_end: null, p_enabled: false }) });
  await addonStorage(`business_feature_entitlements?business_id=eq.${encodeURIComponent(businessId)}&source=eq.stripe`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'inactive', expires_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  });
}
