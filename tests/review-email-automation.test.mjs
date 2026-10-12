import test from 'node:test';
import assert from 'node:assert/strict';
import scheduler,{eligibleReviewEmail, queueReviewEmail, reviewEmailDeliveryReady} from '../lib/review-email-automation.js';
import {readFile} from 'node:fs/promises';
const booking={id:7,status:'completed',customer_email:'User@Example.org',review_email_allowed:true};
const settings={review_requests_enabled:true,review_email_auto_enabled:true,review_email_delay_hours:24,review_trustpilot_url:'https://www.trustpilot.com/evaluate/example.org',review_preferred_platform:'trustpilot',business_name:'Example'};
test('review mail needs completed work, verified email and explicit permission',()=>{
  assert.equal(eligibleReviewEmail({booking,settings}).email,'user@example.org');
  for(const changed of [{review_email_allowed:false},{status:'cancelled'},{customer_email:'invalid'}])assert.equal(eligibleReviewEmail({booking:{...booking,...changed},settings}),null);
  assert.equal(eligibleReviewEmail({booking,settings:{...settings,review_email_auto_enabled:false}}),null);
});
test('review mail queue is unique per tenant/booking and does not directly email',async()=>{
  const prior={url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY,fetch:globalThis.fetch};
  process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='secret';
  let stored;
  globalThis.fetch=async(url,options)=>{assert.match(String(url),/on_conflict=business_id,booking_id/);stored=JSON.parse(options.body);return {ok:true,text:async()=>JSON.stringify([])};};
  try{assert.equal(await queueReviewEmail({businessId:'business-1',booking,settings}),true);assert.equal(stored.customer_email,'user@example.org');assert.equal(stored.review_platform,'trustpilot');assert.equal(stored.status,'pending');}
  finally{globalThis.fetch=prior.fetch;if(prior.url===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=prior.url;if(prior.key===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=prior.key;}
});
test('worker requires secret and environment-enabled delivery',async()=>{
  const source=await readFile(new URL('../lib/review-email-automation.js',import.meta.url),'utf8');
  const migration=await readFile(new URL('../supabase/migrations/20261012234000_add_review_email_queue.sql',import.meta.url),'utf8');
  assert.match(source,/REVIEW_EMAIL_DELIVERY_ENABLED/);assert.match(source,/REVIEW_EMAIL_SCHEDULER_SECRET/);
  assert.match(source,/Idempotency-Key/);assert.match(migration,/for update skip locked/i);
  assert.match(migration,/revoke all on public\.review_email_outbox from public,anon,authenticated/);
  assert.match(migration,/review_email_auto_enabled boolean not null default false/);
});

test('delivery worker refuses all calls without a valid scheduler credential or active kill-switch',async()=>{
 const prev={secret:process.env.REVIEW_EMAIL_SCHEDULER_SECRET,flag:process.env.REVIEW_EMAIL_DELIVERY_ENABLED,fetch:globalThis.fetch};
 process.env.REVIEW_EMAIL_SCHEDULER_SECRET='test-only-scheduler-secret';delete process.env.REVIEW_EMAIL_DELIVERY_ENABLED;
 globalThis.fetch=async()=>{throw Error('No outbound calls allowed')};
 const res=()=>({code:0,body:null,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
 try {
   let response=res();await scheduler({method:'POST',headers:{authorization:'Bearer bad-secret'}},response);assert.equal(response.code,401);
   response=res();await scheduler({method:'POST',headers:{authorization:'Bearer test-only-scheduler-secret'}},response);assert.equal(response.code,503);
 } finally {
  globalThis.fetch=prev.fetch;
  for(const [key,value] of [['REVIEW_EMAIL_SCHEDULER_SECRET',prev.secret],['REVIEW_EMAIL_DELIVERY_ENABLED',prev.flag]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
});

test('sender kill switch and credentials prevent silently queued email',()=>{
  assert.equal(reviewEmailDeliveryReady({REVIEW_EMAIL_DELIVERY_ENABLED:'true'}),false);
  assert.equal(reviewEmailDeliveryReady({REVIEW_EMAIL_DELIVERY_ENABLED:'false',RESEND_API_KEY:'test',REVIEW_EMAIL_SCHEDULER_SECRET:'test',REVIEW_EMAIL_FROM:'Team <reviews@example.org>'}),false);
  assert.equal(reviewEmailDeliveryReady({REVIEW_EMAIL_DELIVERY_ENABLED:'true',RESEND_API_KEY:'test',REVIEW_EMAIL_SCHEDULER_SECRET:'test',REVIEW_EMAIL_FROM:'Team <reviews@example.org>'}),true);
});
