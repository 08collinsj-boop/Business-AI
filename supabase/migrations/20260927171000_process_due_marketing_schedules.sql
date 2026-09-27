-- Execute saved Marketing schedules through the existing idempotent publication pipeline.

alter table public.marketing_schedules
  add column if not exists publication_id uuid,
  add column if not exists claimed_at timestamptz,
  add column if not exists processed_at timestamptz,
  add column if not exists attempts integer not null default 0,
  add column if not exists failure_code text,
  add column if not exists failure_message text;

alter table public.marketing_schedules
  drop constraint if exists marketing_schedules_status_check;
alter table public.marketing_schedules
  add constraint marketing_schedules_status_check
  check (status in ('scheduled','processing','cancelled','posted','failed'));

alter table public.marketing_schedules
  drop constraint if exists marketing_schedules_attempts_check;
alter table public.marketing_schedules
  add constraint marketing_schedules_attempts_check
  check (attempts between 0 and 5);

alter table public.marketing_schedules
  drop constraint if exists marketing_schedules_failure_code_check;
alter table public.marketing_schedules
  add constraint marketing_schedules_failure_code_check
  check (failure_code is null or char_length(failure_code) <= 120);

alter table public.marketing_schedules
  drop constraint if exists marketing_schedules_failure_message_check;
alter table public.marketing_schedules
  add constraint marketing_schedules_failure_message_check
  check (failure_message is null or char_length(failure_message) <= 500);

alter table public.marketing_schedules
  drop constraint if exists marketing_schedules_publication_business_fkey;
alter table public.marketing_schedules
  add constraint marketing_schedules_publication_business_fkey
  foreign key (publication_id, business_id)
  references public.marketing_publications(id, business_id)
  on delete set null;

create index if not exists marketing_schedules_due_idx
  on public.marketing_schedules (status, scheduled_for asc);

create or replace function public.claim_due_marketing_schedules(p_limit integer default 10)
returns setof public.marketing_schedules
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_limit < 1 or p_limit > 50 then
    raise exception 'invalid claim limit';
  end if;

  return query
  with due as (
    select id
    from public.marketing_schedules
    where attempts < 5
      and (
        (status = 'scheduled' and scheduled_for <= now())
        or
        (status = 'processing' and claimed_at < now() - interval '15 minutes')
      )
    order by scheduled_for asc
    for update skip locked
    limit p_limit
  )
  update public.marketing_schedules s
  set status = 'processing',
      claimed_at = now(),
      attempts = attempts + 1,
      failure_code = null,
      failure_message = null,
      updated_at = now()
  from due
  where s.id = due.id
  returning s.*;
end $$;

revoke all on function public.claim_due_marketing_schedules(integer) from public, anon, authenticated;
grant execute on function public.claim_due_marketing_schedules(integer) to service_role;
