-- Fix PL/pgSQL output-column ambiguity in referral profile conflict handling.

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
  on conflict on constraint business_referral_profiles_pkey do nothing;

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
