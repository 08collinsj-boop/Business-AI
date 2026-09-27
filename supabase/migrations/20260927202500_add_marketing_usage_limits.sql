-- Marketing usage guardrails for Pilot launch.
-- Automated Marketing remains daily by default. Facebook publishing is capped
-- in the application layer, while AI usage is atomically reserved here.

create table if not exists public.marketing_image_usage_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  generation_id uuid not null,
  created_at timestamptz not null default now(),
  constraint marketing_image_usage_generation_business_fkey
    foreign key (generation_id, business_id)
    references public.marketing_generations(id, business_id)
    on delete cascade
);

create index if not exists marketing_image_usage_business_created_idx
  on public.marketing_image_usage_events (business_id, created_at desc);

alter table public.marketing_image_usage_events enable row level security;
revoke all on public.marketing_image_usage_events from anon, authenticated;
grant all on public.marketing_image_usage_events to service_role;

create or replace function public.reserve_marketing_image_usage(
  p_business_id uuid,
  p_generation_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  usage_id uuid;
  used_count integer;
  daily_limit integer;
  account_plan text;
begin
  perform pg_advisory_xact_lock(hashtextextended('marketing-image:' || p_business_id::text, 0));

  if not exists (
    select 1
    from public.marketing_generations
    where business_id = p_business_id
      and id = p_generation_id
      and status = 'completed'
  ) then
    return jsonb_build_object('allowed', false, 'reason', 'generation');
  end if;

  select plan into account_plan
  from public.business_billing_accounts
  where business_id = p_business_id;

  daily_limit := case account_plan
    when 'pro' then 10
    when 'business' then 20
    when 'trial' then 3
    when 'starter' then 3
    else 3
  end;

  select count(*) into used_count
  from public.marketing_image_usage_events
  where business_id = p_business_id
    and created_at > now() - interval '24 hours';

  if used_count >= daily_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'used', used_count,
      'limit', daily_limit
    );
  end if;

  insert into public.marketing_image_usage_events(business_id, generation_id)
  values (p_business_id, p_generation_id)
  returning id into usage_id;

  return jsonb_build_object(
    'allowed', true,
    'id', usage_id,
    'used', used_count + 1,
    'limit', daily_limit
  );
end $$;

revoke all on function public.reserve_marketing_image_usage(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_marketing_image_usage(uuid, uuid)
  to service_role;

create or replace function public.reserve_marketing_generation(
  p_business_id uuid,
  p_actor_user_id uuid,
  p_request jsonb,
  p_request_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  generation_id uuid;
  account public.business_billing_accounts%rowtype;
  period_start timestamptz;
  period_end timestamptz;
  allowance integer;
  daily_limit integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('marketing:' || p_business_id::text,0));

  if not exists (
    select 1 from public.business_memberships
    where business_id = p_business_id
      and user_id = p_actor_user_id
      and role in ('owner','admin','member')
  ) then
    return jsonb_build_object('allowed',false,'reason','membership');
  end if;

  select * into account
  from public.business_billing_accounts
  where business_id = p_business_id
  for share;

  if not found or account.status <> 'active' then
    return jsonb_build_object('allowed',false,'reason','entitlement');
  end if;

  if account.plan = 'trial' and account.trial_purchased then
    period_start := account.trial_started_at;
    period_end := account.trial_expires_at;
    allowance := 10;
    daily_limit := 10;
  elsif account.plan = 'starter' then
    period_start := account.current_period_started_at;
    period_end := account.current_period_ends_at;
    allowance := 100;
    daily_limit := 10;
  elsif account.plan = 'pro' then
    period_start := account.current_period_started_at;
    period_end := account.current_period_ends_at;
    allowance := 100;
    daily_limit := 25;
  elsif account.plan = 'business' then
    period_start := account.current_period_started_at;
    period_end := account.current_period_ends_at;
    allowance := 100;
    daily_limit := 50;
  else
    return jsonb_build_object('allowed',false,'reason','entitlement');
  end if;

  if account.plan in ('starter','pro','business') then
    perform 1
    from public.business_feature_entitlements
    where business_id = p_business_id
      and feature_key = 'ai_marketing'
      and status = 'active'
      and (expires_at is null or expires_at > now())
    for share;
    if not found then
      return jsonb_build_object('allowed',false,'reason','entitlement');
    end if;
  end if;

  if period_start is null or period_end is null
     or period_start > now() or period_end <= now() then
    return jsonb_build_object('allowed',false,'reason','entitlement');
  end if;

  if (
    select count(*)
    from public.marketing_generations
    where business_id = p_business_id
      and billing_period_started_at = period_start
      and status in ('pending','completed')
  ) >= allowance then
    return jsonb_build_object('allowed',false,'reason','allowance');
  end if;

  if (
    select count(*)
    from public.marketing_generations
    where business_id = p_business_id
      and created_at > now() - interval '24 hours'
  ) >= daily_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'limit', daily_limit
    );
  end if;

  if exists (
      select 1 from public.marketing_generations
      where business_id = p_business_id
        and created_at > now() - interval '60 seconds'
        and request_hash = p_request_hash
    )
    or exists (
      select 1 from public.marketing_generations
      where business_id = p_business_id
        and created_at > now() - interval '10 seconds'
    )
    or (
      select count(*) from public.marketing_generations
      where business_id = p_business_id
        and created_at > now() - interval '1 hour'
    ) >= 10 then
    return jsonb_build_object('allowed',false,'reason','rate_limit');
  end if;

  insert into public.marketing_generations(
    business_id, actor_user_id, content_type, platform, tone,
    request_text, extra_instructions, request_hash, billing_period_started_at
  )
  values(
    p_business_id, p_actor_user_id,
    p_request->>'content_type',
    p_request->>'platform',
    p_request->>'tone',
    p_request->>'prompt',
    coalesce(p_request->>'extra_instructions',''),
    p_request_hash,
    period_start
  )
  returning id into generation_id;

  return jsonb_build_object(
    'allowed', true,
    'id', generation_id,
    'daily_limit', daily_limit
  );
end $$;

revoke all on function public.reserve_marketing_generation(uuid,uuid,jsonb,text)
  from public, anon, authenticated;
grant execute on function public.reserve_marketing_generation(uuid,uuid,jsonb,text)
  to service_role;
