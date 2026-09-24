import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const saved = { ...process.env };
const originalFetch = globalThis.fetch;
const businessId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const generationId = '33333333-3333-4333-8333-333333333333';
const accountId = '44444444-4444-4444-8444-444444444444';
const publicationId = '55555555-5555-4555-8555-555555555555';
const publicationRequestId = '66666666-6666-4666-8666-666666666666';
const response = (body, ok = true, status = ok ? 200 : 500) => ({
  ok, status,
  text: async () => typeof body === 'string' ? body : JSON.stringify(body),
  json: async () => body
});
const res = () => ({ statusCode: 0, body: null, headers: {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader(key, value) { this.headers[key] = value; }, end() { return this; } });

function baseEnv() {
  process.env.TENANCY_AUTH_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-key';
  process.env.META_APP_ID = 'app-id';
  process.env.META_APP_SECRET = 'app-secret';
  process.env.META_REDIRECT_URI = 'https://pilot.example.test/api/meta-callback';
  process.env.META_GRAPH_API_VERSION = 'v24.0';
  process.env.META_OAUTH_SCOPES = 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish';
  process.env.META_TOKEN_ENCRYPTION_KEY = '11'.repeat(32);
  process.env.PUBLIC_APP_URL = 'https://pilot.example.test';
}

function authFetch(role = 'owner', extra = async () => null) {
  return async (url, options = {}) => {
    const href = String(url);
    if (href.endsWith('/auth/v1/user')) return response({ id: userId, email: 'owner@example.test' });
    if (href.includes('business_memberships')) return response([{ business_id: businessId, role }]);
    const custom = await extra(href, options);
    return custom || response({}, false);
  };
}

test('Meta token encryption is authenticated, reversible with the server key, and fails closed without configuration', async () => {
  baseEnv();
  const meta = await import(new URL(`../lib/meta.js?crypto=${Math.random()}`, import.meta.url));
  const encrypted = meta.encryptMetaToken('EAAB-test-token-value');
  assert.notEqual(encrypted.token_ciphertext, 'EAAB-test-token-value');
  assert.equal(meta.decryptMetaToken(encrypted), 'EAAB-test-token-value');
  const altered = { ...encrypted, token_tag: Buffer.alloc(16).toString('base64') };
  assert.throws(() => meta.decryptMetaToken(altered), /reconnected/i);
  delete process.env.META_TOKEN_ENCRYPTION_KEY;
  assert.equal(meta.metaConfiguration().configured, false);
  assert.throws(() => meta.encryptMetaToken('EAAB-test-token-value'), /not configured/i);
});

test('Meta Graph requests keep access tokens out of URLs and use the Authorization header', async () => {
  baseEnv();
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const href = String(url);
    if (href.includes('/me/accounts')) return response({ data: [] });
    if (href.match(/\/me(?:\?|$)/)) return response({ id: 'meta-user-1' });
    return response({}, false);
  };
  const meta = await import(new URL(`../lib/meta.js?header=${Math.random()}`, import.meta.url));
  const result = await meta.inspectMetaIdentity('EAAB-sensitive-token-value');
  assert.equal(result.providerUserId, 'meta-user-1');
  assert.equal(calls.length, 2);
  for (const call of calls) {
    const requestUrl = new URL(call.url);
    assert.equal(requestUrl.searchParams.has('access_token'), false);
    assert.doesNotMatch(call.url, /EAAB-sensitive-token-value/i);
    assert.equal(call.options.headers.Authorization, 'Bearer EAAB-sensitive-token-value');
  }
});

test('expired Meta connections are reported as requiring reconnection', async () => {
  baseEnv();
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes('marketing_meta_connections')) return response([{ id: 'connection-1', status: 'connected', token_expires_at: new Date(Date.now() - 60000).toISOString(), scopes: [] }]);
    if (href.includes('marketing_social_accounts')) return response([]);
    return response({}, false);
  };
  const meta = await import(new URL(`../lib/meta.js?expired=${Math.random()}`, import.meta.url));
  const status = await meta.metaConnectionStatus(businessId);
  assert.equal(status.connected, false);
  assert.equal(status.needs_reauth, true);
});

test('Meta OAuth start stores only a hash of one-time state and never returns provider secrets', async () => {
  baseEnv();
  const writes = [];
  globalThis.fetch = authFetch('owner', async (href, options) => {
    if (href.includes('marketing_meta_oauth_states') && options.method === 'POST') { writes.push(JSON.parse(options.body)); return response({}, true, 201); }
    return null;
  });
  const handler = (await import(new URL(`../lib/meta-handler.js?oauth=${Math.random()}`, import.meta.url))).default;
  const out = res();
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, query: {}, body: { action: 'oauth_start' } }, out);
  assert.equal(out.statusCode, 200);
  const url = new URL(out.body.authorization_url);
  const rawState = url.searchParams.get('state');
  assert.ok(rawState?.length >= 24);
  assert.equal(writes.length, 1);
  assert.match(writes[0].state_hash, /^[a-f0-9]{64}$/);
  assert.notEqual(writes[0].state_hash, rawState);
  assert.equal(writes[0].business_id, businessId);
  assert.doesNotMatch(JSON.stringify(out.body), /app-secret|server-key|token_ciphertext|access_token/i);
});

