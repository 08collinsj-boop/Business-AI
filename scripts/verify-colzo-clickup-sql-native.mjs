/**
 * Isolated fictional ClickUp migration/restore rehearsal.
 * Never connects to a hosted database: PG* environment is removed, the client
 * uses a private UNIX socket and the Postgres server has TCP disabled.
 * This is NOT proof of an actual Development database backup/restore.
 */
import assert from 'node:assert/strict';
import {mkdtempSync,chmodSync,chownSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

const bin=process.env.COLZO_PG_BIN, modulePath=process.env.COLZO_PG_CLIENT_MODULE;
const backupBin=process.env.COLZO_PG_BACKUP_CLIENT_BIN||bin;
if(!bin||!modulePath)throw Error('Requires existing isolated COLZO_PG_BIN and COLZO_PG_CLIENT_MODULE; does not download software.');
const {default:pg}=await import(pathToFileURL(modulePath));
const work=mkdtempSync(join(tmpdir(),'colzo-clickup-backup-native-'));
chmodSync(work,0o700);
const root=process.getuid?.()===0;
if(root)chownSync(work,65534,65534);
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('PG')));
const run=(name,args)=>{
 const executable=join(['pg_dump','pg_restore','createdb'].includes(name)?backupBin:bin,name);
 return execFileSync(root?'python3':executable,root
 ?['-c','import os,sys; os.setgroups([]); os.setgid(65534); os.setuid(65534); os.execv(sys.argv[1],sys.argv[1:])',executable,...args]
 :args,{env,stdio:'pipe',timeout:45000});
};
const port=55468;
const config={host:work,port,user:'native_admin',database:'postgres',connectionTimeoutMillis:5000};
const connect=async database=>{const client=new pg.Client({...config,database});await client.connect();return client};
const migration=readFileSync(new URL('../supabase/migrations/20261112013500_add_clickup_connections.sql',import.meta.url),'utf8');
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
const u='20000000-0000-4000-8000-000000000001';
const archive=join(work,'fictional-before-clickup.dump');
const checks=[];
const check=(name,result)=>{assert.ok(result,name);checks.push(name)};
let started=false,admin,restored;
try{
 run('initdb',['-D',join(work,'data'),'-U','native_admin','--no-locale','--encoding=UTF8','--auth-local=trust']);
 run('pg_ctl',['-D',join(work,'data'),'-l',join(work,'server.log'),'-o',`-k ${work} -p ${port} -c listen_addresses='' -c shared_buffers=16MB -c max_connections=20`,'start']);
 started=true;
 admin=await connect('postgres');
 check('socket-only PostgreSQL 17',(
  await admin.query('SHOW server_version')).rows[0].server_version.startsWith('17.')&&
  (await admin.query('SHOW listen_addresses')).rows[0].listen_addresses==='');
 await admin.query(`
  CREATE ROLE postgres NOLOGIN; CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
  CREATE SCHEMA auth;
  CREATE TABLE public.businesses(id uuid PRIMARY KEY,name text NOT NULL);
  CREATE TABLE auth.users(id uuid PRIMARY KEY,email text NOT NULL);
  GRANT USAGE ON SCHEMA auth TO postgres;
  GRANT REFERENCES ON auth.users TO postgres;
  GRANT REFERENCES ON public.businesses TO postgres;
  GRANT CREATE ON SCHEMA public TO postgres;
  INSERT INTO public.businesses(id,name) VALUES('${a}','Fictional company A'),('${b}','Fictional company B');
  INSERT INTO auth.users(id,email) VALUES('${u}','fictional-owner@example.invalid');
 `);
 const before=(await admin.query('SELECT json_agg(name ORDER BY name) names FROM public.businesses')).rows[0].names;
 // Real pg_dump/pg_restore against two different disposable database names.
 run('pg_dump',['-h',work,'-p',String(port),'-U','native_admin','-d','postgres','--format=custom','--file',archive]);
 check('synthetic pre-migration archive is readable',run('pg_restore',['--list',archive]).length>100);
 await admin.query('BEGIN');
 await admin.query('SET LOCAL ROLE postgres');
 await admin.query(migration);
 await admin.query('RESET ROLE');
 const tables=(await admin.query("SELECT count(*)::int n FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('colzo_clickup_oauth_states','colzo_clickup_connections') AND relkind='r' AND relrowsecurity")).rows[0].n;
 check('both exact ClickUp tables created with row level security',tables===2);
 const permissions=(await admin.query(`SELECT
  (has_table_privilege('service_role','public.colzo_clickup_connections','SELECT')
    AND has_table_privilege('service_role','public.colzo_clickup_connections','INSERT')
    AND has_table_privilege('service_role','public.colzo_clickup_connections','UPDATE')
    AND has_table_privilege('service_role','public.colzo_clickup_connections','DELETE')) service,
  has_table_privilege('authenticated','public.colzo_clickup_connections','SELECT') browser,
  has_table_privilege('anon','public.colzo_clickup_connections','SELECT') anonymous,
  has_table_privilege('authenticated','public.colzo_clickup_oauth_states','SELECT') state_browser`)).rows[0];
 check('only service role is granted provider credentials',permissions.service&&!permissions.browser&&!permissions.anonymous&&!permissions.state_browser);
 await admin.query(`INSERT INTO public.colzo_clickup_connections(business_id,connected_by,workspace_id,workspace_name,token_ciphertext,token_iv,token_tag)
 VALUES('${a}','${u}','123','Fictional workspace','synthetic-ciphertext-only','synthetic-iv','synthetic-tag');
 INSERT INTO public.colzo_clickup_oauth_states(state_hash,business_id,actor_user_id,expires_at)
 VALUES('${'a'.repeat(64)}','${a}','${u}',now()+interval '1 hour');`);
 check('synthetic provider rows can be inserted by owner',(
  await admin.query('SELECT count(*)::int n FROM public.colzo_clickup_connections')).rows[0].n===1);
 await admin.query('SAVEPOINT invalid_workspace');
 let rejected=false;
 try{
  await admin.query(`INSERT INTO public.colzo_clickup_connections(business_id,connected_by,workspace_id,workspace_name,token_ciphertext,token_iv,token_tag)
 VALUES('${b}','${u}','0','Invalid','synthetic-ciphertext-only','synthetic-iv','synthetic-tag')`);
 }catch(e){rejected=e.code==='23514'}
 await admin.query('ROLLBACK TO SAVEPOINT invalid_workspace');
 check('invalid provider workspace is rejected by database constraint',rejected);
 await admin.query(`DELETE FROM public.businesses WHERE id='${a}'`);
 check('deleting fictional tenant cascades credentials and OAuth state',(
  await admin.query('SELECT ((SELECT count(*) FROM public.colzo_clickup_connections) + (SELECT count(*) FROM public.colzo_clickup_oauth_states))::int n')).rows[0].n===0);
 await admin.query('COMMIT');
 check('source migration committed in disposable database',(await admin.query("SELECT to_regclass('public.colzo_clickup_connections') IS NOT NULL ok")).rows[0].ok);
 run('createdb',['-h',work,'-p',String(port),'-U','native_admin','colzo_fictional_restored']);
 run('pg_restore',['-h',work,'-p',String(port),'-U','native_admin','--exit-on-error','-d','colzo_fictional_restored',archive]);
 restored=await connect('colzo_fictional_restored');
 const after=(await restored.query('SELECT json_agg(name ORDER BY name) names FROM public.businesses')).rows[0].names;
 check('independent restore preserves both pre-migration synthetic tenants',JSON.stringify(before)===JSON.stringify(after));
 check('independent restored snapshot has no new ClickUp tables',(await restored.query("SELECT to_regclass('public.colzo_clickup_connections') IS NULL AND to_regclass('public.colzo_clickup_oauth_states') IS NULL ok")).rows[0].ok);
 check('independent restore preserves synthetic Auth user',(await restored.query('SELECT count(*)::int n FROM auth.users')).rows[0].n===1);
 console.log(JSON.stringify({scope:'Isolated synthetic PostgreSQL 17 only. NOT a Development or Supabase Auth/Storage restore.',checks,count:checks.length,developmentBackupVerified:false,migrationInstalledInDevelopment:false}));
}finally{
 await restored?.end();await admin?.end();
 if(started)run('pg_ctl',['-D',join(work,'data'),'stop','-m','fast']);
 rmSync(work,{recursive:true,force:true});
}
