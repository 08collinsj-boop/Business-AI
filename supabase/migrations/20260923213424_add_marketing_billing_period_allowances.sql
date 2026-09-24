-- Pilot Marketing allowances; existing successful drafts are retained.
alter table public.marketing_generations add column billing_period_started_at timestamptz;
create index marketing_generations_billing_period_idx on public.marketing_generations(business_id,billing_period_started_at,status);
-- Attribute existing generations only when they fall inside their current recorded billing period.
update public.marketing_generations g set billing_period_started_at = case when b.plan='trial' then b.trial_started_at else b.current_period_started_at end
from public.business_billing_accounts b where b.business_id=g.business_id
and g.created_at >= case when b.plan='trial' then b.trial_started_at else b.current_period_started_at end
and g.created_at < case when b.plan='trial' then b.trial_expires_at else b.current_period_ends_at end;

create or replace function public.reserve_marketing_generation(p_business_id uuid,p_actor_user_id uuid,p_request jsonb,p_request_hash text)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  generation_id uuid;
  account public.business_billing_accounts%rowtype;
  period_start timestamptz;
  period_end timestamptz;
  allowance integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('marketing:' || p_business_id::text,0));
  if not exists (select 1 from public.business_memberships where business_id=p_business_id and user_id=p_actor_user_id and role in ('owner','admin','member')) then
    return jsonb_build_object('allowed',false,'reason','membership');
  end if;
  select * into account from public.business_billing_accounts where business_id=p_business_id for share;
  if not found or account.status <> 'active' then return jsonb_build_object('allowed',false,'reason','entitlement'); end if;
  if account.plan = 'trial' and account.trial_purchased then
    period_start := account.trial_started_at; period_end := account.trial_expires_at; allowance := 10;
  elsif account.plan in ('starter','pro','business') then
    period_start := account.current_period_started_at; period_end := account.current_period_ends_at; allowance := 100;
    perform 1 from public.business_feature_entitlements where business_id=p_business_id and feature_key='ai_marketing'
      and status='active' and expires_at > now() for share;
    if not found then return jsonb_build_object('allowed',false,'reason','entitlement'); end if;
  else return jsonb_build_object('allowed',false,'reason','entitlement'); end if;
  if period_start is null or period_end is null or period_start > now() or period_end <= now() then
    return jsonb_build_object('allowed',false,'reason','entitlement');
  end if;
  -- Include pending reservations to prevent concurrent requests overspending.
  -- Failed provider/validation attempts are retained for abuse limits but do not spend the paid allowance.
  -- Soft-deleting a draft does not refund a successful generation.
  if (select count(*) from public.marketing_generations where business_id=p_business_id
      and billing_period_started_at=period_start and status in ('pending','completed')) >= allowance then
    return jsonb_build_object('allowed',false,'reason','allowance');
  end if;
  if exists (select 1 from public.marketing_generations where business_id=p_business_id and created_at > now()-interval '60 seconds' and request_hash=p_request_hash)
    or exists (select 1 from public.marketing_generations where business_id=p_business_id and created_at > now()-interval '10 seconds')
    or (select count(*) from public.marketing_generations where business_id=p_business_id and created_at > now()-interval '1 hour') >= 10
    or (select count(*) from public.marketing_generations where business_id=p_business_id and created_at > now()-interval '24 hours') >= 50 then
    return jsonb_build_object('allowed',false,'reason','rate_limit');
  end if;
  insert into public.marketing_generations(business_id,actor_user_id,content_type,platform,tone,request_text,extra_instructions,request_hash,billing_period_started_at)
  values(p_business_id,p_actor_user_id,p_request->>'content_type',p_request->>'platform',p_request->>'tone',p_request->>'prompt',coalesce(p_request->>'extra_instructions',''),p_request_hash,period_start) returning id into generation_id;
  return jsonb_build_object('allowed',true,'id',generation_id);
end $$;
revoke all on function public.reserve_marketing_generation(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.reserve_marketing_generation(uuid,uuid,jsonb,text) to service_role;

-- Recheck the billing event version under the same row lock used by billing sync.
-- A delayed earlier event cannot reactivate an add-on after newer billing state.
create or replace function public.sync_marketing_entitlement_from_stripe(
 p_business_id uuid,p_event_created_at timestamptz,p_item_id text,p_period_end timestamptz,p_enabled boolean
) returns boolean language plpgsql security invoker set search_path=public as $$
declare account public.business_billing_accounts%rowtype; existing public.business_feature_entitlements%rowtype;
begin
 select * into account from public.business_billing_accounts where business_id=p_business_id for update;
 if not found or account.last_stripe_event_created_at is distinct from p_event_created_at then return false; end if;
 select * into existing from public.business_feature_entitlements where business_id=p_business_id and feature_key='ai_marketing' for update;
 if p_item_id is null and existing.source is distinct from 'stripe' then return true; end if;
 if not p_enabled or account.status <> 'active' or account.current_period_ends_at <= now() then
   update public.business_feature_entitlements set status='inactive',updated_at=now()
    where business_id=p_business_id and feature_key='ai_marketing' and source='stripe';
 elsif p_item_id is not null and p_period_end > now() then
   insert into public.business_feature_entitlements(business_id,feature_key,status,source,source_reference,expires_at)
    values(p_business_id,'ai_marketing','active','stripe',p_item_id,least(p_period_end,account.current_period_ends_at))
    on conflict(business_id,feature_key) do update set status='active',source='stripe',source_reference=excluded.source_reference,expires_at=excluded.expires_at,updated_at=now();
 else
   -- No refund on normal removal: retain only the previously verified paid-through date.
   update public.business_feature_entitlements set status=case when expires_at > now() then status else 'inactive' end,updated_at=now()
    where business_id=p_business_id and feature_key='ai_marketing' and source='stripe';
 end if;
 return true;
end $$;
revoke all on function public.sync_marketing_entitlement_from_stripe(uuid,timestamptz,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.sync_marketing_entitlement_from_stripe(uuid,timestamptz,text,timestamptz,boolean) to service_role;
