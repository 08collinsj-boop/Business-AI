create table if not exists public.business_incident_controls (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  ai_receptionist_paused boolean not null default false,
  marketing_generation_paused boolean not null default false,
  marketing_publishing_paused boolean not null default false,
  automatic_followups_paused boolean not null default false,
  customer_submissions_paused boolean not null default false,
  reason text not null default '',
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_incident_controls_reason_length check (char_length(reason) <= 500)
);

alter table public.business_incident_controls enable row level security;
revoke all on table public.business_incident_controls from anon, authenticated;
grant select, insert, update, delete on table public.business_incident_controls to service_role;

create table if not exists public.platform_incident_controls (
  id text primary key,
  ai_receptionist_paused boolean not null default false,
  marketing_generation_paused boolean not null default false,
  marketing_publishing_paused boolean not null default false,
  automatic_followups_paused boolean not null default false,
  customer_submissions_paused boolean not null default false,
  reason text not null default '',
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_incident_controls_singleton check (id = 'global'),
  constraint platform_incident_controls_reason_length check (char_length(reason) <= 500)
);

alter table public.platform_incident_controls enable row level security;
revoke all on table public.platform_incident_controls from anon, authenticated;
grant select, insert, update, delete on table public.platform_incident_controls to service_role;

insert into public.platform_incident_controls (id) values ('global') on conflict (id) do nothing;
