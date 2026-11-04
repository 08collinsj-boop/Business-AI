import test from 'node:test';
import assert from 'node:assert/strict';
import { runLiveIsolation } from '../scripts/lib/colzo-live-isolation.mjs';
const businesses = ['433f135d-720f-4687-8114-3dffe7361675', '6da33602-1b8f-474d-84a6-e003d1c713fd'];
function bridge(mode = '') {
  const calls = [];
  const request = async (identity, spec) => {
    calls.push({ identity, ...spec });
    if (mode === 'transport') throw Error('private token must never escape');
    if (mode === 'sso') return { status: 200, contentType: 'text/html', data: '<html>SSO</html>' };
    const i = identity === 'A' ? 0 : 1;
    const json = (status, data) => ({ status, contentType: 'application/json; charset=utf-8', data });
    if (identity === 'anonymous') return json(401, { error: 'Authentication required' });
    if (mode === 'unauthenticated') return json(401, { error: 'Authentication required' });
    if (spec.method === 'PATCH') return json(mode === 'write' ? 200 : 404, { error: 'Record not found' });
    if (spec.path.includes('&id=') || spec.path.includes('?id=')) return json(404, { error: 'Record not found' });
    if (mode === 'empty') return json(200, []);
    return json(200, [{ id: i + 1, business_id: businesses[mode === 'leak' ? 1 - i : i], updated_at: '2026-10-29T10:00:00Z' }]);
  };
  return { request, calls };
}
test('runner verifies both directions and post-denial preservation using synthetic bridge only', async () => {
  const { request, calls } = bridge();
  const r = await runLiveIsolation({ request, businesses, allowDeniedWrites: true });
  assert.equal(r.complete, true);
  assert.equal(r.checks.length, 28);
  assert.equal(calls.filter(c => c.method === 'PATCH').length, 8);
});
test('default never writes and does not claim complete acceptance', async () => {
  const { request, calls } = bridge();
  const r = await runLiveIsolation({ request, businesses });
  assert.equal(r.complete, false);
  assert.equal(calls.some(c => c.method !== 'GET'), false);
  assert.equal(r.checks.filter(c => c.status === 'NOT RUN').length, 8);
});
for (const mode of ['sso', 'transport', 'unauthenticated']) test(`${mode} is BLOCKED, no secret or false pass`, async () => {
  const { request } = bridge(mode);
  const r = await runLiveIsolation({ request, businesses });
  assert.deepEqual(r, { checks: [{ name: 'customer: own tenant 1 read', status: 'BLOCKED' }], complete: false });
});
test('foreign tenant disclosure fails immediately', async () => {
  const r = await runLiveIsolation({ request: bridge('leak').request, businesses });
  assert.equal(r.checks[0].status, 'FAIL');
  assert.equal(r.checks.length, 1);
});
test('unexpected write success stops without retry or compensating write', async () => {
  const { request, calls } = bridge('write');
  const r = await runLiveIsolation({ request, businesses, allowDeniedWrites: true });
  assert.equal(r.checks.at(-1).status, 'FAIL');
  assert.equal(calls.filter(c => c.method === 'PATCH').length, 1);
});
test('missing foreign fixtures are BLOCKED, no records created', async () => {
  const { request, calls } = bridge('empty');
  const r = await runLiveIsolation({ request, businesses, allowDeniedWrites: true });
  assert.equal(r.complete, false);
  assert.equal(r.checks.filter(c => c.status === 'BLOCKED').length, 8);
  assert.equal(calls.some(c => c.method !== 'GET'), false);
});
test('same business cannot count as two-business acceptance', async () => {
  await assert.rejects(runLiveIsolation({ request: bridge().request, businesses: [businesses[0], businesses[0]] }));
});
test('404 carrying foreign row data must fail rather than count as denial', async () => {
  const base = bridge().request;
  const request = async (identity, spec) => spec.path.includes('&id=')
    ? { status: 404, contentType: 'application/json', data: { error: 'Not found', record: { business_id: businesses[1] } } }
    : base(identity, spec);
  const r = await runLiveIsolation({ request, businesses });
  assert.equal(r.checks.at(-1).status, 'FAIL');
});
