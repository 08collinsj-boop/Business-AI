-- DISPOSABLE DATABASE ONLY. Not a migration; no permission to apply to shared Dev.
-- Apply after scoped-pilot-access.STAGED.sql. Existing policies/grants are retained.
-- Grant presence is the durable pilot designation. Runtime cannot delete it.
BEGIN;
CREATE SCHEMA colzo_pilot_private;
REVOKE ALL ON SCHEMA colzo_pilot_private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA colzo_pilot_private TO authenticated;
REVOKE ALL ON public.colzo_pilot_access FROM service_role;
GRANT SELECT ON public.colzo_pilot_access TO service_role;

CREATE FUNCTION colzo_pilot_private.workspace_read_allowed(p_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT auth.uid() IS NOT NULL
 AND EXISTS (SELECT 1 FROM public.business_memberships m
             WHERE m.business_id=p_business_id AND m.user_id=auth.uid())
 AND NOT EXISTS (SELECT 1 FROM public.colzo_pilot_access g
                 WHERE g.business_id=p_business_id
                 AND (g.status <> 'active' OR g.activated_at > statement_timestamp()
                      OR g.expires_at <= statement_timestamp()
                      OR extract(epoch FROM g.expires_at-g.activated_at) <> 1209600));
$$;
REVOKE ALL ON FUNCTION colzo_pilot_private.workspace_read_allowed(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION colzo_pilot_private.workspace_read_allowed(uuid) TO authenticated;

-- Restrictive policies AND with all existing permissive policies. They cannot
-- accidentally grant new access. Recovery/membership and customer-owned portal
-- access remain separate. No existing table grants or policy bodies are widened.
DO $$ DECLARE t record; key_name text; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
 AND (c.relname='businesses' OR EXISTS (
   SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='business_id' AND NOT a.attisdropped))
 AND c.relname NOT IN ('business_memberships','colzo_pilot_access','customer_enquiry_access','customer_complaints')
 LOOP
  key_name := CASE WHEN t.relname='businesses' THEN 'id' ELSE 'business_id' END;
  EXECUTE format('CREATE POLICY colzo_pilot_expiry_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (colzo_pilot_private.workspace_read_allowed(%I)) WITH CHECK (colzo_pilot_private.workspace_read_allowed(%I))',t.relname,key_name,key_name);
 END LOOP;
END $$;
COMMIT;
