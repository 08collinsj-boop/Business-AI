-- CORRECTED PROPOSAL ONLY. Do NOT execute without separate exact-file approval.
-- Historical prior proposal retained unchanged; not approved for reuse.
-- Native PostgreSQL execution testing and signed-off browser/API acceptance still required.
-- Operator role privilege is temporarily SET-enabled only within this transaction.
-- Review exact SQL and SHA-256 and obtain separate approval BEFORE execution.
-- Execute grant and revoke as SEPARATE operator actions, with browser testing between them.
-- Avoid autocommit execution per statement: submit as ONE atomic SQL transaction.
-- Use only AFTER separately approved fixture browser/API tests. Revocation is not row deletion.
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
DO $preflight$
BEGIN
 IF current_user <> 'postgres' OR session_user <> 'postgres' THEN RAISE EXCEPTION 'Unexpected operator'; END IF;
 IF (SELECT count(*) FROM pg_auth_members am JOIN pg_roles target ON target.oid=am.roleid JOIN pg_roles caller ON caller.oid=am.member
 WHERE target.rolname='colzo_pilot_operator' AND caller.rolname='postgres') <> 1
 OR (SELECT count(*) FROM pg_auth_members am JOIN pg_roles target ON target.oid=am.roleid JOIN pg_roles caller ON caller.oid=am.member
 JOIN pg_roles grantor ON grantor.oid=am.grantor
 WHERE target.rolname='colzo_pilot_operator' AND caller.rolname='postgres' AND grantor.rolname='supabase_admin'
 AND am.admin_option=true AND am.set_option=false AND am.inherit_option=false) <> 1
 OR pg_has_role('postgres','colzo_pilot_operator','SET')
 OR pg_has_role('postgres','colzo_pilot_operator','USAGE')
 THEN RAISE EXCEPTION 'Exact original restricted operator membership required'; END IF;
 IF (SELECT count(*) FROM public.colzo_pilot_access
 WHERE business_id='433f135d-720f-4687-8114-3dffe7361675'::uuid
 AND status='active' AND granted_by='b8cb079d-792e-4810-8218-0f9d442c521a'::uuid) <> 1
 THEN RAISE EXCEPTION 'Expected fictional grant not found'; END IF;
END
$preflight$;
GRANT colzo_pilot_operator TO postgres WITH SET TRUE;
DO $temp_membership$
BEGIN
 IF (SELECT count(*) FROM pg_auth_members am JOIN pg_roles r ON r.oid=am.roleid JOIN pg_roles m ON m.oid=am.member
    WHERE r.rolname='colzo_pilot_operator' AND m.rolname='postgres')<>2
 OR (SELECT count(*) FROM pg_auth_members am JOIN pg_roles r ON r.oid=am.roleid JOIN pg_roles m ON m.oid=am.member
    JOIN pg_roles g ON g.oid=am.grantor
    WHERE r.rolname='colzo_pilot_operator' AND m.rolname='postgres' AND g.rolname='postgres'
    AND am.set_option=true AND am.inherit_option=false AND am.admin_option=false)<>1
 THEN RAISE EXCEPTION 'Exact temporary postgres-granted membership not found'; END IF;
END
$temp_membership$;
SET LOCAL ROLE colzo_pilot_operator;
SELECT colzo_pilot_private.revoke_access(
 '433f135d-720f-4687-8114-3dffe7361675'::uuid,
 'b8cb079d-792e-4810-8218-0f9d442c521a'::uuid,
 'colzo-qa-20261028-4bb083-revoke-v1',
 'End of authorised isolated fictional acceptance tests'
) AS fictional_revoke_result;
RESET ROLE;
-- Revoke the extra row created by postgres; do not merely change its options.
REVOKE colzo_pilot_operator FROM postgres GRANTED BY postgres RESTRICT;
DO $postflight$
BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected role after RESET'; END IF;
 IF (SELECT count(*) FROM pg_auth_members am JOIN pg_roles r ON r.oid=am.roleid JOIN pg_roles m ON m.oid=am.member
     WHERE r.rolname='colzo_pilot_operator' AND m.rolname='postgres')<>1
 OR (SELECT count(*) FROM pg_auth_members am JOIN pg_roles r ON r.oid=am.roleid JOIN pg_roles m ON m.oid=am.member
     JOIN pg_roles g ON g.oid=am.grantor
     WHERE r.rolname='colzo_pilot_operator' AND m.rolname='postgres' AND g.rolname='supabase_admin'
       AND am.set_option=false AND am.inherit_option=false AND am.admin_option=true)<>1
 OR pg_has_role('postgres','colzo_pilot_operator','SET')
 OR pg_has_role('postgres','colzo_pilot_operator','USAGE')
 THEN RAISE EXCEPTION 'Exact restricted grantor/membership restoration failed'; END IF;
 IF (SELECT count(*) FROM public.colzo_pilot_access
   WHERE business_id='433f135d-720f-4687-8114-3dffe7361675'::uuid AND status='revoked')<>1
 THEN RAISE EXCEPTION 'Fixture revocation was not confirmed'; END IF;
 IF (SELECT count(*) FROM public.colzo_pilot_access
   WHERE business_id='6da33602-1b8f-474d-84a6-e003d1c713fd'::uuid AND status='active')<>1
 THEN RAISE EXCEPTION 'Original demo grant was changed'; END IF;
END
$postflight$;
COMMIT;
-- Revoke preserves append-only grant/audit history and requires verifying application access denial.
