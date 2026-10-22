import test from 'node:test';
import assert from 'node:assert/strict';

const saved=['TENANCY_AUTH_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'].map(k=>[k,process.env[k]]);
Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-service-key'});
const {default:handler}=await import('../lib/colzo-leads-handler.js');
const beforeFetch=globalThis.fetch;
test.after(()=>{globalThis.fetch=beforeFetch;for(const[k,v]of saved)v===undefined?delete process.env[k]:process.env[k]=v});
const version='2026-10-19T16:00:00.123456+00:00';
const later='2026-10-19T16:00:00.123457+00:00';
const row={id:17,business_id:'synthetic-business',status:'New',notes:'Original',updated_at:version};
const reply=d=>({ok:true,json:async()=>d,text:async()=>JSON.stringify(d)});
function network({current=row,updated=[{...row,notes:'Saved',updated_at:later}]}={}){
 const calls=[];globalThis.fetch=async(url,init={})=>{
   const path=String(url),method=init.method||'GET';calls.push({path,method,body:init.body});
   if(path.endsWith('/auth/v1/user'))return reply({id:'synthetic-user'});
   if(path.includes('/business_memberships?'))return reply([{business_id:row.business_id,role:'owner'}]);
   if(path.includes('/leads?')&&method==='GET')return reply(current?[current]:[]);
   if(path.includes('/leads?')&&method==='PATCH')return reply(updated);
   return reply(null);
 };return calls;
}
async function patch(body){const res={statusCode:200,status(n){this.statusCode=n;return this},json(body){this.body=body;return this}};await handler({method:'PATCH',body,headers:{authorization:'Bearer synthetic-token'}},res);return res}
const mutations=calls=>calls.filter(c=>c.method==='PATCH'||c.method==='POST');
test('missing or malformed loaded version cannot mutate a lead',async()=>{
 for(const expected of [undefined,null,'','not-a-time',{},'2026']){
   const calls=network();const body={id:17,notes:'Saved'};if(expected!==undefined)body.expected_updated_at=expected;
   const result=await patch(body);
   assert.equal(result.statusCode,400);assert.equal(mutations(calls).length,0);
 }
});
test('stale version including sub-millisecond difference returns 409 without history or follow-up writes',async()=>{
 const calls=network({current:{...row,updated_at:later}});
 const result=await patch({id:17,notes:'Saved',expected_updated_at:version});
 assert.equal(result.statusCode,409);assert.equal(mutations(calls).length,0);
});
test('successful lead edit atomically matches tenant, id and exact loaded version',async()=>{
 const calls=network();const result=await patch({id:17,notes:'Saved',expected_updated_at:version});
 assert.equal(result.statusCode,200);
 const write=calls.find(c=>c.method==='PATCH'&&c.path.includes('/leads?'));
 const params=new URL(write.path).searchParams;
 assert.equal(params.get('id'),'eq.17');assert.equal(params.get('business_id'),'eq.synthetic-business');
 assert.equal(params.get('updated_at'),'eq.'+version);
 assert.equal(JSON.parse(write.body).expected_updated_at,undefined);
 assert.equal(result.body.updated_at,later);
});
test('a race after the current-row read conflicts without audit/history effects',async()=>{
 const calls=network({updated:[]});const result=await patch({id:17,notes:'Saved',expected_updated_at:version});
 assert.equal(result.statusCode,409);assert.equal(mutations(calls).length,1);
});
test('missing database version fails closed before mutation',async()=>{
 const calls=network({current:{...row,updated_at:undefined}});
 assert.equal((await patch({id:17,notes:'Saved',expected_updated_at:version})).statusCode,503);
 assert.equal(mutations(calls).length,0);
});
