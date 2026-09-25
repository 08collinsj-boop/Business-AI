import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { processVerifiedStripeEvent } from '../lib/stripe-webhook-handler.js';
import addonsHandler from '../lib/addons-handler.js';
import { completeSubscriptionItems } from '../lib/stripe.js';
const saved={...process.env}, originalFetch=globalThis.fetch;
afterEach(()=>{process.env={...saved};globalThis.fetch=originalFetch;});
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const now=Math.floor(Date.now()/1000), start=now-100, end=now+86400;
const iso=n=>new Date(n*1000).toISOString();
const reply=(body,status=200)=>({ok:status<400,status,text:async()=>JSON.stringify(body),json:async()=>body});
function setup(){
 Object.assign(process.env,{BILLING_ENABLED:'true',TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://dev.example.test',SUPABASE_SERVICE_ROLE_KEY:'server',STRIPE_SECRET_KEY:'sk_test_placeholder',BILLING_APP_URL:'https://pilot.example.test',STRIPE_PRICE_STARTER:'price_starter',STRIPE_PRICE_PRO:'price_pro',STRIPE_PRICE_BUSINESS:'price_business',STRIPE_PRICE_ADDON_AI_MARKETING:'price_marketing'});
 const state={accounts:new Map(),features:new Map(),events:new Map(),writes:[],subscription:null,failAddon:false};
 globalThis.fetch=async(raw,opt={})=>{
  const url=new URL(raw),path=url.pathname, body=opt.body?JSON.parse(opt.body):{};
  if(url.hostname==='api.stripe.com'){
   if(path.includes('/subscriptions/'))return reply(state.subscription);
   if(path.includes('/prices/'))return reply({active:true,type:'recurring',currency:'gbp',unit_amount:1999,recurring:{interval:'month',interval_count:1}});
   throw Error('Unexpected Stripe request '+path);
  }
  if(path.endsWith('/auth/v1/user'))return reply({id:'owner'});
  if(path.endsWith('/business_memberships'))return reply([{business_id:A,role:'owner'}]);
  if(path.endsWith('/business_billing_accounts')){const rows=[...state.accounts.values()].filter(a=>['business_id','stripe_customer_id','stripe_subscription_id'].every(k=>!url.searchParams.has(k)||url.searchParams.get(k)==='eq.'+a[k]));return reply(rows);}
  if(path.endsWith('/business_billing_usage'))return reply([]);
  if(path.endsWith('/business_feature_entitlements'))return reply([...state.features.values()].filter(e=>url.searchParams.get('business_id')==='eq.'+e.business_id));
  if(path.endsWith('/stripe_webhook_events')){
   if(opt.method==='POST'){if(state.events.has(body.stripe_event_id))return reply({},409);state.events.set(body.stripe_event_id,body);return reply({},201);}
   const id=url.searchParams.get('stripe_event_id')?.slice(3), event=state.events.get(id);
   if(url.searchParams.has('processing_error')){if(!event?.processing_error)return reply([]);Object.assign(event,body);return reply([event]);}
   Object.assign(event,body);return reply({});
  }
  if(path.endsWith('/rpc/sync_business_billing_from_stripe')){
   state.writes.push({kind:'base',body});const old=state.accounts.get(body.p_business_id);
   if(old?.last_stripe_event_created_at>body.p_event_created_at)return reply(false);
   const row=Object.fromEntries(Object.entries(body).map(([k,v])=>[k.slice(2),v]));row.last_stripe_event_created_at=body.p_event_created_at;
   state.accounts.set(body.p_business_id,row);return reply(true);
  }
  if(path.endsWith('/rpc/sync_marketing_entitlement_from_stripe')){
   state.writes.push({kind:'addon',body});if(state.failAddon){state.failAddon=false;return reply({},503);}
   const account=state.accounts.get(body.p_business_id);
   if(account?.last_stripe_event_created_at!==body.p_event_created_at)return reply(false);
   const active=body.p_enabled&&body.p_item_id&&Date.parse(body.p_period_end)>Date.now()&&account.status==='active';
   state.features.set(body.p_business_id,{business_id:body.p_business_id,feature_key:'ai_marketing',source:'stripe',status:active?'active':'inactive',source_reference:body.p_item_id,expires_at:active?null:new Date().toISOString()});return reply(true);
  }
  if(path.endsWith('/business_audit_events'))return reply({});
  throw Error('Unexpected request '+raw);
 };
 return state;
}
function sub(plan='starter',overrides={}){return {id:'sub_a',object:'subscription',customer:'cus_a',status:'active',metadata:{business_id:A,plan:'untrusted'},items:{data:[{id:'si_marketing',price:{id:'price_marketing'},current_period_start:start,current_period_end:end},{id:'si_base',price:{id:'price_'+plan},current_period_start:start,current_period_end:end}]},...overrides};}
function event(subscription,type='customer.subscription.updated',id='evt_1',created=now){return {id,type,created,data:{object:subscription}};}
async function catalog(){const res={status(n){this.code=n;return this;},json(body){this.body=body;return this;},setHeader(){}};await addonsHandler({method:'GET',headers:{authorization:'Bearer owner'},query:{}},res);return res;}
for(const plan of ['starter','pro','business'])for(const type of ['customer.subscription.created','customer.subscription.updated','checkout.session.completed'])test(`${plan} + Marketing syncs from ${type} with item-level periods`,async()=>{
 const s=setup();s.subscription=sub(plan);let e=event(s.subscription,type);
 if(type==='checkout.session.completed')e.data.object={id:'cs_test',object:'checkout.session',mode:'subscription',payment_status:'paid',subscription:'sub_a',customer:'cus_a',metadata:{business_id:A}};
 assert.equal((await processVerifiedStripeEvent(e)).status,200);
 const base=s.writes.find(w=>w.kind==='base').body,addon=s.writes.find(w=>w.kind==='addon').body;
 assert.equal(base.p_plan,plan);assert.equal(base.p_current_period_started_at,iso(start));assert.equal(base.p_current_period_ends_at,iso(end));assert.equal(addon.p_item_id,'si_marketing');assert.equal(addon.p_period_end,iso(end));assert.equal(s.features.size,1);assert.equal(s.features.get(A).expires_at,null);
 const response=await catalog();assert.equal(response.code,200);assert.equal(response.body.addons.find(a=>a.key==='ai_marketing').entitlement,'active');assert.equal(response.body.addons.find(a=>a.key==='ai_phone').entitlement,'unavailable');
});
test('removal revokes and repeated deliveries cannot duplicate or reactivate Marketing',async()=>{const s=setup();await processVerifiedStripeEvent(event(sub()));const removed=sub();removed.items.data.shift();const e=event(removed,undefined,'evt_remove',now+1);assert.equal((await processVerifiedStripeEvent(e)).status,200);assert.equal(s.features.get(A).status,'inactive');assert.equal((await processVerifiedStripeEvent(e)).body.duplicate,true);assert.equal(s.features.size,1);assert.equal((await catalog()).body.addons[0].entitlement,'inactive');});
for(const status of ['canceled','incomplete','past_due','incomplete_expired'])test(`${status} subscription cannot grant Marketing`,async()=>{const s=setup();await processVerifiedStripeEvent(event(sub()));await processVerifiedStripeEvent(event(sub('starter',{status}),status==='canceled'?'customer.subscription.deleted':'customer.subscription.updated','evt_status',now+1));assert.equal(s.features.get(A).status,'inactive');});
test('scheduled whole-subscription cancellation stays active until the paid period ends',async()=>{const s=setup();await processVerifiedStripeEvent(event(sub('starter',{cancel_at_period_end:true})));assert.equal(s.features.get(A).status,'active');});
test('unknown add-on price and metadata cannot activate a feature',async()=>{const s=setup();const x=sub();x.items.data[0].price.id='price_unknown';x.metadata.feature_key='ai_marketing';await processVerifiedStripeEvent(event(x));assert.equal(s.features.size,0);});
test('unknown base price fails closed instead of acknowledging a successful sync',async()=>{const s=setup();const x=sub();x.items.data[1].price.id='price_unknown';assert.equal((await processVerifiedStripeEvent(event(x))).status,503);assert.equal(s.features.size,0);});
test('conflicting customer tenant blocks first subscription activation',async()=>{const s=setup();s.accounts.set(B,{business_id:B,stripe_customer_id:'cus_a'});assert.equal((await processVerifiedStripeEvent(event(sub()))).status,400);assert.equal(s.writes.length,0);});
test('checkout and retrieved subscription must resolve to the same tenant',async()=>{const s=setup();s.subscription=sub('starter',{customer:'cus_b',metadata:{business_id:B}});const e=event({id:'cs',mode:'subscription',payment_status:'paid',subscription:'sub_a',customer:'cus_a',metadata:{business_id:A}},'checkout.session.completed');assert.equal((await processVerifiedStripeEvent(e)).status,503);assert.equal(s.writes.length,0);});
test('unpaid checkout does not grant Marketing',async()=>{const s=setup();await processVerifiedStripeEvent(event({id:'cs',mode:'subscription',payment_status:'unpaid',subscription:'sub_a',customer:'cus_a',metadata:{business_id:A}},'checkout.session.completed'));assert.equal(s.writes.length,0);});
test('older event cannot reactivate after removal',async()=>{const s=setup();const x=sub();await processVerifiedStripeEvent(event(x));const removed=sub();removed.items.data.shift();await processVerifiedStripeEvent(event(removed,undefined,'evt_remove',now+2));await processVerifiedStripeEvent(event(x,undefined,'evt_delayed',now+1));assert.equal(s.features.get(A).status,'inactive');});
test('failed add-on write is retried under the same event ID',async()=>{const s=setup();s.failAddon=true;const e=event(sub());assert.equal((await processVerifiedStripeEvent(e)).status,503);assert.equal((await processVerifiedStripeEvent(e)).status,200);assert.equal(s.features.get(A).status,'active');assert.equal((await processVerifiedStripeEvent(e)).body.duplicate,true);});
test('missing active periods returns retryable failure instead of an empty successful sync',async()=>{const s=setup();const x=sub();delete x.items.data[1].current_period_end;assert.equal((await processVerifiedStripeEvent(event(x))).status,503);assert.equal(s.features.size,0);});
test('legacy subscription-level periods remain supported',async()=>{const s=setup();const x=sub();for(const i of x.items.data){delete i.current_period_start;delete i.current_period_end;}x.current_period_start=start;x.current_period_end=end;assert.equal((await processVerifiedStripeEvent(event(x))).status,200);assert.equal(s.features.get(A).status,'active');});
test('subscription pagination includes later Marketing items',async()=>{setup();globalThis.fetch=async(url)=>{assert.match(String(url),/subscription=sub_a/);assert.match(String(url),/starting_after=si_base/);return reply({data:[{id:'si_marketing',price:{id:'price_marketing'}}],has_more:false});};const x=await completeSubscriptionItems({id:'sub_a',items:{data:[{id:'si_base'}],has_more:true}});assert.equal(x.items.data.length,2);assert.equal(x.items.has_more,false);});
for(const injected of [{action:'activate',key:'ai_marketing'},{action:'purchase',key:'ai_marketing',business_id:B},{action:'purchase',key:'ai_marketing',status:'active'},{action:'purchase',key:'ai_phone'}])test(`browser cannot self-enable with ${JSON.stringify(injected)}`,async()=>{const s=setup();const res={status(n){this.code=n;return this;},json(b){this.body=b;return this;},setHeader(){}};await addonsHandler({method:'POST',headers:{authorization:'Bearer owner'},query:{},body:injected},res);assert.ok([400,409].includes(res.code));assert.equal(s.features.size,0);assert.equal(s.writes.length,0);});
