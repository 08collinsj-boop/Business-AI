import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const path = new URL('../docs/colzo-pilot-review/PILOT_BOOKING_OVERLAP_20261029.PROPOSED.sql', import.meta.url);
const A = '10000000-0000-4000-8000-000000000001', B = '10000000-0000-4000-8000-000000000002';
const setup = `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE public.colzo_pilot_access(business_id uuid PRIMARY KEY);
CREATE TABLE public.bookings(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,business_id uuid NOT NULL,status text,starts_at timestamptz,ends_at timestamptz,notes text);
INSERT INTO public.colzo_pilot_access VALUES ('${A}');`;
const insert = (business = A, start = '15:00', end = '16:00', status = 'confirmed') => `INSERT INTO public.bookings(business_id,status,starts_at,ends_at) VALUES('${business}','${status}','2026-11-04 ${start}+00','2026-11-04 ${end}+00')`;
test('pilot confirmed scheduling rejects overlaps atomically and retains non-pilot behavior', async () => {
  const db = new PGlite();
  try {
    await db.exec(setup);
    if (existsSync(path)) await db.exec(readFileSync(path, 'utf8'));
    await db.exec(insert());
    await assert.rejects(db.exec(insert(A, '15:30', '16:30')), { code: '23P01' });
    assert.equal((await db.query('SELECT count(*)::int n FROM bookings')).rows[0].n, 1);
    await db.exec(insert(A, '16:00', '17:00'));
    await db.exec(insert(A, '15:30', '16:30', 'requested'));
    await assert.rejects(db.exec("UPDATE bookings SET status='confirmed' WHERE status='requested'"), { code: '23P01' });
    await db.exec("UPDATE bookings SET status='cancelled' WHERE status='requested'");
    await db.exec(insert(B)); await db.exec(insert(B));
    assert.equal((await db.query(`SELECT count(*)::int n FROM bookings WHERE business_id='${B}'`)).rows[0].n, 2);
    await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');
    await assert.rejects(db.exec(insert(A, '18:00', '19:00')), { code: '40001' });
    await db.exec('ROLLBACK');
    await db.exec(`BEGIN; ${insert(A, '18:00', '19:00')}; ROLLBACK;`);
    assert.equal((await db.query("SELECT count(*)::int n FROM bookings WHERE starts_at='2026-11-04 18:00+00'")).rows[0].n, 0);
  } finally { await db.close(); }
});
