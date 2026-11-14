-- STAGED DESIGN ONLY. DO NOT APPLY TO DEVELOPMENT OR PRODUCTION.
-- The real Development backup and independent restore (Auth/Storage review),
-- operator approval, schema inspection and QA gates must pass first.
-- This file is intentionally OUTSIDE supabase/migrations; never auto-run.
-- Designed for PostgreSQL 17; test in a disposable isolated database first.

begin;

-- Existing actions and memberships already share business_id. The composite
-- foreign key prevents the service-role API from assigning another tenant's
-- user even if application-level membership validation is bypassed or races.
alter table public.actions
  add column if not exists assignee_user_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.actions'::regclass
      and conname = 'actions_assignee_business_membership_fkey'
  ) then
    alter table public.actions
      add constraint actions_assignee_business_membership_fkey
      foreign key (business_id, assignee_user_id)
      references public.business_memberships (business_id, user_id)
      on delete set null (assignee_user_id);
  end if;
end;
$$;

create index if not exists actions_business_assignee_status_idx
  on public.actions (business_id, assignee_user_id, status, due_at)
  where assignee_user_id is not null;

-- Existing actions RLS remains enabled; existing service-role-only write
-- patterns remain. Do not add public grants or weaken RLS policies.
commit;
