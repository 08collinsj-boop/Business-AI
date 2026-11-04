import test from 'node:test';
import assert from 'node:assert/strict';

// Synthetic contradictory service-role responses: no real staff information,
// membership, invitation, session, JWT, database call or tenant is accessed.
const BUSINESS = '11111111-1111-4111-8111-111111111111';
const FOREIGN = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';
const INVITE = '44444444-4444-4444-8444-444444444444';
const ownMembers = [{ business_id: BUSINESS, user_id: USER, role: 'owner', created_at: '2026-10-31T00:00:00.000Z' }];
const ownInvites = [{ business_id: BUSINESS, id: INVITE, invited_email: 'fixture@example.invalid', role: 'member', status: 'pending', expires_at: '2026-11-05T00:00:00.000Z', created_at: '2026-10-31T00:00:00.000Z' }];
const reply = body => ({ ok: true, status: 200, text: async () => JSON.stringify(body), json: async () => body });
const response = () => ({ code: 0, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

async function simulate(t, { table = null, rows = null, legacy = false } = {}) {
  const env = { SUPABASE_URL: 'https://mvwseobgkexzpmmkgcxe.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-only-not-a-key',
    TENANCY_AUTH_ENABLED: 'true', COLZO_SCOPED_PILOT_ACCESS: 'false',
    VERCEL_ENV: legacy ? 'production' : 'preview',
    VERCEL_GIT_COMMIT_REF: 'fix/colzo-pilot-release-gates-20261026' };
  const before = Object.fromEntries(Object.keys(env).map(k => [k, process.env[k]]));
  const priorFetch = globalThis.fetch;
  Object.assign(process.env, env);
  const requests = [];
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    if (url.pathname === '/auth/v1/user') return reply({ id: USER });
    if (url.pathname === '/rest/v1/business_memberships' && url.searchParams.has('user_id'))
      return reply([{ business_id: BUSINESS, role: 'owner' }]);
    if (url.pathname === '/rest/v1/business_memberships' || url.pathname === '/rest/v1/business_team_invitations') {
      const key = url.pathname.split('/').at(-1);
      requests.push({ table: key, params: url.searchParams });
      return reply(table === key ? rows : key === 'business_memberships' ? ownMembers : ownInvites);
    }
    throw new Error('Unknown synthetic request ' + url.pathname);
  };
  t.after(() => {
    globalThis.fetch = priorFetch;
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const { default: handler } = await import('../lib/team-handler.js?read-provenance=' + Math.random());
  const res = response();
  await handler({ method: 'GET', headers: { authorization: 'Bearer synthetic-user' }, query: {} }, res);
  return { res, requests };
}

test('team owner GET validates tenant on both lists but retains original public shape', async t => {
  const { res, requests } = await simulate(t);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.members, [{ user_id: USER, role: 'owner', created_at: ownMembers[0].created_at }]);
  assert.deepEqual(res.body.invitations, [{
    id: INVITE, invited_email: 'fixture@example.invalid', role: 'member', status: 'pending',
    expires_at: ownInvites[0].expires_at, created_at: ownInvites[0].created_at
  }]);
  for (const request of requests) {
    assert.equal(request.params.get('business_id'), 'eq.' + BUSINESS);
    assert.match(request.params.get('select'), /business_id/);
  }
});

for (const [table, good] of [
  ['business_memberships', ownMembers],
  ['business_team_invitations', ownInvites]
]) {
  test('team GET refuses a foreign ' + table + ' row rather than exposing personnel', async t => {
    const { res } = await simulate(t, { table, rows: [{ ...good[0], business_id: FOREIGN }] });
    assert.equal(res.code, 500);
    assert.deepEqual(res.body, { error: 'Could not process team request' });
    assert.doesNotMatch(JSON.stringify(res.body), /fixture@example\.invalid|33333333/);
  });
  test('team GET refuses a row missing tenant provenance from ' + table, async t => {
    const { business_id, ...missing } = good[0];
    const { res } = await simulate(t, { table, rows: [missing] });
    assert.equal(res.code, 500);
  });
  test('team GET refuses malformed successful null response from ' + table, async t => {
    const { res } = await simulate(t, { table, rows: null });
    assert.equal(res.code, 500);
  });
  test('team GET preserves an actual empty ' + table + ' result', async t => {
    const { res } = await simulate(t, { table, rows: [] });
    assert.equal(res.code, 200);
    assert.deepEqual(table === 'business_memberships' ? res.body.members : res.body.invitations, []);
  });
}

test('legacy Production team GET preserves historic response shape and nullable upstream fallback', async t => {
  const { res } = await simulate(t, { table: 'business_team_invitations', rows: null, legacy: true });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.invitations, []);
});
