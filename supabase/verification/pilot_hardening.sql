-- Read-only schema/RLS verification. The final quota check writes only a
-- non-personal HMAC-shaped Dev test bucket and can be omitted if desired.
select jsonb_build_object(
  'tables', (
    select coalesce(jsonb_agg(jsonb_build_object('table', tablename, 'rls', rowsecurity) order by tablename), '[]'::jsonb)
    from pg_tables where schemaname = 'public' and tablename in ('business_audit_events', 'public_enquiry_rate_limit_buckets', 'business_data_lifecycle_policies')
  ),
  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object('table', tablename, 'name', policyname, 'roles', roles, 'command', cmd) order by tablename, policyname), '[]'::jsonb)
    from pg_policies where schemaname = 'public' and tablename in ('business_audit_events', 'business_data_lifecycle_policies')
  ),
  'anon_grants', (
    select coalesce(jsonb_agg(table_name order by table_name), '[]'::jsonb)
    from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon' and table_name in ('business_audit_events', 'public_enquiry_rate_limit_buckets', 'business_data_lifecycle_policies')
  ),
  'quota_function_acl', (
    select coalesce(proacl::text, '') from pg_proc where oid = 'public.consume_public_enquiry_quota(uuid, text, timestamptz, integer, integer)'::regprocedure
  )
) as pilot_hardening_verification;
