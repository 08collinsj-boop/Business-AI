import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const base=await readFile(new URL('../docs/colzo-pilot-review/scoped-pilot-access.STAGED.sql',import.meta.url),'utf8');
const A='10000000-0000-4000-8000-000000000001', B='10000000-0000-4000-8000-000000000002';
const U='20000000-0000-4000-8000-000000000001', V='20000000-0000-4000-8000-000000000002';
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
 create table public.businesses(id uuid primary key);
 create table public.business_memberships(business_id uuid references businesses,user_id uuid references auth.users,role text,primary key(business_id,user_id));
 insert into auth.users values('${U}','a@example.invalid',now()),('${V}','b@example.invalid',now());
 insert into businesses values('${A}'),('${B}');
 insert into business_memberships values('${A}','${U}','owner'),('${B}','${V}','owner');
 alter table business_memberships enable row level security;
 create policy own_memberships on business_memberships for select to authenticated using(user_id=auth.uid());
 grant select on business_memberships to authenticated;
 alter table businesses enable row level security;
 create policy own_business on businesses for select to authenticated using(exists(select 1 from business_memberships m where m.business_id=id and m.user_id=auth.uid()));
 grant select on businesses to authenticated;
 create table business_billing_accounts(business_id uuid primary key references businesses,stripe_customer_id text,stripe_subscription_id text,plan text default 'none',status text default 'inactive',trial_purchased boolean default false);
 `);
 for(const table of ['leads','lead_history','bookings','actions','business_settings','business_knowledge_items','voice_calls']){
  await db.exec(`create table public.${table}(id int primary key,business_id uuid references businesses,payload text);
  insert into ${table} values(1,'${A}','A record'),(2,'${B}','B record');
  alter table ${table} enable row level security;
  create policy member_select on ${table} for select to authenticated using(exists(select 1 from business_memberships m where m.business_id=${table}.business_id and m.user_id=auth.uid()));
  grant select on ${table} to authenticated;`);
 }
 await db.exec(base);
 return db;
}
async function readAs(db,user,table='leads'){
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
 await db.exec('set role authenticated');
 try{return (await db.query(`select * from public.${table}`)).rows;}finally{await db.exec('reset role');}
}
async function install(db){
 // Missing enforcement is deliberately tested against the existing vulnerable proposal.
 const sql=await readFile(new URL('../docs/colzo-pilot-review/pilot-expiry-enforcement.STAGED.sql',import.meta.url),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
 await db.exec(sql);
}
test('database expiry denies direct reads with the same identity on every protected fixture table',async()=>{
 const db=await fixture();try{
  await db.exec(`insert into colzo_pilot_access(business_id,activated_at,expires_at) values('${A}',now()-interval '15 days',now()-interval '1 day');`);
  assert.equal((await readAs(db,U)).length,1,'reproduces baseline gap');
  await install(db);
  for(const t of ['leads','lead_history','bookings','actions','business_settings','businesses','business_knowledge_items','voice_calls']){
   assert.equal((await readAs(db,U,t)).length,0,t+' denies expired pilot');
   assert.equal((await readAs(db,V,t)).length,1,t+' preserves independent legacy B');
  }
  assert.equal((await readAs(db,U,'business_memberships')).length,1,'identity routing/recovery remains possible');
 }finally{await db.close();}
});
test('active pilots remain isolated; revocation and pending activation deny direct access',async()=>{
 const db=await fixture();try{
  await db.exec(`insert into colzo_pilot_access(business_id,activated_at,expires_at) values('${A}',now(),now()+interval '14 days');`);
  await install(db);
  assert.deepEqual((await readAs(db,U)).map(r=>r.payload),['A record']);
  await db.exec(`update colzo_pilot_access set status='revoked' where business_id='${A}';`);
  assert.equal((await readAs(db,U)).length,0);
  await db.exec(`update colzo_pilot_access set status='active',activated_at=now()+interval '1 day',expires_at=now()+interval '15 days' where business_id='${A}';`);
  assert.equal((await readAs(db,U)).length,0);
 }finally{await db.close();}
});
test('paid legacy access is unchanged and browser roles cannot write grants or invoke operator functions',async()=>{
 const db=await fixture();try{
  await db.exec(`insert into business_billing_accounts values('${B}','synthetic_customer','synthetic_subscription','pro','active',false);`);
  await install(db);
  assert.equal((await readAs(db,V)).length,1);
  assert.equal((await db.query("select has_table_privilege('authenticated','colzo_pilot_access','INSERT') ok")).rows[0].ok,false);
  assert.equal((await db.query("select has_table_privilege('service_role','colzo_pilot_access','UPDATE') ok")).rows[0].ok,false);
  await db.exec('set role authenticated');
  await assert.rejects(db.exec(`insert into colzo_pilot_access(business_id,activated_at,expires_at) values('${A}',now(),now()+interval '14 days')`),/permission denied/);
  await db.exec('reset role');
 }finally{await db.close();}
});
export {fixture,install,readAs,A,B,U,V};

async function workspaceFixture(){
 const db=await fixture();
 await db.exec(`alter table businesses alter column id set default gen_random_uuid();
 alter table businesses add column name text; alter table businesses add column created_at timestamptz default now();
 create sequence synthetic_settings_id start 3;
 alter table business_settings alter column id set default nextval('synthetic_settings_id');
 alter table business_settings add column business_name text; alter table business_settings add column business_type text;
 create table business_configurations(business_id uuid primary key references businesses); alter table business_configurations enable row level security;`);
 // Execute the actual existing creation migration, not a mocked provisioning RPC.
 await db.exec(await readFile(new URL('../supabase/migrations/20260916180000_add_business_creation_and_public_routes.sql',import.meta.url),'utf8'));
 await provision(db);
 const sql=await readFile(new URL('../docs/colzo-pilot-review/pilot-workspace-provisioning.STAGED.sql',import.meta.url),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
 await db.exec(sql);
 assert.ok((await db.query("select to_regprocedure('colzo_pilot_private.provision_workspace(uuid,text,text,text,text,text)') fn")).rows[0].fn,'atomic workspace provisioning must exist');
 return db;
}
test('new workspaces and grants commit together with two independent synthetic owners',async()=>{
 const db=await workspaceFixture();try{
  const W='20000000-0000-4000-8000-000000000003',X='20000000-0000-4000-8000-000000000004';
  await db.exec(`insert into auth.users values('${W}','new-a@example.invalid',now()),('${X}','new-b@example.invalid',now());`);
  const create=(u,name,slug,key)=>db.query('select colzo_pilot_private.provision_workspace($1,$2,$3,$4,$5,$6) result',[u,name,'Synthetic service',slug,key,'synthetic operator ownership approval']);
  const a=(await create(W,'Synthetic Pilot A','synthetic-pilot-a','workspace-a')).rows[0].result;
  const b=(await create(X,'Synthetic Pilot B','synthetic-pilot-b','workspace-b')).rows[0].result;
  assert.notEqual(a.business_id,b.business_id);
  assert.deepEqual((await create(W,'Synthetic Pilot A','synthetic-pilot-a','workspace-a')).rows[0].result,a);
  await db.query('insert into leads values(3,$1,$2),(4,$3,$4)',[a.business_id,'new A record',b.business_id,'new B record']);
  assert.deepEqual((await readAs(db,W)).map(r=>r.payload),['new A record']);
  assert.deepEqual((await readAs(db,X)).map(r=>r.payload),['new B record']);
  await db.query("update colzo_pilot_access set activated_at=now()-interval '15 days',expires_at=now()-interval '1 day' where business_id=$1",[a.business_id]);
  assert.equal((await readAs(db,W)).length,0);
  assert.deepEqual((await readAs(db,X)).map(r=>r.payload),['new B record']);
  assert.equal((await db.query('select count(*)::int n from business_public_routes where business_id in ($1,$2)',[a.business_id,b.business_id])).rows[0].n,2);
 }finally{await db.close();}
});
test('new workspace provisioning rolls back the business, route and owner if audit persistence fails',async()=>{
 const db=await workspaceFixture();try{
  const W='20000000-0000-4000-8000-000000000003';
  await db.query('insert into auth.users values($1,$2,now())',[W,'new-a@example.invalid']);
  const before=(await db.query('select count(*)::int n from businesses')).rows[0].n;
  await db.exec(`create function colzo_pilot_private.fail_workspace_audit() returns trigger language plpgsql as $$begin raise exception 'audit unavailable'; end$$; create trigger synthetic_workspace_audit_failure before insert on colzo_pilot_private.audit for each row execute function colzo_pilot_private.fail_workspace_audit();`);
  await assert.rejects(db.query('select colzo_pilot_private.provision_workspace($1,$2,$3,$4,$5,$6)',[W,'Synthetic A','Service','synthetic-a','workspace-a','synthetic ownership approval']),/audit unavailable/);
  assert.equal((await db.query('select count(*)::int n from businesses')).rows[0].n,before);
  assert.equal((await db.query('select count(*)::int n from business_memberships where user_id=$1',[W])).rows[0].n,0);
  assert.equal((await db.query("select count(*)::int n from business_public_routes where route_value='synthetic-a'")).rows[0].n,0);
 }finally{await db.close();}
});

async function provision(db){
 await install(db);
 const sql=await readFile(new URL('../docs/colzo-pilot-review/pilot-provisioning.STAGED.sql',import.meta.url),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
 await db.exec(sql);
 assert.ok((await db.query("select to_regprocedure('colzo_pilot_private.grant_access(uuid,uuid,text,text)') fn")).rows[0].fn,'controlled grant function must exist');
}
const grant=async(db,b=A,u=U,key='grant-a')=>{
 await db.exec('set role colzo_pilot_operator');
 try{return await db.query('select colzo_pilot_private.grant_access($1,$2,$3,$4) result',[b,u,key,'synthetic reviewed ownership evidence']);}
 finally{await db.exec('reset role');}
};
test('controlled grant is audited, idempotent and exactly 336 hours; paid accounts are ineligible',async()=>{
 const db=await fixture();try{
  await provision(db);
  const first=(await grant(db)).rows[0].result;
  assert.equal(Date.parse(first.expires_at)-Date.parse(first.activated_at),1209600000);
  assert.deepEqual((await grant(db)).rows[0].result,first);
  assert.equal((await db.query('select count(*)::int n from colzo_pilot_private.audit')).rows[0].n,1);
  assert.equal((await db.query('select * from colzo_pilot_private.audit')).rows[0].executed_by,'postgres','record the database operator identity separately from the beneficiary');
  await assert.rejects(grant(db,A,U,'different-key'),/already designated/);
  await db.exec(`insert into business_billing_accounts values('${B}','synthetic_customer','synthetic_subscription','pro','active',false)`);
  await assert.rejects(grant(db,B,V,'grant-b'),/paid history/);
  assert.equal((await db.query('select count(*)::int n from colzo_pilot_access')).rows[0].n,1);
 }finally{await db.close();}
});
test('pending invitation expiry and idempotency-key substitution cannot allocate a seat',async()=>{
 const db=await fixture();try{
  await provision(db);await grant(db);
  const W='20000000-0000-4000-8000-000000000003';
  await db.query('insert into auth.users values($1,$2,now())',[W,'member@example.invalid']);
  await db.query('select colzo_pilot_private.invite($1,$2,$3,$4,$5)',[A,U,'member@example.invalid','a'.repeat(64),'invite-a']);
  await db.exec("update colzo_pilot_private.invitations set expires_at=now()-interval '1 second'");
  await assert.rejects(db.query('select colzo_pilot_private.accept_invite($1,$2,$3,$4)',[A,W,'a'.repeat(64),'accept-expired']),/invitation unavailable/);
  await assert.rejects(grant(db,B,V,'grant-a'),/idempotency conflict/);
  assert.equal((await db.query('select count(*)::int n from business_memberships where business_id=$1',[A])).rows[0].n,1);
  await db.query('select colzo_pilot_private.invite($1,$2,$3,$4,$5)',[A,U,'member@example.invalid','b'.repeat(64),'invite-replacement']);
  await db.query('select colzo_pilot_private.revoke_access($1,$2,$3,$4)',[A,U,'revoked-before-accept','synthetic withdrawal']);
  await assert.rejects(db.query('select colzo_pilot_private.accept_invite($1,$2,$3,$4)',[A,W,'b'.repeat(64),'accept-revoked']),/pilot unavailable/);
 }finally{await db.close();}
});
test('invitation reserves final seat and acceptance rejects foreign, unverified and reused recipients',async()=>{
 const db=await fixture();try{
  await provision(db);await grant(db);
  const W='20000000-0000-4000-8000-000000000003';
  await db.query('insert into auth.users values($1,$2,now())',[W,'member@example.invalid']);
  const invite=()=>db.query('select colzo_pilot_private.invite($1,$2,$3,$4,$5) result',[A,U,'member@example.invalid','a'.repeat(64),'invite-a']);
  const invitation=(await invite()).rows[0].result;
  assert.deepEqual((await invite()).rows[0].result,invitation);
  await assert.rejects(db.query('select colzo_pilot_private.invite($1,$2,$3,$4,$5)',[A,U,'other@example.invalid','b'.repeat(64),'invite-other']),/seat capacity/);
  const accept=(u,key,token='a'.repeat(64),business=A)=>db.query('select colzo_pilot_private.accept_invite($1,$2,$3,$4) result',[business,u,token,key]);
  await assert.rejects(accept(V,'wrong-user'),/recipient/);
  await assert.rejects(accept(W,'foreign-tenant','a'.repeat(64),B),/invitation unavailable|pilot unavailable/);
  await db.query('update auth.users set email_confirmed_at=null where id=$1',[W]);
  await assert.rejects(accept(W,'unverified'),/recipient/);
  await db.query('update auth.users set email_confirmed_at=now() where id=$1',[W]);
  const result=(await accept(W,'accept-a')).rows[0].result;
  assert.equal(result.role,'member');
  assert.deepEqual((await accept(W,'accept-a')).rows[0].result,result);
  await assert.rejects(accept(W,'reuse'),/invitation unavailable/);
  assert.equal((await db.query('select count(*)::int n from business_memberships where business_id=$1',[A])).rows[0].n,2);
  assert.equal((await db.query("select has_function_privilege('service_role','colzo_pilot_private.grant_access(uuid,uuid,text,text)','EXECUTE') ok")).rows[0].ok,false);
  assert.equal((await db.query("select has_function_privilege('authenticated','colzo_pilot_private.accept_invite(uuid,uuid,text,text)','EXECUTE') ok")).rows[0].ok,false);
 }finally{await db.close();}
});
test('expiry, revocation and audit failure fail closed without extending the grant',async()=>{
 const db=await fixture();try{
  await provision(db);await grant(db);
  await db.exec(`update colzo_pilot_access set activated_at=now()-interval '15 days',expires_at=now()-interval '1 day';`);
  await assert.rejects(db.query('select colzo_pilot_private.invite($1,$2,$3,$4,$5)',[A,U,'member@example.invalid','a'.repeat(64),'expired-invite']),/pilot unavailable/);
  await db.query('select colzo_pilot_private.record_expiry($1)',[A]);
  await db.query('select colzo_pilot_private.record_expiry($1)',[A]);
  assert.equal((await db.query("select count(*)::int n from colzo_pilot_private.audit where action='expired'")).rows[0].n,1);
  await db.query('select colzo_pilot_private.revoke_access($1,$2,$3,$4)',[A,U,'revoke-a','synthetic withdrawal']);
  assert.equal((await readAs(db,U)).length,0);
  await assert.rejects(db.exec('update colzo_pilot_private.audit set action=action'),/append only/);
  await db.exec(`create function colzo_pilot_private.fail_audit() returns trigger language plpgsql as $$begin raise exception 'audit unavailable'; end$$; create trigger synthetic_audit_failure before insert on colzo_pilot_private.audit for each row execute function colzo_pilot_private.fail_audit();`);
  await assert.rejects(grant(db,B,V,'grant-b'),/audit unavailable/);
  assert.equal((await db.query('select count(*)::int n from colzo_pilot_access where business_id=$1',[B])).rows[0].n,0);
 }finally{await db.close();}
});
test('legacy membership writers cannot bypass a reserved pilot seat or add a third user',async()=>{
 const db=await fixture();try{
  await provision(db);await grant(db);
  const W='20000000-0000-4000-8000-000000000003',X='20000000-0000-4000-8000-000000000004';
  await db.exec(`insert into auth.users values('${W}','member@example.invalid',now()),('${X}','extra@example.invalid',now());`);
  await db.query('select colzo_pilot_private.invite($1,$2,$3,$4,$5)',[A,U,'member@example.invalid','a'.repeat(64),'invite-a']);
  await assert.rejects(db.query('insert into business_memberships values($1,$2,$3)',[A,X,'member']),/seat capacity/);
  await db.query('select colzo_pilot_private.accept_invite($1,$2,$3,$4)',[A,W,'a'.repeat(64),'accept-a']);
  await assert.rejects(db.query('insert into business_memberships values($1,$2,$3)',[A,X,'member']),/seat capacity/);
  assert.equal((await db.query('select count(*)::int n from business_memberships where business_id=$1',[A])).rows[0].n,2);
 }finally{await db.close();}
});
test('pilot lasts exactly 336 elapsed hours across the London clock change',async()=>{
 const db=await fixture();try{
  await db.exec("set timezone='Europe/London'");
  await db.exec(`insert into colzo_pilot_access(business_id,activated_at,expires_at) values('${A}','2026-10-20T12:00:00Z','2026-11-03T12:00:00Z')`);
  await assert.rejects(db.exec(`update colzo_pilot_access set expires_at='2026-11-03T13:00:00Z'`),/check constraint/);
 }finally{await db.close();}
});
test('disposable snapshot restores data and protections; transaction rollback restores the baseline',async()=>{
 let db=await fixture();let restored;
 try{
  const backup=await db.dumpDataDir();
  await provision(db);await grant(db);
  const secured=await db.dumpDataDir();
  restored=new PGlite({loadDataDir:secured});
  assert.deepEqual((await readAs(restored,U)).map(r=>r.payload),['A record']);
  assert.equal((await restored.query('select count(*)::int n from colzo_pilot_private.audit')).rows[0].n,1);
  await restored.exec("update colzo_pilot_access set status='revoked'");
  assert.equal((await readAs(restored,U)).length,0);
  await restored.close();restored=null;
  restored=new PGlite({loadDataDir:backup});
  assert.equal((await readAs(restored,U)).length,1);
  assert.equal((await restored.query("select to_regnamespace('colzo_pilot_private') n")).rows[0].n,null);
  await restored.exec('begin');
  await restored.exec("create schema rollback_probe; insert into colzo_pilot_access(business_id,activated_at,expires_at) values('10000000-0000-4000-8000-000000000001',now(),now()+interval '14 days')");
  await restored.exec('rollback');
  assert.equal((await restored.query('select count(*)::int n from colzo_pilot_access')).rows[0].n,0);
  assert.equal((await restored.query("select to_regnamespace('rollback_probe') n")).rows[0].n,null);
 }finally{if(restored)await restored.close();await db.close();}
});
test('an idempotency-key collision cannot silently suppress an expiry audit event',async()=>{
 const db=await fixture();try{
  await provision(db);await grant(db,A,U,'expiry:'+A);
  await db.exec("update colzo_pilot_access set activated_at=now()-interval '15 days',expires_at=now()-interval '1 day'");
  await assert.rejects(db.query('select colzo_pilot_private.record_expiry($1)',[A]),/idempotency conflict/);
  assert.equal((await readAs(db,U)).length,0,'audit failure must not restore expired access');
 }finally{await db.close();}
});

test('a revoked owner cannot restart free access through a different business',async()=>{
 const db=await fixture();try{
  await provision(db);await grant(db);
  await db.query('select colzo_pilot_private.revoke_access($1,$2,$3,$4)',[A,U,'withdraw-a','synthetic withdrawal']);
  // Simulate an authorised membership transfer; historical grant/audit remains.
  await db.query('delete from business_memberships where business_id=$1',[A]);
  await db.query('insert into businesses values($1)',['10000000-0000-4000-8000-000000000003']);
  await db.query('insert into business_memberships values($1,$2,$3)',['10000000-0000-4000-8000-000000000003',U,'owner']);
  await assert.rejects(grant(db,'10000000-0000-4000-8000-000000000003',U,'restart-free-access'),/owner already received pilot access/);
  assert.equal((await db.query('select count(*)::int n from colzo_pilot_access')).rows[0].n,1);
  assert.equal((await db.query("select count(*)::int n from colzo_pilot_private.audit where action='granted'")).rows[0].n,1);
 }finally{await db.close();}
});

test('invitation acceptance audit failure rolls back both membership and token consumption',async()=>{
 const db=await fixture();try{
  await provision(db);await grant(db);
  const W='20000000-0000-4000-8000-000000000003';
  await db.query('insert into auth.users values($1,$2,now())',[W,'member@example.invalid']);
  await db.query('select colzo_pilot_private.invite($1,$2,$3,$4,$5)',[A,U,'member@example.invalid','d'.repeat(64),'invite-atomic']);
  await db.exec(`create function colzo_pilot_private.fail_accept_audit() returns trigger language plpgsql as $$begin if NEW.action='accepted' then raise exception 'audit unavailable'; end if; return NEW; end$$;
   create trigger fail_accept_audit before insert on colzo_pilot_private.audit for each row execute function colzo_pilot_private.fail_accept_audit();`);
  await assert.rejects(db.query('select colzo_pilot_private.accept_invite($1,$2,$3,$4)',[A,W,'d'.repeat(64),'accept-atomic']),/audit unavailable/);
  assert.equal((await db.query('select count(*)::int n from business_memberships where user_id=$1',[W])).rows[0].n,0);
  assert.equal((await db.query("select status from colzo_pilot_private.invitations where token_hash=$1",['d'.repeat(64)])).rows[0].status,'pending');
  await db.exec('drop trigger fail_accept_audit on colzo_pilot_private.audit');
  await db.query('select colzo_pilot_private.accept_invite($1,$2,$3,$4)',[A,W,'d'.repeat(64),'accept-atomic']);
  assert.equal((await db.query('select count(*)::int n from business_memberships where user_id=$1',[W])).rows[0].n,1);
 }finally{await db.close();}
});

test('legacy writers cannot give an existing pilot member access to an unmarked business',async()=>{
 const db=await fixture();try{
  await provision(db);await grant(db);
  await assert.rejects(db.query("insert into business_memberships(business_id,user_id,role) values($1,$2,'member')",[B,U]),/cross business membership/);
  await assert.rejects(db.query('update business_memberships set business_id=$1 where business_id=$2 and user_id=$3',[B,A,U]),/cross business membership/);
  await db.query('select colzo_pilot_private.revoke_access($1,$2,$3,$4)',[A,U,'withdraw-before-legacy-add','synthetic withdrawal']);
  await assert.rejects(db.query("insert into business_memberships(business_id,user_id,role) values($1,$2,'member')",[B,U]),/cross business membership/);
  assert.equal((await db.query('select count(*)::int n from business_memberships where user_id=$1',[U])).rows[0].n,1);
 }finally{await db.close();}
});

test('operator and legacy membership writers reject stale-snapshot transaction modes',async()=>{
 const db=await fixture();try{
  await provision(db);
  const W='20000000-0000-4000-8000-000000000003';
  await db.query('insert into auth.users values($1,$2,now())',[W,'isolation@example.invalid']);
  for(const isolation of ['REPEATABLE READ','SERIALIZABLE']){
   await db.exec('BEGIN ISOLATION LEVEL '+isolation);
   try{await assert.rejects(db.query('select colzo_pilot_private.grant_access($1,$2,$3,$4)',[A,U,'isolation-grant','synthetic reviewed ownership']),/read committed required/);}
   finally{await db.exec('ROLLBACK');}
   await db.exec('BEGIN ISOLATION LEVEL '+isolation);
   try{await assert.rejects(db.query("insert into business_memberships values($1,$2,'member')",[B,W]),/read committed required/);}
   finally{await db.exec('ROLLBACK');}
  }
  assert.equal((await db.query('select count(*)::int n from colzo_pilot_access')).rows[0].n,0);
 }finally{await db.close();}
});
