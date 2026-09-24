import crypto from 'node:crypto';
import { addonError, addonStorage } from './addons.js';

const META_OAUTH_HOST = 'https://www.facebook.com';
const META_GRAPH_HOST = 'https://graph.facebook.com';
const SAFE_VERSION = /^v\d+\.\d+$/;
const SAFE_SCOPES = /^[a-z0-9_,]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function metaError(status, message, code = 'META_ERROR') {
  const error = addonError(status, message);
  error.code = code;
  return error;
}

function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch { return null; }
}

function encryptionKey() {
  const raw = String(process.env.META_TOKEN_ENCRYPTION_KEY || '').trim();
  if (!raw) return null;
  const candidates = [];
  if (/^[a-f0-9]{64}$/i.test(raw)) candidates.push(Buffer.from(raw, 'hex'));
  try { candidates.push(Buffer.from(raw, 'base64')); } catch {}
  return candidates.find(value => value.length === 32) || null;
}

export function metaConfiguration() {
  const version = String(process.env.META_GRAPH_API_VERSION || '').trim();
  const redirectUri = httpsUrl(process.env.META_REDIRECT_URI);
  const scopes = String(process.env.META_OAUTH_SCOPES || '').trim();
  const appId = String(process.env.META_APP_ID || '').trim();
  const appSecret = String(process.env.META_APP_SECRET || '').trim();
  const key = encryptionKey();
  const configured = Boolean(appId && appSecret && redirectUri && SAFE_VERSION.test(version) && SAFE_SCOPES.test(scopes) && scopes && key);
  return {
    configured,
    appId: configured ? appId : null,
    appSecret: configured ? appSecret : null,
    redirectUri: configured ? redirectUri : null,
    version: configured ? version : null,
    scopes: configured ? scopes.split(',').map(value => value.trim()).filter(Boolean) : [],
    key,
    publishEnabled: configured && process.env.META_PUBLISH_ENABLED === 'true'
  };
}

export function encryptMetaToken(token) {
  const config = metaConfiguration();
  if (!config.key || typeof token !== 'string' || token.length < 8 || token.length > 12000) throw metaError(503, 'Meta connection is not configured', 'META_NOT_CONFIGURED');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', config.key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return { token_ciphertext: ciphertext.toString('base64'), token_iv: iv.toString('base64'), token_tag: cipher.getAuthTag().toString('base64') };
}

export function decryptMetaToken(row) {
  const config = metaConfiguration();
  if (!config.key) throw metaError(503, 'Meta connection is not configured', 'META_NOT_CONFIGURED');
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', config.key, Buffer.from(row.token_iv, 'base64'));
    decipher.setAuthTag(Buffer.from(row.token_tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(row.token_ciphertext, 'base64')), decipher.final()]).toString('utf8');
  } catch { throw metaError(503, 'Meta connection needs to be reconnected', 'META_TOKEN_UNREADABLE'); }
}

export function createOAuthState() {
  const value = crypto.randomBytes(32).toString('base64url');
  return { value, hash: crypto.createHash('sha256').update(value).digest('hex') };
}

export function hashOAuthState(value) {
  return typeof value === 'string' && value.length >= 24 && value.length <= 200
    ? crypto.createHash('sha256').update(value).digest('hex')
    : null;
}

export function buildMetaOAuthUrl(state) {
  const config = metaConfiguration();
  if (!config.configured) throw metaError(503, 'Meta connection is not configured', 'META_NOT_CONFIGURED');
  const url = new URL(`/${config.version}/dialog/oauth`, META_OAUTH_HOST);
  url.searchParams.set('client_id', config.appId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', config.scopes.join(','));
  url.searchParams.set('response_type', 'code');
  return url.toString();
}

async function parseProviderResponse(response) {
  const raw = await response.text();
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) {
    const providerCode = body?.error?.code ? `META_${body.error.code}` : 'META_PROVIDER_ERROR';
    throw metaError(response.status >= 500 ? 502 : 400, 'Meta could not complete that request', providerCode);
  }
  return body;
}

