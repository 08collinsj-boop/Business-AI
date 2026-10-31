import test from 'node:test';
import assert from 'node:assert/strict';

// Fictional handover data; synthetic Supabase replies intentionally contradict
// a correctly tenant-filtered service request. No real JWT/DB/lead data used.
const BUSINESS = '11111111-1111-4111-8111-111111111111';
const FOREIGN = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';
const ID = '44444444-4444-4444-8444-444444444444';
const OTHER_ID = '55555555-5555-4555-8555-555555555555';
const own = { id: ID, business_id: BUSINESS, lead_id: 4, status: 'requires_attention', summary: 'Fictional human handover' };
const reply = data => ({ ok: true, status: 200, text: async () => JSON.stringify(data), json: async () => data });
const response = () => ({ code: 0, body: null, status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; } });

async function simulate(t, { method = 'GET', returned = [], legacy = false, status = 'acknowledged' } = {}) {
  const env = { SUPABASE_URL: 'https://mvwseobgkexzpmmkgcxe.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-only',
    TENANCY_AUTH_ENABLED: 'true', COLZO_SCOPED_PILOT_ACCESS: 'false',
    VERCEL_ENV: legacy ? 'production' : 'preview',
    VERCEL_GIT_COMMIT_REF: 'fix/colzo-pilot-release-gates-20261026' };
  const oldEnv = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  const oldFetch = globalThis.fetch;
  Object.assign(process.env, env);
  const calls = [];
  globalThis.fetch = async (input, opts = {}) => {
    const url = new URL(String(input));
    const verb = opts.method || 'GET';
    const patch = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ path: url.pathname, verb, query: url.searchParams, patch });
    if (url.pathname === '/auth/v1/user') return reply({ id: USER });
    if (url.pathname === '/rest/v1/business_memberships') return reply([{ business_id: BUSINESS, role: 'member' }]);
    if (url.pathname === '/rest/v1/lead_handovers') {
      if (typeof returned === 'function') return reply(returned(patch));
      return reply(returned);
    }
    if (url.pathname === '/rest/v1/business_audit_events') return reply([{ id: 9 }]);
    throw new Error('Unexpected synthetic route: ' + url.pathname);
  };
  t.after(() => {
    globalThis.fetch = oldFetch;
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const { default: handler } = await import('../lib/handover-handler.js?work-tenant-confirmation=' + Math.random());
  const res = response();
  await handler({ method, headers: { authorization: 'Bearer synthetic-user' }, query: {},
    body: method === 'PATCH' ? { id: ID, status } : null }, res);
  return { res, calls };
}

test('handover GET returns authenticated tenant records and preserves normal empty list', async t => {
  const a = await simulate(t, { returned: [own] });
  assert.equal(a.res.code, 200);
  assert.deepEqual(a.res.body, [own]);
  const scope = a.calls.find(x => x.path === '/rest/v1/lead_handovers');
  assert.equal(scope.query.get('business_id'), 'eq.' + BUSINESS);
});

test('handover GET returns genuine empty list', async t => {
  const { res } = await simulate(t, { returned: [] });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, []);
});

for (const [label, returned] of [
  ['foreign tenant', [{ ...own, business_id: FOREIGN }]],
  ['mixed tenants', [own, { ...own, id: OTHER_ID, business_id: FOREIGN }]],
  ['missing business id', [{ id: ID, summary: 'Unsourced fictional data' }]],
  ['nonarray null result', null],
  ['object-shaped result', { records: [] }]
]) {
  test('handover GET refuses ' + label + ' instead of disclosing data or false empty result', async t => {
    const { res, calls } = await simulate(t, { returned });
    assert.equal(res.code, 500);
    assert.doesNotMatch(JSON.stringify(res.body), /Fictional human handover|Unsourced fictional data/);
    assert.ok(calls.every(x => x.verb === 'GET'));
  });
}

const correct = patch => ({ ...own, ...patch });
test('handover PATCH confirms own tenant, id, status and actor before success audit', async t => {
  const { res, calls } = await simulate(t, { method: 'PATCH', returned: patch => [correct(patch)] });
  assert.equal(res.code, 200);
  assert.equal(res.body.id, ID);
  assert.equal(res.body.status, 'acknowledged');
  assert.equal(calls.filter(x => x.path === '/rest/v1/business_audit_events').length, 1);
  const request = calls.find(x => x.path === '/rest/v1/lead_handovers');
  assert.equal(request.query.get('business_id'), 'eq.' + BUSINESS);
  assert.equal(request.query.get('id'), 'eq.' + ID);
});

for (const [label, returned] of [
  ['foreign tenant', patch => [{ ...correct(patch), business_id: FOREIGN }]],
  ['wrong id', patch => [{ ...correct(patch), id: OTHER_ID }]],
  ['missing status confirmation', patch => [{ ...own, acknowledged_by: patch.acknowledged_by }]],
  ['wrong reviewer actor', patch => [{ ...correct(patch), acknowledged_by: FOREIGN }]],
  ['second response row', patch => [correct(patch), { ...correct(patch), id: OTHER_ID }]],
  ['malformed null response', () => null]
]) {
  test('handover PATCH refuses ' + label + ' and never issues success audit', async t => {
    const { res, calls } = await simulate(t, { method: 'PATCH', returned });
    assert.equal(res.code, 500);
    assert.equal(calls.filter(x => x.path === '/rest/v1/business_audit_events').length, 0);
    assert.doesNotMatch(JSON.stringify(res.body), /Fictional human handover/);
  });
}

test('handover PATCH genuine no-row update returns not found and no audit', async t => {
  const { res, calls } = await simulate(t, { method: 'PATCH', returned: [] });
  assert.equal(res.code, 404);
  assert.equal(calls.filter(x => x.path === '/rest/v1/business_audit_events').length, 0);
});

test('legacy Production handover read behavior is preserved', async t => {
  const { res } = await simulate(t, { returned: null, legacy: true });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, []);
});
