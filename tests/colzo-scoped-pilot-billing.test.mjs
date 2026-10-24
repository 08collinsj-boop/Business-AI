import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isScopedPilotRequested} from '../lib/colzo-scoped-pilot.js';

const originalEnv={...process.env};
const originalFetch=globalThis.fetch;
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const row={business_id:a,status:'active',activated_at:'2026-10-24T10:00:00.000Z',expires_at:'2026-11-07T10:00:00.000Z'};
const when=new Date('2026-10-25T12:00:00Z');
const response=(body,ok=true)=>({ok,status:ok?200:503,text:async()=>JSON.stringify(body),json:async()=>body});
function enable(){Object.assign(process.env,{
 COLZO_SCOPED_PILOT_ACCESS:'true',VERCEL_ENV:'preview',
 SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',
 SUPABASE_SERVICE_ROLE_KEY:'synthetic_fixture',PILOT_FREE_STARTER_MARKETING:'false',BILLING_ENABLED:'false'
});}
function backend(calls,{grant=row,quantity=2,broken=false}={}){
 return async(url,opts={})=>{
  const href=String(url);calls.push({href,method:opts.method||'GET'});
  if(href.includes('colzo_pilot_access'))return broken?response({message:'offline'},false):response(href.includes(encodeURIComponent(a))&&grant?[grant]:[]);
  if(href.includes('business_billing_usage'))return response([{quantity}]);
  if(href.includes('rpc/consume_billing_ai_enquiry_allowance'))return response(true);
  if(href.includes('rpc/release_billing_ai_enquiry_allowance'))return response(true);
  throw Error('Unexpected remote access: '+href);
 };
}
test('approved business receives bounded allowance; another business is denied and not reserved',async()=>{
 enable();const calls=[];globalThis.fetch=backend(calls);
 const billing=await import('../lib/billing.js');
 const e=await billing.getBusinessEntitlements(a,when);
 assert.equal(e.active,true);assert.equal(e.enquiriesRemaining,248);
 const good=await billing.reserveAiEnquiryAllowance(a,when);
 assert.equal(good.allowed,true);assert.equal(good.period,row.activated_at);
 assert.equal(await billing.releaseAiEnquiryAllowance(a,good.reservation),true);
 const other=await billing.reserveAiEnquiryAllowance(b,when);
 assert.equal(other.allowed,false);
 assert.equal(calls.filter(c=>c.href.includes('consume_billing_ai_enquiry_allowance')).length,1);
 assert.equal(calls.every(c=>!c.href.includes('business_billing_accounts')),true);
});
test('no grant, cross-business record, expired grant, or down storage never grant access',async()=>{
 enable();const billing=await import('../lib/billing.js');
 for(const config of [{grant:null},{grant:{...row,business_id:b}},{broken:true}]){
  const calls=[];globalThis.fetch=backend(calls,config);
  const x=await billing.getAiEnquiryAccess(a,when);
  assert.equal(x.allowed,false);assert.equal(calls.filter(c=>c.href.includes('consume_billing_ai_enquiry_allowance')).length,0);
 }
 globalThis.fetch=backend([]);
 assert.equal((await billing.getAiEnquiryAccess(a,new Date(row.expires_at))).allowed,false);
});
test('wrong environment or legacy broad pilot override cannot unlock scoped pilot',async()=>{
 enable();const billing=await import('../lib/billing.js');let requests=0;
 globalThis.fetch=async()=>{requests++;throw Error('should not be called');};
 process.env.VERCEL_ENV='production';
 assert.equal((await billing.getAiEnquiryAccess(a,when)).allowed,false);
 process.env.VERCEL_ENV='preview';process.env.PILOT_FREE_STARTER_MARKETING='true';
 assert.equal((await billing.getAiEnquiryAccess(a,when)).allowed,false);
 assert.equal(requests,0);
});
test('scoped pilot locks inherited Marketing add-on and legacy blanket free switch',async()=>{
 enable();const billing=await import('../lib/billing.js');const addon=await import('../lib/addons.js');
 assert.equal(isScopedPilotRequested(),true);
 assert.equal(billing.isPilotFreeStarterMarketingEnabled(),false);
 await assert.rejects(()=>addon.requireAddon(a,'ai_marketing'),/locked|unavailable/i);
});
test('authenticated owner receives pilot status without checkout; team member is forbidden',async()=>{
 enable();process.env.TENANCY_AUTH_ENABLED='true';
 const start=new Date(Date.now()-86400000).toISOString();
 const live={business_id:a,status:'active',activated_at:start,expires_at:new Date(Date.parse(start)+14*86400000).toISOString()};
 let role='owner';const calls=[];
 globalThis.fetch=async(url,opts={})=>{
  const href=String(url);calls.push(href);
  if(href.endsWith('/auth/v1/user'))return response({id:'owner-verified'});
  if(href.includes('business_memberships'))return response([{business_id:a,role}]);
  if(href.includes('colzo_pilot_access'))return response([live]);
  if(href.includes('business_billing_usage'))return response([{quantity:0}]);
  throw Error('Unexpected network call '+href);
 };
 const handler=(await import('../lib/billing-handler.js')).default;
 const req={method:'GET',headers:{authorization:'Bearer synthetic-token'}};
 const res=()=>({statusCode:0,body:null,status(code){this.statusCode=code;return this;},json(v){this.body=v;return this;}});
 let out=res();await handler(req,out);
 assert.equal(out.statusCode,200);
 assert.equal(out.body.pilot_free_access,true);
 assert.equal(out.body.account,null);
 assert.equal(out.body.entitlements.trialExpiresAt,live.expires_at);
 for(const action of ['checkout','change_plan','cancel_plan_change','portal','cancel']){
  out=res();await handler({...req,method:'POST',query:{business_id:b},body:{action,plan:'starter'}},out);
  assert.equal(out.statusCode,403);
 }
 assert.ok(calls.every(href=>!href.includes('checkout/sessions')));
 role='member';out=res();await handler(req,out);
 assert.equal(out.statusCode,403);
});
test('scoped allowance exhaustion and atomic reservation refusal cannot grant an enquiry',async()=>{
 enable();const billing=await import('../lib/billing.js');
 let calls=[];globalThis.fetch=backend(calls,{quantity:250});
 assert.equal((await billing.reserveAiEnquiryAllowance(a,when)).allowed,false);
 assert.ok(calls.every(call=>!call.href.includes('consume_billing_ai_enquiry_allowance')));
 calls=[];const normal=backend(calls,{quantity:249});
 globalThis.fetch=async(url,opts)=>String(url).includes('rpc/consume_billing_ai_enquiry_allowance')?response(false):normal(url,opts);
 const refused=await billing.reserveAiEnquiryAllowance(a,when);
 assert.equal(refused.allowed,false);assert.equal(refused.reservation,null);
 assert.equal(refused.code,'AI_ENQUIRY_ALLOWANCE_REACHED');
});
test('scoped staff checks allow a second seat, reject a third and reject expired grants',async()=>{
 enable();const billing=await import('../lib/billing.js');
 const start=new Date(Date.now()-86400000).toISOString();
 const live={...row,activated_at:start,expires_at:new Date(Date.parse(start)+14*86400000).toISOString()};
 globalThis.fetch=backend([],{grant:live});
 assert.equal((await billing.assertStaffSeatAvailable(a,1)).staffAllowance,2);
 await assert.rejects(()=>billing.assertStaffSeatAvailable(a,2),{status:409});
 const expired={...row,activated_at:new Date(Date.now()-15*86400000).toISOString(),expires_at:new Date(Date.now()-86400000).toISOString()};
 globalThis.fetch=backend([],{grant:expired});
 await assert.rejects(()=>billing.assertStaffSeatAvailable(a,0),{status:402});
});
test('scoped pilot never reads or mutates Stripe through add-on management, even with an inherited paid account',async()=>{
 enable();process.env.TENANCY_AUTH_ENABLED='true';process.env.BILLING_ENABLED='true';
 process.env.STRIPE_PRICE_ADDON_AI_MARKETING='price_synthetic_marketing';
 const start=new Date(Date.now()-86400000).toISOString();
 const live={...row,activated_at:start,expires_at:new Date(Date.parse(start)+14*86400000).toISOString()};
 const calls=[];let existing=false;
 globalThis.fetch=async(url,opts={})=>{
  const href=String(url);calls.push({href,method:opts.method||'GET'});
  if(href.endsWith('/auth/v1/user'))return response({id:'owner-verified'});
  if(href.includes('business_memberships'))return response([{business_id:a,role:'owner'}]);
  if(href.includes('colzo_pilot_access'))return response([live]);
  if(href.includes('business_billing_usage'))return response([{quantity:0}]);
  if(href.includes('business_billing_accounts'))return response([{business_id:a,plan:'starter',status:'active',stripe_subscription_id:'sub_synthetic',current_period_started_at:start,current_period_ends_at:live.expires_at}]);
  if(href.includes('business_feature_entitlements'))return response(existing?[{feature_key:'ai_marketing',status:'active',source:'stripe',expires_at:live.expires_at}]:[]);
  if(href.includes('audit_events'))return response([]);
  throw Error('Unexpected network call '+href);
 };
 // Stripe is entirely synthetic; even a regressed purchase cannot contact a provider.
 const stripe=`export const stripeConfigured=()=>true;
 export const addonPriceDetails=async()=>{globalThis.__pilotStripeCalls++;return {amount:1999,currency:'GBP',interval:'month'}};
 export const addSubscriptionAddon=async()=>{globalThis.__pilotStripeCalls++};
 export const removeSubscriptionAddon=async()=>{globalThis.__pilotStripeCalls++};`;
 const stripeUrl='data:text/javascript;base64,'+Buffer.from(stripe).toString('base64');
 const source=(await readFile(new URL('../lib/addons-handler.js',import.meta.url),'utf8'))
  .replace(/from '([^']+)'/g,(_,path)=>'from '+JSON.stringify(path==='./stripe.js'?stripeUrl:new URL('../lib/'+path,import.meta.url).href));
 const handler=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
 const res=()=>({statusCode:0,body:null,setHeader(){},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}});
 globalThis.__pilotStripeCalls=0;
 try{
  for(const action of ['purchase','cancel']){
   existing=action==='cancel';const out=res();
   await handler({method:'POST',headers:{authorization:'Bearer synthetic'},query:{},body:{action,key:'ai_marketing'}},out);
   assert.equal(out.statusCode,403,action+' must be blocked before paid processing');
  }
  const out=res();await handler({method:'GET',headers:{authorization:'Bearer synthetic'},query:{}},out);
  assert.equal(out.statusCode,200);
  assert.ok(out.body.addons.every(addon=>!addon.purchasable&&!addon.cancellable&&addon.entitlement!=='active'));
  assert.equal(globalThis.__pilotStripeCalls,0);
  assert.ok(calls.every(call=>!call.href.includes('business_billing_accounts')&&!call.href.includes('business_feature_entitlements')));
 }finally{delete globalThis.__pilotStripeCalls;}
});
test.after(()=>{for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];Object.assign(process.env,originalEnv);globalThis.fetch=originalFetch;});
