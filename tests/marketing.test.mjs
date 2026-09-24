import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import addonsHandler from '../lib/addons-handler.js';
import marketingHandler from '../lib/marketing-handler.js';
import { activeAddon, addonDefinition } from '../lib/addons.js';
import { validateMarketingInput, validateMarketingOutput, MARKETING_SYSTEM_PROMPT } from '../lib/marketing.js';
const savedEnv = { ...process.env }, originalFetch = globalThis.fetch;
afterEach(() => { process.env = { ...savedEnv }; globalThis.fetch = originalFetch; });
const input = { content_type: 'social_post', platform: 'facebook', tone: 'friendly', prompt: 'Promote our repairs' };
const output = { main_copy: 'Explore our repair service.', short_alternative: 'Repairs from Acme.', call_to_action: 'Ask us about repairs.', hashtags: ['#Repairs'], missing_information: [] };
const response = (body, ok = true) => ({ ok, status: ok ? 200 : 500, text: async () => JSON.stringify(body), json: async () => body });
const res = () => ({ statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
function setup({ entitled = true, role = 'owner', reservation = { allowed: true, id: 'generation-a' }, model = output, authValid = true } = {}) {
  Object.assign(process.env, { TENANCY_AUTH_ENABLED: 'true', SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'fake-service-key', OPENAI_API_KEY: 'fake-provider-key' });
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/v1/user')) return response({ id: 'user-a' }, authValid);
    if (url.includes('business_memberships')) return response([{ business_id: 'business-a', role }]);
    if (url.includes('business_feature_entitlements')) return response(entitled ? [{ feature_key: 'ai_marketing', status: 'active' }] : []);
    if (url.includes('business_settings')) return response([{ business_name: 'Acme', services: 'Repairs', opening_hours: 'Monday 9–5' }]);
    if (url.includes('business_configurations')) return response([{ description: 'Local repairs', faqs: [{ question: 'Area?', answer: 'York' }] }]);
    if (url.includes('rpc/reserve_marketing_generation')) return response(reservation);
    if (url.startsWith('https://api.openai.com')) return response({ id: 'response-a', output_text: typeof model === 'string' ? model : JSON.stringify(model), usage: { input_tokens: 150, output_tokens: 100 } });
    if (url.includes('marketing_generations') || url.includes('business_audit_events')) return response(null);
    throw new Error(`Unexpected request: ${url}`);
  };
  return calls;
}
async function call(handler, { method = 'POST', body = input, query = {}, token = true } = {}) {
  const result = res();
  await handler({ method, body, query, headers: token ? { authorization: 'Bearer verified' } : {} }, result);
  return result;
}
for (const [name, handler] of [['add-ons', addonsHandler], ['marketing', marketingHandler]]) {
  test(`${name}: unauthenticated access is rejected`, async () => { setup(); assert.equal((await call(handler, { token: false })).statusCode, 401); });
  test(`${name}: invalid token is rejected`, async () => { setup({ authValid: false }); assert.equal((await call(handler)).statusCode, 401); });
  test(`${name}: legacy auth-disabled mode fails closed`, async () => { const calls = setup(); process.env.TENANCY_AUTH_ENABLED = 'false'; assert.equal((await call(handler)).statusCode, 503); assert.equal(calls.length, 0); });
  test(`${name}: tenant query is rejected`, async () => { const calls = setup(); assert.equal((await call(handler, { method: name === 'add-ons' ? 'GET' : 'POST', query: { business_id: 'business-b' } })).statusCode, 400); assert.ok(calls.every(c => !c.url.includes('business-b'))); });
}
test('add-on catalogue returns only membership-scoped entitlement and safe pricing', async () => {
  const calls = setup(); const result = await call(addonsHandler, { method: 'GET' });
  assert.equal(result.statusCode, 200); assert.equal(result.body.addons[0].entitlement, 'active'); assert.equal(result.body.addons[1].entitlement, 'unavailable');
  assert.ok(result.body.addons.every(a => !a.purchasable)); assert.equal(result.body.addons[0].pricing.amount,1999); assert.equal(result.body.addons[1].pricing.amount,null);
  assert.ok(calls.find(c => c.url.includes('business_feature_entitlements?business_id=eq.business-a')));
  assert.doesNotMatch(JSON.stringify(result.body), /stripe_price|service-key/);
});
for (const key of ['unknown', '__proto__', 'constructor']) test(`unknown add-on ${key} rejected`, async () => { setup(); assert.equal((await call(addonsHandler, { body: { action: 'purchase', key } })).statusCode, 400); assert.throws(() => addonDefinition(key)); });
for (const extra of [{ active: true }, { status: 'active' }, { status: 'invalid' }, { business_id: 'business-b' }, { price: 1 }, { price_id: 'price_fake' }, { stripe_price_id: 'price_fake' }, { amount: 1 }]) test(`client cannot grant or price entitlement: ${Object.keys(extra)[0]}=${Object.values(extra)[0]}`, async () => {
  const calls = setup(); assert.equal((await call(addonsHandler, { body: { action: 'purchase', key: 'ai_marketing', ...extra } })).statusCode, 400);
  assert.equal(calls.filter(c => c.options.method === 'POST').length, 0);
});
for (const key of ['ai_marketing', 'ai_phone']) test(`${key} cannot start unconfigured checkout`, async () => { const calls = setup(); assert.equal((await call(addonsHandler, { body: { action: 'purchase', key } })).statusCode, 409); assert.ok(calls.every(c => !c.url.includes('stripe'))); });
for (const role of ['admin', 'member']) test(`${role} can read add-ons but cannot manage purchases`, async () => { setup({ role }); assert.equal((await call(addonsHandler, { method: 'GET' })).statusCode, 200); assert.equal((await call(addonsHandler, { body: { action: 'purchase', key: 'ai_marketing' } })).statusCode, 403); });
test('inactive, expired and coming-soon entitlements cannot grant access', () => {
  assert.equal(activeAddon('ai_marketing', { status: 'active', expires_at: '2000-01-01' }), false);
  assert.equal(activeAddon('ai_marketing', { status: 'inactive' }), false);
  assert.equal(activeAddon('ai_phone', { status: 'active' }), false);
});
test('no entitlement prevents context reads, reservations and AI calls', async () => { const calls = setup({ entitled: false }); assert.equal((await call(marketingHandler)).statusCode, 403); assert.ok(calls.every(c => !/business_settings|openai|reserve_marketing/.test(c.url))); });
for (const role of ['owner', 'admin', 'member']) test(`entitled ${role} generates using only own business context`, async () => {
  const calls = setup({ role }); const result = await call(marketingHandler);
  assert.equal(result.statusCode, 200); assert.deepEqual(result.body.output, output);
  const storageReads = calls.filter(c => /business_settings|business_configurations|business_feature_entitlements/.test(c.url));
  assert.ok(storageReads.every(c => c.url.includes('business_id=eq.business-a')));
  const reserve = JSON.parse(calls.find(c => c.url.includes('rpc/')).options.body); assert.equal(reserve.p_business_id, 'business-a'); assert.equal(reserve.p_actor_user_id, 'user-a');
  const modelCall = JSON.parse(calls.find(c => c.url.includes('api.openai.com')).options.body);
  const context = JSON.parse(modelCall.input); assert.equal(context['TRUSTED BUSINESS FACTS'].business_name, 'Acme'); assert.equal(context['TRUSTED BUSINESS FACTS'].faqs[0].answer, 'York');
  assert.equal(context['TRUSTED BUSINESS FACTS'].price, undefined); assert.equal(modelCall.max_output_tokens, 2200); assert.equal(modelCall.store, false);
  assert.ok(calls.find(c => c.url.includes('marketing_generations?id=eq.generation-a&business_id=eq.business-a')));
});
for (const [key, value] of [['business_id','business-b'], ['content_type','invalid'], ['platform','tiktok'], ['tone','invalid'], ['prompt','x'.repeat(2001)], ['extra_instructions','x'.repeat(1001)], ['active',true]]) test(`marketing rejects invalid ${key}`, async () => {
  const calls = setup(); assert.equal((await call(marketingHandler, { body: { ...input, [key]: value } })).statusCode, 400); assert.ok(calls.every(c => !c.url.includes('openai')));
});
for (const value of [null, [], '{', 'x'.repeat(12001), { ...input, prompt: '   ' }]) test(`marketing body validation rejects ${typeof value === 'string' ? value.slice(0, 10) : JSON.stringify(value)}`, () => assert.throws(() => validateMarketingInput(value)));
test('rapid duplicates and quota failures return 429 before provider call', async () => { const calls = setup({ reservation: { allowed: false, reason: 'rate_limit' } }); const result = await call(marketingHandler); assert.equal(result.statusCode, 429); assert.equal(result.headers['Retry-After'], '60'); assert.ok(calls.every(c => !c.url.includes('openai'))); });
test('entitlement revoked at reservation is denied', async () => { const calls = setup({ reservation: { allowed: false, reason: 'entitlement' } }); assert.equal((await call(marketingHandler)).statusCode, 403); assert.ok(calls.every(c => !c.url.includes('openai'))); });
test('explicit one-generation facts stay separate and never update knowledge', async () => {
  const calls = setup(); assert.equal((await call(marketingHandler, { body: { ...input, prompt: 'Create a 20% discount post' } })).statusCode, 200);
  const context = JSON.parse(JSON.parse(calls.find(c => c.url.includes('openai')).options.body).input);
  assert.match(context['OWNER REQUEST'].prompt, /20%/); assert.doesNotMatch(JSON.stringify(context['TRUSTED BUSINESS FACTS']), /20%/);
  assert.ok(calls.filter(c => /business_settings|business_configurations/.test(c.url)).every(c => !c.options.method));
  assert.match(MARKETING_SYSTEM_PROMPT, /Never invent prices/); assert.match(MARKETING_SYSTEM_PROMPT, /not permanent business knowledge/);
});
for (const bad of ['not json', { ...output, main_copy: null }, { ...output, secret: 'bad' }, { ...output, hashtags: Array(13).fill('#bad') }]) test(`malformed model output handled safely: ${JSON.stringify(bad).slice(0, 35)}`, async () => {
  const calls = setup({ model: bad }); const result = await call(marketingHandler); assert.equal(result.statusCode, 502); assert.equal(result.body.output, undefined);
  const saved = calls.filter(c => c.url.includes('marketing_generations')); assert.equal(JSON.parse(saved[0].options.body).status, 'failed');
});
test('output bounds reject excessive generated text', () => assert.throws(() => validateMarketingOutput({ ...output, main_copy: 'x'.repeat(5001) })));
test('provider failure returns safe error and retains failed reservation', async () => {
  const calls = setup(); const base = globalThis.fetch; globalThis.fetch = async (url, options) => url.includes('openai') ? response({ secret: 'must not leak' }, false) : base(url, options);
  const result = await call(marketingHandler); assert.equal(result.statusCode, 502); assert.doesNotMatch(JSON.stringify(result.body), /must not leak/); assert.ok(calls.some(c => c.url.includes('marketing_generations')));
});
