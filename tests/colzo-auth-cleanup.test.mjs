import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import operations from '../api/operations.js';

const branch='feature/colzo-complete-ui-motion-20261017';
const names=['VERCEL_ENV','VERCEL_GIT_COMMIT_REF','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','TENANCY_AUTH_ENABLED'];
function devEnv(t){
 const original=names.map(n=>process.env[n]);
 Object.assign(process.env,{
  VERCEL_ENV:'preview',
  VERCEL_GIT_COMMIT_REF:branch,
  SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY:'synthetic-test-only',
  TENANCY_AUTH_ENABLED:'true'
 });
 t.after(()=>names.forEach((n,i)=>original[i]===undefined?delete process.env[n]:process.env[n]=original[i]));
}
function request(operation,headers={}){
 const req={method:'GET',query:{operation},headers};
 const res={statusCode:200,body:null,headersSent:false,responseHeaders:{},
  status(n){this.statusCode=n;return this},
  json(x){this.body=x;this.headersSent=true;return this},
  setHeader(k,v){this.responseHeaders[k.toLowerCase()]=v}};
 return {req,res};
}
test('retired unauthenticated Dev service-role preflight is not routable',{concurrency:false},async t=>{
 devEnv(t);
 const priorFetch=globalThis.fetch;let count=0;
 globalThis.fetch=async()=>{count++;throw Error('Should not send an upstream credential')};
 t.after(()=>globalThis.fetch=priorFetch);
 const {req,res}=request('dev-auth-preflight');
 await operations(req,res);
 assert.equal(res.statusCode,404);
 assert.deepEqual(res.body,{error:'Not found'});
 assert.equal(count,0);
});
test('signed-in legal API keeps the existing Supabase verification but does not log session transport metadata',{concurrency:false},async t=>{
 devEnv(t);
 const originalFetch=globalThis.fetch;const oldInfo=console.info;const emitted=[];const requests=[];
 globalThis.fetch=async (url,options={})=>{
  requests.push({url:String(url),authorization:options.headers?.Authorization});
  if(String(url).endsWith('/auth/v1/user'))return {ok:true,status:200,json:async()=>({id:'synthetic-user'})};
  if(String(url).includes('/rest/v1/'))return {ok:true,status:200,text:async()=>'[]'};
  throw Error('unexpected upstream endpoint');
 };
 console.info=(...items)=>emitted.push(items.map(String).join(' '));
 t.after(()=>{globalThis.fetch=originalFetch;console.info=oldInfo});
 const {req,res}=request('legal',{'x-colzo-supabase-authorization':'Bearer synthetic-owner-jwt'});
 await operations(req,res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body?.needs_user_acceptance,true);
 assert.equal(requests[0]?.authorization,'Bearer synthetic-owner-jwt');
 assert.ok(!emitted.some(line=>line.includes('colzo.preview_legal_transport')));
 assert.ok(!JSON.stringify(res.body).includes('synthetic-owner-jwt'));
});
test('unauthenticated legal request remains 401 without temporary transport response fields',{concurrency:false},async t=>{
 devEnv(t);
 const {req,res}=request('legal');
 await operations(req,res);
 assert.equal(res.statusCode,401);
 assert.deepEqual(res.body,{error:'Authentication is required'});
 assert.equal(res.responseHeaders['x-colzo-auth-transport'],undefined);
});
test('retired temporary Dev-only credential probe is absent from the server source',()=>{
 const src=readFileSync('api/operations.js','utf8');
 assert.doesNotMatch(src,/dev-auth-preflight|colzo\.preview_legal_transport|preview_auth_transport/);
});

