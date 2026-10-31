import test from 'node:test';
import assert from 'node:assert/strict';

// Synthetic service responses intentionally contradict a tenant-filtered read.
// No real JWT, business, Supabase request, or customer data is involved.
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const UA = '33333333-3333-4333-8333-333333333333';
const UB = '44444444-4444-4444-8444-444444444444';
const reply = data => ({ ok: true, status: 200, text: async () => JSON.stringify(data), json: async () => data });
const response = () => ({ code: 0, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, setHeader() {} });

async function simulate(t, resource, { viewer = 'a', rows = [] } = {}) {
  const env = {
    SUPABASE_URL: 'https://mvwseobgkexzpmmkgcxe.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-only',
    TENANCY_AUTH_ENABLED: 'true',
    COLZO_SCOPED_PILOT_ACCESS: 'false',
    VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_REF: 'fix/colzo-pilot-release-gates-20261026'
  };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  const priorFetch = globalThis.fetch;
  Object.assign(process.env, env);
  const calls = [];
  globalThis.fetch = async (input, opts = {}) => {
    const url = new URL(input);
    const method = opts.method || 'GET';
    calls.push({ path: url.pathname, method, params: url.searchParams });
    if (url.pathname === '/auth/v1/user') {
      assert.equal(opts.headers.Authorization, 'Bearer synthetic-' + viewer);
      return reply({ id: viewer === 'a' ? UA : UB });
    }
    if (url.pathname === '/rest/v1/business_memberships') {
      assert.equal(url.searchParams.get('user_id'), 'eq.' + (viewer === 'a' ? UA : UB));
      return reply([{ business_id: viewer === 'a' ? A : B, role: 'owner' }]);
    }
    if (url.pathname === '/rest/v1/' + resource) return reply(rows);
    throw Error('Unexpected mock request ' + url.pathname);
  };
  t.after(() => {
    globalThis.fetch = priorFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const handler = (await import('../api/' + resource + '.js?tenant-read=' + Math.random())).default;
  const res = response();
  await handler({ method: 'GET', headers: { authorization: 'Bearer synthetic-' + viewer }, query: {} }, res);
  return { res, calls };
}

for (const resource of ['actions', 'bookings']) {
  test(resource + ' accepts returned records from the authenticated owner tenant', async t => {
    const own = { id: 9, business_id: A, title: 'Fictional A' };
    const { res, calls } = await simulate(t, resource, { rows: [own] });
    assert.equal(res.code, 200);
    assert.deepEqual(res.body, [own]);
    const get = calls.find(c => c.path === '/rest/v1/' + resource);
    assert.equal(get.params.get('business_id'), 'eq.' + A);
    assert.ok(calls.every(c => c.method === 'GET'));
  });

  test(resource + ' refuses a foreign tenant record returned despite the database scope', async t => {
    const foreign = { id: 21, business_id: B, title: 'Fictional private B' };
    const { res, calls } = await simulate(t, resource, { rows: [foreign] });
    assert.equal(res.code, 500, 'unsafe upstream representation must fail closed');
    assert.doesNotMatch(JSON.stringify(res.body || {}), /Fictional private B/);
    assert.equal(calls.find(c => c.path === '/rest/v1/' + resource).params.get('business_id'), 'eq.' + A);
    assert.ok(calls.every(c => c.method === 'GET'));
  });

  test(resource + ' refuses a mixed tenant result rather than leaking the foreign record', async t => {
    const { res, calls } = await simulate(t, resource, {
      viewer: 'b',
      rows: [{ id: 21, business_id: B, title: 'Fictional B' },
             { id: 9, business_id: A, title: 'Fictional private A' }]
    });
    assert.equal(res.code, 500);
    assert.doesNotMatch(JSON.stringify(res.body || {}), /Fictional private A/);
    assert.equal(calls.find(c => c.path === '/rest/v1/' + resource).params.get('business_id'), 'eq.' + B);
  });

  test(resource + ' refuses an unscoped row missing tenant provenance', async t => {
    const { res } = await simulate(t, resource, { rows: [{ id: 9, title: 'No tenant field' }] });
    assert.equal(res.code, 500);
    assert.doesNotMatch(JSON.stringify(res.body || {}), /No tenant field/);
  });
}
