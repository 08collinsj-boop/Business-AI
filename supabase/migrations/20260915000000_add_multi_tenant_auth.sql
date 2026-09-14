-- REVIEW ONLY: source controlled, intentionally not applied to production yet.
-- Preflight counts on the verified production baseline: leads=9, lead_history=7,
-- business_settings=1. Run the verification query in docs before applying.

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legacy_settings_id bigint unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_memberships (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index if not exists business_memberships_user_id_idx on public.business_memberships(user_id);

alter table public.leads add column if not exists business_id uuid;
alter table public.lead_history add column if not exists business_id uuid;
alter table public.business_settings add column if not exists business_id uuid;

-- Preserve the existing settings row as the first tenant. No Auth user or owner
-- membership is fabricated; owner onboarding is a separate authenticated step.
insert into public.businesses (name, legacy_settings_id)
select coalesce(nullif(trim(business_name), ''), 'My Business'), id
from public.business_settings
on conflict (legacy_settings_id) do nothing;

update public.business_settings s set business_id = b.id
from public.businesses b
where b.legacy_settings_id = s.id and s.business_id is null;

update public.leads l set business_id = s.business_id
from public.business_settings s
where l.business_id is null and s.business_id is not null;

update public.lead_history h set business_id = l.business_id
from public.leads l
where h.lead_id = l.id and h.business_id is null;

alter table public.leads alter column business_id set not null;
alter table public.lead_history alter column business_id set not null;
alter table public.business_settings alter column business_id set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'leads_business_id_fkey') then alter table public.leads add constraint leads_business_id_fkey foreign key (business_id) references public.businesses(id); end if;
  if not exists (select 1 from pg_constraint where conname = 'lead_history_business_id_fkey') then alter table public.lead_history add constraint lead_history_business_id_fkey foreign key (business_id) references public.businesses(id); end if;
  if not exists (select 1 from pg_constraint where conname = 'business_settings_business_id_fkey') then alter table public.business_settings add constraint business_settings_business_id_fkey foreign key (business_id) references public.businesses(id); end if;
end $$;
create index if not exists leads_business_id_created_at_idx on public.leads(business_id, created_at desc);
create index if not exists lead_history_business_id_lead_id_idx on public.lead_history(business_id, lead_id, created_at desc);
create unique index if not exists business_settings_business_id_idx on public.business_settings(business_id);

alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;

revoke all on public.businesses, public.business_memberships, public.leads, public.lead_history, public.business_settings from anon, authenticated;
grant select on public.businesses, public.business_memberships, public.leads, public.lead_history, public.business_settings to authenticated;

drop policy if exists "members read own memberships" on public.business_memberships;
drop policy if exists "members read businesses" on public.businesses;
drop policy if exists "members read leads" on public.leads;
drop policy if exists "members read lead history" on public.lead_history;
drop policy if exists "members read settings" on public.business_settings;
create policy "members read own memberships" on public.business_memberships for select to authenticated using (user_id = (select auth.uid()));
create policy "members read businesses" on public.businesses for select to authenticated using (exists (select 1 from public.business_memberships m where m.business_id = businesses.id and m.user_id = (select auth.uid())));
create policy "members read leads" on public.leads for select to authenticated using (exists (select 1 from public.business_memberships m where m.business_id = leads.business_id and m.user_id = (select auth.uid())));
create policy "members read lead history" on public.lead_history for select to authenticated using (exists (select 1 from public.business_memberships m where m.business_id = lead_history.business_id and m.user_id = (select auth.uid())));
create policy "members read settings" on public.business_settings for select to authenticated using (exists (select 1 from public.business_memberships m where m.business_id = business_settings.business_id and m.user_id = (select auth.uid())));

-- Writes remain server-authorized until dashboard API role checks are deployed.
