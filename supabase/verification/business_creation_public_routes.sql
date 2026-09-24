-- Read-only Dev verification for public routing and atomic owner onboarding.
select jsonb_build_object(
  'routes_table_exists', to_regclass('public.business_public_routes') is not null,
  'existing_routes', (select count(*) from public.business_public_routes),
  'routes_without_business', (
    select count(*) from public.business_public_routes route
    left join public.businesses business on business.id = route.business_id
    where business.id is null
  ),
  'rls_enabled', (
    select coalesce(rowsecurity, false) from pg_tables
    where schemaname = 'public' and tablename = 'business_public_routes'
  ),
  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object('name', policyname, 'command', cmd, 'roles', roles) order by policyname), '[]'::jsonb)
    from pg_policies where schemaname = 'public' and tablename = 'business_public_routes'
  ),
  'anon_privileges', (
    select coalesce(jsonb_agg(privilege_type order by privilege_type), '[]'::jsonb)
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'business_public_routes' and grantee = 'anon'
  ),
  'authenticated_privileges', (
    select coalesce(jsonb_agg(privilege_type order by privilege_type), '[]'::jsonb)
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'business_public_routes' and grantee = 'authenticated'
  ),
  'owner_function', (
    select jsonb_build_object(
      'exists', true,
      'security_definer', prosecdef,
      'acl', coalesce(proacl::text, '')
    )
    from pg_proc
    where oid = 'public.create_business_for_owner(uuid, text, text, text)'::regprocedure
  )
) as business_creation_public_routes_verification;
