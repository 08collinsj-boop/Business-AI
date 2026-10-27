import test from 'node:test';import assert from 'node:assert/strict';
const saved={...process.env},savedFetch=globalThis.fetch;
const A='11111111-1111-4111-8111-111111111111';
const res=()=>({statusCode:0,body:null,status(c){this.statusCode=c;return this;},json(b){this.body=b;return this;},setHeader(){}});
const reply=b=>({ok:true,status:200,json:async()=>b,text:async()=>JSON.stringify(b)});
function enable(){Object.assign(process.env,{COLZO_SCOPED_PILOT_ACCESS:'true',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'fix/colzo-pilot-release-gates-20261026',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-fixture',PILOT_FREE_STARTER_MARKETING:'false',BILLING_ENABLED:'false',TENANCY_AUTH_ENABLED:'true',FRONTEND_AUTH_ENABLED:'true',PUBLIC_ENQUIRY_RATE_LIMIT_MODE:'memory'});delete process.env.OPENAI_API_KEY;delete process.env.OPENROUTER_API_KEY;}
let n=0;
async function load({expired=false,failedSave=false}={}){enable();const calls=[],writes=[];const start=Date.now()-(expired?15:1)*86400000;const grant={business_id:A,status:'active',activated_at:new Date(start).toISOString(),expires_at:new Date(start+336*3600000).toISOString()};globalThis.fetch=async(url,opts={})=>{const h=String(url);calls.push(h);if(opts.body)writes.push({url:h,body:JSON.parse(opts.body)});assert.ok(h.startsWith(process.env.SUPABASE_URL+'/'),'external provider call forbidden');
 if(h.includes('business_public_routes'))return reply([{business_id:A,route_type:'slug',route_value:'qa-example',active:true}]);
 if(h.includes('business_legal_acceptances'))return reply([{id:1,business_id:A,document_key:'dpa',document_version:'1.1'}]);
 if(h.includes('business_incident_controls'))return reply([]);
 if(h.includes('platform_incident_controls'))return reply([{id:'global'}]);
 if(h.includes('business_settings'))return reply([{business_name:'QA Example',business_type:'Electrical services',services:'Indoor lighting',opening_hours:'Monday-Friday 09:00-17:00',email:'qa@example.invalid'}]);
 if(h.includes('business_configurations'))return reply([{ai_handling_mode:'balanced',faqs:[]}]);
 if(h.includes('business_knowledge_items'))return reply([]);
 if(h.includes('colzo_pilot_access'))return reply([grant]);
 if(h.includes('business_billing_usage'))return reply([{quantity:0}]);
 if(h.includes('rpc/consume_billing_ai_enquiry_allowance')||h.includes('rpc/release_billing_ai_enquiry_allowance'))return reply(true);
 if(h.includes('rpc/save_public_enquiry'))return failedSave?{ok:false,status:400,text:async()=>JSON.stringify({message:'synthetic persistence failure'})}:reply({id:1});
 if(h.includes('rpc/request_colzo_pilot_booking'))return reply({id:7,business_id:A,lead_id:1,status:'requested',source:'ai_request',created:true});
 if(h.includes('business_audit_events')||h.includes('lead_history'))return reply([]);
 throw Error('Unexpected fixture call '+h);
 };return{handler:(await import('../api/enquiry.js?no-provider='+ ++n)).default,calls,writes};}
test('no-provider scoped demo answers approved FAQ and honours booking refusal',async()=>{const{handler,calls}=await load();for(const message of ['What are your opening hours?','Do not book anything. I only want information.']){const r=res();await handler({method:'POST',headers:{'x-forwarded-for':'198.51.100.22'},query:{business:'qa-example'},body:{message}},r);assert.equal(r.statusCode,200);assert.equal(r.body.bookingRequested,false);if(message.startsWith('What'))assert.match(r.body.reply,/09:00-17:00/);}assert.ok(!calls.some(h=>h.includes('save_public_enquiry')));});
test('no-provider scoped demo persists quote and booking requests without provider calls',async()=>{for(const message of ['Please quote for replacing two lights. My email is alex.qa@example.invalid.','Please book an appointment to replace two lights. My email is alex.qa@example.invalid.']){const{handler}=await load();const r=res();await handler({method:'POST',headers:{'x-forwarded-for':'198.51.100.23'},query:{business:'qa-example'},body:{message}},r);assert.equal(r.statusCode,200);assert.equal(r.body.leadCaptured,true);assert.equal(r.body.bookingRequested,message.startsWith('Please book'));assert.doesNotMatch(r.body.reply,/appointment is confirmed/i);}});
test('no-provider mode preserves expired grant denial',async()=>{const{handler}=await load({expired:true});const r=res();await handler({method:'POST',headers:{'x-forwarded-for':'198.51.100.24'},query:{business:'qa-example'},body:{message:'What are your opening hours?'}},r);assert.equal(r.statusCode,402);assert.ok(!r.body.leadCaptured);});
test('shallow health permits configured no-provider Dev scoped preview only',async()=>{enable();const health=(await import('../lib/health-handler.js')).default;let r=res();health({method:'GET'},r);assert.equal(r.statusCode,200);assert.deepEqual(r.body,{status:'ok'});process.env.VERCEL_ENV='production';r=res();health({method:'GET'},r);assert.equal(r.statusCode,503);});
test('no-provider failed save never claims delivery',async()=>{const{handler}=await load({failedSave:true});const r=res();await handler({method:'POST',headers:{'x-forwarded-for':'198.51.100.25'},query:{business:'qa-example'},body:{message:'Please quote for replacing two lights. My email is alex.qa@example.invalid.'}},r);assert.equal(r.statusCode,200);assert.equal(r.body.leadCaptured,false);assert.match(r.body.reply,/could not pass|could not save|unable to save/i);assert.doesNotMatch(r.body.reply,/I've passed|I've captured/i);});
test('no-provider eligibility requires Dev Preview, auth and disabled billing',async()=>{const{isScopedPilotNoProviderDemo}=await import('../lib/colzo-scoped-pilot.js');enable();for(const [k,v] of [['SUPABASE_URL','https://other.invalid'],['VERCEL_ENV','production'],['TENANCY_AUTH_ENABLED','false'],['FRONTEND_AUTH_ENABLED','false'],['BILLING_ENABLED','true'],['PILOT_FREE_STARTER_MARKETING','true'],['OPENAI_API_KEY','synthetic-key']]){const old=process.env[k];process.env[k]=v;assert.equal(isScopedPilotNoProviderDemo(),false,k);if(old===undefined)delete process.env[k];else process.env[k]=old;}});
test('demo request-an-appointment wording creates only a pending booking',async()=>{
 const {handler,writes}=await load(),r=res();
 await handler({method:'POST',headers:{'x-forwarded-for':'198.51.100.60'},query:{business:'qa-example'},body:{message:'Please request an appointment next Tuesday afternoon. My email is alex.qa@example.invalid.'}},r);
 assert.equal(r.statusCode,200);assert.equal(r.body.leadCaptured,true);assert.equal(r.body.bookingRequested,true);
 assert.equal(writes.filter(w=>w.url.includes('rpc/request_colzo_pilot_booking')).length,1);
 assert.match(r.body.reply,/confirm availability/i);assert.doesNotMatch(r.body.reply,/appointment is confirmed/i);
});
test('demo refusal history cannot become the subsequent quote or booking work type',async()=>{
 const {handler,writes}=await load(),r=res();
 const quote='Fictional demonstration: please quote for replacing two indoor lights. My name is QA Sam Example and my email is sam.qa@example.invalid. This is a test enquiry only.';
 const messages=[{role:'user',content:'What are your opening hours?'},{role:'assistant',content:'Monday-Friday 09:00-17:00'},{role:'user',content:'Do not book anything. I only want information. Do not arrange a callback.'},{role:'assistant',content:"Understood. I won't arrange a new booking or callback."}];
 await handler({method:'POST',headers:{'x-forwarded-for':'198.51.100.61'},query:{business:'qa-example'},body:{message:quote,messages}},r);
 assert.equal(r.statusCode,200);assert.equal(r.body.leadCaptured,true);assert.equal(r.body.bookingRequested,false);
 const enquiry=writes.find(w=>w.url.includes('rpc/save_public_enquiry'));
 assert.equal(enquiry.body.p_lead.job_type,'replacing two indoor lights');
 const booking=res();await handler({method:'POST',headers:{'x-forwarded-for':'198.51.100.62'},query:{business:'qa-example'},body:{message:'Please request an appointment next Tuesday afternoon.',messages:[...messages,{role:'user',content:quote},{role:'assistant',content:r.body.reply}],continuation:r.body.continuation,session:r.body.session}},booking);
 assert.equal(booking.statusCode,200);assert.equal(booking.body.bookingRequested,true);
 assert.equal(writes.find(w=>w.url.includes('rpc/request_colzo_pilot_booking')).body.p_title,'replacing two indoor lights');
});
test.after(()=>{for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);globalThis.fetch=savedFetch;});
