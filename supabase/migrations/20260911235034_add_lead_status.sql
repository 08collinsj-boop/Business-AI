-- Historical production migration, source-controlled for fresh Dev bootstrap.
alter table public.leads
add column if not exists status text not null default 'New';

alter table public.leads
drop constraint if exists leads_status_check;

alter table public.leads
add constraint leads_status_check
check (status in ('New', 'Contacted', 'Converted'));
