-- Optional add-ons are independent of base-plan enquiry/staff allowances.
-- Catalogue presentation lives in lib/addons.js; this allowlist is defence in depth.
create table public.business_feature_entitlements (
  business_id uuid not null references public.businesses(id) on delete cascade,
  feature_key text not null check (feature_key in ('ai_marketing','ai_phone')),
  status text not null default 'inactive' check (status in ('active','inactive')),
  source text not null check (source in ('manual','stripe')),
  source_reference text check (length(source_reference) <= 200),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id,feature_key),
  constraint coming_soon_cannot_activate check (feature_key <> 'ai_phone' or status = 'inactive'),
  constraint stripe_requires_expiry check (source <> 'stripe' or (expires_at is not null and source_reference is not null))
);
create index business_feature_entitlements_source_idx on public.business_feature_entitlements(source_reference) where source_reference is not null;
alter table public.business_feature_entitlements enable row level security;
revoke all on public.business_feature_entitlements from anon, authenticated;
grant select (business_id,feature_key,status,expires_at,created_at,updated_at) on public.business_feature_entitlements to authenticated;
grant all on public.business_feature_entitlements to service_role;
create policy "members read own feature entitlements" on public.business_feature_entitlements for select to authenticated
using (exists (select 1 from public.business_memberships m where m.business_id = business_feature_entitlements.business_id and m.user_id = (select auth.uid())));

create function public.audit_feature_entitlement() returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  insert into public.business_audit_events(business_id,action,resource_type,resource_id,metadata)
  values(new.business_id,'addon.entitlement_changed','feature_entitlement',new.feature_key,jsonb_build_object('feature_key',new.feature_key,'status',new.status,'source',new.source));
  return new;
end $$;
revoke all on function public.audit_feature_entitlement() from public,anon,authenticated;
grant execute on function public.audit_feature_entitlement() to service_role;
create trigger feature_entitlement_audit before insert or update on public.business_feature_entitlements for each row execute function public.audit_feature_entitlement();

-- This is also the durable generation reservation ledger. Failed attempts count
-- towards the cost guard. Stored drafts leave room for future campaign relations.
create table public.marketing_generations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  content_type text not null check (content_type in ('social_post','caption','promotional_post','announcement','offer','event','update')),
  platform text not null check (platform in ('facebook','instagram','linkedin','general')),
  tone text not null check (tone in ('professional','friendly','casual','promotional')),
  request_text text not null check (length(request_text) between 1 and 2000),
  extra_instructions text not null default '' check (length(extra_instructions) <= 1000),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  output jsonb,
  model text check (length(model) <= 100),
  provider_response_id text check (length(provider_response_id) <= 200),
  usage jsonb not null default '{}'::jsonb check (jsonb_typeof(usage) = 'object'),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id,business_id),
  check (output is null or (jsonb_typeof(output) = 'object' and octet_length(output::text) <= 16000)),
  check (status <> 'completed' or (output is not null and completed_at is not null))
);
create index marketing_generations_business_created_idx on public.marketing_generations(business_id,created_at desc);
create index marketing_generations_actor_idx on public.marketing_generations(actor_user_id);
alter table public.marketing_generations enable row level security;
revoke all on public.marketing_generations from anon,authenticated;
grant select on public.marketing_generations to authenticated;
grant all on public.marketing_generations to service_role;
create policy "entitled members read own marketing generations" on public.marketing_generations for select to authenticated
using (exists (select 1 from public.business_memberships m where m.business_id = marketing_generations.business_id and m.user_id = (select auth.uid()))
  and exists (select 1 from public.business_feature_entitlements e where e.business_id = marketing_generations.business_id and e.feature_key = 'ai_marketing' and e.status = 'active' and (e.expires_at is null or e.expires_at > now())));

create function public.reserve_marketing_generation(p_business_id uuid,p_actor_user_id uuid,p_request jsonb,p_request_hash text)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare generation_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('marketing:' || p_business_id::text,0));
  if not exists (select 1 from public.business_memberships where business_id=p_business_id and user_id=p_actor_user_id and role in ('owner','admin','member')) then
    return jsonb_build_object('allowed',false,'reason','membership');
  end if;
  -- Lock the entitlement through reservation so concurrent revocation cannot
  -- grant a new reservation using an already-revoked row.
  perform 1 from public.business_feature_entitlements where business_id=p_business_id and feature_key='ai_marketing' and status='active' and (expires_at is null or expires_at > now()) for share;
  if not found then return jsonb_build_object('allowed',false,'reason','entitlement'); end if;
  if exists (select 1 from public.marketing_generations where business_id=p_business_id and created_at > now()-interval '60 seconds' and request_hash=p_request_hash)
    or exists (select 1 from public.marketing_generations where business_id=p_business_id and created_at > now()-interval '10 seconds')
    or (select count(*) from public.marketing_generations where business_id=p_business_id and created_at > now()-interval '1 hour') >= 10
    or (select count(*) from public.marketing_generations where business_id=p_business_id and created_at > now()-interval '24 hours') >= 50 then
    return jsonb_build_object('allowed',false,'reason','rate_limit');
  end if;
  insert into public.marketing_generations(business_id,actor_user_id,content_type,platform,tone,request_text,extra_instructions,request_hash)
  values(p_business_id,p_actor_user_id,p_request->>'content_type',p_request->>'platform',p_request->>'tone',p_request->>'prompt',coalesce(p_request->>'extra_instructions',''),p_request_hash) returning id into generation_id;
  return jsonb_build_object('allowed',true,'id',generation_id);
end $$;
revoke all on function public.reserve_marketing_generation(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.reserve_marketing_generation(uuid,uuid,jsonb,text) to service_role;
