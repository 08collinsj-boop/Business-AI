-- PROPOSED ONLY. Development project mvwseobgkexzpmmkgcxe; NOT FOR AUTOMATIC EXECUTION.
-- Operator role privilege is temporarily SET-enabled only within this transaction.
-- Review exact SQL and SHA-256 and obtain separate approval BEFORE execution.
-- Execute grant and revoke as SEPARATE operator actions, with browser testing between them.
-- Avoid autocommit execution per statement: submit as ONE atomic SQL transaction.
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
DO $preflight$
DECLARE member record;
BEGIN
 SELECT am.set_option,am.inherit_option,am.admin_option INTO member
 FROM pg_auth_members am
 JOIN pg_roles target ON target.oid=am.roleid
 JOIN pg_roles caller ON caller.oid=am.member
 WHERE target.rolname='colzo_pilot_operator' AND caller.rolname='postgres';
 IF NOT FOUND OR member.set_option OR member.inherit_option OR NOT member.admin_option
 THEN RAISE EXCEPTION 'Operator membership preflight failed'; END IF;
 IF current_user <> 'postgres' OR session_user <> 'postgres'
 THEN RAISE EXCEPTION 'Unexpected SQL operator'; END IF;
 IF (SELECT count(*) FROM auth.users WHERE id='b8cb079d-792e-4810-8218-0f9d442c521a'::uuid AND email='colzo-qa-20261028-4bb083bba9b9@example.invalid' AND email_confirmed_at IS NOT NULL) <> 1
 OR (SELECT count(*) FROM public.business_memberships WHERE user_id='b8cb079d-792e-4810-8218-0f9d442c521a'::uuid AND business_id='433f135d-720f-4687-8114-3dffe7361675'::uuid AND role='owner') <> 1
 OR (SELECT count(*) FROM public.business_memberships WHERE business_id='433f135d-720f-4687-8114-3dffe7361675'::uuid) <> 1
 OR (SELECT count(*) FROM public.business_memberships WHERE user_id='b8cb079d-792e-4810-8218-0f9d442c521a'::uuid) <> 1
 OR (SELECT count(*) FROM public.colzo_pilot_access WHERE business_id='433f135d-720f-4687-8114-3dffe7361675'::uuid) <> 0
 OR (SELECT count(*) FROM colzo_pilot_private.audit WHERE actor='b8cb079d-792e-4810-8218-0f9d442c521a'::uuid AND action='granted') <> 0
 OR (SELECT count(*) FROM public.business_billing_accounts WHERE business_id='433f135d-720f-4687-8114-3dffe7361675'::uuid AND (stripe_customer_id IS NOT NULL OR stripe_subscription_id IS NOT NULL OR plan <> 'none' OR status <> 'inactive' OR trial_purchased)) <> 0
 THEN RAISE EXCEPTION 'Fictional test grant eligibility preflight failed'; END IF;
END
$preflight$;
GRANT colzo_pilot_operator TO postgres WITH SET TRUE;
SET LOCAL ROLE colzo_pilot_operator;
SELECT colzo_pilot_private.grant_access(
 '433f135d-720f-4687-8114-3dffe7361675'::uuid,
 'b8cb079d-792e-4810-8218-0f9d442c521a'::uuid,
 'colzo-qa-20261028-4bb083-grant-v1',
 'Approved isolated Development-only fictional two-business acceptance fixture; no real pilot or invitation'
) AS fictional_grant_result;
RESET ROLE;
GRANT colzo_pilot_operator TO postgres WITH SET FALSE;
GRANT colzo_pilot_operator TO postgres WITH INHERIT FALSE;
DO $postflight$
BEGIN
 IF (SELECT count(*) FROM pg_auth_members am JOIN pg_roles r ON r.oid=am.roleid JOIN pg_roles m ON m.oid=am.member WHERE r.rolname='colzo_pilot_operator' AND m.rolname='postgres' AND am.set_option=false AND am.inherit_option=false AND am.admin_option=true) <> 1 THEN RAISE EXCEPTION 'Exact restored membership required'; END IF;
 IF EXISTS(
 SELECT 1 FROM pg_auth_members am
 JOIN pg_roles target ON target.oid=am.roleid JOIN pg_roles caller ON caller.oid=am.member
 WHERE target.rolname='colzo_pilot_operator' AND caller.rolname='postgres'
 AND (am.set_option OR am.inherit_option IS DISTINCT FROM FALSE)
 ) OR (SELECT count(*) FROM public.colzo_pilot_access WHERE business_id='433f135d-720f-4687-8114-3dffe7361675'::uuid AND status='active'
 AND expires_at = activated_at + interval '336 hours') <> 1
 THEN RAISE EXCEPTION 'Grant postflight failed: rollback entire transaction'; END IF;
END
$postflight$;
COMMIT;
-- After commit: independently verify role set_option=false, one fixture grant and unchanged original demonstration grant.
