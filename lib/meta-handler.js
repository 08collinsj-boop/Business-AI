import { requireBusinessMember, sendAuthError } from './auth.js';
import { addonStorage } from './addons.js';
import { recordAuditEvent } from './audit.js';
import {
  buildMetaOAuthUrl,
  createOAuthState,
  disconnectMeta,
  exchangeMetaCode,
  hashOAuthState,
  inspectMetaIdentity,
  metaConfiguration,
  metaConnectionStatus,
  metaError,
  selectMetaAccount,
  storeMetaConnection
} from './meta.js';

function parse(value) {
  try {
    const body = typeof value === 'string' ? JSON.parse(value) : value || {};
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch { return null; }
}

function appOrigin() {
  for (const value of [process.env.PUBLIC_APP_URL, process.env.BILLING_APP_URL]) {
    try { const url = new URL(value); if (url.protocol === 'https:') return url.origin; } catch {}
  }
  return null;
}

function redirect(res, status) {
  const origin = appOrigin();
  if (!origin) return res.status(status === 'connected' ? 200 : 400).json({ connected: status === 'connected' });
  res.statusCode = 302;
  res.setHeader('Location', `${origin}/?meta=${encodeURIComponent(status)}`);
  return res.end?.();
}

async function callback(req, res) {
  const state = typeof req.query?.state === 'string' ? req.query.state : '';
  const code = typeof req.query?.code === 'string' ? req.query.code : '';
  const hash = hashOAuthState(state);
  if (!hash || !code || req.query?.error) return redirect(res, 'error');
  try {
    const now = new Date().toISOString();
    const claimed = await addonStorage(`marketing_meta_oauth_states?state_hash=eq.${encodeURIComponent(hash)}&used_at=is.null&expires_at=gt.${encodeURIComponent(now)}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ used_at: now })
    });
    const row = claimed?.[0];
    if (!row?.business_id || !row?.actor_user_id) return redirect(res, 'error');
    const token = await exchangeMetaCode(code);
    const identity = await inspectMetaIdentity(token.accessToken);
    const config = metaConfiguration();
    await storeMetaConnection({
      businessId: row.business_id,
      actorUserId: row.actor_user_id,
      accessToken: token.accessToken,
      expiresIn: token.expiresIn,
      providerUserId: identity.providerUserId,
      accounts: identity.accounts,
      scopes: config.scopes
    });
    await recordAuditEvent({ businessId: row.business_id, actorUserId: row.actor_user_id, action: 'marketing.meta_connected', resourceType: 'marketing_connection', resourceId: 'meta', metadata: { account_count: identity.accounts.length } });
    return redirect(res, 'connected');
  } catch {
    return redirect(res, 'error');
  }
}

export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  if (req.method === 'GET' && req.query?.callback === '1') return callback(req, res);
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  let auth;
  try { auth = await requireBusinessMember(req, req.method === 'POST' ? ['owner', 'admin'] : null); }
  catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: 'Authenticated business access is required' });
  try {
    if (req.method === 'GET') return res.status(200).json(await metaConnectionStatus(auth.businessId));
    const body = parse(req.body);
    if (!body || Object.keys(body).some(key => !['action', 'account_id'].includes(key))) return res.status(400).json({ error: 'Invalid Meta request' });
    if (body.action === 'oauth_start') {
      const config = metaConfiguration();
      if (!config.configured) return res.status(503).json({ error: 'Meta connection is not configured for this environment' });
      const state = createOAuthState();
      await addonStorage('marketing_meta_oauth_states', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ state_hash: state.hash, business_id: auth.businessId, actor_user_id: auth.userId, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() })
      });
      return res.status(200).json({ authorization_url: buildMetaOAuthUrl(state.value) });
    }
    if (body.action === 'select_account') {
      const selected = await selectMetaAccount(auth.businessId, body.account_id);
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'marketing.meta_account_selected', resourceType: 'marketing_account', resourceId: selected?.id || '', metadata: { platform: selected?.platform || 'unknown' } });
      return res.status(200).json({ selected: true });
    }
    if (body.action === 'disconnect') {
      await disconnectMeta(auth.businessId);
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'marketing.meta_disconnected', resourceType: 'marketing_connection', resourceId: 'meta', metadata: {} });
      return res.status(200).json({ disconnected: true });
    }
    return res.status(400).json({ error: 'Invalid Meta request' });
  } catch (error) {
    const status = [400, 404, 409, 502, 503].includes(error?.status) ? error.status : 503;
    const message = error?.code === 'META_NOT_CONFIGURED' ? 'Meta connection is not configured for this environment' : error?.message || 'Meta connection is temporarily unavailable';
    return res.status(status).json({ error: message, code: error?.code || 'META_ERROR' });
  }
}
