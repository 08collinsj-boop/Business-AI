// Offline assembly only. Never connects to or applies SQL to a database.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const sources=['scoped-pilot-access.STAGED.sql','pilot-expiry-enforcement.STAGED.sql','pilot-provisioning.STAGED.sql','pilot-workspace-provisioning.STAGED.sql','pilot-idempotent-bookings.STAGED.sql'];
const approvedSourceHashes=[
    {
      "name": "scoped-pilot-access.STAGED.sql",
      "sha256": "75e8003c2abdcdfa1d82873e9f7bf9af074caa48cf44d97667bcddd24614107f"
    },
    {
      "name": "pilot-expiry-enforcement.STAGED.sql",
      "sha256": "4945235ec43f0d645ebff416347ea3c0b3e0cc61fa33b12ffa9b119fcb541268"
    },
    {
      "name": "pilot-provisioning.STAGED.sql",
      "sha256": "11e15f6f3e1252cb0f9f1255e1d9641bfacbcc0818e321bb47ea09e5f51ea83d"
    },
    {
      "name": "pilot-workspace-provisioning.STAGED.sql",
      "sha256": "0e2942ecdb3a27a535db8282b4cd312dd2e439574287f32cd3f52061769820c8"
    },
    {
      "name": "pilot-idempotent-bookings.STAGED.sql",
      "sha256": "26dc7e0c9a57bca194ba86d01bfdf4b5e16c65cf30df00fb393f378c525ed1a4"
    }
  ];
export function assemble(inputs){
 if(inputs.length!==sources.length||inputs.some((x,i)=>x.name!==sources[i]))throw new Error('Unexpected source order');
 const bodies=inputs.map(({name,sql},i)=>{
  const begin=[...sql.matchAll(/^BEGIN;\r?$/gm)],commit=[...sql.matchAll(/^COMMIT;\r?$/gm)];
  if(begin.length!==(i?1:0)||commit.length!==(i?1:0)|| (i&&begin[0].index>commit[0].index))throw new Error('Unexpected transaction boundary in '+name);
  if(i&&sql.slice(commit[0].index+commit[0][0].length).trim())throw new Error('Unexpected trailing SQL');
  if(createHash('sha256').update(sql).digest('hex')!==approvedSourceHashes[i].sha256)throw new Error('Unexpected source integrity change: '+name);
  return sql.replace(/^BEGIN;\r?\n/m,'').replace(/^COMMIT;\r?\n?/m,'');
 });
 return `\\set ON_ERROR_STOP on
-- PROPOSAL ONLY. Development mvwseobgkexzpmmkgcxe. Requires recovery, independent
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
${bodies.join('\n')}
-- Assertions run before commit. No grants, invitations or workspaces are created.
DO $verify$
DECLARE p record; role_name text;
BEGIN
 IF EXISTS(SELECT 1 FROM public.colzo_pilot_access) OR EXISTS(SELECT 1 FROM colzo_pilot_private.audit) OR EXISTS(SELECT 1 FROM colzo_pilot_private.invitations) THEN RAISE EXCEPTION 'unexpected activation'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='colzo_pilot_operator' AND (rolcanlogin OR rolinherit OR rolsuper OR rolbypassrls))
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles r ON r.oid=m.roleid OR r.oid=m.member WHERE r.rolname='colzo_pilot_operator') THEN RAISE EXCEPTION 'unsafe operator role'; END IF;
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
`;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const folder=new URL('../docs/colzo-pilot-review/',import.meta.url);
 const inputs=await Promise.all(sources.map(async name=>({name,sql:await readFile(new URL(name,folder),'utf8')})));
 const sql=assemble(inputs), hash=s=>createHash('sha256').update(s).digest('hex');
 await writeFile(new URL('pilot-release-application.PROPOSED.sql',folder),sql);
 await writeFile(new URL('RELEASE_PACKAGE_20261026.json',folder),JSON.stringify({target:'mvwseobgkexzpmmkgcxe',status:'PROPOSED_NOT_AUTHORISED_NOT_APPLIED',application_sha256:hash(sql),sources:inputs.map(x=>({name:x.name,sha256:hash(x.sql)})),rollback:'Before COMMIT: ROLLBACK/disconnect. After COMMIT: preserve controls and records; no destructive automatic rollback.'},null,2)+'\n');
 console.log('Prepared proposal SHA256 '+hash(sql));
}
