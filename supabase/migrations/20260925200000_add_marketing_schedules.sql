-- Pilot marketing scheduling groundwork (management only).
-- Scheduled drafts stay in 'scheduled' status until a future processor acts.
-- Nothing here publishes, claims provider results, or touches billing.
-- Writes continue through server routes using the service role.

create table if not exists public.marketing_schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  marketing_generation_id uuid not null,
  platform text not null check (platform in (
    'facebook',
    'instagram',
    'linkedin',
    'general'
  )),
  scheduled_for timestamptz not null,
  status text not null default 'scheduled' check (status in (
    'scheduled',
    'cancelled',
    'posted',
    'failed'
  )),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_schedules_generation_business_fkey
    foreign key (marketing_generation_id, business_id)
    references public.marketing_generations(id, business_id)
    on delete cascade,
  unique (id, business_id)
);

create index if not exists marketing_schedules_business_upcoming_idx
  on public.marketing_schedules (business_id, status, scheduled_for asc);
create index if not exists marketing_schedules_generation_idx
  on public.marketing_schedules (marketing_generation_id, business_id);

alter table public.marketing_schedules enable row level security;

revoke all on public.marketing_schedules from anon, authenticated;
grant select on public.marketing_schedules to authenticated;
grant all on public.marketing_schedules to service_role;

create policy "members read own marketing schedules"
  on public.marketing_schedules for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships membership
      where membership.business_id = marketing_schedules.business_id
        and membership.user_id = (select auth.uid())
    )
  );