async function metaFetch(path, { method = 'GET', token = null, body = null, timeout = 20000 } = {}) {
  const config = metaConfiguration();
  if (!config.configured) throw metaError(503, 'Meta connection is not configured', 'META_NOT_CONFIGURED');
  const url = new URL(`/${config.version}/${String(path || '').replace(/^\/+/, '')}`, META_GRAPH_HOST);
  const options = { method, signal: AbortSignal.timeout(timeout), headers: {} };
  if (token) options.headers.Authorization = `Bearer ${token}`;
  if (method === 'GET') {
    if (body) for (const [key, value] of Object.entries(body)) if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  } else {
    const form = new URLSearchParams();
    if (body) for (const [key, value] of Object.entries(body)) if (value !== undefined && value !== null) form.set(key, String(value));
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = form;
  }
  return parseProviderResponse(await fetch(url, options));
}

export async function exchangeMetaCode(code) {
  const config = metaConfiguration();
  if (!config.configured || typeof code !== 'string' || code.length < 4 || code.length > 2000) throw metaError(400, 'Invalid Meta authorisation response', 'META_INVALID_CODE');
  const short = await metaFetch('oauth/access_token', { body: { client_id: config.appId, client_secret: config.appSecret, redirect_uri: config.redirectUri, code } });
  if (!short?.access_token) throw metaError(502, 'Meta did not return an access token', 'META_TOKEN_MISSING');
  try {
    const long = await metaFetch('oauth/access_token', { body: { grant_type: 'fb_exchange_token', client_id: config.appId, client_secret: config.appSecret, fb_exchange_token: short.access_token } });
    return { accessToken: long?.access_token || short.access_token, expiresIn: Number(long?.expires_in || short?.expires_in) || null };
  } catch {
    return { accessToken: short.access_token, expiresIn: Number(short?.expires_in) || null };
  }
}

export async function inspectMetaIdentity(userToken) {
  const [profile, pages] = await Promise.all([
    metaFetch('me', { token: userToken, body: { fields: 'id' } }),
    metaFetch('me/accounts', { token: userToken, body: { fields: 'id,name,access_token,instagram_business_account{id,username}', limit: 100 } })
  ]);
  const accounts = [];
  for (const page of Array.isArray(pages?.data) ? pages.data : []) {
    if (!page?.id || !page?.access_token) continue;
    accounts.push({ platform: 'facebook', providerAccountId: String(page.id), displayName: String(page.name || 'Facebook Page').slice(0, 300), linkedPageProviderId: null, token: page.access_token });
    if (page.instagram_business_account?.id) accounts.push({ platform: 'instagram', providerAccountId: String(page.instagram_business_account.id), displayName: String(page.instagram_business_account.username || `${page.name || 'Instagram'} account`).slice(0, 300), linkedPageProviderId: String(page.id), token: page.access_token });
  }
  return { providerUserId: profile?.id ? String(profile.id) : null, accounts };
}

export async function metaConnectionStatus(businessId) {
  const config = metaConfiguration();
  const [connections, accounts] = await Promise.all([
    addonStorage(`marketing_meta_connections?business_id=eq.${encodeURIComponent(businessId)}&select=id,status,token_expires_at,scopes,connected_at,updated_at&limit=1`),
    addonStorage(`marketing_social_accounts?business_id=eq.${encodeURIComponent(businessId)}&select=id,platform,provider_account_id,display_name,linked_page_provider_id,selected,status,created_at,updated_at&order=platform.asc,display_name.asc&limit=100`)
  ]);
  const connection = connections?.[0] || null;
  const expired = Boolean(connection?.token_expires_at && Date.parse(connection.token_expires_at) <= Date.now());
  return {
    configured: config.configured,
    publish_enabled: config.publishEnabled,
    connected: connection?.status === 'connected' && !expired,
    needs_reauth: connection?.status === 'needs_reauth' || expired,
    token_expires_at: connection?.token_expires_at || null,
    scopes: Array.isArray(connection?.scopes) ? connection.scopes : [],
    accounts: Array.isArray(accounts) ? accounts : [],
    instagram_text_only_supported: false
  };
}

