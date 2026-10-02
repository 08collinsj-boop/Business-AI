-- Pilot AI Marketing strategy and weekly planning state.
-- Keeps legacy planning columns compatible while introducing a dedicated tenant-scoped strategy table.

alter table public.marketing_automation_settings
  add column if not exists strategy jsonb,
  add column if not exists weekly_plan jsonb not null default '[]'::jsonb;

alter table public.marketing_automation_settings
  drop constraint if exists marketing_automation_strategy_object_check,
  add constraint marketing_automation_strategy_object_check
    check (strategy is null or jsonb_typeof(strategy) = 'object'),
  drop constraint if exists marketing_automation_weekly_plan_array_check,
  add constraint marketing_automation_weekly_plan_array_check
    check (jsonb_typeof(weekly_plan) = 'array');

create table if not exists public.marketing_strategy_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  goals jsonb not null default '["enquiries","build_trust"]'::jsonb,
  pillars jsonb not null default '[{"key":"services","enabled":true,"weight":30},{"key":"completed_work","enabled":true,"weight":25},{"key":"advice","enabled":true,"weight":20},{"key":"trust","enabled":true,"weight":15},{"key":"offers","enabled":true,"weight":5},{"key":"updates","enabled":true,"weight":5}]'::jsonb,
  weekly_posts smallint not null default 4 check (weekly_posts between 1 and 7),
  preferred_time text not null default '18:30' check (preferred_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  weekly_plan jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_strategy_goals_array check (jsonb_typeof(goals) = 'array'),
  constraint marketing_strategy_pillars_array check (jsonb_typeof(pillars) = 'array'),
  constraint marketing_strategy_plan_array check (jsonb_typeof(weekly_plan) = 'array')
);

create index if not exists marketing_strategy_settings_updated_by_idx
  on public.marketing_strategy_settings (updated_by) where updated_by is not null;

alter table public.marketing_strategy_settings enable row level security;
revoke all on public.marketing_strategy_settings from anon, authenticated;
grant select on public.marketing_strategy_settings to authenticated;
grant all on public.marketing_strategy_settings to service_role;

drop policy if exists "members read own marketing strategy" on public.marketing_strategy_settings;
create policy "members read own marketing strategy"
  on public.marketing_strategy_settings for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships membership
      where membership.business_id = marketing_strategy_settings.business_id
        and membership.user_id = (select auth.uid())
    )
  );
