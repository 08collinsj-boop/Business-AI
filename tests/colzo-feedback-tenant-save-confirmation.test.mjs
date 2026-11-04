import test from 'node:test';
import assert from 'node:assert/strict';

// Fictional upstream responses are deliberately inconsistent with tenant-scoped
// PostgREST filters. No genuine Auth token, provider request or business data.
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';
const FEEDBACK = '44444444-4444-4444-8444-444444444444';
const reply = data => ({ ok: true, status: 200, text: async () => JSON.stringify(data), json: async () => data });
const response = () => ({
  code: 0, body: null, setHeader() {},
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; }
});
const input = { category: 'bug', title: 'Fictional case', page: 'bookings', message: 'Fictional save did not persist', app_version: 'qa' };
const own = { id: FEEDBACK, business_id: A, actor_user_id: USER, ...input, status: 'new' };

async function run(t, { method = 'GET', returned = [], body = null, legacy = false } = {}) {
  const env = {
    TENANCY_AUTH_ENABLED: 'true', SUPABASE_URL: 'https://mvwseobgkexzpmmkgcxe.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'fictional-only-not-a-credential',
    COLZO_SCOPED_PILOT_ACCESS: 'false',
    VERCEL_ENV: legacy ? 'production' : 'preview',
    VERCEL_GIT_COMMIT_REF: 'fix/colzo-pilot-release-gates-20261026'
  };
  const before = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  const fetchBefore = globalThis.fetch;
  Object.assign(process.env, env);
  const requests = [];
  globalThis.fetch = async (input, opts = {}) => {
    const url = new URL(String(input));
    const verb = opts.method || 'GET';
    requests.push({ path: url.pathname, method: verb, params: url.searchParams, payload: opts.body ? JSON.parse(opts.body) : null });
    if (url.pathname === '/auth/v1/user') return reply({ id: USER });
    if (url.pathname === '/rest/v1/business_memberships') return reply([{ business_id: A, role: 'owner' }]);
    if (url.pathname === '/rest/v1/pilot_feedback') return reply(returned);
    if (url.pathname === '/rest/v1/business_audit_events') return reply([{ id: 7 }]);
    throw new Error('Unexpected mocked route ' + url.pathname);
  };
  t.after(() => {
    globalThis.fetch = fetchBefore;
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const { default: handler } = await import('../lib/feedback-handler.js?pilot-feedback-boundary=' + Math.random());
  const res = response();
  await handler({
    method, headers: { authorization: 'Bearer fictional-qa-token' },
    query: {}, body: method === 'POST' ? input : method === 'PATCH' ? { feedback_id: FEEDBACK, status: 'reviewed', ...body } : null
  }, res);
  return { res, requests };
}

test('feedback GET keeps genuine owner tenant rows and does not expose provenance column', async t => {
  const { res, requests } = await run(t, { returned: [own] });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.feedback, [{
    id: FEEDBACK, category: input.category, title: input.title,
    page: input.page, message: input.message, app_version: input.app_version, status: 'new'
  }]);
  const query = requests.find(x => x.path === '/rest/v1/pilot_feedback');
  assert.equal(query.params.get('business_id'), 'eq.' + A);
  assert.match(query.params.get('select'), /business_id/);
});

test('feedback GET refuses a foreign row rather than disclosing fictional data', async t => {
  const { res } = await run(t, { returned: [{ ...own, business_id: B, message: 'Foreign fictional private note' }] });
  assert.equal(res.code, 503);
  assert.doesNotMatch(JSON.stringify(res.body), /Foreign fictional private note/);
});

test('feedback GET refuses a malformed successful response rather than a false empty library', async t => {
  const { res } = await run(t, { returned: null });
  assert.equal(res.code, 503);
});

test('feedback POST confirms the tenant and submitted fields before success audit', async t => {
  const { res, requests } = await run(t, { method: 'POST', returned: [own] });
  assert.equal(res.code, 201);
  assert.equal(res.body.id, FEEDBACK);
  assert.equal(requests.filter(x => x.path === '/rest/v1/business_audit_events').length, 1);
});

for (const [label, returned] of [
  ['foreign tenant', [{ ...own, business_id: B }]],
  ['id-only return', [{ id: FEEDBACK }]],
  ['contradictory saved message', [{ ...own, message: 'Different fictional message' }]]
]) {
  test('feedback POST refuses ' + label + ' and skips success audit', async t => {
    const { res, requests } = await run(t, { method: 'POST', returned });
    assert.equal(res.code, 503);
    assert.equal(requests.filter(x => x.path === '/rest/v1/business_audit_events').length, 0);
  });
}

test('feedback PATCH confirms matching tenant, id and saved review status', async t => {
  const { res } = await run(t, { method: 'PATCH', returned: [{ ...own, status: 'reviewed' }] });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { updated: true });
});

for (const [label, returned] of [
  ['foreign tenant', [{ ...own, business_id: B, status: 'reviewed' }]],
  ['wrong feedback id', [{ ...own, id: '55555555-5555-4555-8555-555555555555', status: 'reviewed' }]],
  ['contradictory status', [{ ...own, status: 'new' }]]
]) {
  test('feedback PATCH refuses ' + label + ' as an unverified save', async t => {
    const { res } = await run(t, { method: 'PATCH', returned });
    assert.equal(res.code, 503);
  });
}

test('feedback PATCH returns 404 for genuine empty update', async t => {
  const { res } = await run(t, { method: 'PATCH', returned: [] });
  assert.equal(res.code, 404);
});

test('legacy Production feedback submission remains unchanged', async t => {
  const { res } = await run(t, { method: 'POST', returned: [{ id: FEEDBACK }], legacy: true });
  assert.equal(res.code, 201);
});
