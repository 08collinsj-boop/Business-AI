\set ON_ERROR_STOP on
-- PROPOSAL ONLY. Development mvwseobgkexzpmmkgcxe. Recovery deferred to public launch; requires independent
-- review and explicit approval of this exact hash. Not an automatic migration.
-- Use psql -X -f, without -1. Disconnect/ROLLBACK on any error before COMMIT.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';
SET LOCAL search_path = '';
SET LOCAL row_security = on;
DO $gate$ BEGIN
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'trusted postgres owner required'; END IF;
 IF current_setting('transaction_isolation') <> 'read committed' THEN RAISE EXCEPTION 'read committed required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('public.create_business_for_owner(uuid,text,text,text)')
 AND p.proowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='postgres') AND p.prosecdef
 AND p.proconfig=ARRAY['search_path=public, auth']::text[]
 AND pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid))='872a165ace5cfa6c8e9429c23a7d5d4b'
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')) THEN RAISE EXCEPTION 'unsafe creator dependency'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n CROSS JOIN (VALUES ('anon'),('authenticated'),('service_role')) r(name)
 WHERE n.nspname IN ('public','auth') AND pg_catalog.has_schema_privilege(r.name,n.oid,'CREATE')) THEN RAISE EXCEPTION 'untrusted creator search_path schema'; END IF;
END $gate$;
-- STAGED ONLY. Do not apply to Dev or Production before a verified restore and owner approval.
CREATE TABLE public.colzo_pilot_access (
 business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
 activated_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT colzo_pilot_exact_fourteen_days CHECK (expires_at = activated_at + interval '336 hours')
);
ALTER TABLE public.colzo_pilot_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.colzo_pilot_access FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.colzo_pilot_access TO service_role;
COMMENT ON TABLE public.colzo_pilot_access IS 'Manually approved, per-business Colzo trial grants. Not a paid trial.';

-- DISPOSABLE DATABASE ONLY. Not a migration; no permission to apply to shared Dev.
-- Apply after scoped-pilot-access.STAGED.sql. Existing policies/grants are retained.
-- Grant presence is the durable pilot designation. Runtime cannot delete it.
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

-- DISPOSABLE DATABASE ONLY; not installed, exposed or wired to the app.
-- Apply after the grant table and expiry proposal. Dedicated operator role has
-- no login or members. Real ownership checks must precede operator attestation.
CREATE ROLE colzo_pilot_operator NOLOGIN NOINHERIT;
GRANT USAGE ON SCHEMA colzo_pilot_private TO colzo_pilot_operator;
CREATE TABLE colzo_pilot_private.audit (
 request_key text PRIMARY KEY CHECK(length(request_key) BETWEEN 1 AND 200),
 business_id uuid NOT NULL REFERENCES public.businesses(id),
 actor uuid REFERENCES auth.users(id), action text NOT NULL,
 payload jsonb NOT NULL, result jsonb NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 executed_by name NOT NULL DEFAULT session_user
);
CREATE TABLE colzo_pilot_private.invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES public.colzo_pilot_access(business_id),
 invited_email text NOT NULL CHECK(invited_email=lower(trim(invited_email)) AND length(invited_email) BETWEEN 3 AND 320),
 token_hash text UNIQUE NOT NULL CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','revoked')),
 accepted_by uuid REFERENCES auth.users(id)
);
CREATE UNIQUE INDEX colzo_pilot_pending_recipient ON colzo_pilot_private.invitations(business_id,invited_email) WHERE status='pending';
ALTER TABLE colzo_pilot_private.audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE colzo_pilot_private.invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA colzo_pilot_private FROM PUBLIC,anon,authenticated,service_role,colzo_pilot_operator;
CREATE FUNCTION colzo_pilot_private.immutable_audit() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$BEGIN RAISE EXCEPTION 'audit is append only'; END$$;
CREATE TRIGGER pilot_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON colzo_pilot_private.audit
FOR EACH STATEMENT EXECUTE FUNCTION colzo_pilot_private.immutable_audit();

CREATE FUNCTION colzo_pilot_private.replay(p_key text,p_business uuid,p_action text,p_actor uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$DECLARE e colzo_pilot_private.audit%rowtype; BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'read committed required'; END IF;
 IF p_key IS NULL OR length(p_key) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'invalid idempotency key'; END IF;
 -- Serialize identical keys even across different businesses.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_key,0));
 SELECT * INTO e FROM colzo_pilot_private.audit WHERE request_key=p_key;
 IF FOUND THEN
  IF e.business_id IS DISTINCT FROM p_business OR e.action IS DISTINCT FROM p_action OR e.actor IS DISTINCT FROM p_actor OR e.payload IS DISTINCT FROM p_payload THEN
   RAISE EXCEPTION 'idempotency conflict';
  END IF;
  RETURN e.result;
 END IF;
 RETURN NULL;
