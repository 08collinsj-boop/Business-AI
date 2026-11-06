import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const USER='30000000-0000-4000-8000-000000000001', SESSION='40000000-0000-4000-8000-000000000001';
const saved={...process.env}, oldFetch=globalThis.fetch, DEV='https://mvwseobgkexzpmmkgcxe.supabase.co';
const reply=(body,ok=true)=>({ok,status:ok?200:503,json:async()=>body,text:async()=>JSON.stringify(body)});
function enable(){
 Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'true',COLZO_PREVIEW_STRICT_SESSION_REPLAY:'true',VERCEL_ENV:'preview',SUPABASE_URL:DEV,SUPABASE_SERVICE_ROLE_KEY:'fixture-server-key',PILOT_FREE_STARTER_MARKETING:'false'});
}
const jwt=(claims)=>'eyJhbGciOiJub25lIn0.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.fixture';
let run=0;
async function fixture({active=true,rpcOk=true,malformed=false,claims={sub:USER,session_id:SESSION,aal:'aal2'}}={}){
 enable();
 const calls=[],token=jwt(claims);
 globalThis.fetch=async(url,opts={})=>{
  const path=String(url);calls.push({path,opts});
  if(path.endsWith('/auth/v1/user')){assert.equal(opts.headers.Authorization,'Bearer '+token);return reply({id:USER,email:'QA@EXAMPLE.INVALID'});}
  if(path.endsWith('/rest/v1/rpc/colzo_preview_session_active')){
   assert.equal(opts.method,'POST');assert.equal(opts.headers.Authorization,'Bearer fixture-server-key');
   assert.deepEqual(JSON.parse(opts.body),{p_user_id:USER,p_session_id:SESSION});
   return reply(malformed?{active}:active,rpcOk);
  }
  throw Error('Unexpected external request: '+path);
 };
 const {requireAuthenticatedUser}=await import('../lib/auth.js?strict='+ ++run);
 return {requireAuthenticatedUser,req:{headers:{authorization:'Bearer '+token}},calls};
}
test('a revoked Auth session denies replay of an otherwise valid bearer token',async()=>{
 const s=await fixture({active:false});await assert.rejects(s.requireAuthenticatedUser(s.req),{status:401});
 assert.equal(s.calls.filter(c=>c.path.includes('/rpc/')).length,1);
});
test('active session succeeds after a separate server-only Auth session check',async()=>{
 const s=await fixture();assert.deepEqual(await s.requireAuthenticatedUser(s.req),{enforced:true,userId:USER,email:'qa@example.invalid'});
 assert.equal(s.calls.filter(c=>c.path.includes('/rpc/')).length,1);
});
test('strict Preview auth fails closed on absent session claim and invalid or unavailable RPC responses',async()=>{
 for(const opts of [{claims:{sub:USER,aal:'aal2'}},{rpcOk:false},{malformed:true}]){
  const s=await fixture(opts);await assert.rejects(s.requireAuthenticatedUser(s.req),e=>e?.status===401||e?.status===500);
 }
});
test('strict session enforcement never changes Production or disabled pilot behavior',async()=>{
 for(const [key,value] of [['VERCEL_ENV','production'],['COLZO_PREVIEW_STRICT_SESSION_REPLAY','false'],['SUPABASE_URL','https://other.supabase.co']]){
  const s=await fixture({active:false});process.env[key]=value;
  assert.equal((await s.requireAuthenticatedUser(s.req)).userId,USER);
  assert.equal(s.calls.filter(c=>c.path.includes('/rpc/')).length,0);
 }
});
test('staged RPC permits a server check but prevents browser roles and denies revoked or expired sessions',async()=>{
 const db=new PGlite();
 try{
  await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.sessions(id uuid primary key,user_id uuid not null,not_after timestamptz);");
  await db.query("insert into auth.sessions values($1,$2,now()+interval '1 day')",[SESSION,USER]);
  await db.exec(await readFile(new URL('../docs/colzo-pilot-review/STRICT_SESSION_REPLAY_PREVIEW.STAGED.sql',import.meta.url),'utf8'));
  const check=()=>db.query('select public.colzo_preview_session_active($1,$2) active',[USER,SESSION]);
  assert.equal((await check()).rows[0].active,true);
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   await assert.rejects(check(),/permission denied/i);
   await db.exec('reset role');
  }
  await db.query('delete from auth.sessions where id=$1',[SESSION]);
  assert.equal((await check()).rows[0].active,false);
  await db.query("insert into auth.sessions values($1,$2,now()-interval '1 second')",[SESSION,USER]);
  assert.equal((await check()).rows[0].active,false);
 }finally{await db.close();}
});
test.after(()=>{for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);globalThis.fetch=oldFetch;});
