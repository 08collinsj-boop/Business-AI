import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import operations from '../api/operations.js';

const branch='feature/colzo-complete-ui-motion-20261017';
const fields=['VERCEL_ENV','VERCEL_GIT_COMMIT_REF','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','TENANCY_AUTH_ENABLED','FRONTEND_AUTH_ENABLED','SUPABASE_PUBLISHABLE_KEY','COLZO_EXPECTED_SUPABASE_PROJECT_REF'];
function env(t,changes={}) {
 const old=fields.map(k=>process.env[k]);fields.forEach(k=>delete process.env[k]);
 Object.assign(process.env,{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch,SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'dev-only-test-fixture',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake_test_key',TENANCY_AUTH_ENABLED:'true',FRONTEND_AUTH_ENABLED:'true'},changes);
 t.after(()=>fields.forEach((k,i)=>old[i]===undefined?delete process.env[k]:process.env[k]=old[i]));
}
function reqWith(headers={}) {
 const req={method:'GET',query:{operation:'legal'},headers};
 const res={statusCode:200,body:null,headersSent:false,status(code){this.statusCode=code;return this},json(data){this.body=data;this.headersSent=true;return this},setHeader(){}};
 return {req,res};
}
function network(t, valid=true){
 const old=globalThis.fetch;const calls=[];
 globalThis.fetch=async (url,init={})=>{
  const location=String(url);calls.push({location,authorization:init.headers?.Authorization});
  if(location.endsWith('/auth/v1/user'))return {ok:valid,status:valid?200:401,json:async()=>valid?{id:'fixture-user'}:{message:'Invalid token'}};
  if(location.includes('/rest/v1/'))return {ok:true,status:200,text:async()=>'[]'};
  throw Error('Unexpected network call');
 };
 t.after(()=>globalThis.fetch=old);
 return calls;
}
test('Preview alternate bearer transport reaches legal handler but still verifies JWT with Supabase',{concurrency:false},async t=>{
 env(t);const calls=network(t);const {req,res}=reqWith({'x-colzo-supabase-authorization':'Bearer fixture-jwt'});
 await operations(req,res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body?.needs_user_acceptance,true);
 assert.equal(calls[0]?.authorization,'Bearer fixture-jwt');
});
test('Preview bearer helper never grants unauthenticated requests',{concurrency:false},async t=>{
 env(t);const calls=network(t);const {req,res}=reqWith({});
 await operations(req,res);assert.equal(res.statusCode,401);assert.deepEqual(calls,[]);
});
test('Preview alternate token is still refused if Supabase rejects it',{concurrency:false},async t=>{
 env(t);const calls=network(t,false);const {req,res}=reqWith({'x-colzo-supabase-authorization':'Bearer fixture-jwt'});
 await operations(req,res);assert.equal(res.statusCode,401);assert.equal(calls.length,1);
});
test('Unrelated Preview branches ignore Colzo-only alternate auth header',{concurrency:false},async t=>{
 env(t,{VERCEL_GIT_COMMIT_REF:'feature/unrelated-branch'});const calls=network(t);const {req,res}=reqWith({'x-colzo-supabase-authorization':'Bearer fixture-jwt'});
 await operations(req,res);assert.equal(res.statusCode,401);assert.deepEqual(calls,[]);
});
test('An explicit Authorization header remains authoritative over Preview compatibility header',{concurrency:false},async t=>{
 env(t);const calls=network(t);const {req,res}=reqWith({authorization:'Bearer official-jwt','x-colzo-supabase-authorization':'Bearer fake-token'});
 await operations(req,res);assert.equal(res.statusCode,200);assert.equal(calls[0]?.authorization,'Bearer official-jwt');
});
test('Browser-side compatibility header is selected only with server-approved Preview flag',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const config=await readFile(new URL('../lib/public-config-handler.js',import.meta.url),'utf8');
 assert.match(config,/previewAuthTransportEnabled/);
 assert.match(html,/colzoPreviewAuthTransportEnabled/);
 assert.match(html,/X-Colzo-Supabase-Authorization/);
 assert.match(html,/headers\.delete\('Authorization'\)/);
});
test('All protected direct API entry points restore the same verified Preview header',async()=>{
 for(const path of ['api/business-onboarding.js','api/business-configuration.js','api/actions.js','api/bookings.js','api/history.js','api/pipeline.js','api/settings.js','api/voice.js']){
  const src=await readFile(new URL('../'+path,import.meta.url),'utf8');
  assert.match(src,/restorePreviewAuthToken\(req\)/,path);
 }
});


test('Preview transport restores valid Supabase token when Vercel adds a non-Bearer Authorization header',{concurrency:false},async t=>{
 env(t);const calls=network(t);
 const {req,res}=reqWith({authorization:'Vercel session marker','x-colzo-supabase-authorization':'Bearer fixture-jwt'});
 await operations(req,res);
 assert.equal(res.statusCode,200);
 assert.equal(calls[0]?.authorization,'Bearer fixture-jwt');
});
test('A Preview legal denial reports token transport metadata without any credential',{concurrency:false},async t=>{
 env(t); const calls=network(t);
 const {req,res}=reqWith({});
 res.setHeader=function(key,value){this.responseHeaders??={};this.responseHeaders[key.toLowerCase()]=value;};
 await operations(req,res);
 assert.equal(res.statusCode,401);
 assert.equal(res.responseHeaders?.['x-colzo-auth-transport'],'alternate-missing');
 assert.equal(Object.values(res.responseHeaders||{}).some(v=>String(v).includes('Bearer')),false);
 assert.deepEqual(calls,[]);
});
test('Preview legal denial reports a malformed upstream Authorization header',{concurrency:false},async t=>{
 env(t);
 const {req,res}=reqWith({authorization:'Vercel session marker'});
 res.setHeader=function(key,value){this.responseHeaders??={};this.responseHeaders[key.toLowerCase()]=value;};
 await operations(req,res);
 assert.equal(res.statusCode,401);
 assert.equal(res.responseHeaders?.['x-colzo-auth-transport'],'standard-not-bearer');
});

test('Preview legal 401 includes safe transport state in JSON when response header is not visible',{concurrency:false},async t=>{
 env(t);const calls=network(t);const {req,res}=reqWith({});
 await operations(req,res);
 assert.equal(res.statusCode,401);
 assert.equal(res.body.error,'Authentication is required');
 assert.equal(res.body.preview_auth_transport,'alternate-missing');
 assert.deepEqual(calls,[]);
});
test('Other branches preserve original legal error response shape',{concurrency:false},async t=>{
 env(t,{VERCEL_GIT_COMMIT_REF:'feature/unrelated-branch'});const {req,res}=reqWith({});
 await operations(req,res);
 assert.equal(res.statusCode,401);
 assert.deepEqual(res.body,{error:'Authentication is required'});
});
test('Preview legal response never includes the submitted token',{concurrency:false},async t=>{
 env(t);const calls=network(t,false);const {req,res}=reqWith({'x-colzo-supabase-authorization':'Bearer fixture-jwt'});
 await operations(req,res);
 assert.equal(res.statusCode,401);
 assert.equal(res.body.preview_auth_transport,'bearer-present');
 assert.equal(JSON.stringify(res.body).includes('fixture-jwt'),false);
});

test('Preview legal requests produce one safe auth transport log without credentials or user identifiers',{concurrency:false},async t=>{
 env(t);const calls=network(t);const {req,res}=reqWith({'x-colzo-supabase-authorization':'Bearer fixture-jwt'});
 const old=console.info, events=[];
 console.info=(...args)=>events.push(args.join(' '));t.after(()=>console.info=old);
 await operations(req,res);
 assert.equal(res.statusCode,200);
 const transport=events.filter(e=>e.includes('colzo.preview_legal_transport'));
 assert.equal(transport.length,1);
 const parsed=JSON.parse(transport[0]);
 assert.deepEqual(parsed,{event:'colzo.preview_legal_transport',state:'bearer-present',route:'legal'});
 assert.equal(JSON.stringify(events).includes('fixture-jwt'),false);
 assert.equal(JSON.stringify(events).includes('fixture-user'),false);
});
test('Unauthenticated Preview legal requests log alternate-missing, without changing 401',{concurrency:false},async t=>{
 env(t);network(t);const {req,res}=reqWith({});
 const old=console.info,events=[];
 console.info=(...args)=>events.push(args.join(' '));t.after(()=>console.info=old);
 await operations(req,res);
 assert.equal(res.statusCode,401);
 assert.deepEqual(events.filter(e=>e.includes('colzo.preview_legal_transport')).map(JSON.parse),[{event:'colzo.preview_legal_transport',state:'alternate-missing',route:'legal'}]);
});
test('Other branches never emit Colzo Preview token transport logs',{concurrency:false},async t=>{
 env(t,{VERCEL_GIT_COMMIT_REF:'feature/other'});network(t);const {req,res}=reqWith({});
 const old=console.info,events=[];
 console.info=(...args)=>events.push(args.join(' '));t.after(()=>console.info=old);
 await operations(req,res);
 assert.equal(events.some(e=>e.includes('colzo.preview_legal_transport')),false);
});
