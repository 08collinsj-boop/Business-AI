-- Forward-only migration. Apply only after review to the same Supabase project
-- that already contains businesses, business_memberships, and tenant-owned leads.
-- It does not modify or backfill existing records.

create unique index if not exists leads_id_business_id_idx
  on public.leads (id, business_id);

create table if not exists public.bookings (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete restrict,
  lead_id bigint,
  title text not null,
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  location text not null default '',
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'completed', 'cancelled')),
  notes text not null default '',
  source text not null default 'manual'
    check (source in ('manual', 'ai_request', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_lead_business_fkey
    foreign key (lead_id, business_id)
    references public.leads (id, business_id)
    on delete restrict,
  constraint bookings_times_check
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create unique index if not exists bookings_id_business_id_idx
  on public.bookings (id, business_id);
create index if not exists bookings_business_starts_at_idx
  on public.bookings (business_id, starts_at asc);
create index if not exists bookings_business_status_idx
  on public.bookings (business_id, status, starts_at asc);
create index if not exists bookings_business_lead_id_idx
  on public.bookings (business_id, lead_id);

create table if not exists public.actions (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete restrict,
  lead_id bigint,
  booking_id bigint,
  title text not null,
  description text not null default '',
  action_type text not null default 'custom'
    check (action_type in ('call_customer', 'send_quote', 'follow_up', 'confirm_appointment', 'review_enquiry', 'custom')),
  due_at timestamptz,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint actions_lead_business_fkey
    foreign key (lead_id, business_id)
    references public.leads (id, business_id)
    on delete restrict,
  constraint actions_booking_business_fkey
    foreign key (booking_id, business_id)
    references public.bookings (id, business_id)
    on delete restrict,
  constraint actions_completed_at_check
    check (
      (status = 'completed' and completed_at is not null)
      or (status <> 'completed' and completed_at is null)
    )
);

create index if not exists actions_business_due_at_idx
  on public.actions (business_id, due_at asc)
  where status = 'pending';
create index if not exists actions_business_status_idx
  on public.actions (business_id, status, due_at asc);
create index if not exists actions_business_lead_id_idx
  on public.actions (business_id, lead_id);
create index if not exists actions_business_booking_id_idx
  on public.actions (business_id, booking_id);

alter table public.bookings enable row level security;
alter table public.actions enable row level security;

-- Dashboard writes remain exclusively server-authorized. RLS permits direct
-- authenticated reads only for the caller's membership, matching existing tables.
revoke all on public.bookings, public.actions from anon, authenticated;
grant select on public.bookings, public.actions to authenticated;

drop policy if exists "members read bookings" on public.bookings;
drop policy if exists "members read actions" on public.actions;

create policy "members read bookings"
  on public.bookings for select to authenticated
  using (
    exists (
      select 1
      from public.business_memberships membership
      where membership.business_id = bookings.business_id
        and membership.user_id = (select auth.uid())
    )
  );

create policy "members read actions"
  on public.actions for select to authenticated
  using (
    exists (
      select 1
      from public.business_memberships membership
      where membership.business_id = actions.business_id
        and membership.user_id = (select auth.uid())
    )
  );
