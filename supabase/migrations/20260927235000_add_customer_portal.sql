-- Customer Portal: separate customer accounts from business memberships and
-- link only explicitly authenticated customer enquiries for status tracking.

create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_enquiry_access (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  lead_id bigint not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_user_id, lead_id)
);

create index if not exists customer_enquiry_access_user_created_idx
  on public.customer_enquiry_access(customer_user_id, created_at desc);
create index if not exists customer_enquiry_access_lead_idx
  on public.customer_enquiry_access(lead_id);

alter table public.customer_profiles enable row level security;
alter table public.customer_enquiry_access enable row level security;
revoke all on public.customer_profiles from anon, authenticated;
revoke all on public.customer_enquiry_access from anon, authenticated;
grant all on public.customer_profiles to service_role;
grant all on public.customer_enquiry_access to service_role;
