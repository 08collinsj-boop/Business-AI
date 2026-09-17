-- Stripe billing foundation. This is tenant-owned, additive, and deliberately
-- service-role managed: browser clients never write billing state directly.

create table if not exists public.business_billing_accounts (
  business_id uuid primary key references public.businesses(id) on delete restrict,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'none'
    check (plan in ('none', 'trial', 'starter', 'pro', 'business')),
  status text not null default 'inactive'
    check (status in ('inactive', 'active', 'trialing', 'past_due', 'cancelled', 'expired')),
  trial_purchased boolean not null default false,
  trial_started_at timestamptz,
  trial_expires_at timestamptz,
  current_period_started_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (plan <> 'trial') or (trial_purchased and trial_started_at is not null and trial_expires_at is not null)
  ),
  check ((trial_expires_at is null) or (trial_started_at is null) or trial_expires_at > trial_started_at),
  check ((current_period_ends_at is null) or (current_period_started_at is null) or current_period_ends_at > current_period_started_at)
);

create index if not exists business_billing_accounts_status_idx
  on public.business_billing_accounts (status, current_period_ends_at);
create table if not exists public.business_billing_usage (
  business_id uuid not null references public.businesses(id) on delete restrict,
  period_started_at timestamptz not null,
  metric text not null check (metric in ('ai_enquiries')),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (business_id, period_started_at, metric)
);
create index if not exists business_billing_usage_business_metric_idx
  on public.business_billing_usage (business_id, metric, period_started_at desc);

-- Idempotency ledger contains only the Stripe event id/type and internal
-- processing state. It deliberately stores no payment or customer payload.
create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key check (char_length(stripe_event_id) between 3 and 255),
  event_type text not null check (char_length(event_type) between 3 and 255),
  business_id uuid references public.businesses(id) on delete restrict,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error boolean not null default false
);
create index if not exists stripe_webhook_events_business_received_idx
  on public.stripe_webhook_events (business_id, received_at desc);

alter table public.business_billing_accounts enable row level security;
alter table public.business_billing_usage enable row level security;
alter table public.stripe_webhook_events enable row level security;
revoke all on public.business_billing_accounts, public.business_billing_usage, public.stripe_webhook_events from anon, authenticated;

-- Atomic consumption prevents concurrent serverless requests from exceeding
-- an entitled AI enquiry allowance. Only service_role receives EXECUTE.
create or replace function public.consume_billing_ai_enquiry_allowance(
  p_business_id uuid,
  p_period_started_at timestamptz,
  p_allowance integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean := false;
begin
  if p_business_id is null
    or p_period_started_at is null
    or p_allowance not between 1 and 1000000 then
    raise exception 'invalid billing allowance request';
  end if;

  insert into public.business_billing_usage (business_id, period_started_at, metric, quantity, updated_at)
    values (p_business_id, p_period_started_at, 'ai_enquiries', 1, now())
  on conflict (business_id, period_started_at, metric) do update
    set quantity = public.business_billing_usage.quantity + 1,
        updated_at = now()
    where public.business_billing_usage.quantity < p_allowance
  returning true into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;
revoke all on function public.consume_billing_ai_enquiry_allowance(uuid, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.consume_billing_ai_enquiry_allowance(uuid, timestamptz, integer) to service_role;