END$$;

CREATE FUNCTION colzo_pilot_private.grant_access(p_business uuid,p_owner uuid,p_key text,p_evidence text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; payload jsonb:=jsonb_build_object('evidence',p_evidence); start_at timestamptz; BEGIN
 result:=colzo_pilot_private.replay(p_key,p_business,'granted',p_owner,payload);
 IF result IS NOT NULL THEN RETURN result; END IF;
 PERFORM 1 FROM public.businesses WHERE id=p_business FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'business unavailable'; END IF;
 PERFORM 1 FROM auth.users WHERE id=p_owner AND email_confirmed_at IS NOT NULL FOR UPDATE;
 IF NOT FOUND OR p_evidence IS NULL OR length(trim(p_evidence))<10 THEN RAISE EXCEPTION 'verified owner evidence required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.business_memberships WHERE business_id=p_business AND user_id=p_owner AND role='owner')
 OR (SELECT count(*) FROM public.business_memberships WHERE business_id=p_business)<>1
 OR EXISTS(SELECT 1 FROM public.business_memberships WHERE user_id=p_owner AND business_id<>p_business)
 THEN RAISE EXCEPTION 'exactly one verified owner required'; END IF;
 IF EXISTS(SELECT 1 FROM public.colzo_pilot_access WHERE business_id=p_business) THEN RAISE EXCEPTION 'business already designated'; END IF;
 -- The verified identity lock above serializes grants across businesses. Keep
 -- the append-only award history as the authority even after membership moves.
 IF EXISTS(SELECT 1 FROM colzo_pilot_private.audit WHERE actor=p_owner AND action='granted')
 OR EXISTS(SELECT 1 FROM public.colzo_pilot_access WHERE granted_by=p_owner)
 THEN RAISE EXCEPTION 'owner already received pilot access'; END IF;
 IF EXISTS(SELECT 1 FROM public.business_billing_accounts WHERE business_id=p_business AND
  (stripe_customer_id IS NOT NULL OR stripe_subscription_id IS NOT NULL OR plan<>'none' OR status<>'inactive' OR trial_purchased))
 THEN RAISE EXCEPTION 'paid history excludes free pilot'; END IF;
 start_at:=clock_timestamp();
 INSERT INTO public.colzo_pilot_access(business_id,activated_at,expires_at,granted_by)
 VALUES(p_business,start_at,start_at+interval '336 hours',p_owner);
 result:=jsonb_build_object('business_id',p_business,'activated_at',start_at,'expires_at',start_at+interval '336 hours');
 INSERT INTO colzo_pilot_private.audit(request_key,business_id,actor,action,payload,result,recorded_at) VALUES(p_key,p_business,p_owner,'granted',payload,result,clock_timestamp());
 RETURN result;
END$$;

CREATE FUNCTION colzo_pilot_private.lock_active(p_business uuid) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$BEGIN
 PERFORM 1 FROM public.businesses WHERE id=p_business FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.colzo_pilot_access WHERE business_id=p_business AND status='active'
 AND activated_at<=clock_timestamp() AND expires_at>clock_timestamp()) THEN RAISE EXCEPTION 'pilot unavailable'; END IF;
END$$;

