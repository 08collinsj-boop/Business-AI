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
    "20260915010000_add_bookings_actions.sql",
    "20260916153249_add_voice_receptionist_foundation.sql",
    "20260916154907_add_voice_foreign_key_indexes.sql",
    "20260916170000_add_business_configuration_onboarding.sql"
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

test("tenancy, booking, and voice migrations retain tenant-safe constraints and RLS", () => {
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
  const voice = contents.get("20260916153249_add_voice_receptionist_foundation.sql");
  assert.match(voice, /create table if not exists public\.voice_provider_connections/i);
  assert.match(voice, /create table if not exists public\.voice_phone_numbers/i);
  assert.match(voice, /create table if not exists public\.voice_calls/i);
  assert.match(voice, /create table if not exists public\.voice_call_events/i);
  assert.match(voice, /foreign key \(call_id, business_id\)/i);
  assert.match(voice, /foreign key \(lead_id, business_id\)/i);
  assert.match(voice, /alter table public\.voice_calls enable row level security/i);
  assert.match(voice, /revoke all on public\.voice_provider_connections, public\.voice_phone_numbers/i);
  const voiceIndexes = contents.get("20260916154907_add_voice_foreign_key_indexes.sql");
  assert.match(voiceIndexes, /voice_calls_lead_business_id_idx/i);
  assert.match(voiceIndexes, /voice_call_events_call_business_id_idx/i);
  const configuration = contents.get("20260916170000_add_business_configuration_onboarding.sql");
  assert.match(configuration, /create table if not exists public\.business_configurations/i);
  assert.match(configuration, /business_id uuid primary key references public\.businesses/i);
  assert.match(configuration, /alter table public\.business_configurations enable row level security/i);
  assert.match(configuration, /revoke all on public\.business_configurations from anon, authenticated/i);
  assert.match(configuration, /members read business configuration/i);
});
