-- Safe read-only Development recovery-catalog preflight, 2026-10-29.
-- Target project only: Business-AI-Dev mvwseobgkexzpmmkgcxe.
-- Metadata only: no Auth/customer/Storage payload, backups or credentials.
-- This SQL does NOT create a backup or verify restorability.
BEGIN READ ONLY;
WITH relevant AS (
  SELECT n.nspname AS schema_name,
    count(*) FILTER (WHERE c.relkind IN ('r','p'))::int AS table_count,
    count(*) FILTER (WHERE c.relkind='v')::int AS view_count,
    count(*) FILTER (WHERE c.relkind='i')::int AS index_count,
    count(*) FILTER (WHERE c.relkind='S')::int AS sequence_count
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('public','auth','storage','colzo_pilot_private','graphql_public')
  GROUP BY n.nspname
),
essential(name) AS (
  VALUES
  ('public.businesses'),
  ('public.business_memberships'),
  ('public.colzo_pilot_access'),
  ('public.business_legal_acceptances'),
  ('public.user_legal_acceptances'),
  ('public.business_data_lifecycle_policies'),
  ('colzo_pilot_private.audit'),
  ('auth.users'),
  ('auth.identities'),
  ('auth.sessions'),
  ('auth.refresh_tokens'),
  ('auth.mfa_factors'),
  ('storage.buckets'),
  ('storage.objects')
),
present AS (
  SELECT name,
    to_regclass(name) IS NOT NULL AS exists_in_database
  FROM essential
)
SELECT jsonb_build_object(
  'project','Business-AI-Dev',
  'metadata_only',true,
  'schemas',(SELECT coalesce(jsonb_agg(to_jsonb(relevant) ORDER BY schema_name),'[]'::jsonb) FROM relevant),
  'essential_relations',(SELECT coalesce(jsonb_agg(to_jsonb(present) ORDER BY name),'[]'::jsonb) FROM present),
  'rls_policy_count',(SELECT count(*)::int FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','colzo_pilot_private')),
  'database_function_count',(SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','colzo_pilot_private')),
  'postgres_major',(SELECT current_setting('server_version_num')::int/10000)
) AS recovery_catalog_metadata;
ROLLBACK;
