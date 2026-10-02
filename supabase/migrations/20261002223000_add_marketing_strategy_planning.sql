-- Pilot AI Marketing strategy and weekly planning state.
-- Keeps planning tenant-scoped inside the existing owner-controlled Marketing settings row.

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
