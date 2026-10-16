-- Colzo projects and quotes. Schema addition only; no customer data changes.
create table if not exists public.colzo_projects (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 lead_id bigint,
 title text not null check (char_length(title) between 3 and 160),
 client_name text not null default '' check (char_length(client_name)<=160),
 status text not null default 'planned' check(status in ('planned','active','paused','completed')),
 progress integer not null default 0 check(progress between 0 and 100),
 notes text not null default '' check (char_length(notes)<=4000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint colzo_projects_lead_tenant_fkey foreign key(lead_id,business_id) references public.leads(id,business_id) on delete restrict
);
create index if not exists colzo_projects_tenant_status_idx on public.colzo_projects(business_id,status,created_at desc);
alter table public.colzo_projects enable row level security;
revoke all on public.colzo_projects from public,anon,authenticated;
grant all on public.colzo_projects to service_role;
create table if not exists public.colzo_quotes (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 lead_id bigint not null,
 title text not null check(char_length(title) between 3 and 160),
 amount_gbp numeric(12,2) not null check(amount_gbp>=0 and amount_gbp<=999999999.99),
 notes text not null default '' check(char_length(notes)<=4000),
 status text not null default 'draft' check(status in ('draft','sent','accepted','declined')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint colzo_quotes_lead_tenant_fkey foreign key(lead_id,business_id) references public.leads(id,business_id) on delete restrict
);
create index if not exists colzo_quotes_tenant_lead_idx on public.colzo_quotes(business_id,lead_id,created_at desc);
alter table public.colzo_quotes enable row level security;
revoke all on public.colzo_quotes from public,anon,authenticated;
grant all on public.colzo_quotes to service_role;
-- Quotes are internal records: status 'sent' means a human confirms dispatch;
-- there is no automatic email, PDF or payment sent by this migration.

create table if not exists public.colzo_clients (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 full_name text not null check(char_length(full_name) between 2 and 160),
 email text not null default '' check(char_length(email)<=320),
 phone text not null default '' check(char_length(phone)<=80),
 notes text not null default '' check(char_length(notes)<=4000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists colzo_clients_business_idx on public.colzo_clients(business_id,full_name);
alter table public.colzo_clients enable row level security;
revoke all on public.colzo_clients from public,anon,authenticated;
grant all on public.colzo_clients to service_role;
