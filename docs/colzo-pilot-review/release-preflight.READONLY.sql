-- Read-only aggregate preflight. Never grants release approval or changes data.
SELECT jsonb_build_object(
 'checked_at_utc',clock_timestamp(),
 'server_version',current_setting('server_version'),
 'duplicate_pending_ai_booking_groups',(
  SELECT count(*) FROM (
   SELECT business_id,lead_id FROM public.bookings
   WHERE source='ai_request' AND status='requested' AND lead_id IS NOT NULL
   GROUP BY business_id,lead_id HAVING count(*)>1
  ) duplicate_groups),
 'migration_ledger_entries',(SELECT count(*) FROM supabase_migrations.schema_migrations),
 'existing_owner_creator',to_regprocedure('public.create_business_for_owner(uuid,text,text,text)'),
 'staged_grants_table',to_regclass('public.colzo_pilot_access'),
 'staged_private_schema',to_regnamespace('colzo_pilot_private'),
 'staged_booking_function',to_regprocedure('public.request_colzo_pilot_booking(uuid,bigint,text,text,text,text,text,text)'),
 'staged_booking_index',to_regclass('public.colzo_pilot_one_pending_ai_booking'),
 'staged_operator_role',(SELECT count(*) FROM pg_roles WHERE rolname='colzo_pilot_operator'),
 'required_tables',(
  SELECT jsonb_object_agg(name,to_regclass('public.'||name) IS NOT NULL)
  FROM unnest(ARRAY['businesses','business_memberships','business_settings',
   'business_configurations','business_public_routes','business_billing_accounts',
   'leads','bookings','lead_history','business_audit_events']) name),
 'installed_extensions',(SELECT jsonb_agg(extname ORDER BY extname) FROM pg_extension)
) AS preflight;
