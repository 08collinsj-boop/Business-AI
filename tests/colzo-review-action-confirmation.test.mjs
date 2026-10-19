import test from 'node:test';
import assert from 'node:assert/strict';
const old = globalThis.fetch;
const keys = ['TENANCY_AUTH_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','VERCEL_ENV','VERCEL_GIT_COMMIT_REF'];
const saved = keys.map(k=>[k,process.env[k]]);
const tenant = '87654321-4321-4321-8432-123456789abc';
Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-key',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-complete-ui-motion-20261017'});
const { default: handler } = await import('../api/bookings.js');
test.after(()=>{globalThis.fetch=old;for(const[k,v]of saved)if(v===undefined)delete process.env[k];else process.env[k]=v});
const start='2026-10-19T12:00:00.123456+00:00';
const current={id:11,business_id:tenant,title:'Synthetic',status:'confirmed',lead_id:null,updated_at:start};
const respond = data => ({ok:true,status:200,text:async()=>JSON.stringify(data),json:async()=>data});
async function complete(actionRows){
 const calls=[];
 globalThis.fetch=async(url,options={})=>{
  const path=String(url),method=options.method||'GET';calls.push({path,method,body:options.body});
  if(path.endsWith('/auth/v1/user'))return respond({id:'fixture-owner'});
  if(path.includes('business_memberships?'))return respond([{business_id:tenant,role:'owner'}]);
  if(path.includes('/bookings?')&&method==='GET')return respond([current]);
  if(path.includes('/bookings?')&&method==='PATCH')return respond([{...current,...JSON.parse(options.body)}]);
  if(path.includes('/business_settings?'))return respond([{business_name:'Synthetic',review_requests_enabled:true,review_preferred_platform:'google',review_google_url:'https://g.page/r/example/review'}]);
  if(path.includes('/actions?')&&method==='GET')return respond([]);
  if(path.endsWith('/rest/v1/actions')&&method==='POST')return respond(actionRows);
  if(path.endsWith('/rest/v1/business_audit_events'))return respond(null);
  throw Error('Unexpected synthetic path');
 };
 const res={statusCode:0,status(n){this.statusCode=n;return this},json(body){this.body=body;return this},setHeader(){}};
 await handler({method:'PATCH',body:{id:11,status:'completed',expected_updated_at:start},headers:{authorization:'Bearer synthetic-token'}},res);
 const audit=calls.filter(c=>c.path.endsWith('/business_audit_events')).map(c=>JSON.parse(c.body).action);
 return {res,audit,calls};
}
test('Preview does not audit a falsely confirmed review action from another tenant',async()=>{
 const {res,audit}=await complete([{id:99,business_id:'other',booking_id:11,action_type:'request_review'}]);
 assert.equal(res.statusCode,200);
 assert.equal(audit.includes('review_request.prepared'),false);
});
test('Preview does not audit review action without matching persistence representation',async()=>{
 const {res,audit}=await complete([]);
 assert.equal(res.statusCode,200);
 assert.equal(audit.includes('review_request.prepared'),false);
});
test('Preview audits a persisted review action only for its own business',async()=>{
 const {res,audit}=await complete([{id:99,business_id:tenant,booking_id:11,action_type:'request_review'}]);
 assert.equal(res.statusCode,200);
 assert.equal(audit.includes('review_request.prepared'),true);
});

test('Preview does not log unlinked or misclassified review action rows',async()=>{
 for(const row of [{id:99,business_id:tenant,booking_id:12,action_type:'request_review'}, {id:99,business_id:tenant,booking_id:11,action_type:'custom'}]){
  const {res,audit}=await complete([row]);
  assert.equal(res.statusCode,200);
  assert.equal(audit.includes('review_request.prepared'),false);
 }
});
