-- PROPOSED ONLY. Business-AI-Dev mvwseobgkexzpmmkgcxe; separate approval required.
-- Remove only the extra inert postgres-granted membership created by the approved grant.
-- Retain the original supabase_admin-granted membership and all pilot/audit records.
-- Submit this complete transaction once through the verified owner SQL Editor.
BEGIN;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '3s';
DO $preflight$
BEGIN
 IF current_user <> 'postgres' OR session_user <> 'postgres'
 THEN RAISE EXCEPTION 'Unexpected SQL operator'; END IF;
 IF (SELECT count(*) FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member WHERE r.rolname='colzo_pilot_operator' AND u.rolname='postgres') <> 2
 OR (SELECT count(*) FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member JOIN pg_roles g ON g.oid=m.grantor WHERE r.rolname='colzo_pilot_operator' AND u.rolname='postgres' AND g.rolname='supabase_admin' AND m.admin_option AND NOT m.inherit_option AND NOT m.set_option) <> 1
 OR (SELECT count(*) FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member JOIN pg_roles g ON g.oid=m.grantor WHERE r.rolname='colzo_pilot_operator' AND u.rolname='postgres' AND g.rolname='postgres' AND NOT m.admin_option AND NOT m.inherit_option AND NOT m.set_option) <> 1
 OR pg_has_role('postgres','colzo_pilot_operator','SET')
 OR pg_has_role('postgres','colzo_pilot_operator','USAGE')
 THEN RAISE EXCEPTION 'Unexpected membership baseline'; END IF;
END
$preflight$;
REVOKE colzo_pilot_operator FROM postgres GRANTED BY postgres RESTRICT;
DO $postflight$
BEGIN
 IF (SELECT count(*) FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member WHERE r.rolname='colzo_pilot_operator' AND u.rolname='postgres') <> 1
 OR (SELECT count(*) FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member JOIN pg_roles g ON g.oid=m.grantor WHERE r.rolname='colzo_pilot_operator' AND u.rolname='postgres' AND g.rolname='supabase_admin' AND m.admin_option AND NOT m.inherit_option AND NOT m.set_option) <> 1
 OR pg_has_role('postgres','colzo_pilot_operator','SET')
 OR pg_has_role('postgres','colzo_pilot_operator','USAGE')
 THEN RAISE EXCEPTION 'Original membership not restored'; END IF;
END
$postflight$;
COMMIT;
