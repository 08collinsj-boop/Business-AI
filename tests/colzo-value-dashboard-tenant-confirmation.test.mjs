import test from 'node:test';
import assert from 'node:assert/strict';

// Deliberately contradictory, fictional upstream responses. No real tenant,
// credential, request, record or account is read or modified.
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';
const datasets = {
  leads: [{ business_id: A, id: 7, status: 'New', estimated_value: 500, created_at: new Date().toISOString() }],
  bookings: [{ business_id: A, id: 8, status: 'confirmed', source: 'ai_request', created_at: new Date().toISOString() }],
  actions: [{ business_id: A, id: 9, title: 'Automatic follow-up', action_type: 'follow_up', status: 'completed', completed_at: new Date().toISOString(), created_at: new Date().toISOString() }],
  business_audit_events: [{ business_id: A, id: 10, resource_id: '7', metadata: { source: 'qr' }, created_at: new Date().toISOString() }]
};
const reply = body => ({ ok: true, status: 200, text: async () => JSON.stringify(body), json: async () => body });
const response = () => ({ code: 0, body: null, headers: {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, setHeader(name, value) { this.headers[name] = value; } });
async function simulate(t, { override = null, legacy = false } = {}) {
  const env = {
    TENANCY_AUTH_ENABLED: 'true', SUPABASE_URL: 'https://mvwseobgkexzpmmkgcxe.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'fictional-not-a-service-role-key',
    COLZO_SCOPED_PILOT_ACCESS: 'false',
    VERCEL_ENV: legacy ? 'production' : 'preview',
    VERCEL_GIT_COMMIT_REF: 'fix/colzo-pilot-release-gates-20261026'
  };
  const before = Object.fromEntries(Object.keys(env).map(k => [k, process.env[k]]));
  const oldFetch = globalThis.fetch;
  Object.assign(process.env, env);
  const queries = [];
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    if (url.pathname === '/auth/v1/user') return reply({ id: USER });
    if (url.pathname === '/rest/v1/business_memberships') return reply([{ business_id: A, role: 'owner' }]);
    const table = url.pathname.split('/').at(-1);
    if (Object.hasOwn(datasets, table)) {
      queries.push({ table, query: url.searchParams });
      return reply(override?.table === table ? override.value : datasets[table]);
    }
    throw new Error('Unexpected fictional route: ' + url.pathname);
  };
  t.after(() => {
    globalThis.fetch = oldFetch;
    for (const [key, val] of Object.entries(before)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });
  const { default: handler } = await import('../lib/value-dashboard-handler.js?tenant-metrics=' + Math.random());
  const res = response();
  await handler({ method: 'GET', headers: { authorization: 'Bearer fictional-user' }, query: {} }, res);
  return { res, queries };
}

test('value dashboard totals genuine own business records only, without disclosing row contents', async t => {
  const { res, queries } = await simulate(t);
  assert.equal(res.code, 200);
  assert.equal(res.body.activity.enquiries, 1);
  assert.equal(res.body.activity.ai_booking_requests, 1);
  assert.equal(res.body.activity.actions_completed, 1);
  assert.equal(res.body.values.period_opportunity_value, 500);
  assert.equal(res.body.sources.qr, 1);
  assert.equal(res.body.sources.untracked, 0);
  assert.ok(!JSON.stringify(res.body).includes('business_id'));
  assert.equal(queries.length, 4);
  for (const { query } of queries) {
    assert.equal(query.get('business_id'), 'eq.' + A);
    assert.match(query.get('select'), /business_id/, 'provenance required in service-role results');
  }
});

for (const table of Object.keys(datasets)) {
  test('value dashboard rejects foreign ' + table + ' records instead of poisoning metrics', async t => {
    const poisoned = [{ ...datasets[table][0], business_id: B,
      ...(table === 'leads' ? { estimated_value: 999999 } : {}) }];
    const { res } = await simulate(t, { override: { table, value: poisoned } });
    assert.equal(res.code, 500);
    assert.equal(res.body.error, 'Could not load value dashboard');
    assert.doesNotMatch(JSON.stringify(res.body), /999999|Foreign|business_id/);
  });
  test('value dashboard rejects missing tenant provenance in ' + table, async t => {
    const { business_id, ...missing } = datasets[table][0];
    const { res } = await simulate(t, { override: { table, value: [missing] } });
    assert.equal(res.code, 500);
  });
  test('value dashboard rejects successful null response for ' + table + ' rather than a false zero', async t => {
    const { res } = await simulate(t, { override: { table, value: null } });
    assert.equal(res.code, 500);
  });
}

test('value dashboard still permits a genuinely empty business dashboard', async t => {
  const { res } = await simulate(t, { override: { table: 'leads', value: [] } });
  assert.equal(res.code, 200);
  assert.equal(res.body.activity.enquiries, 0);
  assert.equal(res.body.values.period_opportunity_value, 0);
});

test('legacy Production value dashboard continues treating anomalous upstream payload as empty', async t => {
  const { res } = await simulate(t, { legacy: true, override: { table: 'leads', value: null } });
  assert.equal(res.code, 200);
  assert.equal(res.body.activity.enquiries, 0);
});
