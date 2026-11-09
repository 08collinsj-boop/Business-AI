import test from 'node:test';
import assert from 'node:assert/strict';
import {requireAuthenticatedUser, requireBusinessMember, sendAuthError} from '../lib/auth.js';

// Fault injection only. These are not live-issued sessions or outage acceptance.
const USER='30000000-0000-4000-8000-000000000001';
const SESSION='40000000-0000-4000-8000-000000000001';
const DEV='https://mvwseobgkexzpmmkgcxe.supabase.co';
const token='fixture.'+Buffer.from(JSON.stringify({sub:USER,session_id:SESSION,aal:'aal2'})).toString('base64url')+'.fixture';
const request={headers:{authorization:'Bearer '+token}};
const reply=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body,text:async()=>JSON.stringify(body)});
function fixture(t,stage,fault,strict=false){
 const env={...process.env},fetch=globalThis.fetch,calls=[];
 t.after(()=>{process.env=env;globalThis.fetch=fetch;});
 Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'true',COLZO_PREVIEW_STRICT_SESSION_REPLAY:String(strict),VERCEL_ENV:'preview',SUPABASE_URL:DEV,SUPABASE_SERVICE_ROLE_KEY:'fixture-only-service-key'});
 globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;calls.push(path);
  assert.equal(new URL(url).origin,DEV,'no real external provider request');
  if(path===stage)return fault(options);
  if(path==='/auth/v1/user')return reply({id:USER,email:'qa@example.invalid'});
  if(path==='/rest/v1/rpc/colzo_preview_session_active')return reply(true);
  throw Error('Unexpected downstream read: '+path);
 };
 return calls;
}
for(const [label,stage,fault,expected,strict] of [
 ['Auth network failure','/auth/v1/user',()=>{throw Error('private upstream detail');},500,false],
 ['Auth HTTP 503','/auth/v1/user',()=>reply({error:'private upstream detail'},503),401,false],
 ['Auth invalid JSON','/auth/v1/user',()=>({ok:true,json:async()=>{throw Error('private upstream detail');}}),500,false],
 ['Auth missing identity','/auth/v1/user',()=>reply({}),401,false],
 ['membership HTTP 503','/rest/v1/business_memberships',()=>reply({error:'private upstream detail'},503),500,false],
 ['membership malformed JSON','/rest/v1/business_memberships',()=>({ok:true,text:async()=>'{'}),403,false],
 ['membership missing response','/rest/v1/business_memberships',()=>reply(null),403,false],
 ['membership empty response','/rest/v1/business_memberships',()=>reply([]),403,false],
 ['session network failure','/rest/v1/rpc/colzo_preview_session_active',()=>{throw Error('private upstream detail');},500,true],
 ['session HTTP 503','/rest/v1/rpc/colzo_preview_session_active',()=>reply(null,503),500,true],
 ['session missing RPC','/rest/v1/rpc/colzo_preview_session_active',()=>reply(null,404),500,true],
 ['session malformed result','/rest/v1/rpc/colzo_preview_session_active',()=>reply([true]),500,true],
 ['session revoked','/rest/v1/rpc/colzo_preview_session_active',()=>reply(false),401,true]
]){
 test('fault injection denies records: '+label,async t=>{
  const calls=fixture(t,stage,fault,strict);
  let failure;
  try{await requireBusinessMember(request);}catch(error){failure=error;}
  assert.ok(failure,'must not return an authorised workspace');
  const res={status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
  sendAuthError(res,failure);
  assert.equal(res.statusCode,expected);
  assert.doesNotMatch(JSON.stringify(res.body),/private upstream detail|fixture-only-service-key|fixture\./);
  const allowed=['/auth/v1/user',...(strict?['/rest/v1/rpc/colzo_preview_session_active']:[]),...(stage.includes('business_memberships')?[stage]:[])];
  assert.ok(calls.every(path=>allowed.includes(path)));
  assert.equal(calls.filter(path=>path===stage).length,1,'no implicit failure retries');
 });
}
test('fault injection positive control: healthy verified Auth and session remain usable',async t=>{
 const calls=fixture(t,'/no-fault',()=>reply(null),true);
 const result=await requireAuthenticatedUser(request);
 assert.deepEqual(result,{enforced:true,userId:USER,email:'qa@example.invalid'});
 assert.deepEqual(calls,['/auth/v1/user','/rest/v1/rpc/colzo_preview_session_active']);
});