CREATE FUNCTION colzo_pilot_private.invite(p_business uuid,p_owner uuid,p_email text,p_hash text,p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; payload jsonb:=jsonb_build_object('email',p_email,'hash',p_hash); invitation_id uuid; expiry timestamptz; BEGIN
 result:=colzo_pilot_private.replay(p_key,p_business,'invited',p_owner,payload);
 IF result IS NOT NULL THEN RETURN result; END IF;
 PERFORM colzo_pilot_private.lock_active(p_business);
 IF NOT EXISTS(SELECT 1 FROM public.business_memberships WHERE business_id=p_business AND user_id=p_owner AND role='owner') THEN RAISE EXCEPTION 'owner required'; END IF;
 IF p_email IS NULL OR p_email<>lower(trim(p_email)) OR p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
 OR p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid invitation'; END IF;
 -- Release stale reservations under the same business lock before allocating.
 UPDATE colzo_pilot_private.invitations SET status='revoked' WHERE business_id=p_business AND status='pending' AND expires_at<=clock_timestamp();
 IF (SELECT count(*) FROM public.business_memberships WHERE business_id=p_business)
  +(SELECT count(*) FROM colzo_pilot_private.invitations WHERE business_id=p_business AND status='pending')>=2 THEN RAISE EXCEPTION 'seat capacity'; END IF;
 IF EXISTS(SELECT 1 FROM public.business_memberships m JOIN auth.users u ON u.id=m.user_id WHERE m.business_id=p_business AND lower(u.email)=p_email) THEN RAISE EXCEPTION 'already a member'; END IF;
 SELECT least(expires_at,clock_timestamp()+interval '48 hours') INTO expiry FROM public.colzo_pilot_access WHERE business_id=p_business;
 INSERT INTO colzo_pilot_private.invitations(business_id,invited_email,token_hash,expires_at)
 VALUES(p_business,p_email,p_hash,expiry) RETURNING id INTO invitation_id;
 result:=jsonb_build_object('invitation_id',invitation_id,'expires_at',expiry);
 INSERT INTO colzo_pilot_private.audit(request_key,business_id,actor,action,payload,result,recorded_at) VALUES(p_key,p_business,p_owner,'invited',payload,result,clock_timestamp());
 -- Audit/constraint waits must not turn an expired reservation into success.
 PERFORM colzo_pilot_private.lock_active(p_business);
 IF expiry<=clock_timestamp() THEN RAISE EXCEPTION 'invitation unavailable'; END IF;
 RETURN result;
END$$;

CREATE FUNCTION colzo_pilot_private.accept_invite(p_business uuid,p_user uuid,p_hash text,p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; payload jsonb:=jsonb_build_object('hash',p_hash); invitation colzo_pilot_private.invitations%rowtype; BEGIN
 result:=colzo_pilot_private.replay(p_key,p_business,'accepted',p_user,payload);
 IF result IS NOT NULL THEN RETURN result; END IF;
 PERFORM colzo_pilot_private.lock_active(p_business);
 SELECT * INTO invitation FROM colzo_pilot_private.invitations WHERE business_id=p_business AND token_hash=p_hash AND status='pending' AND expires_at>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'invitation unavailable'; END IF;
 PERFORM 1 FROM auth.users WHERE id=p_user AND email_confirmed_at IS NOT NULL AND lower(email)=invitation.invited_email FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'verified recipient required'; END IF;
 IF EXISTS(SELECT 1 FROM public.business_memberships WHERE user_id=p_user) THEN RAISE EXCEPTION 'recipient already belongs to a business'; END IF;
 IF (SELECT count(*) FROM public.business_memberships WHERE business_id=p_business)>=2 THEN RAISE EXCEPTION 'seat capacity'; END IF;
 UPDATE colzo_pilot_private.invitations SET status='accepted',accepted_by=p_user WHERE id=invitation.id;
 INSERT INTO public.business_memberships(business_id,user_id,role) VALUES(p_business,p_user,'member');
 result:=jsonb_build_object('business_id',p_business,'user_id',p_user,'role','member');
 INSERT INTO colzo_pilot_private.audit(request_key,business_id,actor,action,payload,result,recorded_at) VALUES(p_key,p_business,p_user,'accepted',payload,result,clock_timestamp());
 -- Recheck both deadlines after identity, membership and audit waits. Raising
 -- rolls back the membership, invitation transition and audit atomically.
 PERFORM colzo_pilot_private.lock_active(p_business);
 IF invitation.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'invitation unavailable'; END IF;
 RETURN result;
END$$;

CREATE FUNCTION colzo_pilot_private.revoke_access(p_business uuid,p_actor uuid,p_key text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; payload jsonb:=jsonb_build_object('reason',p_reason); BEGIN
 result:=colzo_pilot_private.replay(p_key,p_business,'revoked',p_actor,payload);
 IF result IS NOT NULL THEN RETURN result; END IF;
 PERFORM 1 FROM public.businesses WHERE id=p_business FOR UPDATE;
 IF p_reason IS NULL OR length(trim(p_reason))<3 THEN RAISE EXCEPTION 'reason required'; END IF;
 UPDATE public.colzo_pilot_access SET status='revoked',updated_at=clock_timestamp() WHERE business_id=p_business;
 IF NOT FOUND THEN RAISE EXCEPTION 'pilot unavailable'; END IF;
 UPDATE colzo_pilot_private.invitations SET status='revoked' WHERE business_id=p_business AND status='pending';
 result:=jsonb_build_object('business_id',p_business,'status','revoked');
 INSERT INTO colzo_pilot_private.audit(request_key,business_id,actor,action,payload,result,recorded_at) VALUES(p_key,p_business,p_actor,'revoked',payload,result,clock_timestamp());
 RETURN result;
END$$;

-- Expiry enforcement is immediate and does not depend on this audit collector.
CREATE FUNCTION colzo_pilot_private.record_expiry(p_business uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE prior jsonb;
BEGIN
 -- Check collisions rather than reporting success after ON CONFLICT skipped
 -- an event with a different action. Use the same key-before-business lock
 -- ordering as other operator operations.
 prior:=colzo_pilot_private.replay('expiry:'||p_business,p_business,'expired',NULL,'{}');
 IF prior IS NOT NULL THEN RETURN; END IF;
 PERFORM 1 FROM public.businesses WHERE id=p_business FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.colzo_pilot_access WHERE business_id=p_business AND expires_at<=clock_timestamp()) THEN
  INSERT INTO colzo_pilot_private.audit(request_key,business_id,actor,action,payload,result)
  VALUES('expiry:'||p_business,p_business,NULL,'expired','{}','{}');
 END IF;
END$$;

-- Protect legacy/service membership writers as well as the new operator RPC.
CREATE FUNCTION colzo_pilot_private.enforce_seat() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'read committed required'; END IF;
 -- Serialize against initial designation before deciding whether pilot rules
 -- apply. A foreign-key wait after that decision would use stale rules.
 PERFORM 1 FROM public.businesses WHERE id=NEW.business_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.colzo_pilot_access WHERE business_id=NEW.business_id) THEN
  PERFORM colzo_pilot_private.lock_active(NEW.business_id);
  PERFORM 1 FROM auth.users WHERE id=NEW.user_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.business_memberships WHERE user_id=NEW.user_id AND business_id<>NEW.business_id) THEN RAISE EXCEPTION 'cross business membership'; END IF;
  IF (SELECT count(*) FROM public.business_memberships WHERE business_id=NEW.business_id AND user_id<>NEW.user_id)
    +(SELECT count(*) FROM colzo_pilot_private.invitations WHERE business_id=NEW.business_id AND status='pending' AND expires_at>clock_timestamp())>=2
  THEN RAISE EXCEPTION 'seat capacity'; END IF;
 ELSE
  -- Legacy destinations must not accept a member already assigned to any
  -- designated pilot, including revoked/expired pilots. Lock the identity as
  -- pilot acceptance does, so competing writers cannot both pass this check.
  PERFORM 1 FROM auth.users WHERE id=NEW.user_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.business_memberships m
    JOIN public.colzo_pilot_access p ON p.business_id=m.business_id
    WHERE m.user_id=NEW.user_id AND m.business_id<>NEW.business_id)
  THEN RAISE EXCEPTION 'cross business membership'; END IF;
 END IF;
 RETURN NEW;
