import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const DEV='https://mvwseobgkexzpmmkgcxe.supabase.co';
const OWNER='20000000-0000-4000-8000-000000000001';
const BUSINESS='10000000-0000-4000-8000-000000000001';
const saved={...process.env};
const originalFetch=globalThis.fetch;
const response=(status=200,body={})=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(body),json:async()=>body});
const res=()=>({statusCode:0,body:null,status(n){this.statusCode=n;return this;},json(x){this.body=x;return this;},setHeader(){}});
function enable(){
 Object.assign(process.env,{
  COLZO_SCOPED_PILOT_ACCESS:'true',COLZO_SELF_SERVE_PILOT_SIGNUP:'true',
  VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-preview-self-serve-pilot-20261102',
  SUPABASE_URL:DEV,SUPABASE_SERVICE_ROLE_KEY:'fixture-private',
  SUPABASE_PUBLISHABLE_KEY:'sb_publishable_abcdef',
  TENANCY_AUTH_ENABLED:'true',FRONTEND_AUTH_ENABLED:'true',
  BILLING_ENABLED:'false',PILOT_FREE_STARTER_MARKETING:'false'
 });
 delete process.env.OPENAI_API_KEY;delete process.env.OPENROUTER_API_KEY;
}
const source=(name)=>readFile(new URL(name,import.meta.url),'utf8');

test('self-service setting is opt-in, Preview-only, Development-only and cost-controlled',async()=>{
 enable();
 const {isScopedPilotSelfServeEnabled}=await import('../lib/colzo-scoped-pilot.js');
 assert.equal(isScopedPilotSelfServeEnabled(),true);
 for(const [key,value] of [
  ['COLZO_SELF_SERVE_PILOT_SIGNUP','false'],['COLZO_SCOPED_PILOT_ACCESS','false'],
  ['VERCEL_ENV','production'],['SUPABASE_URL','https://other.supabase.co'],
  ['TENANCY_AUTH_ENABLED','false'],['FRONTEND_AUTH_ENABLED','false'],
  ['BILLING_ENABLED','true'],['PILOT_FREE_STARTER_MARKETING','true'],
  ['OPENAI_API_KEY','paid-provider-key']
 ]){
  const before=process.env[key];process.env[key]=value;
  assert.equal(isScopedPilotSelfServeEnabled(),false,key+' must fail closed');
  if(before===undefined)delete process.env[key];else process.env[key]=before;
 }
});

test('project-wide signup flag is ignored by every other Preview branch',async()=>{
 enable();
 const {isScopedPilotSelfServeEnabled}=await import('../lib/colzo-scoped-pilot.js');
 const {default:publicConfig}=await import('../lib/public-config-handler.js');
 for(const wrongBranch of ['fix/colzo-pilot-release-gates-20261026','feature/colzo-complete-ui-motion-20261017','main']){
  process.env.VERCEL_GIT_COMMIT_REF=wrongBranch;
  assert.equal(isScopedPilotSelfServeEnabled(),false,wrongBranch+' cannot enable automatic grants');
  const config=res();publicConfig({method:'GET'},config);
  assert.equal(config.statusCode,200);
  assert.equal(config.body.pilotAccess.approvalRequired,true,wrongBranch+' must retain manual approval');
  assert.equal(config.body.pilotAccess.selfService,undefined);
 }
 process.env.VERCEL_GIT_COMMIT_REF='feature/colzo-preview-self-serve-pilot-20261102';
 assert.equal(isScopedPilotSelfServeEnabled(),true);
});

test('other Colzo Preview branch cannot create workspaces even when shared signup switch is on',async()=>{
 enable();
 process.env.VERCEL_GIT_COMMIT_REF='fix/colzo-pilot-release-gates-20261026';
 globalThis.fetch=async (url)=>{
  if(String(url).endsWith('/auth/v1/user'))return response(200,{id:OWNER,email:'qa@example.invalid'});
  throw new Error('No database writes allowed for a non-self-service branch');
 };
 const {default:handler}=await import('../api/business-onboarding.js?branch-guard='+Date.now());
 const result=res();
 await handler({method:'POST',headers:{authorization:'Bearer synthetic-test-token'},body:{business_name:'Example Test',business_type:'Trades'}},result);
 assert.equal(result.statusCode,403);
 assert.equal(result.body.code,'PILOT_PROVISIONING_MANAGED');
});

