/** Live acceptance through an operator-provided, session-safe request bridge.
 * No credential entry, session extraction, token logging, fixture creation or deletion.
 * The bridge must bind A/B to genuine separately issued fictional owner sessions.
 * Tests using a mock bridge verify this runner only, never live tenant isolation.
 */
import { isDeepStrictEqual } from 'node:util';

const resources = [
  ['customer', '/api/colzo-records?resource=clients'],
  ['enquiry', '/api/leads'],
  ['booking', '/api/bookings'],
  ['action', '/api/actions']
];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const query = (path, key, value) => path + (path.includes('?') ? '&' : '?') + key + '=' + encodeURIComponent(value);
const denial = (r, status) => r.status === status && r.data && !Array.isArray(r.data)
  && typeof r.data.error === 'string'
  && Object.keys(r.data).every(key => ['error', 'code'].includes(key));

export async function runLiveIsolation({ request, businesses, allowDeniedWrites = false }) {
  if (typeof request !== 'function' || !Array.isArray(businesses) || businesses.length !== 2
      || businesses.some(id => !uuid.test(id)) || businesses[0] === businesses[1]) {
    throw Error('Two distinct fictional business UUIDs and an authorised request bridge are required');
  }
  const checks = [];
  const record = (name, status) => checks.push({ name, status });
  const send = async (identity, path, method = 'GET', body) => {
    let response;
    try { response = await request(identity, { path, method, ...(body ? { body } : {}) }); }
    catch { throw { status: 'BLOCKED' }; }
    if (!response || !Number.isInteger(response.status)
        || !/^application\/json(?:;|$)/i.test(response.contentType || '')) throw { status: 'BLOCKED' };
    return response;
  };
  const requireResult = (ok, status = 'FAIL') => { if (!ok) throw { status }; };
  const rowsFor = async (identity, path, businessId) => {
    const r = await send(identity, path);
    requireResult(r.status === 200, [401, 403].includes(r.status) ? 'BLOCKED' : 'FAIL');
    requireResult(Array.isArray(r.data) && r.data.every(row => row && row.business_id === businessId));
    return r.data;
  };
  // Never serialize exceptions, responses, row contents, headers or credentials.
  async function check(name, operation) {
    try { await operation(); record(name, 'PASS'); return true; }
    catch (error) { record(name, error?.status === 'BLOCKED' ? 'BLOCKED' : 'FAIL'); return false; }
  }
  for (const [kind, path] of resources) {
    const snapshots = [];
    for (let i = 0; i < 2; i++) {
      if (!await check(`${kind}: own tenant ${i + 1} read`, async () => {
        snapshots[i] = await rowsFor(i === 0 ? 'A' : 'B', path, businesses[i]);
      })) return { checks, complete: false };
    }
    for (let i = 0; i < 2; i++) {
      const identity = i === 0 ? 'A' : 'B', otherIdentity = i === 0 ? 'B' : 'A';
      const foreign = snapshots[1 - i][0];
      if (!foreign?.id || !Number.isFinite(Date.parse(foreign.updated_at))) {
        record(`${kind}: foreign fixture for tenant ${i + 1}`, 'BLOCKED');
        continue;
      }
      const isCustomer = kind === 'customer';
      // Leads/bookings have no GET-by-record-ID contract. Check list scoping;
      // customer/action endpoints do support an exact ID selector.
      const readPath = ['customer', 'action'].includes(kind) ? query(path, 'id', foreign.id) : path;
      if (!await check(`${kind}: foreign ${['customer', 'action'].includes(kind) ? 'ID' : 'list'} read tenant ${i + 1}`, async () => {
        const r = await send(identity, readPath);
        requireResult(denial(r, 404) || (r.status === 200 && Array.isArray(r.data)
          && r.data.every(row => row?.business_id === businesses[i])
          && !r.data.some(row => String(row.id) === String(foreign.id))));
      })) return { checks, complete: false };
      if (!allowDeniedWrites) {
        record(`${kind}: foreign write tenant ${i + 1}`, 'NOT RUN');
        continue;
      }
      // A defect could permit this change. Require explicit fictional-write opt-in;
      // stop on the first unexpected success, never retry or auto-restore.
      const patch = isCustomer ? { notes: 'FICTIONAL ISOLATION DENIAL PROBE' }
        : kind === 'enquiry' ? { notes: 'FICTIONAL ISOLATION DENIAL PROBE' }
        : { title: 'FICTIONAL ISOLATION DENIAL PROBE' };
      const body = { ...patch, expected_updated_at: foreign.updated_at, ...(!isCustomer ? { id: foreign.id } : {}) };
      if (!await check(`${kind}: foreign write tenant ${i + 1}`, async () => {
        const r = await send(identity, isCustomer ? query(path, 'id', foreign.id) : path, 'PATCH', body);
        const after = await rowsFor(otherIdentity, path, businesses[1 - i]);
        requireResult(isDeepStrictEqual(snapshots[1 - i], after));
        requireResult(denial(r, 404));
      })) return { checks, complete: false };
    }
    if (!await check(`${kind}: anonymous denial`, async () => {
      const r = await send('anonymous', path);
      requireResult(denial(r, 401));
    })) return { checks, complete: false };
  }
  return { checks, complete: checks.every(c => c.status === 'PASS') };
}
