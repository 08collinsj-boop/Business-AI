-- Proposed Development QA operator capability. Requires separate installation
-- and action-time role-change approval. This file is outside the migrations.
-- The installer must independently verify the selected Supabase project before
-- setting colzo.qa_project_ref. The setting is an operator assertion.
BEGIN;
DO $$ BEGIN
  IF current_setting('colzo.qa_project_ref', true)
      IS DISTINCT FROM 'mvwseobgkexzpmmkgcxe' THEN
    RAISE EXCEPTION 'Verified Development project assertion required';
  END IF;
END $$;

CREATE FUNCTION colzo_pilot_private.set_qa_role(
  p_business uuid, p_owner uuid, p_user uuid,
  p_expected_role text, p_role text, p_key text, p_evidence text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  previous_result jsonb;
  existing_role text;
  receipt jsonb;
  payload jsonb := jsonb_build_object(
    'user_id', p_user, 'expected_role', p_expected_role,
    'role', p_role, 'evidence', p_evidence
  );
BEGIN
  IF current_setting('colzo.qa_project_ref', true)
      IS DISTINCT FROM 'mvwseobgkexzpmmkgcxe' THEN
    RAISE EXCEPTION 'Verified Development project assertion required';
  END IF;
  IF p_expected_role IS NULL OR p_role IS NULL
      OR p_expected_role NOT IN ('member', 'admin')
      OR p_role NOT IN ('member', 'admin') OR p_role = p_expected_role THEN
    RAISE EXCEPTION 'invalid role transition';
  END IF;
  IF p_evidence IS NULL OR length(trim(p_evidence)) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'owner approval evidence required';
  END IF;

  previous_result := colzo_pilot_private.replay(
    p_key, p_business, 'qa_role_changed', p_owner, payload
  );
  PERFORM colzo_pilot_private.lock_active(p_business);

  -- Match the existing operator workflow's grant-before-identity lock order.
  PERFORM 1 FROM auth.users WHERE id IN (p_owner, p_user) ORDER BY id FOR UPDATE;
  PERFORM 1 FROM auth.mfa_factors
    WHERE user_id IN (p_owner, p_user) AND status = 'verified'
    ORDER BY user_id FOR UPDATE;
  PERFORM 1 FROM public.business_memberships
    WHERE user_id IN (p_owner, p_user) ORDER BY user_id, business_id FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.business_memberships m ON m.user_id = u.id
    WHERE u.id = p_owner AND u.email_confirmed_at IS NOT NULL
      AND m.business_id = p_business AND m.role = 'owner'
      AND EXISTS (SELECT 1 FROM auth.mfa_factors f
                  WHERE f.user_id = u.id AND f.status = 'verified')
  ) THEN
    RAISE EXCEPTION 'verified owner required';
  END IF;
  IF p_user IS NOT DISTINCT FROM p_owner OR NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p_user
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) ~ '\+colzoqa[23]@'
      AND EXISTS (SELECT 1 FROM auth.mfa_factors f
                  WHERE f.user_id = u.id AND f.status = 'verified')
  ) THEN
    RAISE EXCEPTION 'verified QA recipient required';
  END IF;
  IF (SELECT count(*) FROM public.business_memberships WHERE user_id = p_user) <> 1
      OR NOT EXISTS (SELECT 1 FROM public.business_memberships
                     WHERE user_id = p_user AND business_id = p_business) THEN
    RAISE EXCEPTION 'QA recipient must belong to exactly one business';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM colzo_pilot_private.invitations
                 WHERE business_id = p_business AND accepted_by = p_user
                   AND status = 'accepted') THEN
    RAISE EXCEPTION 'accepted invitation required';
  END IF;
  IF (SELECT count(*) FROM public.business_memberships WHERE business_id = p_business)
      + (SELECT count(*) FROM colzo_pilot_private.invitations
          WHERE business_id = p_business AND status = 'pending'
            AND expires_at > clock_timestamp()) > 2 THEN
    RAISE EXCEPTION 'seat capacity';
  END IF;

  SELECT role INTO existing_role FROM public.business_memberships
    WHERE business_id = p_business AND user_id = p_user;
  IF previous_result IS NOT NULL THEN
    IF existing_role IS DISTINCT FROM p_role THEN
      RAISE EXCEPTION 'role changed after recorded request';
    END IF;
    RETURN previous_result;
  END IF;
  IF existing_role IS DISTINCT FROM p_expected_role THEN
    RAISE EXCEPTION 'role changed; refresh before approval';
  END IF;

  UPDATE public.business_memberships SET role = p_role
    WHERE business_id = p_business AND user_id = p_user
      AND role = p_expected_role;
  IF NOT FOUND THEN RAISE EXCEPTION 'role changed; refresh before approval'; END IF;

  receipt := jsonb_build_object('previous_role', existing_role, 'role', p_role);
  INSERT INTO colzo_pilot_private.audit(
    request_key, business_id, actor, action, payload, result, recorded_at
  ) VALUES (
    p_key, p_business, p_owner, 'qa_role_changed', payload, receipt, clock_timestamp()
  );
  PERFORM colzo_pilot_private.lock_active(p_business);
  RETURN receipt;
END $$;

REVOKE ALL ON FUNCTION colzo_pilot_private.set_qa_role(uuid,uuid,uuid,text,text,text,text)
  FROM PUBLIC, anon, authenticated, service_role, colzo_pilot_operator;
GRANT EXECUTE ON FUNCTION colzo_pilot_private.set_qa_role(uuid,uuid,uuid,text,text,text,text)
  TO colzo_pilot_operator;
COMMIT;
