-- Forward-only: customer-authenticated complaints, human-managed and tenant-scoped.
-- Apply only to a separate development database after migration review.
create table if not exists public.customer_complaints (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  lead_id bigint not null,
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(subject) between 5 and 160),
  description text not null check (char_length(description) between 10 and 4000),
  status text not null default 'received'
    check (status in ('received','in_review','responded','resolved','reopened')),
  response_note text not null default '' check (char_length(response_note) <= 3000),
  responded_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_complaints_lead_tenant_fkey foreign key (lead_id, business_id)
    references public.leads(id, business_id) on delete restrict,
  constraint customer_complaints_customer_lead_unique unique (customer_user_id, lead_id)
);
create index if not exists customer_complaints_business_status_idx
  on public.customer_complaints (business_id, status, created_at desc);
create index if not exists customer_complaints_customer_idx
  on public.customer_complaints (customer_user_id, created_at desc);

alter table public.customer_complaints enable row level security;
revoke all on public.customer_complaints from public, anon, authenticated;
grant all on public.customer_complaints to service_role;
-- No anon/authenticated grants or permissive RLS policies. API verifies both
-- Supabase Auth and server-resolved business membership/customer enquiry link.
comment on table public.customer_complaints is
  'Private complaints with explicit tenant and customer ownership; never public reviews.';
