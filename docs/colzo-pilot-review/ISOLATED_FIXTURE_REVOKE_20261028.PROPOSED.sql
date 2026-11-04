-- PROPOSED ONLY. Development project mvwseobgkexzpmmkgcxe; NOT FOR AUTOMATIC EXECUTION.
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
 IF NOT EXISTS(
 SELECT 1 FROM pg_auth_members am JOIN pg_roles target ON target.oid=am.roleid
 JOIN pg_roles caller ON caller.oid=am.member
 WHERE target.rolname='colzo_pilot_operator' AND caller.rolname='postgres'
 AND am.set_option=false AND am.inherit_option=false AND am.admin_option=true
 ) THEN RAISE EXCEPTION 'Operator membership preflight failed'; END IF;
 IF (SELECT count(*) FROM public.colzo_pilot_access
 WHERE business_id='433f135d-720f-4687-8114-3dffe7361675'::uuid
 AND status='active' AND granted_by='b8cb079d-792e-4810-8218-0f9d442c521a'::uuid) <> 1
 THEN RAISE EXCEPTION 'Expected fictional grant not found'; END IF;
END
$preflight$;
GRANT colzo_pilot_operator TO postgres WITH SET TRUE;
SET LOCAL ROLE colzo_pilot_operator;
SELECT colzo_pilot_private.revoke_access(
 '433f135d-720f-4687-8114-3dffe7361675'::uuid,
 'b8cb079d-792e-4810-8218-0f9d442c521a'::uuid,
 'colzo-qa-20261028-4bb083-revoke-v1',
 'End of authorised isolated fictional acceptance tests'
) AS fictional_revoke_result;
RESET ROLE;
GRANT colzo_pilot_operator TO postgres WITH SET FALSE;
GRANT colzo_pilot_operator TO postgres WITH INHERIT FALSE;
DO $postflight$
BEGIN
 IF (SELECT count(*) FROM pg_auth_members am JOIN pg_roles r ON r.oid=am.roleid JOIN pg_roles m ON m.oid=am.member WHERE r.rolname='colzo_pilot_operator' AND m.rolname='postgres' AND am.set_option=false AND am.inherit_option=false AND am.admin_option=true) <> 1 THEN RAISE EXCEPTION 'Exact restored membership required'; END IF;
 IF EXISTS(SELECT 1 FROM pg_auth_members am
 JOIN pg_roles target ON target.oid=am.roleid JOIN pg_roles caller ON caller.oid=am.member
 WHERE target.rolname='colzo_pilot_operator' AND caller.rolname='postgres'
 AND (am.set_option OR am.inherit_option))
 OR (SELECT count(*) FROM public.colzo_pilot_access WHERE business_id='433f135d-720f-4687-8114-3dffe7361675'::uuid AND status='revoked') <> 1
 THEN RAISE EXCEPTION 'Revoke postflight failed: rollback entire transaction'; END IF;
END
$postflight$;
COMMIT;
-- Revoke preserves append-only grant/audit history and requires verifying application access denial.
