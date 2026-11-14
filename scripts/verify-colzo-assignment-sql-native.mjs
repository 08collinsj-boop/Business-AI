/**
 * Isolated fictional PostgreSQL 17 rehearsal for the NOT-APPLIED assignment
 * design. NEVER connects to Supabase Development/Production or real data.
 * This does not replace an encrypted real Development backup and restore.
 */
import assert from 'node:assert/strict';
import {mkdtempSync,chmodSync,chownSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

const bin=process.env.COLZO_PG_BIN;
const modulePath=process.env.COLZO_PG_CLIENT_MODULE;
if(!bin||!modulePath)throw Error('An existing isolated local PostgreSQL test runtime is required.');
const {default:pg}=await import(pathToFileURL(modulePath));
const temp=mkdtempSync(join(tmpdir(),'colzo-assignment-only-'));
chmodSync(temp,0o700);
const root=process.getuid?.()===0;
if(root)chownSync(temp,65534,65534);
const cleanEnv=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('PG')));
const run=(name,args)=>{
 const executable=join(bin,name);
 return execFileSync(root?'python3':executable,root
  ?['-c','import os,sys; os.setgroups([]); os.setgid(65534); os.setuid(65534); os.execv(sys.argv[1],sys.argv[1:])',executable,...args]
  :args,{env:cleanEnv,stdio:'pipe',timeout:45000});
};
const port=55469;
const config={host:temp,port,user:'native_admin',database:'postgres',connectionTimeoutMillis:5000};
const A='10000000-0000-4000-8000-000000000001';
const B='10000000-0000-4000-8000-000000000002';
const owner='20000000-0000-4000-8000-000000000001';
const alice='20000000-0000-4000-8000-000000000002';
const outsider='20000000-0000-4000-8000-000000000003';
const staged=readFileSync(new URL('../docs/staged-sql/COLZO_ACTION_ASSIGNMENT_NOT_APPLIED.sql',import.meta.url),'utf8');
assert.match(staged,/STAGED DESIGN ONLY/);
const checks=[];
const check=(label,result)=>{assert.ok(result,label);checks.push(label);};
let started=false;
let client;
try{
 run('initdb',['-D',join(temp,'data'),'-U','native_admin','--no-locale','--encoding=UTF8','--auth-local=trust']);
 run('pg_ctl',['-D',join(temp,'data'),'-l',join(temp,'server.log'),'-o',`-k ${temp} -p ${port} -c listen_addresses='' -c shared_buffers=16MB -c max_connections=20`,'start']);
 started=true;
 client=new pg.Client(config);await client.connect();
 const version=(await client.query('SHOW server_version')).rows[0].server_version;
 const listeners=(await client.query('SHOW listen_addresses')).rows[0].listen_addresses;
 check('local socket-only native PostgreSQL 17',version.startsWith('17.')&&listeners==='');
 await client.query(`
   CREATE ROLE anon NOLOGIN;
   CREATE ROLE authenticated NOLOGIN;
   CREATE ROLE service_role NOLOGIN;
   CREATE TABLE public.businesses (id uuid primary key,name text not null);
   CREATE TABLE public.business_memberships (
     business_id uuid not null references public.businesses(id),
     user_id uuid not null,
     role text not null check(role in ('owner','admin','member')),
     primary key (business_id,user_id)
   );
   CREATE TABLE public.actions (
     id bigint generated always as identity primary key,
     business_id uuid not null references public.businesses(id),
     title text not null,status text not null default 'pending',
     due_at timestamptz
   );
   ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
   REVOKE ALL ON public.actions FROM anon,authenticated;
   INSERT INTO public.businesses(id,name) VALUES
     ('${A}','Fictional Electrical'),('${B}','Fictional Cleaning');
   INSERT INTO public.business_memberships(business_id,user_id,role) VALUES
     ('${A}','${owner}','owner'),('${A}','${alice}','member'),('${B}','${outsider}','member');
   INSERT INTO public.actions(business_id,title) VALUES('${A}','Unassigned site task');
 `);
 check('fixture starts without assignment column',(await client.query("SELECT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actions' AND column_name='assignee_user_id') AS absent")).rows[0].absent);
 await client.query(staged);
 const fk=(await client.query("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='public.actions'::regclass AND conname='actions_assignee_business_membership_fkey'")).rows;
 check('composite business and assignee membership foreign key installed',fk.length===1&&fk[0].definition.includes('FOREIGN KEY (business_id, assignee_user_id)')&&fk[0].definition.includes('REFERENCES business_memberships(business_id, user_id)'));
 const security=(await client.query("SELECT c.relrowsecurity AS rls,has_table_privilege('anon','public.actions','UPDATE') AS anon_update,has_table_privilege('authenticated','public.actions','UPDATE') AS browser_update FROM pg_class c WHERE c.oid='public.actions'::regclass")).rows[0];
 check('assignment SQL preserves actions RLS and service-only mutation policy',security.rls&&!security.anon_update&&!security.browser_update);
 const added=await client.query(`INSERT INTO public.actions(business_id,title,assignee_user_id)
 VALUES('${A}','Check consumer unit','${alice}') RETURNING id,business_id,assignee_user_id`);
 const taskId=added.rows[0].id;
 check('valid same-company member can be assigned',added.rows.length===1&&added.rows[0].business_id===A&&added.rows[0].assignee_user_id===alice);
 await client.query('BEGIN');
 await client.query('SAVEPOINT foreign_assignee');
 let foreignRejected=false;
 try{
   await client.query(`INSERT INTO public.actions(business_id,title,assignee_user_id) VALUES('${A}','Forged cross-tenant task','${outsider}')`);
 }catch(error){foreignRejected=error.code==='23503';}
 await client.query('ROLLBACK TO SAVEPOINT foreign_assignee');
 check('foreign company assignee rejected by PostgreSQL FK',foreignRejected);
 await client.query('COMMIT');
 await client.query(`DELETE FROM public.business_memberships WHERE business_id='${A}' AND user_id='${alice}'`);
 const detached=(await client.query('SELECT business_id,assignee_user_id FROM public.actions WHERE id=$1',[taskId])).rows[0];
 check('member removal clears assignee but preserves original action tenant',detached.business_id===A&&detached.assignee_user_id===null);
 await client.query(staged);
 const indexes=(await client.query("SELECT count(*)::int n FROM pg_indexes WHERE schemaname='public' AND tablename='actions' AND indexname='actions_business_assignee_status_idx'")).rows[0].n;
 check('safe reapply keeps one covering membership index',indexes===1);
 console.log(JSON.stringify({scope:'Isolated fictional PG17 local socket only; NO hosted Development restore or SQL writes.',checks,count:checks.length,assignmentInstalledInDevelopment:false,realBackupVerified:false}));
}finally{
 await client?.end();
 if(started)run('pg_ctl',['-D',join(temp,'data'),'stop','-m','fast']);
 rmSync(temp,{recursive:true,force:true});
}
