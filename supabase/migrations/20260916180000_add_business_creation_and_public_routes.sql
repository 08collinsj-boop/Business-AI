-- Server-owned public routing and atomic first-owner onboarding.
-- This migration is additive and preserves all existing tenants, memberships,
-- settings, configurations and customer records.

create table if not exists public.business_public_routes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  route_type text not null default 'slug'
    check (route_type in ('slug', 'custom_domain', 'widget', 'location')),
  route_value text not null
    check (route_value = lower(route_value))
    check (route_value ~ '^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_type, route_value),
  unique (id, business_id)
);

create index if not exists business_public_routes_business_active_idx
  on public.business_public_routes (business_id, active);

-- Existing businesses receive an active slug. The first readable name keeps a
-- friendly route; colliding names gain a stable suffix derived from the UUID.
with candidates as (
  select
    business.id as business_id,
    coalesce(nullif(trim(business.name), ''), 'business') as raw_name,
    regexp_replace(lower(coalesce(nullif(trim(business.name), ''), 'business')), '[^a-z0-9]+', '-', 'g') as base_slug,
    row_number() over (
      partition by regexp_replace(lower(coalesce(nullif(trim(business.name), ''), 'business')), '[^a-z0-9]+', '-', 'g')
      order by business.created_at, business.id
    ) as duplicate_number
  from public.businesses business
), normalised as (
  select
    business_id,
    case
      when duplicate_number = 1 then left(trim(both '-' from base_slug), 63)
      else left(trim(both '-' from base_slug), 54) || '-' || left(replace(business_id::text, '-', ''), 8)
    end as route_value
  from candidates
)
insert into public.business_public_routes (business_id, route_type, route_value)
select business_id, 'slug',
  case when char_length(route_value) >= 3 then route_value else 'business-' || left(replace(business_id::text, '-', ''), 8) end
from normalised
on conflict (route_type, route_value) do nothing;

alter table public.business_public_routes enable row level security;
revoke all on public.business_public_routes from anon, authenticated;
grant select on public.business_public_routes to authenticated;

drop policy if exists "admins read business public routes" on public.business_public_routes;
create policy "admins read business public routes"
  on public.business_public_routes for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships membership
      where membership.business_id = business_public_routes.business_id
        and membership.user_id = (select auth.uid())
        and membership.role in ('owner', 'admin')
    )
  );

-- This is intentionally SECURITY DEFINER because one transaction must create
-- the business, owner membership, settings, configuration and route. It is
-- callable only by service_role; the application verifies the Auth user before
-- supplying p_owner_user_id. No browser role or tenant value reaches it.
create or replace function public.create_business_for_owner(
  p_owner_user_id uuid,
  p_business_name text,
  p_business_type text,
  p_public_slug text
)
returns table (business_id uuid, public_slug text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_business_id uuid;
  v_slug text;
begin
  if p_owner_user_id is null
    or not exists (select 1 from auth.users where id = p_owner_user_id) then
    raise exception 'invalid owner';
  end if;
  if exists (select 1 from public.business_memberships where user_id = p_owner_user_id) then
    raise exception 'owner already belongs to a business';
  end if;
  if p_business_name is null or char_length(trim(p_business_name)) not between 2 and 120 then
    raise exception 'invalid business name';
  end if;
  if p_business_type is null or char_length(trim(p_business_type)) > 120 then
    raise exception 'invalid business type';
  end if;
  v_slug := lower(trim(p_public_slug));
  if v_slug !~ '^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$' then
    raise exception 'invalid public route';
  end if;

  insert into public.businesses (name) values (trim(p_business_name)) returning id into v_business_id;
  insert into public.business_memberships (business_id, user_id, role)
    values (v_business_id, p_owner_user_id, 'owner');
  insert into public.business_settings (business_id, business_name, business_type)
    values (v_business_id, trim(p_business_name), trim(p_business_type));
  insert into public.business_configurations (business_id)
    values (v_business_id);
  insert into public.business_public_routes (business_id, route_type, route_value)
    values (v_business_id, 'slug', v_slug);
  return query select v_business_id, v_slug;
exception when unique_violation then
  raise exception 'business or public route already exists';
end;
$$;

revoke all on function public.create_business_for_owner(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_business_for_owner(uuid, text, text, text) to service_role;
