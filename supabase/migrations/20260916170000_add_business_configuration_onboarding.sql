-- Tenant-owned business configuration for self-service onboarding.
-- This is intentionally additive: existing business_settings rows remain the
-- compatibility source for the original dashboard and are never replaced.

create table if not exists public.business_configurations (
  business_id uuid primary key references public.businesses(id) on delete restrict,
  industry_template_id text not null default 'general'
    check (industry_template_id ~ '^[a-z][a-z0-9_]{0,63}$'),
  description text not null default '' check (char_length(description) <= 4000),
  website text not null default '' check (char_length(website) <= 2048),
  service_areas text not null default '' check (char_length(service_areas) <= 4000),
  customer_enquiry_instructions text not null default ''
    check (char_length(customer_enquiry_instructions) <= 6000),
  faqs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(faqs) = 'array' and jsonb_array_length(faqs) <= 40),
  booking_preferences jsonb not null default '{}'::jsonb
    check (jsonb_typeof(booking_preferences) = 'object'),
  handover_instructions text not null default ''
    check (char_length(handover_instructions) <= 4000),
  enabled_modules jsonb not null default '{"enquiries": true, "bookings": true, "actions": true, "voice": false}'::jsonb
    check (jsonb_typeof(enabled_modules) = 'object'),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Each existing tenant receives a blank, safe configuration row. No customer
-- data, tenant identity, or existing settings are changed or copied.
insert into public.business_configurations (business_id)
select id from public.businesses
on conflict (business_id) do nothing;

create index if not exists business_configurations_template_idx
  on public.business_configurations (industry_template_id);

alter table public.business_configurations enable row level security;

-- Browser clients have no direct write access. Dashboard mutations go through
-- the server, which validates the session, membership and role first.
revoke all on public.business_configurations from anon, authenticated;
grant select on public.business_configurations to authenticated;

drop policy if exists "members read business configuration" on public.business_configurations;
create policy "members read business configuration"
  on public.business_configurations for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships membership
      where membership.business_id = business_configurations.business_id
        and membership.user_id = (select auth.uid())
    )
  );
