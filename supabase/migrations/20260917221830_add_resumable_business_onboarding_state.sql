-- Resumable, tenant-owned setup state. Existing configuration and settings are
-- preserved; the application treats sufficiently configured legacy tenants as
-- complete without rewriting their data.
alter table public.business_configurations
  add column if not exists onboarding_step text not null default 'business'
    check (onboarding_step in ('business', 'location', 'services', 'hours', 'ai', 'knowledge', 'review', 'completed')),
  add column if not exists onboarding_started_at timestamptz,
  add column if not exists service_delivery_mode text not null default 'unspecified'
    check (service_delivery_mode in ('unspecified', 'premises', 'travel', 'both'));

create index if not exists business_configurations_onboarding_step_idx
  on public.business_configurations (onboarding_step)
  where onboarding_completed_at is null;
