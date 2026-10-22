import test from 'node:test';
import assert from 'node:assert/strict';
const vars=['TENANCY_AUTH_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
const before=vars.map(key=>process.env[key]);
const originalFetch=globalThis.fetch;
Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://synthetic.invalid',SUPABASE_SERVICE_ROLE_KEY:'test-secret'});
const {default:handler}=await import('../lib/colzo-records-handler.js');
test.after(()=>{globalThis.fetch=originalFetch;for(const [i,k] of vars.entries())before[i]===undefined?delete process.env[k]:process.env[k]=before[i];});
const TENANT='11111111-1111-4111-8111-111111111111',FOREIGN='22222222-2222-4222-8222-222222222222';
const CLIENT='33333333-3333-4333-8333-333333333333',OTHER='44444444-4444-4444-8444-444444444444';
const VERSION='2026-10-19T13:00:00.000Z';
const reply=(data,status=200)=>({status,ok:status>=200&&status<300,text:async()=>JSON.stringify(data),json:async()=>data});
async function request({method='POST',resource='clients',returned,queryId=CLIENT,body=null,read=null}={}){
 const calls=[],input=body||{full_name:'Changed Customer'};
 globalThis.fetch=async(url,opts={})=>{
   const target=String(url),verb=opts.method||'GET';
   calls.push({target,verb,payload:opts.body?JSON.parse(opts.body):null});
   if(target.endsWith('/auth/v1/user'))return reply({id:'99999999-9999-4999-8999-999999999999'});
   if(target.includes('/business_memberships?'))return reply([{business_id:TENANT,role:'owner'}]);
   if(target.includes('/business_audit_events'))return reply(null,201);
   if(verb==='GET')return reply(read??[{id:CLIENT,business_id:TENANT,full_name:'Original Customer',updated_at:VERSION}]);
   if(verb==='PATCH'||verb==='POST')return reply(returned);
   throw Error('Unexpected synthetic request '+target);
 };
 const res={statusCode:0,status(n){this.statusCode=n;return this},json(x){this.body=x;return this}};
 await handler({method,headers:{authorization:'Bearer synthetic'},query:{resource,...(method!=='POST'?{id:queryId}:{})},body:method==='PATCH'?{expected_updated_at:VERSION,...input}:input},res);
 return {res,calls,write:calls.find(c=>['PATCH','POST'].includes(c.verb))};
}
test('create does not confirm a foreign-tenant returned client or record a success audit',async()=>{
 const {res,calls}=await request({returned:[{id:CLIENT,business_id:FOREIGN,full_name:'Changed Customer'}]});
 assert.equal(res.statusCode,500);
 assert.equal(calls.some(c=>c.target.includes('/business_audit_events')),false);
});
test('create must verify exactly one valid UUID record and persisted fields',async()=>{
 for(const returned of [[],[{id:CLIENT,business_id:TENANT,full_name:'Old'}],[{id:'invalid',business_id:TENANT,full_name:'Changed Customer'}],
  [{id:CLIENT,business_id:TENANT,full_name:'Changed Customer'},{id:OTHER,business_id:TENANT,full_name:'Changed Customer'}]]){
   const {res,calls}=await request({returned});
   assert.equal(res.statusCode,500);
   assert.equal(calls.some(c=>c.target.includes('/business_audit_events')),false);
 }
});
test('edit cannot confirm another record ID or tenant or incorrect persisted values',async()=>{
 for(const returned of [
  [{id:CLIENT,business_id:FOREIGN,full_name:'Changed Customer',updated_at:'2026-10-19T13:00:01.000Z'}],
  [{id:OTHER,business_id:TENANT,full_name:'Changed Customer',updated_at:'2026-10-19T13:00:01.000Z'}],
  [{id:CLIENT,business_id:TENANT,full_name:'Original Customer',updated_at:'2026-10-19T13:00:01.000Z'}],
  [{id:CLIENT,business_id:TENANT,full_name:'Changed Customer',updated_at:VERSION}]
 ]){
  const {res,calls}=await request({method:'PATCH',returned});
  assert.equal(res.statusCode,500);
  assert.equal(calls.some(c=>c.target.includes('/business_audit_events')),false);
 }
});
test('direct GET refuses a mismatched returned tenant even on a tenant-scoped URL',async()=>{
 const {res}=await request({method:'GET',read:[{id:CLIENT,business_id:FOREIGN,full_name:'Private'}]});
 assert.notEqual(res.statusCode,200);
 assert.equal(JSON.stringify(res.body).includes('Private'),false);
});
test('properly persisted create and edit remain functional',async()=>{
 const create=await request({returned:[{id:CLIENT,business_id:TENANT,full_name:'Changed Customer',updated_at:VERSION}]});
 assert.equal(create.res.statusCode,201);
 assert.equal(create.calls.some(c=>c.target.includes('/business_audit_events')),true);
 const edit=await request({method:'PATCH',returned:[{id:CLIENT,business_id:TENANT,full_name:'Changed Customer',updated_at:'2026-10-19T13:00:01.000Z'}]});
 assert.equal(edit.res.statusCode,200);
 assert.equal(edit.calls.some(c=>c.target.includes('/business_audit_events')),true);
});
test('collection GET never discloses a foreign business row in a malformed response',async()=>{
 const {res}=await request({method:'GET',queryId:null,read:[
   {id:CLIENT,business_id:TENANT,full_name:'Owned'},
   {id:OTHER,business_id:FOREIGN,full_name:'Foreign private customer'}
 ]});
 assert.equal(res.statusCode,500);
 assert.equal(JSON.stringify(res.body).includes('Foreign private customer'),false);
});
test('edit never writes when its initial lookup returned a different business or ID',async()=>{
 for(const read of [
   [{id:CLIENT,business_id:FOREIGN,full_name:'Original Customer',updated_at:VERSION}],
   [{id:OTHER,business_id:TENANT,full_name:'Original Customer',updated_at:VERSION}]
 ]){
   const {res,calls}=await request({method:'PATCH',read,returned:[{id:CLIENT,business_id:TENANT,full_name:'Changed Customer',updated_at:'2026-10-19T13:00:01.000Z'}]});
   assert.equal(res.statusCode,500);
   assert.equal(calls.some(c=>c.verb==='PATCH'||c.target.includes('/business_audit_events')),false);
 }
});
test('project creation also rejects a foreign-business returned record',async()=>{
 const body={lead_id:null,title:'Synthetic Project',client_name:'Synthetic Client'};
 const {res,calls}=await request({resource:'projects',body,returned:[{id:CLIENT,business_id:FOREIGN,...body}]});
 assert.equal(res.statusCode,500);
 assert.equal(calls.some(c=>c.target.includes('/business_audit_events')),false);
});