END$$;
CREATE TRIGGER colzo_pilot_seat_guard BEFORE INSERT OR UPDATE ON public.business_memberships
FOR EACH ROW EXECUTE FUNCTION colzo_pilot_private.enforce_seat();

-- PostgreSQL grants EXECUTE to PUBLIC by default: explicitly remove it from
-- every private function, then grant only the five operator entry points.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA colzo_pilot_private FROM PUBLIC,anon,authenticated,service_role,colzo_pilot_operator;
GRANT EXECUTE ON FUNCTION colzo_pilot_private.workspace_read_allowed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION colzo_pilot_private.grant_access(uuid,uuid,text,text),
 colzo_pilot_private.invite(uuid,uuid,text,text,text),
 colzo_pilot_private.accept_invite(uuid,uuid,text,text),
 colzo_pilot_private.revoke_access(uuid,uuid,text,text),
 colzo_pilot_private.record_expiry(uuid) TO colzo_pilot_operator;

-- DISPOSABLE DATABASE ONLY. No endpoint or application feature is enabled.
-- Apply after the other three staged proposals and existing owner creation RPC.
-- The original owner/settings/configuration/route writer is reused unchanged.
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

-- STAGED ONLY. Requires verified genuine recovery, duplicate preflight, independent
-- review and separate shared-SQL approval. Never run automatically on shared Dev.
-- Requires the reviewed colzo_pilot_access table. Does not activate any accounts.

