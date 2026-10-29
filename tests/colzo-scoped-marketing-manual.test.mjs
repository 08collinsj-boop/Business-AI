import test from 'node:test';
import assert from 'node:assert/strict';
const business='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', user='11111111-1111-4111-8111-111111111111', draft='33333333-3333-4333-8333-333333333333';
const originalEnv={...process.env}, originalFetch=globalThis.fetch;
const output={main_copy:'Our fictional workshop is open for enquiries.',short_alternative:'Enquire for details.',call_to_action:'Message us.',hashtags:['#Example'],missing_information:[]};
const body={action:'create_manual',content_type:'social_post',platform:'facebook',tone:'friendly',prompt:'Local workshop update',extra_instructions:'',output};
const reply=(data,ok=true)=>({ok,status:ok?200:503,text:async()=>JSON.stringify(data),json:async()=>data});
const res=()=>({statusCode:0,body:null,setHeader(){},status(code){this.statusCode=code;return this},json(data){this.body=data;return this}});
const now=Date.now();
const active={business_id:business,status:'active',activated_at:new Date(now-3600000).toISOString(),expires_at:new Date(now-3600000+14*86400000).toISOString()};
function configure(){
 Object.assign(process.env,{COLZO_SCOPED_PILOT_ACCESS:'true',VERCEL_ENV:'preview',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-only',TENANCY_AUTH_ENABLED:'true',BILLING_ENABLED:'false',PILOT_FREE_STARTER_MARKETING:'false'});
 delete process.env.OPENROUTER_API_KEY;delete process.env.OPENAI_API_KEY;
}
function stub({grant=active,role='owner',savedForeign=false}={}){
 const calls=[];
 globalThis.fetch=async(url,options={})=>{
  const p=new URL(url).pathname,method=options.method||'GET';
  const parsed=options.body?JSON.parse(options.body):null;calls.push({p,method,parsed});
  if(p==='/auth/v1/user')return reply({id:user});
  if(p.endsWith('/business_memberships'))return reply([{business_id:business,role}]);
  if(p.endsWith('/colzo_pilot_access'))return reply(grant?[grant]:[]);
  if(p.endsWith('/business_billing_usage'))return reply([{quantity:0}]);
  if(p.endsWith('/marketing_generations')){
   if(method==='POST')return reply([{id:draft,...parsed,business_id:savedForeign?other:business,status:'completed',output,approval_status:'draft',created_at:new Date(now).toISOString(),updated_at:new Date(now).toISOString()}]);
   return reply([]);
  }
  if(p.endsWith('/business_audit_events'))return reply([]);
  throw Error('Unexpected external route '+p);
 };
 return calls;
}
async function run(method,payload,opts={}){
 configure();const calls=stub(opts);
 const handler=(await import('../lib/marketing-handler.js')).default,out=res();
 await handler({method,headers:{authorization:'Bearer synthetic-owner'},query:{},body:payload},out);
 return {out,calls};
}
test('active scoped pilot can view manual draft library but not paid provider features',async()=>{
 const {out,calls}=await run('GET',null);
 assert.equal(out.statusCode,200);
 assert.equal(out.body.manual_only,true);
 assert.ok(Array.isArray(out.body.generations));
 assert.ok(calls.every(c=>!c.p.includes('business_feature_entitlements')&&!c.p.includes('billing_accounts')&&!c.p.includes('marketing_publications')));
});
test('authenticated owner can save a manual draft with server-confirmed tenant and no publishing, generation or billing',async()=>{
 const {out,calls}=await run('POST',body);
 assert.equal(out.statusCode,201);
 assert.equal(out.body.id,draft);
 assert.equal(out.body.manual,true);
 const write=calls.find(c=>c.p.endsWith('/marketing_generations')&&c.method==='POST');
 assert.ok(write);assert.equal(write.parsed.business_id,business);assert.equal(write.parsed.actor_user_id,user);
 assert.equal(write.parsed.status,'completed');assert.equal(write.parsed.approval_status,'draft');
 assert.equal(write.parsed.model,'manual');assert.equal(write.parsed.approved_at,null);
 assert.equal(write.parsed.provider_response_id,null);
 assert.deepEqual(write.parsed.output,output);
 assert.ok(calls.every(c=>!c.p.includes('/rpc/reserve_marketing_generation')&&!c.p.includes('publication')&&!c.p.includes('stripe')&&!c.p.includes('checkout')));
});
test('missing or expired scoped grant denies manual storage and does not write',async()=>{
 for(const grant of [null,{...active,status:'revoked'},{...active,expires_at:new Date(now-1000).toISOString()}]){
  const {out,calls}=await run('POST',body,{grant});
  assert.equal(out.statusCode,403);
  assert.equal(calls.some(c=>c.p.endsWith('/marketing_generations')),false);
 }
});
test('scoped pilot rejects paid AI generation and foreign returned manual rows before success audit',async()=>{
 let result=await run('POST',{content_type:'social_post',platform:'facebook',tone:'friendly',prompt:'Generate an AI draft'});
 assert.equal(result.out.statusCode,403);
 assert.ok(result.calls.every(c=>!c.p.includes('/rpc/reserve_marketing_generation')));
 result=await run('POST',body,{savedForeign:true});
 assert.notEqual(result.out.statusCode,201);
 assert.equal(result.calls.some(c=>c.p.endsWith('/business_audit_events')),false);
});
test('non-owner member cannot create manual draft during scoped pilot',async()=>{
 const {out,calls}=await run('POST',body,{role:'member'});
 assert.equal(out.statusCode,403);assert.equal(calls.some(c=>c.p.endsWith('/marketing_generations')),false);
});
test.after(()=>{for(const k of Object.keys(process.env))if(!(k in originalEnv))delete process.env[k];Object.assign(process.env,originalEnv);globalThis.fetch=originalFetch;});