test('Meta account selection is business scoped and rejects browser-supplied unknown fields', async () => {
  baseEnv();
  const calls = [];
  globalThis.fetch = authFetch('admin', async (href, options) => {
    calls.push({ href, options });
    if (href.includes('marketing_social_accounts') && href.includes(`id=eq.${accountId}`) && (!options.method || options.method === 'GET')) return response([{ id: accountId, platform: 'facebook' }]);
    if (href.includes('marketing_social_accounts') && options.method === 'PATCH') return response(href.includes(`id=eq.${accountId}`) ? [{ id: accountId, platform: 'facebook' }] : []);
    if (href.includes('business_audit_events')) return response({}, true, 201);
    return null;
  });
  const handler = (await import(new URL(`../lib/meta-handler.js?select=${Math.random()}`, import.meta.url))).default;
  let out = res();
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, query: {}, body: { action: 'select_account', account_id: accountId } }, out);
  assert.equal(out.statusCode, 200);
  assert.ok(calls.some(call => call.href.includes(`business_id=eq.${encodeURIComponent(businessId)}`) && call.href.includes(`id=eq.${accountId}`)));
  out = res();
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, query: {}, body: { action: 'select_account', account_id: accountId, page_id: 'attacker-controlled' } }, out);
  assert.equal(out.statusCode, 400);
});

test('Marketing publication requires an owner-approved draft and server-selected social account', async () => {
  baseEnv();
  const insertBodies = [];
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  globalThis.fetch = authFetch('owner', async (href, options) => {
    if (href.includes('business_feature_entitlements')) return response([{ feature_key: 'ai_marketing', status: 'active', source: 'manual', source_reference: null, expires_at: null }]);
    if (href.includes('marketing_generations')) {
      if (href.includes('approval_status=eq.approved')) return response([{ id: generationId, business_id: businessId, platform: 'facebook', approval_status: 'approved', approved_at: new Date().toISOString(), output: { main_copy: 'Approved post', short_alternative: '', call_to_action: 'Contact us', hashtags: ['#Local'], missing_information: [] } }]);
      return response([]);
    }
    if (href.includes('marketing_meta_connections') && (!options.method || options.method === 'GET')) return response([{ status: 'connected', token_expires_at: new Date(Date.now() + 86400000).toISOString() }]);
    if (href.includes('marketing_social_accounts') && href.includes('selected=eq.true')) return response([{ id: accountId, platform: 'facebook', provider_account_id: 'page-1', display_name: 'Page' }]);
    if (href.includes('/rest/v1/marketing_publications?on_conflict=business_id,idempotency_key') && options.method === 'POST') { const body = JSON.parse(options.body); insertBodies.push(body); return response([{ id: publicationId, ...body, attempts: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }], true, 201); }
    if (href.includes('business_audit_events')) return response({}, true, 201);
    return null;
  });
  const handler = (await import(new URL(`../lib/marketing-publication-handler.js?schedule=${Math.random()}`, import.meta.url))).default;
  let out = res();
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, query: {}, body: { action: 'schedule', generation_id: generationId, platform: 'facebook', scheduled_for: future, request_id: publicationRequestId } }, out);
  assert.equal(out.statusCode, 201);
  assert.equal(insertBodies[0].business_id, businessId);
  assert.equal(insertBodies[0].social_account_id, accountId);
  assert.match(insertBodies[0].idempotency_key, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(insertBodies[0], 'page_id'), false);
  out = res();
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, query: {}, body: { action: 'schedule', generation_id: generationId, platform: 'facebook', scheduled_for: future, request_id: publicationRequestId, page_id: 'fake' } }, out);
  assert.equal(out.statusCode, 400);
});


test('Marketing publication retries reuse the same durable job for one request ID', async () => {
  baseEnv();
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  let insertCalls = 0;
  globalThis.fetch = authFetch('owner', async (href, options) => {
    if (href.includes('business_feature_entitlements')) return response([{ feature_key: 'ai_marketing', status: 'active', source: 'manual', source_reference: null, expires_at: null }]);
    if (href.includes('marketing_generations') && href.includes('approval_status=eq.approved')) return response([{ id: generationId, business_id: businessId, platform: 'facebook', approval_status: 'approved', approved_at: new Date().toISOString(), output: { main_copy: 'Approved post', short_alternative: '', call_to_action: '', hashtags: [], missing_information: [] } }]);
    if (href.includes('marketing_meta_connections') && (!options.method || options.method === 'GET')) return response([{ status: 'connected', token_expires_at: new Date(Date.now() + 86400000).toISOString() }]);
    if (href.includes('marketing_social_accounts') && href.includes('selected=eq.true')) return response([{ id: accountId, platform: 'facebook', provider_account_id: 'page-1', display_name: 'Page' }]);
    if (href.includes('marketing_publications?on_conflict=business_id,idempotency_key') && options.method === 'POST') {
      insertCalls += 1;
      const body = JSON.parse(options.body);
      if (insertCalls === 1) return response([{ id: publicationId, ...body, attempts: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }], true, 201);
      return response([], true, 201);
    }
    if (href.includes('marketing_publications?business_id=eq.') && href.includes('idempotency_key=eq.')) return response([{ id: publicationId, business_id: businessId, generation_id: generationId, social_account_id: accountId, platform: 'facebook', status: 'scheduled', scheduled_for: future, attempts: 0 }]);
    if (href.includes('business_audit_events')) return response({}, true, 201);
    return null;
  });
  const handler = (await import(new URL(`../lib/marketing-publication-handler.js?idempotent=${Math.random()}`, import.meta.url))).default;
  const request = { method: 'POST', headers: { authorization: 'Bearer valid' }, query: {}, body: { action: 'schedule', generation_id: generationId, platform: 'facebook', scheduled_for: future, request_id: publicationRequestId } };
  let out = res(); await handler(request, out); assert.equal(out.statusCode, 201); assert.equal(out.body.publication.id, publicationId);
  out = res(); await handler(request, out); assert.equal(out.statusCode, 201); assert.equal(out.body.publication.id, publicationId);
  assert.equal(insertCalls, 2);
});