test('public-config advertises automatic 14-day signup only when safety switch is valid',async()=>{
 enable();
 const {default:handler}=await import('../lib/public-config-handler.js');
 let r=res();handler({method:'GET'},r);
 assert.equal(r.statusCode,200);
 assert.deepEqual(r.body.pilotAccess,{approvalRequired:false,selfService:true,fictionalDataOnly:true,durationDays:14,cardRequired:false,automaticConversion:false});
 process.env.COLZO_SELF_SERVE_PILOT_SIGNUP='false';
 r=res();handler({method:'GET'},r);
 assert.equal(r.statusCode,200);
 assert.equal(r.body.pilotAccess.approvalRequired,true);
});

test('verified signed-in business owner can create workspace and grant through ONE atomic database RPC',async()=>{
 enable();const calls=[];
 globalThis.fetch=async (url,options={})=>{
  const path=String(url);calls.push({path,options});
  if(path.endsWith('/auth/v1/user'))return response(200,{id:OWNER,email:'new@example.invalid'});
  if(path.includes('business_memberships?'))return response(200,[]);
  if(path.endsWith('/rpc/create_colzo_self_serve_pilot_workspace'))return response(200,[{business_id:BUSINESS,public_slug:'new-example',activated_at:'2026-11-02T15:00:00Z',expires_at:'2026-11-16T15:00:00Z'}]);
  throw new Error('Unexpected API call '+path);
 };
 const {default:handler}=await import('../api/business-onboarding.js?self-serve='+Date.now());
 let r=res();await handler({method:'GET',headers:{authorization:'Bearer test-issued-token'}},r);
 assert.equal(r.statusCode,200);
 assert.deepEqual(r.body,{needs_business:true},'new verified account must reach business creation');
 r=res();await handler({method:'POST',headers:{authorization:'Bearer test-issued-token'},body:{business_name:'New Example',business_type:'Trades',fictional_data_only_acknowledged:true}},r);
 assert.equal(r.statusCode,201,JSON.stringify(r.body));
 assert.equal(r.body.public_slug,'new-example');
 assert.equal(calls.filter(x=>x.path.includes('/rpc/')).length,1,'business and trial must be atomic');
 const rpc=calls.find(x=>x.path.includes('/rpc/'));
 assert.ok(rpc.path.endsWith('create_colzo_self_serve_pilot_workspace'));
 assert.equal(JSON.parse(rpc.options.body).p_owner_user_id,OWNER);
 assert.equal(JSON.parse(rpc.options.body).p_fictional_data_only_acknowledged,true);
 assert.ok(!calls.some(x=>x.path.includes('rpc/create_business_for_owner_with_referral')),'never split provisioning and grant');
});

test('approval gate remains the default and cannot be bypassed with a client parameter',async()=>{
 enable();process.env.COLZO_SELF_SERVE_PILOT_SIGNUP='false';
 globalThis.fetch=async(url)=>{
  if(String(url).endsWith('/auth/v1/user'))return response(200,{id:OWNER,email:'new@example.invalid'});
  throw new Error('No DB writes allowed');
 };
 const {default:handler}=await import('../api/business-onboarding.js?approval='+Date.now());
 const r=res();await handler({method:'POST',headers:{authorization:'Bearer issued-token'},body:{business_name:'New Example',business_type:'Trades',self_service:true}},r);
 assert.equal(r.statusCode,403);
 assert.equal(r.body.code,'PILOT_PROVISIONING_MANAGED');
});

