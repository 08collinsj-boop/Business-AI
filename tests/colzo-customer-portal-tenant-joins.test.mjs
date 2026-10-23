import test from 'node:test';
import assert from 'node:assert/strict';

const oldEnv={...process.env};
const oldFetch=globalThis.fetch;
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
function response(body,status=200){return {ok:status>=200&&status<300,status,text:async()=>JSON.stringify(body),json:async()=>body};}
function res(){return {statusCode:0,body:null,status(v){this.statusCode=v;return this},json(v){this.body=v;return this},setHeader(){}}}
async function portalFixture({accessBusiness=A,leadBusiness=A,reviewBusiness=A,reviewEnabled=true,handoverBusiness=null}={}){
 process.env.TENANCY_AUTH_ENABLED='true';
 process.env.SUPABASE_URL='https://synthetic.supabase.co';
 process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-service-key';
 const calls=[];
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(url);calls.push({path:u.pathname,search:u.search,method:options.method||'GET'});
  if(u.pathname==='/auth/v1/user')return response({id:USER,email:'synthetic-customer@example.invalid'});
  const p=u.pathname;
  if(p.endsWith('/customer_profiles'))return response([{user_id:USER,display_name:'Synthetic Customer'}]);
  if(p.endsWith('/customer_enquiry_access'))return response([{id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',customer_user_id:USER,business_id:accessBusiness,lead_id:42,created_at:'2026-10-20T00:00:00Z'}]);
  if(p.endsWith('/leads'))return response([{id:42,business_id:leadBusiness,job_type:'Sensitive tenant-specific job',description:'Tenant A customer message',status:'New'}]);
  if(p.endsWith('/business_settings'))return response([{business_id:accessBusiness,business_name:accessBusiness===A?'Business A':'Business B',business_type:'Services',review_requests_enabled:reviewEnabled,review_google_url:'https://g.page/r/example/review',review_facebook_url:'',review_preferred_platform:'google'}]);
  if(p.endsWith('/business_public_routes'))return response([{business_id:accessBusiness,route_value:'business-a'}]);
  if(p.endsWith('/lead_handovers'))return response(handoverBusiness?[{business_id:handoverBusiness,lead_id:42,status:'requires_attention'}]:[]);
  if(p.endsWith('/customer_visible_replies'))return response([]);
  if(p.endsWith('/actions'))return response([{id:17,business_id:reviewBusiness,lead_id:42,booking_id:0,status:'completed',completed_at:'2026-10-20T01:00:00Z'}]);
  throw Error('Unexpected fetch: '+url);
 };
 const mod=await import('../lib/customer-portal-handler.js?test-isolation='+Math.random());
 const outgoing=res();
 await mod.default({method:'GET',headers:{authorization:'Bearer verified-customer-token'}},outgoing);
 return {outgoing,calls};
}
test('normal customer enquiry is returned without disclosing server-only tenant IDs',async()=>{
 const {outgoing}=await portalFixture();
 assert.equal(outgoing.statusCode,200);
 assert.equal(outgoing.body.enquiries.length,1);
 assert.equal(outgoing.body.enquiries[0].business.name,'Business A');
 assert.equal(outgoing.body.enquiries[0].review_request.platform,'google');
 assert.equal(Object.hasOwn(outgoing.body.enquiries[0],'business_id'),false);
 assert.equal(Object.hasOwn(outgoing.body.enquiries[0],'lead_id'),false);
});
test('inconsistent customer access link cannot stitch a lead from tenant A to business B',async()=>{
 const {outgoing}=await portalFixture({accessBusiness:B,leadBusiness:A,reviewBusiness:B});
 assert.equal(outgoing.statusCode,200);
 assert.deepEqual(outgoing.body.enquiries,[]);
});
test('review reward never reads an action belonging to another business even for the same lead ID',async()=>{
 const {outgoing}=await portalFixture({accessBusiness:A,leadBusiness:A,reviewBusiness:B});
 assert.equal(outgoing.statusCode,200);
 assert.equal(outgoing.body.enquiries.length,1);
 assert.equal(outgoing.body.enquiries[0].review_request,null);
});
test.after(()=>{for(const key of Object.keys(process.env))if(!(key in oldEnv))delete process.env[key];Object.assign(process.env,oldEnv);globalThis.fetch=oldFetch});

test('a handover from a different tenant cannot alter the customer-visible lead status',async()=>{
 const {outgoing}=await portalFixture({accessBusiness:A,leadBusiness:A,handoverBusiness:B});
 assert.equal(outgoing.statusCode,200);
 assert.equal(outgoing.body.enquiries.length,1);
 assert.equal(outgoing.body.enquiries[0].status,'Received');
});
test('upstream service-role queries limit leads, actions and handovers to allowed business IDs',async()=>{
 const {outgoing,calls}=await portalFixture();
 assert.equal(outgoing.statusCode,200);
 for(const endpoint of ['/leads','/actions','/lead_handovers']){
  const q=calls.find(c=>c.path.endsWith(endpoint));
  assert.ok(q,endpoint+' request was not made');
  assert.equal(new URLSearchParams(q.search).get('business_id'),'in.('+A+')',endpoint+' must be tenant-scoped at query level');
 }
});
test('parallel first visits must use conflict-safe profile creation without erasing a concurrently created name', async()=>{
 process.env.TENANCY_AUTH_ENABLED='true';
 process.env.SUPABASE_URL='https://synthetic.supabase.co';
 process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-service-key';
 const writes=[];
 const syntheticName='Existing Customer Display Name';
 let reads=0;
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(url),method=options.method||'GET';
  if(u.pathname==='/auth/v1/user')return response({id:USER,email:'synthetic-customer@example.invalid'});
  if(u.pathname.endsWith('/customer_profiles')){
   if(method==='GET'){
    reads++;
    return response(reads===1?[]:[{user_id:USER,display_name:syntheticName}]);
   }
   if(method==='POST'){
    writes.push({path:u.search,prefer:options.headers?.Prefer,body:JSON.parse(options.body)});
    if(!u.search.includes('on_conflict=user_id')||!String(options.headers?.Prefer).includes('resolution=ignore-duplicates'))return response({message:'duplicate key'},409);
    return response([]);
   }
  }
  if(u.pathname.endsWith('/customer_enquiry_access'))return response([]);
  throw Error('Unexpected '+url);
 };
 const mod=await import('../lib/customer-portal-handler.js?profile-race='+Math.random());
 const outgoing=res();
 await mod.default({method:'GET',headers:{authorization:'Bearer synthetic-token'}},outgoing);
 assert.equal(outgoing.statusCode,200,'GET must survive a simultaneous profile creation');
 assert.equal(outgoing.body.customer.display_name,syntheticName,'must read the existing display name rather than overwrite it');
 assert.equal(writes.length,1);
 assert.deepEqual(writes[0].body,{user_id:USER,display_name:''});
 assert.equal(reads,2);
});
