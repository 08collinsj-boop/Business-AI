import test from 'node:test';
import assert from 'node:assert/strict';

const keys=['VERCEL_ENV','VERCEL_GIT_COMMIT_REF','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','TENANCY_AUTH_ENABLED'];
const saved=keys.map(k=>[k,process.env[k]]);
Object.assign(process.env,{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'fix/colzo-pilot-release-gates-20261026',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-only',TENANCY_AUTH_ENABLED:'true'});
const {default:handler}=await import('../api/leads.js');
const oldFetch=globalThis.fetch;
test.after(()=>{globalThis.fetch=oldFetch;for(const[k,v]of saved)v===undefined?delete process.env[k]:process.env[k]=v});
const version='2026-10-31T10:00:00.123456+00:00';
const later='2026-10-31T10:00:00.123457+00:00';
const row={id:17,business_id:'fictional-business',status:'New',notes:'Original',updated_at:version};
const reply=data=>({ok:true,text:async()=>JSON.stringify(data),json:async()=>data});
function network(current=row){
 const calls=[];
 globalThis.fetch=async(uri,init={})=>{
  const url=String(uri),method=init.method||'GET';calls.push({url,method,body:init.body});
  if(url.endsWith('/auth/v1/user'))return reply({id:'fictional-owner'});
  if(url.includes('/business_memberships?'))return reply([{business_id:row.business_id,role:'owner'}]);
  if(url.includes('/leads?')&&method==='GET')return reply([current]);
  if(url.includes('/leads?')&&method==='PATCH')return reply([{...row,notes:'Saved',updated_at:later}]);
  return reply(null);
 };return calls;
}
async function patch(body){
 const res={statusCode:200,status(n){this.statusCode=n;return this},json(body){this.body=body;return this}};
 await handler({method:'PATCH',headers:{authorization:'Bearer fictional-issued-session-placeholder'},body},res);return res;
}
test('direct deployed Leads function accepts versioned native enquiry edit with atomic tenant/version predicate',async()=>{
 const calls=network();const res=await patch({id:17,notes:'Saved',expected_updated_at:version});
 assert.equal(res.statusCode,200);
 const write=calls.find(c=>c.method==='PATCH'&&c.url.includes('/leads?'));
 const params=new URL(write.url).searchParams;
 assert.equal(params.get('business_id'),'eq.'+row.business_id);
 assert.equal(params.get('updated_at'),'eq.'+version);
 assert.equal(res.body.notes,'Saved');
});
test('direct deployed Leads function rejects stale edit with 409 before mutations',async()=>{
 const calls=network({...row,updated_at:later});const res=await patch({id:17,notes:'Saved',expected_updated_at:version});
 assert.equal(res.statusCode,409);assert.equal(calls.filter(c=>['POST','PATCH'].includes(c.method)).length,0);
});
test('direct deployed Leads function rejects missing version rather than allowing a lost update',async()=>{
 const calls=network();const res=await patch({id:17,notes:'Saved'});
 assert.equal(res.statusCode,400);assert.equal(calls.filter(c=>['POST','PATCH'].includes(c.method)).length,0);
});
test('Production direct Leads retains its existing unversioned behavior',async()=>{
 process.env.VERCEL_ENV='production';
 try{network();assert.equal((await patch({id:17,notes:'Saved'})).statusCode,200)}finally{process.env.VERCEL_ENV='preview'}
});
test('direct Leads fails closed on an unexpected Colzo Development target before network access',async()=>{
 const previous=process.env.SUPABASE_URL;process.env.SUPABASE_URL='https://unrelated.supabase.co';
 try{const calls=network();assert.equal((await patch({id:17,notes:'Saved',expected_updated_at:version})).statusCode,503);assert.equal(calls.length,0)}finally{process.env.SUPABASE_URL=previous}
});
test('direct Colzo Leads denies anonymous edits before database access',async()=>{
 const calls=network();const res={statusCode:200,status(n){this.statusCode=n;return this},json(body){this.body=body;return this}};
 await handler({method:'PATCH',headers:{},body:{id:17,notes:'Saved',expected_updated_at:version}},res);
 assert.equal(res.statusCode,401);assert.equal(calls.length,0);
});
