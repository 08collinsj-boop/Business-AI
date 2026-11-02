import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const f=path=>readFile(new URL(path,import.meta.url),'utf8');
const DEV='https://mvwseobgkexzpmmkgcxe.supabase.co';
const OLD={...process.env};
const oldFetch=globalThis.fetch;
const response=(status,body)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(body)});
const makeRes=()=>({statusCode:0,body:null,status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;},setHeader(){}});
function enable(){
 Object.assign(process.env,{
  COLZO_SELF_SERVE_PILOT_SIGNUP:'true',COLZO_SCOPED_PILOT_ACCESS:'true',
  VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-preview-self-serve-pilot-20261102',
  SUPABASE_URL:DEV,SUPABASE_SERVICE_ROLE_KEY:'fixture-only',
  TENANCY_AUTH_ENABLED:'true',FRONTEND_AUTH_ENABLED:'true',BILLING_ENABLED:'false',
  PILOT_FREE_STARTER_MARKETING:'false',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_abcdef'
 });
 delete process.env.OPENAI_API_KEY;delete process.env.OPENROUTER_API_KEY;
}
test('only the explicitly scoped self-service config announces fictional-only content',async()=>{
 enable();
 const {default:handler}=await import('../lib/public-config-handler.js');
 let r=makeRes();handler({method:'GET'},r);
 assert.equal(r.statusCode,200);
 assert.equal(r.body.pilotAccess.fictionalDataOnly,true);
 process.env.COLZO_SELF_SERVE_PILOT_SIGNUP='false';
 r=makeRes();handler({method:'GET'},r);
 assert.equal(r.body.pilotAccess.fictionalDataOnly,undefined);
});
test('self-service workspace creation fails closed without explicit fictional-only consent before RPC writes',async()=>{
 enable();
 const calls=[];
 globalThis.fetch=async(url,options={})=>{
  const u=String(url);calls.push(u);
  if(u.endsWith('/auth/v1/user'))return response(200,{id:'20000000-0000-4000-8000-000000000001',email:'fixture@example.invalid'});
  if(u.includes('/business_memberships?'))return response(200,[]);
  if(u.includes('/rpc/'))throw new Error('No RPC must run without affirmative fictional-only acknowledgement');
  throw new Error('Unexpected call: '+u);
 };
 const {default:handler}=await import('../api/business-onboarding.js?fictional-only-test='+Date.now());
 for(const value of [undefined,false,'true',null,0]){
  const body={business_name:'Example Business',business_type:'Trades'};
  if(value!==undefined)body.fictional_data_only_acknowledged=value;
  const r=makeRes();
  await handler({method:'POST',headers:{authorization:'Bearer synthetic'},body},r);
  assert.equal(r.statusCode,400,'value '+String(value));
  assert.equal(r.body.code,'FICTIONAL_DATA_ONLY_ACK_REQUIRED');
 }
 assert.ok(!calls.some(x=>x.includes('/rpc/')));
});
test('signup UI tells owners fictional content only and requires explicit workspace confirmation',async()=>{
 const html=await f('../index.html');
 assert.match(html,/id="pilotFictionalOnlyDisclaimer"/);
 assert.match(html,/id="pilotFictionalOnlyConsent"/);
 assert.match(html,/id="fictionalOnlyWorkspaceBanner"/);
 assert.match(html,/fictional_data_only_acknowledged\s*:/);
 assert.match(html,/Confirm the pilot is for fictional customer data only/);
});
test('staged SQL creates immutable proof and refuses missing fictional-only acknowledgement',async()=>{
 const sql=await f('../docs/colzo-pilot-review/SELF_SERVICE_PILOT_PREVIEW.STAGED.sql');
 assert.match(sql,/fictional_data_only_acknowledged_at\s+timestamptz\s+NOT NULL/i);
 assert.match(sql,/p_fictional_data_only_acknowledged\s+boolean/i);
 assert.match(sql,/p_fictional_data_only_acknowledged IS DISTINCT FROM true/i);
 assert.match(sql,/INSERT INTO public\.colzo_preview_self_service_awards\(owner_user_id,business_id,activated_at,expires_at,fictional_data_only_acknowledged_at\)/);
});
test.after(()=>{
 for(const key of Object.keys(process.env))if(!(key in OLD))delete process.env[key];
 Object.assign(process.env,OLD);
 globalThis.fetch=oldFetch;
});
