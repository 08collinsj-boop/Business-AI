-- COLZO DEVELOPMENT PREVIEW ONLY — STAGED, NOT INSTALLED.
-- Apply ONLY after separate reviewed authorisation, exact Dev project preflight,
-- genuine two-tenant security acceptance and final operator legal/data exit signoff.
-- Never install on Business AI Production. No credentials, paid providers or billing.
--
-- Called only by server-side verified Supabase Auth sessions via the service-role
-- key. Browser identities have no EXECUTE. Business + 336-hour grant + award
-- ledger commit atomically; failures roll back the entire workspace creation.
BEGIN;

CREATE TABLE public.colzo_preview_self_service_awards (
  owner_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE RESTRICT,
  activated_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  fictional_data_only_acknowledged_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT colzo_preview_selfserve_exact_trial
    CHECK (expires_at = activated_at + interval '336 hours')
);
ALTER TABLE public.colzo_preview_self_service_awards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.colzo_preview_self_service_awards FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.colzo_preview_self_service_awards_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 RAISE EXCEPTION 'self-service award history is immutable';
END$$;
CREATE TRIGGER colzo_preview_self_service_awards_immutable
BEFORE UPDATE OR DELETE ON public.colzo_preview_self_service_awards
FOR EACH STATEMENT EXECUTE FUNCTION public.colzo_preview_self_service_awards_immutable();

CREATE FUNCTION public.create_colzo_self_serve_pilot_workspace(
 p_owner_user_id uuid, p_business_name text, p_business_type text, p_public_slug text,
 p_fictional_data_only_acknowledged boolean
)
RETURNS TABLE (business_id uuid, public_slug text, activated_at timestamptz, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_business uuid; v_slug text; v_start timestamptz; v_end timestamptz;
BEGIN
 -- A real owner must explicitly attest that this initial pilot uses only
 -- fictional customer/business-domain data. No implicit assent or client override.
 IF p_fictional_data_only_acknowledged IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'fictional only acknowledgment required';
 END IF;
 -- Bound total public invitations to FIVE for this restricted test, including
 -- already designated fictional pilot grants. Locks serialize concurrent
 -- registrations so multiple browser requests cannot overrun the cap.
 PERFORM pg_advisory_xact_lock(873104297321);
 IF (SELECT count(*) FROM public.colzo_pilot_access) >= 5 THEN
   RAISE EXCEPTION 'pilot signup capacity reached';
 END IF;
 IF p_owner_user_id IS NULL THEN RAISE EXCEPTION 'verified owner required'; END IF;
 PERFORM 1 FROM auth.users u
  WHERE u.id=p_owner_user_id AND u.email_confirmed_at IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'verified owner required'; END IF;
 IF EXISTS (SELECT 1 FROM public.business_memberships m WHERE m.user_id=p_owner_user_id)
 OR EXISTS (SELECT 1 FROM public.colzo_pilot_access p WHERE p.granted_by=p_owner_user_id)
 OR EXISTS (SELECT 1 FROM public.colzo_preview_self_service_awards a WHERE a.owner_user_id=p_owner_user_id)
 THEN RAISE EXCEPTION 'owner already has a business or trial'; END IF;
 IF p_business_name IS NULL OR length(trim(p_business_name)) NOT BETWEEN 2 AND 120
 OR p_business_type IS NULL OR length(trim(p_business_type)) > 120 THEN
   RAISE EXCEPTION 'invalid business details';
 END IF;
 -- Reuse the original transaction-safe first-owner business writer.
 -- No client-provided tenant ID, duration or activation timestamp is accepted.
 SELECT c.business_id,c.public_slug INTO v_business,v_slug
 FROM public.create_business_for_owner(p_owner_user_id,p_business_name,p_business_type,p_public_slug) c;
 IF v_business IS NULL OR v_slug IS NULL THEN
   RAISE EXCEPTION 'workspace creation unavailable';
 END IF;
 v_start:=clock_timestamp();
 v_end:=v_start + interval '336 hours';
 INSERT INTO public.colzo_pilot_access(business_id,status,activated_at,expires_at,granted_by)
 VALUES(v_business,'active',v_start,v_end,p_owner_user_id);
 INSERT INTO public.colzo_preview_self_service_awards(owner_user_id,business_id,activated_at,expires_at,fictional_data_only_acknowledged_at)
 VALUES(p_owner_user_id,v_business,v_start,v_end,v_start);
 RETURN QUERY SELECT v_business,v_slug,v_start,v_end;
END$$;

REVOKE ALL ON FUNCTION public.create_colzo_self_serve_pilot_workspace(uuid,text,text,text,boolean)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_colzo_self_serve_pilot_workspace(uuid,text,text,text,boolean)
 TO service_role;

COMMIT;
