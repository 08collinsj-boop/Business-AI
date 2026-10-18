import test from 'node:test';
import assert from 'node:assert/strict';
import operations from '../api/operations.js';

const branch = 'feature/colzo-complete-ui-motion-20261017';
const fields=['VERCEL_ENV','VERCEL_GIT_COMMIT_REF','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','TENANCY_AUTH_ENABLED'];
const url='https://mvwseobgkexzpmmkgcxe.supabase.co';

function env(t,extra={}){
 const saved=fields.map(f=>process.env[f]);
 fields.forEach(f=>delete process.env[f]);
 Object.assign(process.env,{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch,SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:'fixture-not-real',TENANCY_AUTH_ENABLED:'true'},extra);
 t.after(()=>fields.forEach((f,i)=>saved[i]===undefined?delete process.env[f]:process.env[f]=saved[i]));
}
function req(method='GET'){
 const request={method,query:{operation:'dev-auth-preflight'},headers:{}};
 const res={statusCode:200,body:null,headersSent:false,responseHeaders:{},
 status(c){this.statusCode=c;return this},
 json(d){this.body=d;this.headersSent=true;return this},
 setHeader(k,v){this.responseHeaders[k]=v}};
 return {request,res};
}
test('Dev-only credential preflight reads zero rows without returning any backend data',{concurrency:false},async t=>{
 env(t);const old=globalThis.fetch,calls=[];
 globalThis.fetch=async (endpoint,opts)=>{calls.push({endpoint:String(endpoint),opts});return {ok:true,status:200}};
 t.after(()=>globalThis.fetch=old);
 const {request,res}=req();await operations(request,res);
 assert.equal(res.statusCode,200);
 assert.deepEqual(res.body,{status:'ready',backendCredential:'accepted'});
 assert.equal(calls.length,1);
 assert.match(calls[0].endpoint,/^https:\/\/mvwseobgkexzpmmkgcxe\.supabase\.co\/rest\/v1\/business_memberships\?select=business_id&limit=0$/);
 assert.equal(calls[0].opts.method,'GET');
 assert.equal(calls[0].opts.headers.Authorization,'Bearer fixture-not-real');
 assert.equal(calls[0].opts.headers.apikey,'fixture-not-real');
 assert.equal(JSON.stringify(res.body).includes('fixture-not-real'),false);
});
test('Rejected server key reports safe blocked state and upstream status without credentials',{concurrency:false},async t=>{
 env(t);const old=globalThis.fetch;
 globalThis.fetch=async()=>({ok:false,status:401});
 t.after(()=>globalThis.fetch=old);
 const {request,res}=req();await operations(request,res);
 assert.equal(res.statusCode,503);
 assert.deepEqual(res.body,{status:'blocked',backendCredential:'rejected',upstreamStatus:401});
 assert.equal(JSON.stringify(res.body).includes('fixture-not-real'),false);
});
test('Missing server key fails closed without external fetch',{concurrency:false},async t=>{
 env(t,{SUPABASE_SERVICE_ROLE_KEY:''});const old=globalThis.fetch;const calls=[];
 globalThis.fetch=async(...args)=>{calls.push(args);throw Error('unexpected network')};t.after(()=>globalThis.fetch=old);
 const {request,res}=req();await operations(request,res);
 assert.equal(res.statusCode,503);assert.equal(res.body.backendCredential,'unconfigured');assert.equal(calls.length,0);
});
test('Other branch cannot invoke Dev-only credential probe',{concurrency:false},async t=>{
 env(t,{VERCEL_GIT_COMMIT_REF:'feature/unrelated-branch'});const old=globalThis.fetch;const calls=[];
 globalThis.fetch=async(...args)=>{calls.push(args);throw Error('unexpected')};t.after(()=>globalThis.fetch=old);
 const {request,res}=req();await operations(request,res);
 assert.equal(res.statusCode,404);assert.equal(calls.length,0);
});
test('POST is blocked and no secret leaves the server',{concurrency:false},async t=>{
 env(t);const old=globalThis.fetch;const calls=[];
 globalThis.fetch=async(...args)=>{calls.push(args);throw Error('unexpected')};t.after(()=>globalThis.fetch=old);
 const {request,res}=req('POST');await operations(request,res);
 assert.equal(res.statusCode,405);assert.equal(calls.length,0);
});

