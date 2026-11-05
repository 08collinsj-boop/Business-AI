-- COLZO DEVELOPMENT ONLY. STAGED / NOT INSTALLED. Separate exact approval required.
-- Target: mvwseobgkexzpmmkgcxe. Run as existing postgres owner, one transaction.
-- Tightens existing direct Data API RLS for designated pilots only; no grants,
-- Auth rows, original expiry dates, new accounts or Production objects changed.
BEGIN;
SET LOCAL lock_timeout = '3s';
DO $$
BEGIN
 IF current_user <> 'postgres'
 OR md5(pg_get_functiondef('colzo_pilot_private.workspace_read_allowed(uuid)'::regprocedure))
    <> '4184260a34e83a331b460d85638947a0'
 OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='colzo_pilot_private.workspace_read_allowed(uuid)'::regprocedure) <> 'postgres'
 OR has_function_privilege('anon','colzo_pilot_private.workspace_read_allowed(uuid)','EXECUTE')
 OR has_function_privilege('service_role','colzo_pilot_private.workspace_read_allowed(uuid)','EXECUTE')
 OR NOT has_function_privilege('authenticated','colzo_pilot_private.workspace_read_allowed(uuid)','EXECUTE')
 OR NOT has_table_privilege(current_user,'auth.sessions','SELECT') THEN
   RAISE EXCEPTION 'Unexpected direct pilot policy baseline; stop and review';
 END IF;
END $$;

CREATE OR REPLACE FUNCTION colzo_pilot_private.workspace_read_allowed(p_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT auth.uid() IS NOT NULL
 AND EXISTS (SELECT 1 FROM public.business_memberships m
             WHERE m.business_id=p_business_id AND m.user_id=auth.uid())
 AND NOT EXISTS (SELECT 1 FROM public.colzo_pilot_access g
                 WHERE g.business_id=p_business_id
                 AND (g.status <> 'active' OR g.activated_at > statement_timestamp()
                      OR g.expires_at <= statement_timestamp()
                      OR extract(epoch FROM g.expires_at-g.activated_at) <> 1209600))
 AND (
   NOT EXISTS (SELECT 1 FROM public.colzo_pilot_access g WHERE g.business_id=p_business_id)
   OR (
     (auth.jwt()->>'aal') = 'aal2'
     AND EXISTS (SELECT 1 FROM auth.sessions s
                 WHERE s.user_id=auth.uid()
                   AND s.id::text=(auth.jwt()->>'session_id')
                   AND (s.not_after IS NULL OR s.not_after > statement_timestamp()))
   )
 );
$$;
-- CREATE OR REPLACE preserves the existing postgres owner and EXECUTE ACL.
-- authenticated may evaluate the private RLS predicate; anon/service_role
-- have no EXECUTE. The Auth sessions table itself remains inaccessible.
COMMIT;