-- Refuse an ambiguous existing state; never delete or silently combine bookings.
CREATE UNIQUE INDEX colzo_pilot_one_pending_ai_booking
 ON public.bookings (business_id, lead_id)
 WHERE source = 'ai_request' AND status = 'requested' AND lead_id IS NOT NULL;

CREATE FUNCTION public.request_colzo_pilot_booking(
 p_business_id uuid, p_lead_id bigint, p_title text,
 p_customer_name text, p_customer_phone text, p_customer_email text,
 p_location text, p_notes text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
 v_grant public.colzo_pilot_access%ROWTYPE;
 v_booking public.bookings%ROWTYPE;
 v_created boolean := false;
 v_now timestamptz;
BEGIN
 IF p_business_id IS NULL OR p_lead_id IS NULL OR p_lead_id <= 0
    OR p_title IS NULL OR pg_catalog.btrim(p_title) = ''
    OR pg_catalog.char_length(p_title) > 200
    OR pg_catalog.char_length(coalesce(p_customer_name,'')) > 160
    OR pg_catalog.char_length(coalesce(p_customer_phone,'')) > 64
    OR pg_catalog.char_length(coalesce(p_customer_email,'')) > 320
    OR pg_catalog.char_length(coalesce(p_location,'')) > 500
    OR pg_catalog.char_length(coalesce(p_notes,'')) > 5000 THEN
  RAISE EXCEPTION 'Invalid booking request' USING ERRCODE = '22023';
 END IF;

 -- Serialize this business/lead across independent database backends.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
   'colzo-pilot-booking:' || p_business_id::text || ':' || p_lead_id::text, 0));
 -- Hold the grant against concurrent revocation until this operation commits.
 SELECT * INTO v_grant FROM public.colzo_pilot_access
  WHERE business_id = p_business_id FOR SHARE;
 v_now := pg_catalog.clock_timestamp();
 IF NOT FOUND OR v_grant.status IS DISTINCT FROM 'active'
    OR v_grant.activated_at IS NULL OR v_grant.expires_at IS NULL
    OR v_grant.expires_at <> v_grant.activated_at + interval '336 hours'
    OR v_now < v_grant.activated_at OR v_now >= v_grant.expires_at THEN
  RAISE EXCEPTION 'Approved pilot access required' USING ERRCODE = '42501';
 END IF;
 PERFORM 1 FROM public.leads WHERE id = p_lead_id AND business_id = p_business_id FOR KEY SHARE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Booking enquiry unavailable' USING ERRCODE = '42501';
 END IF;

 SELECT * INTO v_booking FROM public.bookings
  WHERE business_id = p_business_id AND lead_id = p_lead_id
    AND source = 'ai_request' AND status = 'requested';
 IF NOT FOUND THEN
  INSERT INTO public.bookings
   (business_id,lead_id,title,customer_name,customer_phone,customer_email,location,notes,status,source)
  VALUES
   (p_business_id,p_lead_id,p_title,coalesce(p_customer_name,''),coalesce(p_customer_phone,''),
    coalesce(p_customer_email,''),coalesce(p_location,''),coalesce(p_notes,''),'requested','ai_request')
  ON CONFLICT (business_id,lead_id)
   WHERE source = 'ai_request' AND status = 'requested' AND lead_id IS NOT NULL
  DO NOTHING RETURNING * INTO v_booking;
  v_created := FOUND;
  -- A legacy writer can win the unique constraint while this transaction waits.
  IF NOT v_created THEN
   SELECT * INTO v_booking FROM public.bookings
    WHERE business_id = p_business_id AND lead_id = p_lead_id
      AND source = 'ai_request' AND status = 'requested';
   IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking request changed; retry' USING ERRCODE = '40001';
   END IF;
  END IF;
 END IF;

 IF v_created THEN
  INSERT INTO public.lead_history(business_id,lead_id,action,old_value,new_value)
   VALUES(p_business_id,p_lead_id,'Booking requested','',p_title);
  INSERT INTO public.business_audit_events(business_id,action,resource_type,resource_id,metadata)
   VALUES(p_business_id,'booking.public_requested','booking',v_booking.id::text,
     pg_catalog.jsonb_build_object('source','public_enquiry','lead_id',p_lead_id,'status','requested'));
 END IF;
 -- Final authorization point: lead/index/audit waits may have crossed expiry.
 -- Raising here rolls back the booking and both history/audit inserts.
 v_now := pg_catalog.clock_timestamp();
 IF v_now < v_grant.activated_at OR v_now >= v_grant.expires_at THEN
  RAISE EXCEPTION 'Approved pilot access required' USING ERRCODE = '42501';
 END IF;
 RETURN pg_catalog.jsonb_build_object('id',v_booking.id,'business_id',v_booking.business_id,
   'lead_id',v_booking.lead_id,'status',v_booking.status,'source',v_booking.source,'created',v_created);
