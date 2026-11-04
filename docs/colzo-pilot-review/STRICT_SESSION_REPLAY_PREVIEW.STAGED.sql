-- COLZO DEVELOPMENT PREVIEW ONLY — STAGED, NOT INSTALLED.
-- Requires explicit SQL approval and a separate verified Preview rollout.
-- This does not revoke sessions or alter Auth rows. No Production changes.
-- The calling backend first verifies the presented Supabase access token
-- against /auth/v1/user, then supplies the verified user and JWT session UUID.
BEGIN;

CREATE FUNCTION public.colzo_preview_session_active(p_user_id uuid, p_session_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT EXISTS(
    SELECT 1 FROM auth.sessions AS s
    WHERE s.user_id = p_user_id
      AND s.id = p_session_id
      AND (s.not_after IS NULL OR s.not_after > now())
  );
$$;

-- Postgres grants EXECUTE to PUBLIC by default; explicitly remove it.
REVOKE ALL ON FUNCTION public.colzo_preview_session_active(uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.colzo_preview_session_active(uuid,uuid)
  TO service_role;

COMMIT;
