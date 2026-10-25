import test from 'node:test';
import assert from 'node:assert/strict';
import marketingImageHandler from '../lib/marketing-image-handler.js';
import marketingAutomationHandler from '../lib/marketing-automation-handler.js';
import marketingPublicationHandler from '../lib/marketing-publication-handler.js';
import marketingScheduleHandler from '../lib/marketing-schedule-handler.js';
import marketingSchedulerHandler from '../lib/marketing-scheduler-handler.js';

const beforeEnv={...process.env}, beforeFetch=globalThis.fetch;
const business='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const user='11111111-1111-4111-8111-111111111111';
function response(){return{statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.statusCode=v;return this;},json(body){this.body=body;return this;}};}
function mock(){
 const now=Date.now(),start=new Date(now-3600000).toISOString(),end=new Date(now-3600000+14*86400000).toISOString();
 const calls=[];
 globalThis.fetch=async(url,options={})=>{
  const p=new URL(url).pathname;calls.push({p,method:options.method||'GET'});
  const data=(value)=>({ok:true,status:200,text:async()=>JSON.stringify(value),json:async()=>value});
  if(p==='/auth/v1/user')return data({id:user});
  if(p.endsWith('/business_memberships'))return data([{business_id:business,role:'owner'}]);
  if(p.endsWith('/colzo_pilot_access'))return data([{business_id:business,status:'active',activated_at:start,expires_at:end}]);
  if(p.endsWith('/business_billing_usage'))return data([{quantity:0}]);
  return data([]);
 };
 return calls;
}
test('scoped pilot blocks all ancillary paid Marketing API routes before any Marketing database or provider use',async()=>{
 Object.assign(process.env,{
  TENANCY_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'true',
  VERCEL_ENV:'preview',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY:'synthetic-only',
  PILOT_FREE_STARTER_MARKETING:'false',
  CRON_SECRET:'synthetic-pilot-cron-secret-at-least-32-characters'
 });
 try {
  const calls=mock();
  const routes=[
   [marketingImageHandler,{method:'GET',query:{generation_id:'33333333-3333-4333-8333-333333333333'}}],
   [marketingImageHandler,{method:'POST',query:{},body:{action:'generate',generation_id:'33333333-3333-4333-8333-333333333333'}}],
   [marketingAutomationHandler,{method:'GET',query:{}}],
   [marketingAutomationHandler,{method:'POST',query:{},body:{action:'run_now'}}],
   [marketingPublicationHandler,{method:'GET',query:{}}],
   [marketingPublicationHandler,{method:'POST',query:{},body:{action:'schedule'}}],
   [marketingScheduleHandler,{method:'GET',query:{}}],
   [marketingScheduleHandler,{method:'POST',query:{},body:{action:'create'}}]
  ];
  for(const [handler,req] of routes){
   const out=response();
   await handler({headers:{authorization:'Bearer synthetic-owner'},...req},out);
   assert.equal(out.statusCode,403,handler.name+': '+req.method+': '+JSON.stringify(out.body));
   assert.match(out.body?.error||'',/marketing|pilot|unavailable|locked/i);
  }
  const scheduler=response();
  await marketingSchedulerHandler({method:'GET',headers:{authorization:'Bearer synthetic-pilot-cron-secret-at-least-32-characters'}},scheduler);
  assert.equal(scheduler.statusCode,403,'Marketing cron must not claim or process jobs in scoped pilot');
  assert.ok(calls.every(({p})=>!p.includes('marketing_')&&!p.includes('rpc/claim_due_')&&!p.includes('/storage/')),'no Marketing reads/writes or provider operations');
 }finally{
  globalThis.fetch=beforeFetch;
  for(const k of Object.keys(process.env))if(!(k in beforeEnv))delete process.env[k];
  Object.assign(process.env,beforeEnv);
 }
});
