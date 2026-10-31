-- Colzo Development-only, SELECT-only exposure checkpoint, 2026-10-29.
-- Execute only against Business-AI-Dev mvwseobgkexzpmmkgcxe.
-- This is effective Postgres catalog access, NOT issued-JWT/browser/API acceptance.
BEGIN READ ONLY;

-- 1: Accessible exposed views without security_invoker=true.
SELECT n.nspname AS schema_name, c.relname AS view_name,
       has_table_privilege('anon',c.oid,'SELECT') AS anon_select,
       has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_select
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','graphql_public')
  AND c.relkind IN ('v','m')
  AND NOT COALESCE(c.reloptions @> ARRAY['security_invoker=true'],false)
  AND (has_table_privilege('anon',c.oid,'SELECT')
       OR has_table_privilege('authenticated',c.oid,'SELECT'))
ORDER BY n.nspname,c.relname;

-- 2: Public-schema SECURITY DEFINER functions executable by anon/authenticated.
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','graphql_public') AND p.prosecdef
  AND (has_function_privilege('anon',p.oid,'EXECUTE')
       OR has_function_privilege('authenticated',p.oid,'EXECUTE'))
ORDER BY n.nspname,p.proname;

-- 3: RLS-enabled no-policy tables: effective grants for anon/authenticated.
SELECT n.nspname AS schema_name,c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       has_table_privilege('anon',c.oid,'SELECT') AS anon_select,
       has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_select,
       has_table_privilege('anon',c.oid,'INSERT') AS anon_insert,
       has_table_privilege('authenticated',c.oid,'INSERT') AS authenticated_insert,
       has_table_privilege('anon',c.oid,'UPDATE') AS anon_update,
       has_table_privilege('authenticated',c.oid,'UPDATE') AS authenticated_update,
       has_table_privilege('anon',c.oid,'DELETE') AS anon_delete,
       has_table_privilege('authenticated',c.oid,'DELETE') AS authenticated_delete
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND n.nspname IN ('public','colzo_pilot_private')
  AND c.relrowsecurity
  AND NOT EXISTS (SELECT 1 FROM pg_policy policy WHERE policy.polrelid=c.oid)
ORDER BY n.nspname,c.relname;

-- 4: Private SECURITY DEFINER function exposure, accounting for schema USAGE.
SELECT n.nspname AS schema_name,p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       has_schema_privilege('anon',n.oid,'USAGE')
         AND has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_call,
       has_schema_privilege('authenticated',n.oid,'USAGE')
         AND has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_call,
       p.proconfig AS function_configuration
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='colzo_pilot_private' AND p.prosecdef
ORDER BY n.nspname,p.proname;

ROLLBACK;
