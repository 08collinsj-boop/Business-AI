import test from 'node:test';
import assert from 'node:assert/strict';

const BUSINESS = '11111111-1111-4111-8111-111111111111';
const USER = '33333333-3333-4333-8333-333333333333';
const STAMP = '2026-10-29T11:00:00.000Z';
const current = { id: 7, business_id: BUSINESS, title: 'Original fixture', status: 'requested', starts_at: null, ends_at: null, updated_at: STAMP };
const reply = value => ({ ok: true, status: 200, text: async () => JSON.stringify(value), json: async () => value });
const result = () => ({ code: 0, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; }, setHeader() {} });

async function run(t, method, body, saved) {
  const env = { SUPABASE_URL: 'https://synthetic.test', SUPABASE_SERVICE_ROLE_KEY: 'fixture-only', TENANCY_AUTH_ENABLED: 'true' };
  const prior = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  const previousFetch = globalThis.fetch;
  const calls = [];
  Object.assign(process.env, env);
  globalThis.fetch = async (url, options = {}) => {
    const u = new URL(url);
    const verb = options.method || 'GET';
    if (u.pathname === '/auth/v1/user') return reply({ id: USER });
    if (u.pathname === '/rest/v1/business_memberships') return reply([{ business_id: BUSINESS, role: 'owner' }]);
    calls.push({ path: u.pathname, verb, body: options.body ? JSON.parse(options.body) : null });
    if (u.pathname === '/rest/v1/bookings') return reply(verb === 'GET' ? [current] : saved);
    if (u.pathname === '/rest/v1/business_audit_events' || u.pathname === '/rest/v1/lead_history') return reply([]);
    throw new Error('Unexpected request: ' + u.pathname);
  };
  t.after(() => {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries(prior)) value === undefined ? delete process.env[key] : process.env[key] = value;
  });
  const handler = (await import('../api/bookings.js?returned-fields=' + Math.random())).default;
  const res = result();
  await handler({ method, headers: { authorization: 'Bearer synthetic-user' }, query: {}, body }, res);
  return { res, calls };
}

test('POST refuses a correctly scoped booking whose returned status contradicts the submitted status', async t => {
  const body = { title: 'Fixture booking', status: 'confirmed' };
  const { res, calls } = await run(t, 'POST', body, [{ ...current, title: body.title, status: 'requested' }]);
  assert.equal(res.code, 500, 'a successful response must confirm the requested saved status');
  assert.equal(calls.filter(c => c.verb === 'POST' && c.path === '/rest/v1/bookings').length, 1);
  assert.equal(calls.filter(c => c.path === '/rest/v1/business_audit_events').length, 0, 'no success audit for an unconfirmed booking');
});

test('PATCH refuses a correctly scoped booking whose returned title remains stale', async t => {
  const body = { id: 7, title: 'Updated title' };
  const { res, calls } = await run(t, 'PATCH', body, [{ ...current, title: 'Original fixture' }]);
  assert.equal(res.code, 500, 'a successful response must confirm the requested saved title');
  assert.equal(calls.filter(c => c.verb === 'PATCH' && c.path === '/rest/v1/bookings').length, 1);
  assert.equal(calls.filter(c => c.path === '/rest/v1/business_audit_events').length, 0);
});

test('POST refuses a returned booking whose start time differs from the requested UTC instant', async t => {
  const body = { title: 'Fixture booking', status: 'confirmed', starts_at: '2026-11-04T10:00:00Z', ends_at: '2026-11-04T11:00:00Z' };
  const saved = [{ ...current, title: body.title, status: 'confirmed', starts_at: '2026-11-04T10:30:00+00:00', ends_at: '2026-11-04T11:00:00+00:00' }];
  const { res, calls } = await run(t, 'POST', body, saved);
  assert.equal(res.code, 500, 'a successful response must confirm the requested booking times');
  assert.equal(calls.filter(c => c.path === '/rest/v1/business_audit_events').length, 0);
});

test('POST accepts a correctly scoped saved booking with matching status and equivalent UTC dates', async t => {
  const body = { title: 'Fixture booking', status: 'confirmed', starts_at: '2026-11-04T10:00:00Z', ends_at: '2026-11-04T11:00:00Z' };
  const saved = [{ ...current, title: body.title, status: 'confirmed', starts_at: '2026-11-04T11:00:00+01:00', ends_at: '2026-11-04T11:00:00+00:00' }];
  const { res, calls } = await run(t, 'POST', body, saved);
  assert.equal(res.code, 201);
  assert.equal(calls.filter(c => c.path === '/rest/v1/business_audit_events').length, 1);
});