export async function storeMetaConnection({ businessId, actorUserId, accessToken, expiresIn, providerUserId, accounts, scopes }) {
  const encrypted = encryptMetaToken(accessToken);
  const expiry = Number(expiresIn) > 0 ? new Date(Date.now() + Number(expiresIn) * 1000).toISOString() : null;
  const rows = await addonStorage('marketing_meta_connections?on_conflict=business_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ business_id: businessId, connected_by: actorUserId, status: 'connected', ...encrypted, token_expires_at: expiry, scopes, provider_user_id: providerUserId, connected_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  });
  const connection = rows?.[0];
  if (!connection?.id) throw metaError(503, 'Meta connection could not be saved', 'META_STORAGE_ERROR');
  await addonStorage(`marketing_social_accounts?business_id=eq.${encodeURIComponent(businessId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  for (const account of accounts || []) {
    const tokenFields = encryptMetaToken(account.token);
    await addonStorage('marketing_social_accounts', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ business_id: businessId, connection_id: connection.id, platform: account.platform, provider_account_id: account.providerAccountId, display_name: account.displayName, linked_page_provider_id: account.linkedPageProviderId, ...tokenFields, selected: false, status: 'available' })
    });
  }
  return connection;
}

export async function selectMetaAccount(businessId, accountId) {
  if (!UUID.test(String(accountId || ''))) throw metaError(400, 'Invalid social account', 'META_INVALID_ACCOUNT');
  const rows = await addonStorage(`marketing_social_accounts?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(accountId)}&select=id,platform&limit=1`);
  const account = rows?.[0];
  if (!account) throw metaError(404, 'Social account not found', 'META_ACCOUNT_NOT_FOUND');
  await addonStorage(`marketing_social_accounts?business_id=eq.${encodeURIComponent(businessId)}&platform=eq.${encodeURIComponent(account.platform)}&selected=eq.true`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ selected: false, status: 'available', updated_at: new Date().toISOString() }) });
  const selected = await addonStorage(`marketing_social_accounts?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(accountId)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ selected: true, status: 'selected', updated_at: new Date().toISOString() }) });
  return selected?.[0] || null;
}

export async function disconnectMeta(businessId) {
  // Delete the connection rather than retaining revoked credentials. Accounts
  // cascade with it, so no recoverable provider token remains in storage.
  await addonStorage(`marketing_meta_connections?business_id=eq.${encodeURIComponent(businessId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
}

export async function selectedMetaAccount(businessId, platform) {
  const [connections, rows] = await Promise.all([
    addonStorage(`marketing_meta_connections?business_id=eq.${encodeURIComponent(businessId)}&select=status,token_expires_at&limit=1`),
    addonStorage(`marketing_social_accounts?business_id=eq.${encodeURIComponent(businessId)}&platform=eq.${encodeURIComponent(platform)}&selected=eq.true&status=eq.selected&select=id,platform,provider_account_id,display_name,linked_page_provider_id,token_ciphertext,token_iv,token_tag&limit=1`)
  ]);
  const connection = connections?.[0];
  if (!connection || connection.status !== 'connected' || (connection.token_expires_at && Date.parse(connection.token_expires_at) <= Date.now())) throw metaError(409, 'Reconnect Facebook before publishing', 'META_REAUTH_REQUIRED');
  if (!rows?.[0]) throw metaError(409, `Connect and select a ${platform === 'facebook' ? 'Facebook Page' : 'professional Instagram account'} first`, 'META_ACCOUNT_REQUIRED');
  return rows[0];
}

export async function publishMetaText({ platform, account, text }) {
  const config = metaConfiguration();
  if (!config.publishEnabled) throw metaError(503, 'Meta publishing is not enabled in this environment', 'META_PUBLISH_DISABLED');
  if (typeof text !== 'string' || !text.trim() || text.length > 10000) throw metaError(400, 'Invalid publication content', 'META_INVALID_CONTENT');
  if (platform === 'instagram') throw metaError(409, 'Instagram publishing requires a media asset and is not enabled for text-only Marketing drafts yet', 'META_MEDIA_REQUIRED');
  if (platform !== 'facebook') throw metaError(400, 'Unsupported publishing platform', 'META_PLATFORM_UNSUPPORTED');
  const token = decryptMetaToken(account);
  const result = await metaFetch(`${encodeURIComponent(account.provider_account_id)}/feed`, { method: 'POST', token, body: { message: text.trim() }, timeout: 30000 });
  if (!result?.id) throw metaError(502, 'Meta did not confirm the publication', 'META_POST_ID_MISSING');
  return { providerPostId: String(result.id) };
}
