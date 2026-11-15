import test from 'node:test';
import assert from 'node:assert/strict';
import callback from '../lib/clickup-callback-handler.js';
import {createClickupState} from '../lib/clickup-provider.js';

const businessId='10000000-0000-4000-8000-000000000001';
const actorId='20000000-0000-4000-8000-000000000002';
const key='e'.repeat(64);
const config={
  VERCEL_ENV:'preview',
  VERCEL_GIT_COMMIT_REF:'feature/colzo-connected-workspace-20261112',
  SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY:'fictional-secret',
  CLICKUP_INTEGRATION_ENABLED:'true',CLICKUP_CLIENT_ID:'fictional-client',CLICKUP_CLIENT_SECRET:'fictional-secret',
  CLICKUP_REDIRECT_URI:'https://preview.example.org/api/clickup-callback',
  CLICKUP_TOKEN_ENCRYPTION_KEY:key,
  COLZO_SCOPED_PILOT_ACCESS:'false'
};
function res(){
 return {statusCode:200,headers:{},status(s){this.statusCode=s;return this;},setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},json(value){this.body=value;return this;},end(value=''){this.body=value;return this;}};
}
async function simulate({replayed=false,expired=false,role='owner',cookieMismatch=false}={}){
 const state=createClickupState().state;
 const pending={id:'30000000-0000-4000-8000-000000000003',business_id:businessId,actor_user_id:actorId,expires_at:new Date(Date.now()+(expired?-60000:60000)).toISOString(),used_at:null};
 const calls=[],saved=[];
 const previousFetch=globalThis.fetch, env=Object.fromEntries(Object.keys(config).map(k=>[k,process.env[k]]));
 for(const [k,v] of Object.entries(config))process.env[k]=v;
 globalThis.fetch=async (url,options={})=>{
   const path=new URL(url).pathname,method=options.method||'GET';
   calls.push({path,method});
   const reply=(x,status=200)=>new Response(x===null?'':JSON.stringify(x),{status});
   if(path==='/rest/v1/colzo_clickup_oauth_states'){
     if(method==='GET')return reply([pending]);
     if(method==='PATCH')return reply(replayed?[]:[{...pending,used_at:new Date().toISOString()}]);
   }
   if(path==='/rest/v1/business_memberships')return reply(role==='member'?[]:[{role}]);
   if(path==='/api/v2/oauth/token')return reply({access_token:'fictional-test-oauth-token'});
   if(path==='/api/v2/team')return reply({teams:[{id:'123',name:'Test Workspace'}]});
   if(path==='/rest/v1/colzo_clickup_connections'){
     const body=JSON.parse(options.body);saved.push(body);
     return reply([body]);
   }
   if(path==='/rest/v1/business_audit_events')return reply(null,204);
   throw Error('Unexpected provider path '+path);
 };
 const response=res();
 try{
   const cookie='colzo_clickup_state='+(cookieMismatch?'a'.repeat(state.length):state);
   await callback({method:'GET',headers:{cookie},query:{state,code:'test-valid-authorisation-code'}},response);
   return {response,calls,saved};
 }finally{
   globalThis.fetch=previousFetch;
   for(const [k,v] of Object.entries(env))v===undefined?delete process.env[k]:process.env[k]=v;
 }
}
test('OAuth callback consumes state, confirms owner membership, and stores only encrypted access',async()=>{
 const {response,calls,saved}=await simulate();
 assert.equal(response.statusCode,303);
 assert.equal(response.headers.location,'/?clickup=connected');
 assert.match(response.headers['set-cookie'],/Max-Age=0/);
 assert.ok(calls.some(c=>c.path==='/api/v2/oauth/token'));
 assert.equal(saved.length,1);
 assert.equal(saved[0].business_id,businessId);
 assert.equal(saved[0].workspace_id,'123');
 assert.ok(!JSON.stringify(saved).includes('fictional-test-oauth-token'));
 assert.ok(saved[0].token_ciphertext);
 assert.equal(response.body,'');
});
test('OAuth callback denies replayed state before exchanging the code',async()=>{
 const {response,calls,saved}=await simulate({replayed:true});
 assert.equal(response.statusCode,400);
 assert.equal(calls.filter(c=>c.path==='/api/v2/oauth/token').length,0);
 assert.equal(saved.length,0);
});
test('OAuth callback denies expired pending state before any database write',async()=>{
 const {response,calls}=await simulate({expired:true});
 assert.equal(response.statusCode,400);
 assert.ok(!calls.some(c=>c.method==='PATCH'));
 assert.ok(!calls.some(c=>c.path==='/api/v2/oauth/token'));
});
test('OAuth callback rechecks owner privileges before persisting access',async()=>{
 const {response,calls,saved}=await simulate({role:'member'});
 assert.equal(response.statusCode,403);
 assert.ok(!calls.some(c=>c.path==='/api/v2/oauth/token'));
 assert.equal(saved.length,0);
});
test('OAuth callback mismatched state never touches provider or token storage',async()=>{
 const {response,calls}=await simulate({cookieMismatch:true});
 assert.equal(response.statusCode,400);
 assert.equal(calls.length,0);
});