async function database(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create function auth.uid() returns uuid language sql stable as $fn$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $fn$;create table auth.users(id uuid primary key,email text unique,email_confirmed_at timestamptz);
 create table businesses(id uuid primary key default gen_random_uuid(),name text,created_at timestamptz default now());
 create table business_memberships(business_id uuid references businesses,user_id uuid references auth.users,role text,primary key(business_id,user_id));
 create table business_settings(id bigint generated by default as identity primary key,business_id uuid unique references businesses,business_name text,business_type text);
 create table business_configurations(business_id uuid primary key references businesses);`);
 await db.exec(await source('../supabase/migrations/20260916180000_add_business_creation_and_public_routes.sql'));
 await db.exec(await source('../docs/colzo-pilot-review/scoped-pilot-access.STAGED.sql'));
 await db.exec(await source('../docs/colzo-pilot-review/SELF_SERVICE_PILOT_PREVIEW.STAGED.sql'));
 return db;
}
test('atomic pilot grant: verified identity, tenant isolation, exactly 336 hours, one trial per owner and client denial',async()=>{
 const db=await database();
 try{
  const A='20000000-0000-4000-8000-000000000011',B='20000000-0000-4000-8000-000000000012',C='20000000-0000-4000-8000-000000000013';
  for(const [u,verified] of [[A,true],[B,true],[C,false]])
    await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)',[u,u+'@example.invalid',verified?'2026-11-01T12:00:00Z':null]);
  const create=(u,name,slug)=>db.query('select * from public.create_colzo_self_serve_pilot_workspace($1,$2,$3,$4,$5)',[u,name,'Trades',slug,true]);
  const first=(await create(A,'Example A','example-a')).rows[0],second=(await create(B,'Example B','example-b')).rows[0];
  assert.notEqual(first.business_id,second.business_id);
  assert.equal(new Date(first.expires_at)-new Date(first.activated_at),336*3600000);
  const award=(await db.query('select fictional_data_only_acknowledged_at from colzo_preview_self_service_awards where owner_user_id=$1',[A])).rows[0];
  assert.equal(new Date(award.fictional_data_only_acknowledged_at).getTime(),new Date(first.activated_at).getTime());
  await assert.rejects(db.query('select * from public.create_colzo_self_serve_pilot_workspace($1,$2,$3,$4,$5)',[C,'Unacknowledged','Trades','unacknowledged',false]),/fictional only acknowledgment required/i);
  assert.equal((await db.query('select count(*)::int n from colzo_pilot_access')).rows[0].n,2);
  assert.equal((await db.query('select count(*)::int n from business_memberships')).rows[0].n,2);
  await assert.rejects(create(A,'Example Again','example-again'),/already|trial|membership/i);
  await assert.rejects(create(C,'Unverified','unverified-example'),/verified|confirmed/i);
  assert.equal((await db.query('select count(*)::int n from businesses')).rows[0].n,2,'rejected attempts commit no partial records');
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select * from public.create_colzo_self_serve_pilot_workspace($1,$2,$3,$4,$5)',[C,'Unauthorized','Trades','unauthorized',true]),/permission denied/i);
  await db.exec('reset role');
 }finally{await db.close();}
});

test('trial capacity is bounded even if disposable users attempt repeated signup',async()=>{
 const db=await database();
 try{
  for(let i=1;i<=6;i++){
   const u='20000000-0000-4000-8000-'+String(i).padStart(12,'0');
   await db.query('insert into auth.users values($1,$2,now())',[u,'cap-'+i+'@example.invalid']);
   if(i<=5)await db.query('select public.create_colzo_self_serve_pilot_workspace($1,$2,$3,$4,$5)',[u,'Business '+i,'Trades','business-'+i,true]);
   else await assert.rejects(db.query('select public.create_colzo_self_serve_pilot_workspace($1,$2,$3,$4,$5)',[u,'Business Six','Trades','business-six',true]),/capacity|limit/i);
  }
  assert.equal((await db.query('select count(*)::int n from businesses')).rows[0].n,5);
  assert.equal((await db.query('select count(*)::int n from colzo_pilot_access')).rows[0].n,5);
 }finally{await db.close();}
});
test('a failed trial award rolls back the entire new workspace and all tenant records',async()=>{
 const db=await database();
 try{
  const identity='20000000-0000-4000-8000-000000000099';
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[identity,'forced-rollback@example.invalid']);
  await db.exec(`CREATE FUNCTION public.block_synthetic_trial_award() RETURNS trigger LANGUAGE plpgsql AS $trigger$
    BEGIN RAISE EXCEPTION 'synthetic award failure'; END $trigger$;
    CREATE TRIGGER block_synthetic_trial_award BEFORE INSERT ON public.colzo_preview_self_service_awards
    FOR EACH ROW EXECUTE FUNCTION public.block_synthetic_trial_award();`);
  await assert.rejects(db.query('select public.create_colzo_self_serve_pilot_workspace($1,$2,$3,$4,$5)',[identity,'Rollback Fixture','Trades','rollback-fixture',true]),/synthetic award failure/);
  for(const table of ['businesses','business_memberships','business_settings','business_configurations','business_public_routes','colzo_pilot_access','colzo_preview_self_service_awards']){
    assert.equal((await db.query('select count(*)::int n from public.'+table)).rows[0].n,0,table+' must not retain partial creation');
  }
 }finally{await db.close();}
});

test.after(()=>{for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);globalThis.fetch=originalFetch;});
