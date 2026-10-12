-- Source-only automation foundation. Live sends need explicit provider setup and release gates.
alter table public.business_settings
  add column if not exists review_email_auto_enabled boolean not null default false,
  add column if not exists review_email_delay_hours integer not null default 24;
alter table public.business_settings drop constraint if exists business_settings_review_email_delay_hours_check;
alter table public.business_settings add constraint business_settings_review_email_delay_hours_check
  check (review_email_delay_hours in (0, 24, 48, 72));
alter table public.bookings add column if not exists review_email_allowed boolean not null default false;
create table if not exists public.review_email_outbox (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  booking_id bigint not null,
  customer_email text not null check (char_length(customer_email) <= 320),
  business_name text not null check (char_length(business_name) <= 120),
  review_url text not null check (char_length(review_url) <= 2048),
  review_platform text not null check (review_platform in ('google','facebook','trustpilot')),
  send_after timestamptz not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled','unknown')),
  attempted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_email_outbox_tenant_booking_fk foreign key(booking_id,business_id)
    references public.bookings(id,business_id) on delete restrict,
  constraint review_email_outbox_one_per_booking unique (business_id,booking_id)
);
create index if not exists review_email_outbox_due_idx on public.review_email_outbox(send_after) where status='pending';
alter table public.review_email_outbox enable row level security;
revoke all on public.review_email_outbox from public,anon,authenticated;
grant all on public.review_email_outbox to service_role;

-- Atomic, at-most-once claim. Ambiguous send attempts remain 'unknown' for manual reconciliation.
create or replace function public.claim_due_review_emails(p_limit integer default 10)
returns setof public.review_email_outbox
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  return query
  with claimed as (
    select id from public.review_email_outbox
    where status='pending' and send_after<=now()
    order by send_after asc
    limit least(greatest(coalesce(p_limit,1),1),20)
    for update skip locked
  )
  update public.review_email_outbox e
  set status='processing', attempted_at=now(), updated_at=now()
  from claimed where e.id=claimed.id
  returning e.*;
end;
$$;
revoke all on function public.claim_due_review_emails(integer) from public,anon,authenticated;
grant execute on function public.claim_due_review_emails(integer) to service_role;
