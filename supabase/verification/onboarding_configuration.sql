-- Read-only verification for the tenant-scoped onboarding configuration.
select jsonb_build_object(
  'table_exists', to_regclass('public.business_configurations') is not null,
  'configuration_rows', (select count(*) from public.business_configurations),
  'missing_business_ids', (select count(*) from public.business_configurations where business_id is null),
  'orphaned_business_ids', (
    select count(*) from public.business_configurations configuration
    left join public.businesses business on business.id = configuration.business_id
    where business.id is null
  ),
  'rls_enabled', (
    select coalesce(rowsecurity, false)
    from pg_tables where schemaname = 'public' and tablename = 'business_configurations'
  ),
  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object('name', policyname, 'command', cmd, 'roles', roles) order by policyname), '[]'::jsonb)
    from pg_policies where schemaname = 'public' and tablename = 'business_configurations'
  ),
  'authenticated_privileges', (
    select coalesce(jsonb_agg(privilege_type order by privilege_type), '[]'::jsonb)
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'business_configurations' and grantee = 'authenticated'
  ),
  'anon_privileges', (
    select coalesce(jsonb_agg(privilege_type order by privilege_type), '[]'::jsonb)
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'business_configurations' and grantee = 'anon'
  ),
  'constraints', (
    select coalesce(jsonb_agg(jsonb_build_object('name', conname, 'definition', pg_get_constraintdef(oid)) order by conname), '[]'::jsonb)
    from pg_constraint where conrelid = 'public.business_configurations'::regclass
  )
) as onboarding_configuration_verification;
