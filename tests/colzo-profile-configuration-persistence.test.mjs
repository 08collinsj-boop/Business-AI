import test from 'node:test';
import assert from 'node:assert/strict';
const keys=['TENANCY_AUTH_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','VERCEL_ENV','VERCEL_GIT_COMMIT_REF'];
const previous=keys.map(k=>[k,process.env[k]]),oldFetch=globalThis.fetch;
const tenant='synthetic-business';
Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-only',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-complete-ui-motion-20261017'});
const {default:handler}=await import('../lib/business-profile-handler.js');
test.after(()=>{globalThis.fetch=oldFetch;for(const[k,v]of previous)v===undefined?delete process.env[k]:process.env[k]=v});
const reply=data=>({ok:true,status:200,text:async()=>JSON.stringify(data),json:async()=>data});
async function patchConfiguration({savedRows=[],hasExisting=true,body={description:'New description'}}={}){
 const calls=[];let configuration={business_id:tenant,description:'Original profile'};
 globalThis.fetch=async(input,init={})=>{
  const url=String(input),method=init.method||'GET';calls.push({url,method,body:init.body});
  if(url.endsWith('/auth/v1/user'))return reply({id:'synthetic-owner'});
  if(url.includes('/business_memberships?'))return reply([{business_id:tenant,role:'owner'}]);
  if(url.includes('/business_settings?'))return reply([{id:7,business_id:tenant,business_name:'Synthetic'}]);
  if(url.includes('/business_public_routes?'))return reply([]);
  if(url.includes('/business_configurations?')&&method==='GET')return reply(hasExisting?[configuration]:[]);
  if(url.includes('/rest/v1/business_configurations')&&method==='POST'||url.includes('/business_configurations?')&&method==='PATCH'){
   if(Array.isArray(savedRows)&&savedRows.length)configuration=savedRows[0];
   return reply(savedRows);
  }
  if(url.endsWith('/business_audit_events'))return reply(null);
  throw Error('Unexpected synthetic endpoint');
 };
 const res={statusCode:0,status(n){this.statusCode=n;return this},json(v){this.body=v;return this},setHeader(){}};
 await handler({method:'PATCH',headers:{authorization:'Bearer synthetic-token'},body},res);
 return {res,calls};
}
test('configuration profile update cannot report success when database reports zero updated rows',async()=>{
 const {res,calls}=await patchConfiguration({savedRows:[]});
 assert.equal(res.statusCode,503);
 assert.equal(calls.some(c=>c.url.endsWith('/business_audit_events')),false);
});
test('configuration profile update cannot report success for a foreign tenant',async()=>{
 const {res}=await patchConfiguration({savedRows:[{business_id:'other-tenant',description:'New description'}]});
 assert.equal(res.statusCode,503);
});
test('configuration profile update cannot report success for a stale value',async()=>{
 const {res}=await patchConfiguration({savedRows:[{business_id:tenant,description:'Original profile'}]});
 assert.equal(res.statusCode,503);
});
test('configuration profile accepts correctly saved tenant values',async()=>{
 const {res}=await patchConfiguration({savedRows:[{business_id:tenant,description:'New description'}]});
 assert.equal(res.statusCode,200);
 assert.equal(res.body.profile.description,'New description');
});
test('first-time profile configuration insert must also confirm correct stored tenant',async()=>{
 const {res}=await patchConfiguration({savedRows:[{business_id:'other-tenant',description:'New description'}],hasExisting:false});
 assert.equal(res.statusCode,503);
});

test('Preview rejects credential-bearing and custom-port profile website URLs before any write',async()=>{
 for(const website of ['https://user:pass@legitimate.example/','https://legitimate.example:8443/']){
  const {res,calls}=await patchConfiguration({body:{website}});
  assert.equal(res.statusCode,400);
  assert.equal(calls.some(c=>c.method==='PATCH'||c.method==='POST'),false);
 }
});
