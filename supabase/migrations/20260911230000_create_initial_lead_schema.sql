-- Fresh-project baseline reconstructed from the verified Business AI schema.
-- It creates no customer/lead data and is intentionally ordered before the
-- historical status, settings, tenancy, and bookings/actions migrations.

create table if not exists public.leads (
  id bigint generated always as identity primary key,
  name text,
  phone text,
  email text,
  location text,
  job_type text,
  description text,
  urgency text,
  qualified boolean default false,
  created_at timestamptz default now(),
  estimated_value numeric default 0,
  notes text default '',
  priority text default 'Normal',
  follow_up_date date
);

create table if not exists public.lead_history (
  id bigint generated always as identity primary key,
  lead_id bigint not null references public.leads(id),
  action text not null,
  old_value text default '',
  new_value text default '',
  created_at timestamptz not null default now()
);

create index if not exists lead_history_lead_id_idx
  on public.lead_history (lead_id);
create index if not exists lead_history_created_at_idx
  on public.lead_history (created_at desc);

-- The later tenancy migration installs the membership policies. Enabling RLS
-- here ensures a fresh project never exposes lead data between migrations.
alter table public.leads enable row level security;
alter table public.lead_history enable row level security;
