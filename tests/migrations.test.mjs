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
    "20260916170000_add_business_configuration_onboarding.sql",
    "20260916180000_add_business_creation_and_public_routes.sql",
    "20260916190000_add_pilot_hardening_foundation.sql",
    "20260916191000_add_lifecycle_policy_for_new_businesses.sql",
    "20260917113857_add_pilot_team_and_handover_operations.sql",
    "20260917202438_add_stripe_billing_foundation.sql",
    "20260917203724_add_atomic_paid_trial_activation.sql",
    "20260917221830_add_resumable_business_onboarding_state.sql",
    "20260922160645_add_ai_handling_modes.sql",
    "20260923120000_add_addons_marketing.sql",
    "20260923190000_add_ai_enquiry_reservation_release.sql",
    "20260923193000_add_business_knowledge_uploads.sql",
    "20260923200000_add_marketing_publishing_and_feedback.sql",
    "20260923213424_add_marketing_billing_period_allowances.sql",
    "20260925174629_fix_stripe_marketing_entitlement_sync.sql",
    "20260925174915_align_stripe_entitlement_expiry_constraint.sql",
    "20260925200000_add_marketing_schedules.sql"
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
  const publicRoutes = contents.get("20260916180000_add_business_creation_and_public_routes.sql");
  assert.match(publicRoutes, /create table if not exists public\.business_public_routes/i);
  assert.match(publicRoutes, /alter table public\.business_public_routes enable row level security/i);
  assert.match(publicRoutes, /revoke all on public\.business_public_routes from anon, authenticated/i);
  assert.match(publicRoutes, /security definer/i);
  assert.match(publicRoutes, /revoke all on function public\.create_business_for_owner/i);
  assert.match(publicRoutes, /grant execute on function public\.create_business_for_owner[\s\S]*to service_role/i);
  const hardening = contents.get("20260916190000_add_pilot_hardening_foundation.sql");
  assert.match(hardening, /create table if not exists public\.business_audit_events/i);
  assert.match(hardening, /create table if not exists public\.public_enquiry_rate_limit_buckets/i);
  assert.match(hardening, /create table if not exists public\.business_data_lifecycle_policies/i);
  assert.match(hardening, /revoke all on public\.business_audit_events from anon, authenticated/i);
  assert.match(hardening, /grant execute on function public\.consume_public_enquiry_quota[\s\S]*to service_role/i);
  const lifecycleDefaults = contents.get("20260916191000_add_lifecycle_policy_for_new_businesses.sql");
  assert.match(lifecycleDefaults, /create_default_business_data_lifecycle_policy/i);
  assert.match(lifecycleDefaults, /after insert on public\.businesses/i);
  assert.match(lifecycleDefaults, /revoke all on function public\.create_default_business_data_lifecycle_policy\(\) from public, anon, authenticated/i);
  const operations = contents.get("20260917113857_add_pilot_team_and_handover_operations.sql");
  assert.match(operations, /create table if not exists public\.business_team_invitations/i);
  assert.match(operations, /create table if not exists public\.lead_handovers/i);
  assert.match(operations, /revoke all on public\.business_team_invitations from anon, authenticated/i);
  assert.match(operations, /revoke all on public\.lead_handovers from anon, authenticated/i);
  assert.match(operations, /foreign key \(lead_id, business_id\)/i);
  const billing = contents.get("20260917202438_add_stripe_billing_foundation.sql");
  assert.match(billing, /create table if not exists public\.business_billing_accounts/i);
  assert.match(billing, /create table if not exists public\.business_billing_usage/i);
  assert.match(billing, /create table if not exists public\.stripe_webhook_events/i);
  assert.match(billing, /alter table public\.business_billing_accounts enable row level security/i);
  assert.match(billing, /revoke all on public\.business_billing_accounts, public\.business_billing_usage, public\.stripe_webhook_events from anon, authenticated/i);
  assert.match(billing, /consume_billing_ai_enquiry_allowance/i);
  assert.match(billing, /grant execute on function public\.consume_billing_ai_enquiry_allowance[\s\S]*to service_role/i);
  const billingRelease = contents.get("20260923190000_add_ai_enquiry_reservation_release.sql");
  assert.match(billingRelease, /create or replace function public\.release_billing_ai_enquiry_allowance/i);
  assert.match(billingRelease, /quantity = greatest\(quantity - 1, 0\)/i);
  assert.match(billingRelease, /revoke all on function public\.release_billing_ai_enquiry_allowance[\s\S]*from public, anon, authenticated/i);
  assert.match(billingRelease, /grant execute on function public\.release_billing_ai_enquiry_allowance[\s\S]*to service_role/i);
  const knowledge = contents.get("20260923193000_add_business_knowledge_uploads.sql");
  assert.match(knowledge, /create table if not exists public\.business_knowledge_sources/i);
  assert.match(knowledge, /create table if not exists public\.business_knowledge_items/i);
  assert.match(knowledge, /foreign key \(source_id, business_id\)/i);
  assert.match(knowledge, /alter table public\.business_knowledge_sources enable row level security/i);
  assert.match(knowledge, /alter table public\.business_knowledge_items enable row level security/i);
  assert.match(knowledge, /revoke all on public\.business_knowledge_sources, public\.business_knowledge_items from anon, authenticated/i);
  assert.match(knowledge, /members read own knowledge sources/i);
  assert.match(knowledge, /members read own knowledge items/i);
  assert.match(knowledge, /insert into storage\.buckets/i);
  assert.match(knowledge, /'business-knowledge'/i);
  assert.match(knowledge, /public, file_size_limit, allowed_mime_types/i);
  assert.doesNotMatch(knowledge, /create policy[\s\S]*for insert[\s\S]*storage\.objects/i);
  const marketingPublishing = contents.get("20260923200000_add_marketing_publishing_and_feedback.sql");
  assert.match(marketingPublishing, /alter table public\.marketing_generations[\s\S]*add column if not exists approval_status/i);
  assert.match(marketingPublishing, /create table if not exists public\.marketing_meta_oauth_states/i);
  assert.match(marketingPublishing, /create table if not exists public\.marketing_meta_connections/i);
  assert.match(marketingPublishing, /create table if not exists public\.marketing_social_accounts/i);
  assert.match(marketingPublishing, /create table if not exists public\.marketing_publications/i);
  assert.match(marketingPublishing, /create table if not exists public\.pilot_feedback/i);
  assert.match(marketingPublishing, /alter table public\.marketing_meta_connections enable row level security/i);
  assert.match(marketingPublishing, /revoke all on public\.marketing_meta_connections from anon, authenticated/i);
  assert.match(marketingPublishing, /grant select \(id,business_id,connection_id,platform,provider_account_id,display_name,linked_page_provider_id,selected,status,created_at,updated_at\)[\s\S]*on public\.marketing_social_accounts to authenticated/i);
  assert.match(marketingPublishing, /revoke all on function public\.claim_due_marketing_publications/i);
  assert.match(marketingPublishing, /grant execute on function public\.claim_due_marketing_publications[\s\S]*to service_role/i);
  assert.match(marketingPublishing, /create or replace function public\.claim_marketing_publication/i);
  assert.match(marketingPublishing, /revoke all on function public\.claim_marketing_publication\(uuid,uuid\)[\s\S]*from public, anon, authenticated/i);
  assert.match(marketingPublishing, /grant execute on function public\.claim_marketing_publication\(uuid,uuid\) to service_role/i);
  assert.match(marketingPublishing, /create or replace function public\.sync_business_billing_from_stripe/i);
  assert.match(marketingPublishing, /revoke all on function public\.sync_business_billing_from_stripe/i);
  assert.match(marketingPublishing, /grant execute on function public\.sync_business_billing_from_stripe[\s\S]*to service_role/i);
  assert.match(marketingPublishing, /foreign key \(generation_id, business_id\)/i);
  assert.match(marketingPublishing, /foreign key \(social_account_id, business_id\)/i);
  assert.doesNotMatch(marketingPublishing, /grant select[\s\S]*access_token_ciphertext[\s\S]*to authenticated/i);
  const paidTrial = contents.get("20260917203724_add_atomic_paid_trial_activation.sql");
  assert.match(paidTrial, /create or replace function public\.activate_paid_business_trial/i);
  assert.match(paidTrial, /where not public\.business_billing_accounts\.trial_purchased/i);
  assert.match(paidTrial, /revoke all on function public\.activate_paid_business_trial/i);
  const onboardingState = contents.get("20260917221830_add_resumable_business_onboarding_state.sql");
  assert.match(onboardingState, /add column if not exists onboarding_step/i);
  assert.match(onboardingState, /service_delivery_mode/i);
});
