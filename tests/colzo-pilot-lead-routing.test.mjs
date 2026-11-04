import test from 'node:test';
import assert from 'node:assert/strict';
const keys=['TENANCY_AUTH_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','VERCEL_ENV','VERCEL_GIT_COMMIT_REF'];
const saved=keys.map(k=>[k,process.env[k]]),oldFetch=globalThis.fetch;
Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'fix/colzo-pilot-release-gates-20261026'});
const handler=(await import('../api/operations.js')).default;
test.after(()=>{globalThis.fetch=oldFetch;for(const[k,v]of saved)v===undefined?delete process.env[k]:process.env[k]=v});
const version='2026-10-31T10:00:00.123456+00:00',later='2026-10-31T10:00:00.123457+00:00';
async function patch(expected){
 const calls=[];
 globalThis.fetch=async(url,options={})=>{
  const path=String(url),method=options.method||'GET';calls.push({path,method});
  const row={id:17,business_id:'fictional-business',status:'New',notes:'Winner',updated_at:later};
  const data=path.endsWith('/auth/v1/user')?{id:'fictional-user'}:path.includes('/business_memberships?')?[{business_id:row.business_id,role:'owner'}]:path.includes('/leads?')?[row]:null;
  return {ok:true,status:200,json:async()=>data,text:async()=>JSON.stringify(data)};
 };
 const body={id:17,notes:'Stale'};if(expected!==undefined)body.expected_updated_at=expected;
 const res={headersSent:false,setHeader(){},status(n){this.code=n;return this},json(data){this.body=data;this.headersSent=true;return this}};
 await handler({method:'PATCH',query:{operation:'leads'},body,headers:{authorization:'Bearer fictional-token'}},res);
 return {res,calls};
}
test('actual pilot dispatcher requires enquiry version before any write',async()=>{
 const {res,calls}=await patch();assert.equal(res.code,400);
 assert.equal(calls.some(c=>['POST','PATCH'].includes(c.method)),false);
});
test('actual pilot dispatcher rejects stale enquiry versions without side effects',async()=>{
 const {res,calls}=await patch(version);assert.equal(res.code,409);
 assert.equal(calls.some(c=>['POST','PATCH'].includes(c.method)),false);
});
