-- Additive Dev rollout: deploy this before the version-requiring Colzo handler.
-- Legacy handlers remain unchanged; their writes also advance the version.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '10s';

alter table public.leads
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.colzo_stamp_lead_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;

revoke all on function public.colzo_stamp_lead_version() from public, anon, authenticated;
drop trigger if exists colzo_lead_write_version on public.leads;
create trigger colzo_lead_write_version
before update on public.leads
for each row execute function public.colzo_stamp_lead_version();
commit;
