import assert from 'node:assert/strict';
import test from 'node:test';

const saved={...process.env}; const originalFetch=globalThis.fetch;
const businessId='11111111-1111-4111-8111-111111111111';
const reply=(body,ok=true,status=ok?200:500)=>({ok,status,text:async()=>typeof body==='string'?body:JSON.stringify(body),json:async()=>body});

test('Checkout adds Marketing only from the server-configured Stripe Price and rejects trial add-ons', async()=>{
  process.env.STRIPE_SECRET_KEY='sk_test_placeholder'; process.env.BILLING_APP_URL='https://pilot.example.test'; process.env.STRIPE_PRICE_STARTER='price_base_starter'; process.env.STRIPE_PRICE_TRIAL='price_trial'; process.env.STRIPE_PRICE_ADDON_AI_MARKETING='price_server_marketing';
  const calls=[]; globalThis.fetch=async(url,options={})=>{ calls.push({url:String(url),body:String(options.body||'')}); return reply({url:'https://checkout.stripe.test/session'}); };
  const stripe=await import(new URL(`../lib/stripe.js?checkoutaddon=${Math.random()}`,import.meta.url));
  await stripe.createCheckout({plan:'starter',businessId,customerEmail:'owner@example.test',addonKeys:['ai_marketing']});
  const body=calls[0].body; assert.match(body,/line_items%5B0%5D%5Bprice%5D=price_base_starter/); assert.match(body,/line_items%5B1%5D%5Bprice%5D=price_server_marketing/); assert.doesNotMatch(body,/price_attacker/);
  await assert.rejects(()=>stripe.createCheckout({plan:'trial',businessId,addonKeys:['ai_marketing']}),/recurring plans only/i);
});

test('Stripe subscription plan detection ignores add-on items and fails closed on ambiguous base plans', async()=>{
  process.env.STRIPE_PRICE_STARTER='price_starter'; process.env.STRIPE_PRICE_PRO='price_pro'; process.env.STRIPE_PRICE_BUSINESS='price_business'; process.env.STRIPE_PRICE_ADDON_AI_MARKETING='price_marketing';
  const stripe=await import(new URL(`../lib/stripe.js?planitems=${Math.random()}`,import.meta.url));
  assert.equal(stripe.billingPlanFromSubscription({items:{data:[{price:{id:'price_pro'}},{price:{id:'price_marketing'}}]}}),'pro');
  assert.equal(stripe.billingPlanFromSubscription({items:{data:[{price:{id:'price_pro'}},{price:{id:'price_business'}}]}}),null);
});

test('Stripe-managed add-on synchronisation never overwrites manual Pilot entitlement when item is absent', async()=>{
  process.env.SUPABASE_URL='https://example.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY='server-key'; process.env.STRIPE_PRICE_ADDON_AI_MARKETING='price_marketing';
  const calls=[]; globalThis.fetch=async(url,options={})=>{ const href=String(url); calls.push({href,options}); if(href.includes('business_feature_entitlements')&&(!options.method||options.method==='GET')) return reply([{feature_key:'ai_marketing',status:'active',source:'manual',source_reference:null,expires_at:null}]); return reply({},true,204); };
  const addons=await import(new URL(`../lib/addons.js?manual=${Math.random()}`,import.meta.url));
  await addons.syncStripeAddonEntitlements({businessId,subscription:{id:'sub_1',current_period_end:1785200000,items:{data:[]}},enabled:true});
  assert.equal(calls.filter(call=>call.options.method==='POST').length,0);
});

test.after(()=>{ for(const key of Object.keys(process.env)) if(!(key in saved)) delete process.env[key]; Object.assign(process.env,saved); globalThis.fetch=originalFetch; });