END;
$$;

-- The definer is necessary for narrow atomic writes and row locks without
-- granting clients or service-role callers wider direct grant-table permissions.
-- Keep the owner a trusted migration role; never assign ownership to a client.
REVOKE ALL ON FUNCTION public.request_colzo_pilot_booking(uuid,bigint,text,text,text,text,text,text)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_colzo_pilot_booking(uuid,bigint,text,text,text,text,text,text)
 TO service_role;
COMMENT ON FUNCTION public.request_colzo_pilot_booking(uuid,bigint,text,text,text,text,text,text)
 IS 'Service-only scoped-pilot booking request with grant/tenant checks, retry deduplication and atomic audit. Not appointment confirmation.';

-- Assertions run before commit. No grants, invitations or workspaces are created.
DO $verify$
DECLARE p record; role_name text;
BEGIN
 IF EXISTS(SELECT 1 FROM public.colzo_pilot_access) OR EXISTS(SELECT 1 FROM colzo_pilot_private.audit) OR EXISTS(SELECT 1 FROM colzo_pilot_private.invitations) THEN RAISE EXCEPTION 'unexpected activation'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='colzo_pilot_operator' AND (rolcanlogin OR rolinherit OR rolsuper OR rolbypassrls))
 OR EXISTS(
  SELECT 1 FROM pg_catalog.pg_auth_members m
  WHERE (m.roleid=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='colzo_pilot_operator')
      OR m.member=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='colzo_pilot_operator'))
  AND NOT (
    m.roleid=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='colzo_pilot_operator')
    AND m.member=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=current_user AND NOT rolsuper AND rolcreaterole)
    AND m.grantor=10 AND EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE oid=10 AND rolsuper)
    AND m.admin_option AND NOT m.inherit_option AND NOT m.set_option
  ) IS TRUE
 ) THEN RAISE EXCEPTION 'unsafe operator role'; END IF;
 -- PostgreSQL 17 gives a NOSUPERUSER CREATEROLE installer this bootstrap-issued
 -- admin-only self-entry. ADMIN can regrant access: postgres is already trusted
 -- as function owner/CREATEROLE. It is not a boundary against that administrator.
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF pg_catalog.pg_has_role(role_name,'colzo_pilot_operator','MEMBER')
     OR pg_catalog.pg_has_role(role_name,'colzo_pilot_operator','SET') THEN
   RAISE EXCEPTION 'runtime operator membership: %',role_name;
  END IF;
 END LOOP;
 FOR p IN SELECT f.*,n.nspname FROM pg_catalog.pg_proc f JOIN pg_catalog.pg_namespace n ON n.oid=f.pronamespace WHERE n.nspname='colzo_pilot_private' OR (n.nspname='public' AND f.proname='request_colzo_pilot_booking') LOOP
  IF p.proowner<>(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=current_user) OR NOT ('search_path=""'=ANY(p.proconfig)) THEN RAISE EXCEPTION 'unsafe function owner/search_path: %',p.proname; END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'public function execute: %',p.proname; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF pg_catalog.has_function_privilege(role_name,p.oid,'EXECUTE') IS DISTINCT FROM
      ((p.proname='workspace_read_allowed' AND role_name='authenticated') OR (p.proname='request_colzo_pilot_booking' AND role_name='service_role')) THEN RAISE EXCEPTION 'unexpected function execute: % %',role_name,p.proname; END IF;
  END LOOP;
 END LOOP;
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role','colzo_pilot_operator'] LOOP
  IF pg_catalog.has_table_privilege(role_name,'public.colzo_pilot_access','INSERT,UPDATE,DELETE,TRUNCATE') OR pg_catalog.has_table_privilege(role_name,'colzo_pilot_private.audit','INSERT,UPDATE,DELETE,TRUNCATE') OR pg_catalog.has_table_privilege(role_name,'colzo_pilot_private.invitations','INSERT,UPDATE,DELETE,TRUNCATE') THEN RAISE EXCEPTION 'unexpected direct write: %',role_name; END IF;
 END LOOP;
END $verify$;
COMMIT;
