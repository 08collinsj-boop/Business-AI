-- Read-only verification for the provider-neutral voice foundation.
-- Run only against the intended environment after migration application.
-- A single JSON result is used because `supabase db query` reports one result
-- set per invocation.

select jsonb_build_object(
  'tables', (
    select jsonb_agg(to_jsonb(t) order by t.tablename)
    from (
      select tablename, rowsecurity
      from pg_tables
      where schemaname = 'public'
        and tablename in ('voice_provider_connections', 'voice_phone_numbers', 'voice_calls', 'voice_call_events')
    ) t
  ),
  'client_privileges', (
    select jsonb_agg(to_jsonb(p) order by p.table_name, p.grantee, p.privilege_type)
    from (
      select table_name, grantee, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in ('voice_provider_connections', 'voice_phone_numbers', 'voice_calls', 'voice_call_events')
        and grantee in ('anon', 'authenticated')
    ) p
  ),
  'policies', (
    select jsonb_agg(to_jsonb(p) order by p.tablename, p.policyname)
    from (
      select tablename, policyname, roles, cmd
      from pg_policies
      where schemaname = 'public'
        and tablename in ('voice_provider_connections', 'voice_phone_numbers', 'voice_calls', 'voice_call_events')
    ) p
  ),
  'constraints', (
    select jsonb_agg(to_jsonb(c) order by c.table_name, c.conname)
    from (
      select conrelid::regclass::text as table_name, conname, pg_get_constraintdef(oid) as definition
      from pg_constraint
      where conrelid in (
        'public.voice_provider_connections'::regclass,
        'public.voice_phone_numbers'::regclass,
        'public.voice_calls'::regclass,
        'public.voice_call_events'::regclass
      )
    ) c
  ),
  'indexes', (
    select jsonb_agg(to_jsonb(i) order by i.tablename, i.indexname)
    from (
      select tablename, indexname
      from pg_indexes
      where schemaname = 'public'
        and tablename in ('voice_provider_connections', 'voice_phone_numbers', 'voice_calls', 'voice_call_events')
    ) i
  ),
  'counts', jsonb_build_object(
    'provider_connections', (select count(*) from public.voice_provider_connections),
    'phone_numbers', (select count(*) from public.voice_phone_numbers),
    'voice_calls', (select count(*) from public.voice_calls),
    'voice_call_events', (select count(*) from public.voice_call_events)
  )
) as voice_foundation_verification;
