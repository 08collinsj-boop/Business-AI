-- DISPOSABLE DATABASE ONLY. No endpoint or application feature is enabled.
-- Apply after the other three staged proposals and existing owner creation RPC.
-- The original owner/settings/configuration/route writer is reused unchanged.
BEGIN;
CREATE FUNCTION colzo_pilot_private.provision_workspace(
 p_owner uuid,p_name text,p_type text,p_slug text,p_key text,p_evidence text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 prior colzo_pilot_private.audit%rowtype;
 payload jsonb:=jsonb_build_object('name',p_name,'type',p_type,'slug',p_slug,'evidence',p_evidence);
 created record; grant_result jsonb; result jsonb;
BEGIN
 IF p_key IS NULL OR length(p_key) NOT BETWEEN 1 AND 150 THEN RAISE EXCEPTION 'invalid idempotency key'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_key,0));
 SELECT * INTO prior FROM colzo_pilot_private.audit WHERE request_key=p_key;
 IF FOUND THEN
  IF prior.action<>'workspace_created' OR prior.actor IS DISTINCT FROM p_owner OR prior.payload IS DISTINCT FROM payload THEN
   RAISE EXCEPTION 'idempotency conflict';
  END IF;
  RETURN prior.result;
 END IF;
 -- Lock the verified identity to serialize different workspace requests for
 -- the same owner. A failed grant/audit rolls the original creator back too.
 PERFORM 1 FROM auth.users WHERE id=p_owner AND email_confirmed_at IS NOT NULL FOR UPDATE;
 IF NOT FOUND OR p_evidence IS NULL OR length(trim(p_evidence))<10 THEN RAISE EXCEPTION 'verified owner evidence required'; END IF;
 IF EXISTS(SELECT 1 FROM public.business_memberships WHERE user_id=p_owner) THEN RAISE EXCEPTION 'owner already belongs to a business'; END IF;
 SELECT * INTO created FROM public.create_business_for_owner(p_owner,p_name,p_type,p_slug);
 IF created.business_id IS NULL THEN RAISE EXCEPTION 'workspace creation unavailable'; END IF;
 grant_result:=colzo_pilot_private.grant_access(created.business_id,p_owner,'workspace-grant:'||p_key,p_evidence);
 result:=grant_result||jsonb_build_object('public_slug',created.public_slug);
 INSERT INTO colzo_pilot_private.audit(request_key,business_id,actor,action,payload,result)
 VALUES(p_key,created.business_id,p_owner,'workspace_created',payload,result);
 RETURN result;
END$$;
REVOKE ALL ON FUNCTION colzo_pilot_private.provision_workspace(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION colzo_pilot_private.provision_workspace(uuid,text,text,text,text,text) TO colzo_pilot_operator;
COMMIT;
