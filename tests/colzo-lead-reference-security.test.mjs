import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../lib/colzo-records-handler.js';

const BUSINESS='11111111-1111-4111-8111-111111111111';
const USER='22222222-2222-4222-8222-222222222222';
const foreign='44444444-4444-4444-8444-444444444444';
const qid='33333333-3333-4333-8333-333333333333';
function reply(status,data){
 return {ok:status>=200&&status<300,status,async text(){return JSON.stringify(data)},async json(){return data}};
}
async function request(t,{resource='quotes',method='POST',body,existingLeadId=42,leadBusiness=BUSINESS,id=qid,version='2026-10-15T10:00:00.000Z'}){
 const f=globalThis.fetch;
 const env={TENANCY_AUTH_ENABLED:process.env.TENANCY_AUTH_ENABLED,SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY};
 Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://safe-dev-fixture.test',SUPABASE_SERVICE_ROLE_KEY:'synthetic-test'});
 const calls=[];
 globalThis.fetch=async(input,opts={})=>{
  const url=new URL(String(input)),verb=opts.method||'GET';
  calls.push({url,verb,body:opts.body&&JSON.parse(opts.body)});
  if(url.pathname==='/auth/v1/user')return reply(200,{id:USER,email:'qa@example.test'});
  if(url.pathname==='/rest/v1/business_memberships')return reply(200,[{business_id:BUSINESS,role:'owner'}]);
  if(url.pathname==='/rest/v1/business_audit_events')return reply(201,{});
  if(url.pathname==='/rest/v1/leads'){
   const tenant=url.searchParams.get('business_id');
   const leadId=url.searchParams.get('id');
   if(tenant==='eq.'+leadBusiness&&tenant==='eq.'+BUSINESS&&leadId==='eq.'+existingLeadId)return reply(200,[{id:existingLeadId}]);
   return reply(200,[]);
  }
  if(url.pathname==='/rest/v1/colzo_quotes'||url.pathname==='/rest/v1/colzo_projects'){
   if(verb==='GET')return reply(200,[{id,lead_id:42,business_id:BUSINESS,status:'draft',updated_at:version}]);
   if(verb==='POST')return reply(201,[{id,lead_id:42,business_id:BUSINESS}]);
   if(verb==='PATCH')return reply(200,[{id,business_id:BUSINESS}]);
  }
  throw Error('Unexpected fixture URL '+url);
 };
 t.after(()=>{globalThis.fetch=f;for(const[k,v]of Object.entries(env)){if(v===undefined)delete process.env[k];else process.env[k]=v}});
 const req={method,headers:{authorization:'Bearer synthetic'},query:{resource,...(method==='PATCH'?{id}:{})},body};
 const res={statusCode:200,payload:null,status(v){this.statusCode=v;return this},json(v){this.payload=v;return this}};
 await handler(req,res);
 return {status:res.statusCode,payload:res.payload,calls};
}
const quote=(lead_id)=>({lead_id,title:'Quote for repairs',amount_gbp:200});
const project=(lead_id)=>({lead_id,title:'Project preparation',client_name:'Example Test Client'});
const storageCalls=r=>r.calls.filter(c=>['/rest/v1/colzo_quotes','/rest/v1/colzo_projects'].includes(c.url.pathname)&&['POST','PATCH'].includes(c.verb));
const ownershipCalls=r=>r.calls.filter(c=>c.url.pathname==='/rest/v1/leads');

test('quoted lead must be a safe lossless integer, not a rounded 18 digit value',async t=>{
 const r=await request(t,{body:quote('9007199254740993')});
 assert.equal(r.status,400);assert.equal(storageCalls(r).length,0);
});
test('new quote refuses a lead that does not belong to the authenticated business',async t=>{
 const r=await request(t,{body:quote(42),leadBusiness:foreign});
 assert.equal(r.status,400);assert.equal(storageCalls(r).length,0);
 assert.equal(ownershipCalls(r).length,1);
 assert.equal(ownershipCalls(r)[0].url.searchParams.get('business_id'),'eq.'+BUSINESS);
});
test('valid owned lead creates quote with server-assigned tenant',async t=>{
 const r=await request(t,{body:quote(42)});
 assert.equal(r.status,201);
 assert.equal(ownershipCalls(r).length,1);
 assert.equal(storageCalls(r).length,1);
 assert.equal(storageCalls(r)[0].body.business_id,BUSINESS);
});
test('project lead reference must belong to authenticated business',async t=>{
 const r=await request(t,{resource:'projects',body:project(42),leadBusiness:foreign});
 assert.equal(r.status,400);assert.equal(storageCalls(r).length,0);
});
test('projects can be created without a lead reference',async t=>{
 const r=await request(t,{resource:'projects',body:{title:'No lead project',client_name:'Example Client',lead_id:null}});
 assert.equal(r.status,201);assert.equal(ownershipCalls(r).length,0);
});
test('PATCH referencing a new foreign lead must not change existing quote',async t=>{
 const r=await request(t,{method:'PATCH',body:{lead_id:99,expected_updated_at:'2026-10-15T10:00:00.000Z'},existingLeadId:42});
 assert.equal(r.status,400);assert.equal(storageCalls(r).length,0);
});
