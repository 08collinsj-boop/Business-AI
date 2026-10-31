import test from 'node:test';
import assert from 'node:assert/strict';

const BUSINESS = '11111111-1111-4111-8111-111111111111';
const USER = '33333333-3333-4333-8333-333333333333';
const STAMP = '2026-10-31T12:00:00.000Z';
const current = { id: 7, business_id: BUSINESS, title: 'Original fictional action', status: 'pending', due_at: null, lead_id: null, booking_id: null, updated_at: STAMP };
const reply = value => ({ ok: true, status: 200, text: async () => JSON.stringify(value), json: async () => value });
const result = () => ({ code: 0, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; }, setHeader() {} });

async function run(t, method, body, saved) {
  const env = {
    SUPABASE_URL: 'https://synthetic.test',
    SUPABASE_SERVICE_ROLE_KEY: 'fictional-fixture-key',
    TENANCY_AUTH_ENABLED: 'true',
    COLZO_SCOPED_PILOT_ACCESS: 'false',
    VERCEL_ENV: ''
  };
  const prior = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  const priorFetch = globalThis.fetch;
  const calls = [];
  Object.assign(process.env, env);
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input), verb = options.method || 'GET';
    if (url.pathname === '/auth/v1/user') return reply({ id: USER });
    if (url.pathname === '/rest/v1/business_memberships') return reply([{ business_id: BUSINESS, role: 'owner' }]);
    calls.push({ path: url.pathname, verb, body: options.body ? JSON.parse(options.body) : null });
    if (url.pathname === '/rest/v1/actions') return reply(verb === 'GET' ? [current] : saved);
    if (url.pathname === '/rest/v1/business_audit_events' || url.pathname === '/rest/v1/lead_history') return reply([]);
    throw new Error('Unexpected synthetic request: ' + url.pathname);
  };
  t.after(() => {
    globalThis.fetch = priorFetch;
    for (const [key, value] of Object.entries(prior))
      value === undefined ? delete process.env[key] : process.env[key] = value;
  });
  const handler = (await import('../api/actions.js?action-returned-fields=' + Math.random())).default;
  const res = result();
  await handler({ method, headers: { authorization: 'Bearer synthetic-fixture' }, body, query: {} }, res);
  return { res, calls };
}

test('Action POST refuses a correctly scoped returned record whose status contradicts the submitted status', async t => {
  const { res, calls } = await run(t, 'POST',
    { title: 'New fictional action', status: 'completed' },
    [{ ...current, title: 'New fictional action', status: 'pending' }]);
  assert.equal(res.code, 500, 'a response must not claim saved success on a stale status');
  assert.equal(calls.filter(c => c.path === '/rest/v1/actions' && c.verb === 'POST').length, 1);
  assert.equal(calls.filter(c => c.path === '/rest/v1/business_audit_events').length, 0);
});

test('Action PATCH refuses a returned row whose submitted title was not saved', async t => {
  const { res, calls } = await run(t, 'PATCH',
    { id: 7, title: 'Revised fictional action' },
    [{ ...current, title: 'Original fictional action' }]);
  assert.equal(res.code, 500);
  assert.equal(calls.filter(c => c.path === '/rest/v1/actions' && c.verb === 'PATCH').length, 1);
  assert.equal(calls.filter(c => c.path === '/rest/v1/business_audit_events').length, 0);
});

test('Action PATCH refuses a returned due date with a different UTC instant', async t => {
  const { res, calls } = await run(t, 'PATCH',
    { id: 7, due_at: '2026-11-06T10:00:00Z' },
    [{ ...current, due_at: '2026-11-06T10:30:00Z' }]);
  assert.equal(res.code, 500);
  assert.equal(calls.filter(c => c.path === '/rest/v1/business_audit_events').length, 0);
});

test('Action POST accepts correct saved fields, including equivalent UTC offsets', async t => {
  const { res, calls } = await run(t, 'POST',
    { title: 'New fictional action', status: 'completed', due_at: '2026-11-06T10:00:00Z' },
    [{ ...current, title: 'New fictional action', status: 'completed', due_at: '2026-11-06T11:00:00+01:00' }]);
  assert.equal(res.code, 201);
  assert.equal(calls.filter(c => c.path === '/rest/v1/business_audit_events').length, 1);
});
