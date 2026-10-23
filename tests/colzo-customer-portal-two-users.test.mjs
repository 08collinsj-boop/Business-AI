import test from 'node:test';
import assert from 'node:assert/strict';
const original={...process.env};
const originalFetch=globalThis.fetch;
const U1='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const U2='bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const B1='cccccccc-1111-4111-8111-cccccccccccc';
const B2='dddddddd-2222-4222-8222-dddddddddddd';
const records={
 [U1]:{business_id:B1,lead_id:101,display_name:'Customer One',business_name:'Synthetic Shop One',description:'Enquiry One'},
 [U2]:{business_id:B2,lead_id:202,display_name:'Customer Two',business_name:'Synthetic Shop Two',description:'Enquiry Two'}
};
function reply(data,status=200){return{ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data)};}
function responder(){return{statusCode:0,body:null,setHeader(){},status(code){this.statusCode=code;return this},json(data){this.body=data;return this}};}
async function setup(){
 process.env.TENANCY_AUTH_ENABLED='true';
 process.env.SUPABASE_URL='https://synthetic.supabase.co';
 process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-service-role';
 const queryLog=[];
 globalThis.fetch=async(href,options={})=>{
  const url=new URL(href),who=options.headers?.Authorization;
  if(url.pathname.endsWith('/auth/v1/user')){
   if(who==='Bearer synthetic-one')return reply({id:U1,email:'one@example.invalid'});
   if(who==='Bearer synthetic-two')return reply({id:U2,email:'two@example.invalid'});
   return reply({error:'unauthorised'},401);
  }
  const path=url.pathname.split('/').pop(),q=url.searchParams;
  queryLog.push({path,query:url.search});
  if(path==='customer_profiles'){
   const u=q.get('user_id')?.replace(/^eq\./,'');
   return reply(u in records?[{user_id:u,display_name:records[u].display_name}]:[]);
  }
  if(path==='customer_enquiry_access'){
   const u=q.get('customer_user_id')?.replace(/^eq\./,'');
   return reply(u in records?[{id:u,business_id:records[u].business_id,lead_id:records[u].lead_id}]:[]);
  }
  const leadFilter=q.get('id')||q.get('lead_id')||'';
  const businessFilter=q.get('business_id')||'';
  const u=leadFilter.includes('101')||businessFilter.includes(B1)?U1:U2;
  const r=records[u];
  const leadId=r.lead_id;
  if(path==='leads')return reply([{id:r.lead_id,business_id:r.business_id,job_type:r.description,description:r.description,status:'New'}]);
  if(path==='business_settings')return reply([{business_id:r.business_id,business_name:r.business_name,business_type:'Services',review_requests_enabled:false}]);
  if(path==='business_public_routes')return reply([{business_id:r.business_id,route_value:'shop-'+leadId}]);
  if(path==='lead_handovers'||path==='actions')return reply([]);
  throw Error('Unexpected: '+href);
 };
 const handler=(await import('../lib/customer-portal-handler.js?two-users='+Math.random())).default;
 return {handler,queryLog};
}
test('two independent authenticated customer sessions see only their own authorised tracked enquiries',async()=>{
 const {handler,queryLog}=await setup();
 const first=responder(),second=responder();
 await handler({method:'GET',headers:{authorization:'Bearer synthetic-one'}},first);
 await handler({method:'GET',headers:{authorization:'Bearer synthetic-two'}},second);
 assert.equal(first.statusCode,200);
 assert.equal(second.statusCode,200);
 assert.deepEqual(first.body.enquiries.map(e=>e.business.name),['Synthetic Shop One']);
 assert.deepEqual(second.body.enquiries.map(e=>e.business.name),['Synthetic Shop Two']);
 assert.match(first.body.enquiries[0].title,/One/);
 assert.match(second.body.enquiries[0].title,/Two/);
 assert.equal(first.body.enquiries[0].summary,'','a title must not repeat itself as a summary');
 assert.equal(second.body.enquiries[0].summary,'','a title must not repeat itself as a summary');
 assert.doesNotMatch(JSON.stringify(first.body),/Shop Two|Enquiry Two/);
 assert.doesNotMatch(JSON.stringify(second.body),/Shop One|Enquiry One/);
 assert.equal(queryLog.filter(x=>x.path==='customer_enquiry_access').length,2);
 assert.ok(queryLog.some(x=>x.path==='customer_enquiry_access'&&x.query.includes(encodeURIComponent(U1))));
 assert.ok(queryLog.some(x=>x.path==='customer_enquiry_access'&&x.query.includes(encodeURIComponent(U2))));
});
test('unverified customer bearer token is denied before any service-role tenant read',async()=>{
 const {handler,queryLog}=await setup();
 const invalid=responder();
 await handler({method:'GET',headers:{authorization:'Bearer arbitrary-unsigned'}},invalid);
 assert.equal(invalid.statusCode,401);
 assert.equal(queryLog.length,0);
 assert.equal(invalid.body.enquiries,undefined);
});
test.after(()=>{for(const key of Object.keys(process.env))if(!(key in original))delete process.env[key];Object.assign(process.env,original);globalThis.fetch=originalFetch;});
