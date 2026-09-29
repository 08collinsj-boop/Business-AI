-- Business referral programme: server-owned referral codes, qualification and rewards.
-- Five first-paid referred businesses earn one free base-plan month for the referrer.

create table if not exists public.business_referral_profiles (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  referral_code text not null unique
    check (referral_code ~ '^BAI-[A-Z0-9]{10}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_business_id uuid not null references public.businesses(id) on delete restrict,
  referred_business_id uuid not null unique references public.businesses(id) on delete restrict,
  referral_code text not null,
  status text not null default 'pending'
    check (status in ('pending', 'qualified')),
  qualifying_event_id text unique,
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  check (referrer_business_id <> referred_business_id)
);

create index if not exists business_referrals_referrer_status_idx
  on public.business_referrals (referrer_business_id, status, created_at);

create table if not exists public.business_referral_rewards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  sequence_number integer not null check (sequence_number > 0),
  referral_threshold integer not null default 5 check (referral_threshold = 5),
  status text not null default 'earned'
    check (status in ('earned', 'scheduled', 'redeemed')),
  earned_at timestamptz not null default now(),
  scheduled_at timestamptz,
  redeemed_at timestamptz,
  stripe_subscription_id text,
  stripe_subscription_item_id text,
  stripe_coupon_id text,
  stripe_invoice_id text,
  unique (business_id, sequence_number)
);

create index if not exists business_referral_rewards_business_status_idx
  on public.business_referral_rewards (business_id, status, sequence_number);

alter table public.business_referral_profiles enable row level security;
alter table public.business_referrals enable row level security;
alter table public.business_referral_rewards enable row level security;

revoke all on public.business_referral_profiles from public, anon, authenticated;
revoke all on public.business_referrals from public, anon, authenticated;
revoke all on public.business_referral_rewards from public, anon, authenticated;
grant select, insert, update, delete on public.business_referral_profiles to service_role;
grant select, insert, update, delete on public.business_referrals to service_role;
grant select, insert, update, delete on public.business_referral_rewards to service_role;

insert into public.business_referral_profiles (business_id, referral_code)
select
  business.id,
  'BAI-' || upper(left(replace(business.id::text, '-', ''), 10))
from public.businesses business
on conflict (business_id) do nothing;

create or replace function public.create_business_for_owner_with_referral(
  p_owner_user_id uuid,
  p_business_name text,
  p_business_type text,
  p_public_slug text,
  p_referral_code text default null
)
returns table (business_id uuid, public_slug text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_business_id uuid;
  v_public_slug text;
  v_referral_code text;
  v_referrer_business_id uuid;
begin
  v_referral_code := nullif(upper(trim(coalesce(p_referral_code, ''))), '');

  if v_referral_code is not null then
    if v_referral_code !~ '^BAI-[A-Z0-9]{10}$' then
      raise exception 'invalid referral code';
    end if;
    select profile.business_id
      into v_referrer_business_id
    from public.business_referral_profiles profile
    where profile.referral_code = v_referral_code;
    if v_referrer_business_id is null then
      raise exception 'invalid referral code';
    end if;
  end if;

  select created.business_id, created.public_slug
    into v_business_id, v_public_slug
  from public.create_business_for_owner(
    p_owner_user_id,
    p_business_name,
    p_business_type,
    p_public_slug
  ) created;

  insert into public.business_referral_profiles (business_id, referral_code)
  values (
    v_business_id,
    'BAI-' || upper(left(replace(v_business_id::text, '-', ''), 10))
  )
  on conflict (business_id) do nothing;

  if v_referrer_business_id is not null then
    insert into public.business_referrals (
      referrer_business_id,
      referred_business_id,
      referral_code
    )
    values (
      v_referrer_business_id,
      v_business_id,
      v_referral_code
    );
  end if;

  return query select v_business_id, v_public_slug;
end;
$$;

revoke all on function public.create_business_for_owner_with_referral(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_business_for_owner_with_referral(uuid, text, text, text, text) to service_role;

create or replace function public.qualify_business_referral(
  p_referred_business_id uuid,
  p_event_id text
)
returns table (
  referrer_business_id uuid,
  reward_id uuid,
  reward_earned boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral public.business_referrals%rowtype;
  v_qualified_count integer;
  v_sequence integer;
  v_reward_id uuid;
begin
  if p_referred_business_id is null or nullif(trim(coalesce(p_event_id, '')), '') is null then
    return;
  end if;

  select *
    into v_referral
  from public.business_referrals
  where referred_business_id = p_referred_business_id
  for update;

  if not found then
    return;
  end if;

  if v_referral.status = 'qualified' then
    return query select v_referral.referrer_business_id, null::uuid, false;
    return;
  end if;

  update public.business_referrals
  set
    status = 'qualified',
    qualifying_event_id = p_event_id,
    qualified_at = now()
  where id = v_referral.id;

  select count(*)::integer
    into v_qualified_count
  from public.business_referrals
  where referrer_business_id = v_referral.referrer_business_id
    and status = 'qualified';

  if v_qualified_count > 0 and mod(v_qualified_count, 5) = 0 then
    v_sequence := v_qualified_count / 5;
    insert into public.business_referral_rewards (
      business_id,
      sequence_number,
      referral_threshold
    )
    values (
      v_referral.referrer_business_id,
      v_sequence,
      5
    )
    on conflict (business_id, sequence_number) do nothing
    returning id into v_reward_id;
  end if;

  return query
    select v_referral.referrer_business_id, v_reward_id, v_reward_id is not null;
end;
$$;

revoke all on function public.qualify_business_referral(uuid, text) from public, anon, authenticated;
grant execute on function public.qualify_business_referral(uuid, text) to service_role;
