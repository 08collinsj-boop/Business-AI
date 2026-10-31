/** Disposable socket-only native PostgreSQL concurrency acceptance.
 * Requires an already-installed PostgreSQL 17 distribution and pg client module.
 * No hosted connection strings, inherited PG credentials or live data are used.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, chmodSync, chownSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const bin = process.env.COLZO_PG_BIN, modulePath = process.env.COLZO_PG_CLIENT_MODULE;
if (!bin || !modulePath) throw Error('Set installed COLZO_PG_BIN and COLZO_PG_CLIENT_MODULE; no downloads are performed');
const { default: pg } = await import(pathToFileURL(modulePath));
const work = mkdtempSync(join(tmpdir(), 'colzo-overlap-native-'));
chmodSync(work, 0o700);
const root = process.getuid?.() === 0;
if (root) chownSync(work, 65534, 65534);
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('PG')));
const run = (name, args) => execFileSync(root ? 'python3' : join(bin, name), root
  ? ['-c', 'import os,sys; os.setgroups([]); os.setgid(65534); os.setuid(65534); os.execv(sys.argv[1],sys.argv[1:])', join(bin, name), ...args]
  : args, { env, stdio: 'pipe' });
const connection = { host: work, port: 55459, user: 'postgres', database: 'postgres', connectionTimeoutMillis: 5000 };
const connect = async (user = 'postgres') => { const c = new pg.Client({ ...connection, user }); await c.connect(); return c; };
const A = '10000000-0000-4000-8000-000000000001', B = '10000000-0000-4000-8000-000000000002';
const insert = (business = A, start = '15:00', end = '16:00') => `INSERT INTO public.bookings(business_id,status,starts_at,ends_at) VALUES('${business}','confirmed','2026-11-04 ${start}+00','2026-11-04 ${end}+00')`;
const checks = [];
const check = (label, value) => { assert.ok(value, label); checks.push(label); };
let started = false, admin;
try {
  run('initdb', ['-D', join(work, 'data'), '-U', 'native_admin', '--no-locale', '--encoding=UTF8', '--auth-local=trust']);
  run('pg_ctl', ['-D', join(work, 'data'), '-l', join(work, 'server.log'), '-o', `-k ${work} -p 55459 -c listen_addresses='' -c shared_buffers=16MB -c max_connections=20`, 'start']);
  started = true;
  admin = await connect('native_admin');
  check('native PostgreSQL 17', (await admin.query('SHOW server_version')).rows[0].server_version.startsWith('17.'));
  check('TCP disabled', (await admin.query('SHOW listen_addresses')).rows[0].listen_addresses === '');
  await admin.query(`CREATE ROLE postgres LOGIN NOSUPERUSER BYPASSRLS;
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role LOGIN BYPASSRLS;
    CREATE TABLE public.colzo_pilot_access(business_id uuid PRIMARY KEY);
    CREATE TABLE public.bookings(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,business_id uuid NOT NULL,status text,starts_at timestamptz,ends_at timestamptz,notes text);
    INSERT INTO public.colzo_pilot_access VALUES ('${A}');
    ALTER TABLE public.bookings OWNER TO postgres;
    ALTER TABLE public.colzo_pilot_access OWNER TO postgres;
    ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.colzo_pilot_access ENABLE ROW LEVEL SECURITY;
    GRANT CREATE ON SCHEMA public TO postgres;
    SET SESSION AUTHORIZATION postgres;`);
  check('definer matches non-superuser Development owner', (await admin.query("SELECT NOT rolsuper AND rolbypassrls ok FROM pg_roles WHERE rolname=current_user")).rows[0].ok);
  const proposal = readFileSync(new URL('../docs/colzo-pilot-review/PILOT_BOOKING_OVERLAP_20261029.PROPOSED.sql', import.meta.url), 'utf8');
  await admin.query(proposal);
  const clients = await Promise.all(Array.from({ length: 8 }, () => connect()));
  let outcomes;
  try {
    const pids = await Promise.all(clients.map(async c => (await c.query('SELECT pg_backend_pid() pid')).rows[0].pid));
    check('eight independent database backends', new Set(pids).size === 8);
    await admin.query('BEGIN');
    await admin.query("SELECT pg_advisory_xact_lock(hashtextextended('colzo-pilot-confirmed-booking:' || $1,0))", [A]);
    const pending = clients.map(async c => {
      try { await c.query('BEGIN'); await c.query(insert()); await c.query('SELECT pg_sleep(0.2)'); await c.query('COMMIT'); return 'committed'; }
      catch (e) { await c.query('ROLLBACK'); return e.code; }
    });
    // Observe every independent worker actually waiting on the scheduling lock.
    // Do not infer concurrency merely from Promise.all or distinct backend IDs.
    let waiting = 0;
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      await admin.query('SELECT pg_stat_clear_snapshot()');
      waiting = (await admin.query("SELECT count(*)::int n FROM pg_stat_activity WHERE pid=ANY($1::int[]) AND wait_event='advisory'", [pids])).rows[0].n;
      if (waiting === 8) break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    await admin.query('COMMIT');
    outcomes = await Promise.all(pending);
    check('eight backends observed waiting concurrently', waiting === 8);
  } finally { await Promise.all(clients.map(c => c.end())); }
  check('one simultaneous confirmation commits', outcomes.filter(x => x === 'committed').length === 1);
  check('seven simultaneous overlaps rejected', outcomes.filter(x => x === '23P01').length === 7);
  check('only one confirmed row persisted', (await admin.query('SELECT count(*)::int n FROM bookings')).rows[0].n === 1);
  await admin.query(insert(A, '16:00', '17:00'));
  check('adjacent half-open interval allowed', (await admin.query('SELECT count(*)::int n FROM bookings')).rows[0].n === 2);
  await admin.query(insert(B)); await admin.query(insert(B));
  check('legacy non-pilot overlap behavior retained', (await admin.query(`SELECT count(*)::int n FROM bookings WHERE business_id='${B}'`)).rows[0].n === 2);
  await admin.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  let isolation;
  try { await admin.query(insert(A, '18:00', '19:00')); } catch (e) { isolation = e.code; }
  await admin.query('ROLLBACK');
  check('fixed snapshot scheduling fails closed', isolation === '40001');
  await admin.query('BEGIN'); await admin.query(insert(A, '18:00', '19:00')); await admin.query('ROLLBACK');
  check('forced rollback leaves no booking', (await admin.query("SELECT count(*)::int n FROM bookings WHERE starts_at='2026-11-04 18:00+00'")).rows[0].n === 0);
  const overlapId = (await admin.query(`INSERT INTO bookings(business_id,status,starts_at,ends_at) VALUES('${A}','requested','2026-11-04 15:30+00','2026-11-04 16:30+00') RETURNING id`)).rows[0].id;
  let confirmation;
  try { await admin.query("UPDATE bookings SET status='confirmed' WHERE id=$1", [overlapId]); } catch (e) { confirmation = e.code; }
  check('request confirmation overlap is rejected', confirmation === '23P01');
  await admin.query("UPDATE bookings SET status='cancelled' WHERE id=$1", [overlapId]);
  check('cancellation allowed', (await admin.query('SELECT status FROM bookings WHERE id=$1', [overlapId])).rows[0].status === 'cancelled');
  check('trigger function not client-executable', (await admin.query("SELECT has_function_privilege('authenticated','public.colzo_pilot_confirmed_booking_guard()','EXECUTE') allowed")).rows[0].allowed === false);
  await admin.query('GRANT SELECT, INSERT, UPDATE ON bookings TO service_role; GRANT USAGE ON SEQUENCE bookings_id_seq TO service_role');
  const service = await connect('service_role');
  try {
    let denied;
    try { await service.query(insert(A, '15:30', '16:30')); } catch (e) { denied = e.code; }
    check('service-role writes still invoke restricted definer guard', denied === '23P01');
    await service.query(insert(A, '18:00', '19:00'));
    check('service-role non-conflicting confirmation succeeds', (await service.query("SELECT count(*)::int n FROM bookings WHERE business_id=$1 AND starts_at='2026-11-04 18:00+00'", [A])).rows[0].n === 1);
  } finally { await service.end(); }
  console.log(JSON.stringify({ scope: 'isolated synthetic native PostgreSQL only', checks, count: checks.length, outcomes }));
} finally {
  await admin?.end();
  if (started) run('pg_ctl', ['-D', join(work, 'data'), 'stop', '-m', 'fast']);
}
