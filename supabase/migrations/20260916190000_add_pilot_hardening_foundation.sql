-- Pilot-readiness foundation: durable public quotas, protected audit events,
-- and tenant-owned data-lifecycle preferences. This is additive only.

create table if not exists public.business_audit_events (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete restrict,
  actor_user_id uuid,
  action text not null check (action ~ '^[a-z][a-z0-9_.]{2,99}$'),
  resource_type text not null check (resource_type ~ '^[a-z][a-z0-9_]{1,63}$'),
  resource_id text not null default '' check (char_length(resource_id) <= 200),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists business_audit_events_business_created_idx
  on public.business_audit_events (business_id, created_at desc);
create index if not exists business_audit_events_business_resource_idx
  on public.business_audit_events (business_id, resource_type, resource_id, created_at desc);

alter table public.business_audit_events enable row level security;
revoke all on public.business_audit_events from anon, authenticated;
grant select on public.business_audit_events to authenticated;
drop policy if exists "admins read audit events" on public.business_audit_events;
create policy "admins read audit events"
  on public.business_audit_events for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships membership
      where membership.business_id = business_audit_events.business_id
        and membership.user_id = (select auth.uid())
        and membership.role in ('owner', 'admin')
    )
  );

create table if not exists public.public_enquiry_rate_limit_buckets (
  business_id uuid not null references public.businesses(id) on delete restrict,
  source_fingerprint text not null
    check (source_fingerprint = '_business_' or source_fingerprint ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, source_fingerprint, window_started_at)
);
create index if not exists public_enquiry_rate_limit_buckets_window_idx
  on public.public_enquiry_rate_limit_buckets (window_started_at);

alter table public.public_enquiry_rate_limit_buckets enable row level security;
revoke all on public.public_enquiry_rate_limit_buckets from anon, authenticated;

-- Atomic cross-instance quota consumption. The source is a server-created
-- HMAC fingerprint, never a raw IP address. Only service_role can execute.
create or replace function public.consume_public_enquiry_quota(
  p_business_id uuid,
  p_source_fingerprint text,
  p_window_started_at timestamptz,
  p_source_limit integer default 20,
  p_business_limit integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_allowed boolean := false;
  v_source_allowed boolean := false;
begin
  if p_business_id is null
    or p_source_fingerprint !~ '^[a-f0-9]{64}$'
    or p_window_started_at is null
    or p_source_limit not between 1 and 1000
    or p_business_limit not between 1 and 10000 then
    raise exception 'invalid quota request';
  end if;
  delete from public.public_enquiry_rate_limit_buckets
    where window_started_at < p_window_started_at - interval '24 hours';

  insert into public.public_enquiry_rate_limit_buckets (business_id, source_fingerprint, window_started_at, request_count, updated_at)
    values (p_business_id, '_business_', p_window_started_at, 1, now())
  on conflict (business_id, source_fingerprint, window_started_at) do update
    set request_count = public_enquiry_rate_limit_buckets.request_count + 1,
        updated_at = now()
    where public_enquiry_rate_limit_buckets.request_count < p_business_limit
  returning true into v_total_allowed;
  if not coalesce(v_total_allowed, false) then return false; end if;

  insert into public.public_enquiry_rate_limit_buckets (business_id, source_fingerprint, window_started_at, request_count, updated_at)
    values (p_business_id, p_source_fingerprint, p_window_started_at, 1, now())
  on conflict (business_id, source_fingerprint, window_started_at) do update
    set request_count = public_enquiry_rate_limit_buckets.request_count + 1,
        updated_at = now()
    where public_enquiry_rate_limit_buckets.request_count < p_source_limit
  returning true into v_source_allowed;
  return coalesce(v_source_allowed, false);
end;
$$;
revoke all on function public.consume_public_enquiry_quota(uuid, text, timestamptz, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_public_enquiry_quota(uuid, text, timestamptz, integer, integer) to service_role;

create table if not exists public.business_data_lifecycle_policies (
  business_id uuid primary key references public.businesses(id) on delete restrict,
  lead_retention_days integer not null default 365 check (lead_retention_days between 30 and 3650),
  audit_retention_days integer not null default 730 check (audit_retention_days between 365 and 3650),
  updated_at timestamptz not null default now()
);
insert into public.business_data_lifecycle_policies (business_id)
select id from public.businesses
on conflict (business_id) do nothing;
alter table public.business_data_lifecycle_policies enable row level security;
revoke all on public.business_data_lifecycle_policies from anon, authenticated;
grant select on public.business_data_lifecycle_policies to authenticated;
drop policy if exists "admins read data lifecycle policies" on public.business_data_lifecycle_policies;
create policy "admins read data lifecycle policies"
  on public.business_data_lifecycle_policies for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships membership
      where membership.business_id = business_data_lifecycle_policies.business_id
        and membership.user_id = (select auth.uid())
        and membership.role in ('owner', 'admin')
    )
  );
