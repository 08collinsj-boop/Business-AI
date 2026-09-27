-- Use Meta's native Page scheduling for new Facebook schedules.
-- Fallback worker schedules remain supported for non-native rows.

alter table public.marketing_schedules
  add column if not exists provider_post_id text,
  add column if not exists native_scheduled boolean not null default false;

alter table public.marketing_schedules
  drop constraint if exists marketing_schedules_provider_post_id_check;
alter table public.marketing_schedules
  add constraint marketing_schedules_provider_post_id_check
  check (provider_post_id is null or char_length(provider_post_id) <= 300);

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
    where coalesce(native_scheduled, false) = false
      and attempts < 5
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