test('a lost publish-now response can be retried without creating or re-publishing a second job', async () => {
  baseEnv(); process.env.META_PUBLISH_ENABLED = 'true';
  const published = { id: publicationId, business_id: businessId, generation_id: generationId, social_account_id: accountId, platform: 'facebook', status: 'published', scheduled_for: new Date().toISOString(), published_at: new Date().toISOString(), provider_post_id: 'page-1_post-1', attempts: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  let publishCalls = 0;
  globalThis.fetch = authFetch('owner', async (href, options) => {
    if (href.includes('business_feature_entitlements')) return response([{ feature_key: 'ai_marketing', status: 'active', source: 'manual', source_reference: null, expires_at: null }]);
    if (href.includes('marketing_generations') && href.includes('approval_status=eq.approved')) return response([{ id: generationId, business_id: businessId, platform: 'facebook', approval_status: 'approved', approved_at: new Date().toISOString(), output: { main_copy: 'Approved post', short_alternative: '', call_to_action: '', hashtags: [], missing_information: [] } }]);
    if (href.includes('marketing_meta_connections') && (!options.method || options.method === 'GET')) return response([{ status: 'connected', token_expires_at: new Date(Date.now() + 86400000).toISOString() }]);
    if (href.includes('marketing_social_accounts') && href.includes('selected=eq.true')) return response([{ id: accountId, platform: 'facebook', provider_account_id: 'page-1', display_name: 'Page' }]);
    if (href.includes('marketing_publications?on_conflict=business_id,idempotency_key') && options.method === 'POST') return response([], true, 201);
    if (href.includes('marketing_publications?business_id=eq.') && href.includes('idempotency_key=eq.')) return response([published]);
    if (href.includes('rpc/claim_marketing_publication')) { publishCalls += 1; return response(null); }
    if (href.includes('business_audit_events')) return response({}, true, 201);
    return null;
  });
  const handler = (await import(new URL(`../lib/marketing-publication-handler.js?lost-response=${Math.random()}`, import.meta.url))).default;
  const out = res();
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, query: {}, body: { action: 'schedule', generation_id: generationId, platform: 'facebook', request_id: publicationRequestId } }, out);
  assert.equal(out.statusCode, 200);
  assert.equal(out.body.publication.status, 'published');
  assert.equal(out.body.publication.provider_post_id, 'page-1_post-1');
  assert.equal(publishCalls, 0);
});

test('Marketing publication blocks unapproved drafts before social publishing', async () => {
  baseEnv();
  globalThis.fetch = authFetch('owner', async (href) => {
    if (href.includes('business_feature_entitlements')) return response([{ feature_key: 'ai_marketing', status: 'active', source: 'manual', expires_at: null }]);
    if (href.includes('marketing_generations')) return response([]);
    return null;
  });
  const handler = (await import(new URL(`../lib/marketing-publication-handler.js?unapproved=${Math.random()}`, import.meta.url))).default;
  const out = res();
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, query: {}, body: { action: 'schedule', generation_id: generationId, platform: 'facebook', scheduled_for: new Date(Date.now() + 3600000).toISOString(), request_id: publicationRequestId } }, out);
  assert.equal(out.statusCode, 409);
  assert.equal(out.body.code, 'APPROVAL_REQUIRED');
});

test('ambiguous Meta publication failures are intentionally not automatically retryable', async () => {
  const source = await readFile(new URL('../lib/marketing-publication-handler.js', import.meta.url), 'utf8');
  const publicationSource = await readFile(new URL('../lib/marketing-publication.js', import.meta.url), 'utf8');
  assert.match(source, /META_AMBIGUOUS_RESULT/);
  assert.match(source, /Check the connected Page before retrying/i);
  assert.match(publicationSource, /avoid a duplicate post/i);
  assert.match(publicationSource, /approval_status=eq\.approved/);
  assert.match(publicationSource, /selected=eq\.true/);
});

test.after(() => {
  for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
  Object.assign(process.env, saved);
  globalThis.fetch = originalFetch;
});
