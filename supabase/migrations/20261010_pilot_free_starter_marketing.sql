-- Pilot-only free access; disabled by default. NEVER activate on Production.
create table if not exists public.pilot_free_access_config (
  id boolean primary key default true check (id = true),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.pilot_free_access_config enable row level security;
revoke all on public.pilot_free_access_config from anon, authenticated;
insert into public.pilot_free_access_config(id, enabled) values (true, false) on conflict (id) do nothing;
CREATE OR REPLACE FUNCTION public.reserve_marketing_generation(p_business_id uuid, p_actor_user_id uuid, p_request jsonb, p_request_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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

  if (select enabled from public.pilot_free_access_config where id = true) is true then
    period_start := date_trunc('month', now());
    period_end := period_start + interval '1 month';
    allowance := 100;
    daily_limit := 10;
  else
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
end $function$

