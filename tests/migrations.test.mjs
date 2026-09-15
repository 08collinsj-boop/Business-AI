import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";

const directory = new URL("../supabase/migrations/", import.meta.url);
const names = (await readdir(directory)).filter(name => name.endsWith(".sql")).sort();
const contents = new Map(await Promise.all(names.map(async name => [name, await readFile(new URL(name, directory), "utf8")])));

test("fresh Dev migration chain has a deterministic tenant-safe order", () => {
  assert.deepEqual(names, [
    "20260911230000_create_initial_lead_schema.sql",
    "20260911235034_add_lead_status.sql",
    "20260913233511_add_business_settings.sql",
    "20260914195529_enable_rls_business_settings.sql",
    "20260915000000_add_multi_tenant_auth.sql",
    "20260915010000_add_bookings_actions.sql"
  ]);
  const baseline = contents.get(names[0]);
  assert.match(baseline, /create table if not exists public\.leads/i);
  assert.match(baseline, /create table if not exists public\.lead_history/i);
  assert.match(baseline, /alter table public\.leads enable row level security/i);
  assert.doesNotMatch(baseline, /insert into public\.leads/i);
  assert.doesNotMatch(baseline, /insert into public\.lead_history/i);
  assert.match(contents.get("20260911235034_add_lead_status.sql"), /leads_status_check/);
  assert.match(contents.get("20260913233511_add_business_settings.sql"), /create table if not exists public\.business_settings/i);
});

test("tenancy and booking migrations retain tenant-safe constraints and RLS", () => {
  const tenancy = contents.get("20260915000000_add_multi_tenant_auth.sql");
  const bookings = contents.get("20260915010000_add_bookings_actions.sql");
  assert.match(tenancy, /create table if not exists public\.businesses/i);
  assert.match(tenancy, /create table if not exists public\.business_memberships/i);
  assert.match(tenancy, /alter table public\.leads alter column business_id set not null/i);
  assert.match(bookings, /foreign key \(lead_id, business_id\)/i);
  assert.match(bookings, /foreign key \(booking_id, business_id\)/i);
  assert.match(bookings, /alter table public\.bookings enable row level security/i);
  assert.match(bookings, /alter table public\.actions enable row level security/i);
  assert.match(bookings, /revoke all on public\.bookings, public\.actions from anon, authenticated/i);
});
