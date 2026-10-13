import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import customerHandler, { validateCustomerComplaint } from '../lib/customer-complaints-handler.js';
import ownerHandler, { validateComplaintUpdate, COMPLAINT_TRANSITIONS } from '../lib/complaints-handler.js';

const baseEnv={...process.env};const originalFetch=globalThis.fetch;
const businessId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const customerId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const enquiryId='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const complaintId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function reply(data,status=200){return {ok:status<400,status,json:async()=>data,text:async()=>JSON.stringify(data)};}
function res(){return {code:0,body:null,status(value){this.code=value;return this;},json(value){this.body=value;return this;},setHeader(){}};}
const headers={authorization:'Bearer verified-test-token'};
function setup(fake){
  process.env.TENANCY_AUTH_ENABLED='true';process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='service-test';
  globalThis.fetch=async(url,options={})=>fake(String(url),options);
}
test('complaint body cannot supply IDs, priority, status or bypass customer enrolment',()=>{
  assert.ok(validateCustomerComplaint({enquiry_id:enquiryId,subject:'Unresolved visit',description:'The team has not responded.'}));
  assert.equal(validateCustomerComplaint({enquiry_id:enquiryId,subject:'Unresolved visit',description:'The team has not responded.',business_id:businessId}),null);
  assert.equal(validateCustomerComplaint({enquiry_id:enquiryId,subject:'A',description:'Short'}),null);
  assert.equal(validateCustomerComplaint({enquiry_id:enquiryId,subject:'Unresolved visit',description:'The team has not responded.',status:'resolved'}),null);
});
test('customer POST resolves business and lead from verified enquiry access only', {concurrency:false},async()=>{
  let saved=null;
  setup((url,options)=>{
    if(url.includes('/auth/v1/user'))return reply({id:customerId,email:'client@example.com'});
    if(url.includes('/customer_enquiry_access?')){assert.match(url,/customer_user_id=eq\./);return reply([{business_id:businessId,lead_id:42}]);}
    if(url.includes('/customer_complaints?'))return reply([]);
    if(url.endsWith('/customer_complaints')){saved=JSON.parse(options.body);return reply([{id:complaintId}],201);}
    if(url.includes('/business_audit_events'))return reply([]);
    throw Error('Unexpected URL '+url);
  });
  const result=res();await customerHandler({method:'POST',headers,body:{enquiry_id:enquiryId,subject:'Late response',description:'I have waited for a reply.'}},result);
  assert.equal(result.code,201);assert.equal(saved.business_id,businessId);assert.equal(saved.lead_id,42);assert.equal(saved.customer_user_id,customerId);assert.equal(saved.status,'received');
  assert.equal('email' in saved,false);assert.equal('priority' in saved,false);
});
test('unlinked customer and duplicate complaint are blocked', {concurrency:false},async()=>{
  setup((url)=>{
    if(url.includes('/auth/v1/user'))return reply({id:customerId});
    if(url.includes('/customer_enquiry_access?'))return reply([]);
    throw Error('Unexpected request');
  });
  const missing=res();await customerHandler({method:'POST',headers,body:{enquiry_id:enquiryId,subject:'Late response',description:'I have waited for a reply.'}},missing);
  assert.equal(missing.code,404);
  setup((url)=>{
    if(url.includes('/auth/v1/user'))return reply({id:customerId});
    if(url.includes('/customer_enquiry_access?'))return reply([{business_id:businessId,lead_id:42}]);
    if(url.includes('/customer_complaints?'))return reply([{id:complaintId}]);
    throw Error('Unexpected request');
  });
  const duplicate=res();await customerHandler({method:'POST',headers,body:{enquiry_id:enquiryId,subject:'Late response',description:'I have waited for a reply.'}},duplicate);
  assert.equal(duplicate.code,409);
});
test('owner can only make permitted status changes with private human note', {concurrency:false},async()=>{
  assert.deepEqual(COMPLAINT_TRANSITIONS.received,['in_review','responded']);
  assert.equal(validateComplaintUpdate({id:complaintId,status:'resolved'},'received'),null);
  assert.equal(validateComplaintUpdate({id:complaintId,status:'responded',actor_user_id:customerId},'received'),null);
  assert.ok(validateComplaintUpdate({id:complaintId,status:'in_review'},'received'));
  let patch=null;
  setup((url,options)=>{
    if(url.includes('/auth/v1/user'))return reply({id:customerId});
    if(url.includes('/business_memberships?'))return reply([{business_id:businessId,role:'owner'}]);
    if(url.includes('/customer_complaints?')&&options.method==='PATCH'){patch={url,body:JSON.parse(options.body)};return reply([{id:complaintId,status:'responded',updated_at:new Date().toISOString()}]);}
    if(url.includes('/customer_complaints?'))return reply([{id:complaintId,status:'received',response_note:''}]);
    if(url.includes('/business_audit_events'))return reply([]);
    throw Error('Unexpected URL '+url);
  });
  const noNote=res();await ownerHandler({method:'PATCH',headers,body:{id:complaintId,status:'responded'}},noNote);assert.equal(noNote.code,400);
  const done=res();await ownerHandler({method:'PATCH',headers,body:{id:complaintId,status:'responded',response_note:'We have reviewed the circumstances.'}},done);
  assert.equal(done.code,200);assert.match(patch.url,/business_id=eq\./);assert.match(patch.url,/status=eq.received/);assert.equal(patch.body.status,'responded');
});
test('complaint review is owner/admin only, no unverified browser access', {concurrency:false},async()=>{
  setup((url)=>{
    if(url.includes('/auth/v1/user'))return reply({id:customerId});
    if(url.includes('/business_memberships?'))return reply([{business_id:businessId,role:'member'}]);
    throw Error('Unexpected URL '+url);
  });
  const denied=res();await ownerHandler({method:'GET',headers},denied);assert.equal(denied.code,403);
  const anonymous=res();await customerHandler({method:'POST',headers:{},body:{enquiry_id:enquiryId,subject:'Late response',description:'I have waited for a reply.'}},anonymous);assert.equal(anonymous.code,401);
});
test('routing, UI and migration preserve private ownership and no automatic messages',async()=>{
  const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
  const [migration,ops,vercel,ownerUi,customerUi,portal]=await Promise.all(['supabase/migrations/20261012233000_add_customer_complaints.sql','api/operations.js','vercel.json','index.html','assets/customer-portal.js','lib/customer-portal-handler.js'].map(read));
  assert.match(migration,/foreign key \(lead_id, business_id\)/);assert.match(migration,/enable row level security/);assert.match(migration,/revoke all on public\.customer_complaints from public, anon, authenticated/);
  assert.match(migration,/unique \(customer_user_id, lead_id\)/);
  assert.match(ops,/customerComplaintsHandler/);assert.match(vercel,/\/api\/customer-complaints/);
  assert.match(ownerUi,/complaintsPanel/);assert.match(customerUi,/appendCustomerComplaintControls/);
  assert.match(portal,/customer_user_id=eq\./);assert.doesNotMatch(migration,/sendEmail|sendSms|mailgun|twilio/i);
});
test.after(()=>{globalThis.fetch=originalFetch;for(const key of ['TENANCY_AUTH_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']){if(baseEnv[key]===undefined)delete process.env[key];else process.env[key]=baseEnv[key];}});
