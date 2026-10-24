-- DISPOSABLE DATABASE ONLY; not installed, exposed or wired to the app.
-- Apply after the grant table and expiry proposal. Dedicated operator role has
-- no login or members. Real ownership checks must precede operator attestation.
BEGIN;
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
COMMIT;
