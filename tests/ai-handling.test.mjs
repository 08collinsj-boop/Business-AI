import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { AI_HANDLING_MODES, getAIHandlingPolicy, normaliseAIHandlingMode, validateBusinessConfiguration, decideAIHandover, handlingModeInstructions } from '../lib/business-configuration.js';
const supported = { type: 'normal_enquiry', supported: true, requires_human: false, safety_reason: 'none', unsupported_reason: 'none' };
const modes = Object.values(AI_HANDLING_MODES);
test('mode defaults, policies and configuration allowlist', () => {
  for (const value of [undefined, null, '', 'administrator', {}]) assert.equal(normaliseAIHandlingMode(value), 'balanced');
  for (const mode of modes) {
    assert.deepEqual(validateBusinessConfiguration({ ai_handling_mode: mode }), { ai_handling_mode: mode });
    assert.ok(Object.isFrozen(getAIHandlingPolicy(mode)));
    assert.match(handlingModeInstructions(mode), /safety, complaints, high-risk/);
  }
  for (const value of [null, '', 'BALANCED', 'invalid', 1]) assert.throws(() => validateBusinessConfiguration({ ai_handling_mode: value }), /Invalid/);
  assert.throws(() => validateBusinessConfiguration({ ai_handling_mode: 'ai_first', business_id: 'other' }), /Unsupported/);
  assert.equal(getAIHandlingPolicy('human_first').handleBookingsAutonomously, false);
  assert.equal(getAIHandlingPolicy('balanced').handleQuotesAutonomously, false);
  assert.equal(getAIHandlingPolicy('ai_first').handleQuotesAutonomously, true);
});
for (const mode of modes) {
  test(`${mode}: approved FAQ and supported enquiries respect policy`, () => {
    assert.equal(decideAIHandover(mode, { ...supported, type: 'basic_faq' }, 'When are you open?'), null);
    assert.equal(decideAIHandover(mode, supported, 'I need a repair'), mode === 'human_first' ? 'human_first_mode' : null);
    assert.equal(decideAIHandover(mode, { ...supported, type: 'booking' }, 'I need an appointment'), mode === 'human_first' ? 'human_first_mode' : null);
    assert.ok(decideAIHandover(mode, { ...supported, type: 'quote' }, 'Quote for a kitchen rewire'));
    assert.ok(decideAIHandover(mode, { ...supported, type: 'commitment' }, 'Guarantee tomorrow'));
    assert.equal(decideAIHandover(mode, { ...supported, type: 'unsupported', supported: false, unsupported_reason: 'missing_knowledge' }, 'An uncertain detail'), 'ai_uncertain');
    assert.equal(decideAIHandover(mode, { ...supported, type: 'unsupported', supported: false, unsupported_reason: 'off_topic' }, 'What is the capital of France?'), null);
    assert.equal(decideAIHandover(mode, null, 'Missing classification'), 'ai_uncertain');
  });
  test(`${mode}: safety and human requests always take priority`, () => {
    for (const message of ['Can I speak to someone?', 'I want a person.', 'Can someone call me?', "I don't want to talk to AI.", 'Speak to the owner.', 'Can a member of the team contact me?']) assert.equal(decideAIHandover(mode, supported, message), 'human_requested', message);
    assert.equal(decideAIHandover(mode, supported, 'There is a gas leak'), 'emergency_or_high_risk');
    assert.equal(decideAIHandover(mode, supported, 'I have a complaint'), 'complaint_or_dispute');
    assert.equal(decideAIHandover(mode, { ...supported, requires_human: true }, 'Please arrange a personal conversation'), 'human_requested');
    assert.equal(decideAIHandover(mode, { ...supported, safety_reason: 'emergency_or_high_risk' }, 'A classified risk'), 'emergency_or_high_risk');
    assert.ok(decideAIHandover(mode, supported, 'Sensitive request', true));
    for (const message of ['Do you install fire alarms?', 'How much is an emergency callout?', 'I am a property manager looking for maintenance quotes', "I don't need a human, I just want your opening hours"]) assert.notEqual(decideAIHandover(mode, supported, message), 'emergency_or_high_risk', message);
    assert.notEqual(decideAIHandover(mode, supported, 'I am a property manager looking for maintenance quotes'), 'human_requested');
    assert.notEqual(decideAIHandover(mode, supported, "I don't need a human, I just want your opening hours"), 'human_requested');
  });
}
const savedEnv = { ...process.env }, savedFetch = globalThis.fetch;
const response = () => ({ statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const reply = body => ({ ok: true, text: async () => JSON.stringify(body), json: async () => body });
async function load(mode, intent = supported) {
  process.env.SUPABASE_URL = 'https://test.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-secret'; process.env.OPENAI_API_KEY = 'test-openai';
  process.env.BILLING_ENABLED = 'false'; process.env.PUBLIC_ENQUIRY_RATE_LIMIT_MODE = 'memory';
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes('business_public_routes')) return reply([{ business_id: 'business-a', route_type: 'slug', route_value: 'business-a', active: true }]);
    if (url.includes('business_settings')) return reply([{ business_name: 'Business A', business_type: 'Electrical services', phone: '01429 000000', email: 'hello@example.test', services: 'Repairs', opening_hours: 'Monday 9–5', ai_instructions: 'Always ask which appliance needs repair.' }]);
    if (url.includes('business_configurations')) return reply([{ ai_handling_mode: mode }]);
    if (url.includes('api.openai.com')) return reply({ output_text: JSON.stringify({ reply: 'Approved answer', intent, lead: { phone: '07000000000', job_type: 'Repair', handover_required: false } }) });
    if (url.includes('rpc/save_public_enquiry')) return reply({ id: 1, handover_reason: JSON.parse(options.body).p_reason });
    throw new Error(`Unexpected call: ${url}`);
  };
  const handler = (await import(new URL(`../api/enquiry.js?handling=${Math.random()}`, import.meta.url))).default;
  return { handler, calls };
}
test('public API rejects browser policy and tenant overrides before any database access', async () => {
  const { handler, calls } = await load('human_first');
  for (const field of ['ai_handling_mode', 'business_id', 'tenant_id']) {
    const res = response(); await handler({ method: 'POST', body: { message: 'Hello', [field]: 'other' }, query: { business: 'business-a' } }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(calls.length, 0);
});
test('public API uses routed configuration, persists policy metadata and never returns a lead row', async () => {
  const { handler, calls } = await load('human_first', { ...supported, type: 'quote' });
  const res = response(); await handler({ method: 'POST', body: { message: 'Quote for rewiring my kitchen' }, query: { business: 'business-a', business_id: 'other', ai_handling_mode: 'ai_first' } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.leadCaptured, true); assert.match(res.body.reply, /personal response/);
  assert.ok(calls.find(c => c.url.includes('business_configurations')).url.includes('business_id=eq.business-a'));
  const persisted = JSON.parse(calls.find(c => c.url.includes('rpc/save_public_enquiry')).options.body);
  assert.equal(persisted.p_business_id, 'business-a'); assert.equal(persisted.p_mode, 'human_first'); assert.equal(persisted.p_reason, 'human_first_mode');
  assert.equal(res.body.id, undefined); assert.equal(res.body.business_id, undefined);
  const prompt = JSON.parse(calls.find(c => c.url.includes('api.openai.com')).options.body).instructions;
  assert.match(prompt, /Server-selected handling mode: human_first/);
  assert.match(prompt, /Electrical services/);
  assert.match(prompt, /01429 000000/);
  assert.match(prompt, /Always ask which appliance needs repair/);
});

test('obvious off-topic questions never become leads or handovers even if the model misclassifies them', async () => {
  const { handler, calls } = await load('ai_first', supported);
  const res = response();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.10' }, query: { business: 'business-a' }, body: { message: 'What is the capital of France? My number is 07000000000' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.leadCaptured, false);
  assert.match(res.body.reply, /questions and enquiries about Business A/);
  assert.equal(res.body.continuation, null);
  assert.ok(calls.some(c => c.url.includes('api.openai.com')));
  assert.ok(!calls.some(c => c.url.includes('rpc/save_public_enquiry')));
});
test('human handover collects missing contact and signed continuation cannot be forged', async () => {
  const { handler, calls } = await load('ai_first');
  let res = response(); await handler({ method: 'POST', query: { business: 'business-a' }, body: { message: 'Can I speak to someone?' } }, res);
  assert.equal(res.statusCode, 200); assert.match(res.body.reply, /phone number or email/); assert.equal(res.body.leadCaptured, false);
  assert.ok(!calls.some(c => c.url.includes('api.openai.com')));
  const continuation = res.body.continuation;
  res = response(); await handler({ method: 'POST', query: { business: 'business-a' }, body: { message: '07000000000', continuation } }, res);
  assert.equal(res.body.leadCaptured, true); assert.match(res.body.reply, /passed your enquiry/);
  assert.ok(!calls.some(c => c.url.includes('api.openai.com')));
  res = response(); await handler({ method: 'POST', query: { business: 'business-a' }, body: { message: 'A repair', continuation: continuation + 'bad' } }, res);
  assert.ok(calls.some(c => c.url.includes('api.openai.com')));
});
test('owner/onboarding controls save explicitly and retain draft on failure', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const prefix of ['o','c']) {
    assert.match(html, new RegExp(`name="${prefix}_ai_handling_mode" value="balanced" checked`));
    assert.match(html, new RegExp(`ai_handling_mode:selectedHandlingMode\\('${prefix}'\\)`));
  }
  assert.match(html, /setHandlingMode\('c',config.ai_handling_mode\)/);
  assert.match(html, /status.textContent='Saving…'/);
  assert.match(html, /status.textContent='Business profile saved.'/);
  assert.match(html, /catch\(error\)\{status.innerHTML=`<div class="error">/);
  assert.match(html, /function requestPublicHuman/);
  assert.match(html, /requestSubmit\(\)/);
});

async function loadWithBilling({ providerFails = false, configurationFails = false } = {}) {
  process.env.SUPABASE_URL = 'https://test.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-secret'; process.env.OPENAI_API_KEY = 'test-openai';
  process.env.BILLING_ENABLED = 'true'; process.env.PUBLIC_ENQUIRY_RATE_LIMIT_MODE = 'memory';
  const calls = [];
  const account = { business_id: 'business-a', plan: 'starter', status: 'active', current_period_started_at: '2026-09-01T00:00:00.000Z', current_period_ends_at: '2026-10-01T00:00:00.000Z', cancel_at_period_end: false };
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes('business_public_routes')) return reply([{ business_id: 'business-a', route_type: 'slug', route_value: 'business-a', active: true }]);
    if (url.includes('business_settings')) return reply([{ business_name: 'Business A', business_type: 'Electrical services', services: 'Repairs', opening_hours: 'Monday 9–5', ai_instructions: 'Stay focused on this business.' }]);
    if (url.includes('business_configurations')) return configurationFails ? { ok: false, status: 400, text: async () => JSON.stringify({ message: 'configuration unavailable' }) } : reply([{ ai_handling_mode: 'ai_first', description: 'Electrical repairs' }]);
    if (url.includes('business_billing_accounts')) return reply([account]);
    if (url.includes('business_billing_usage')) return reply([{ quantity: 0 }]);
    if (url.includes('consume_billing_ai_enquiry_allowance')) return reply(true);
    if (url.includes('release_billing_ai_enquiry_allowance')) return reply(true);
    if (url.includes('api.openai.com')) {
      if (providerFails) return { ok: false, status: 500, text: async () => JSON.stringify({ error: 'provider failed' }) };
      return reply({ output_text: JSON.stringify({ reply: 'Approved answer', intent: supported, lead: { phone: null, email: null, job_type: null, description: null, qualified: false, handover_required: false } }) });
    }
    if (url.includes('rpc/save_public_enquiry')) return reply({ id: 1, handover_reason: null });
    throw new Error(`Unexpected call: ${url}`);
  };
  const handler = (await import(new URL(`../api/enquiry.js?billing=${Math.random()}`, import.meta.url))).default;
  return { handler, calls };
}

test('one customer AI session consumes one advertised enquiry allowance unit across multiple turns', async () => {
  const { handler, calls } = await loadWithBilling();
  let res = response();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.25' }, query: { business: 'business-a' }, body: { message: 'Are you open on Monday?' } }, res);
  assert.equal(res.statusCode, 200); assert.ok(res.body.session);
  const session = res.body.session;
  res = response();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.25' }, query: { business: 'business-a' }, body: { message: 'And what services do you offer?', messages: [{ role: 'user', content: 'Are you open on Monday?' }, { role: 'assistant', content: 'Approved answer' }], session } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.session, session);
  assert.equal(calls.filter(c => c.url.includes('consume_billing_ai_enquiry_allowance')).length, 1);
  assert.equal(calls.filter(c => c.url.includes('api.openai.com')).length, 2);
});

test('business configuration failure happens before billing allowance is consumed', async () => {
  const loaded = await loadWithBilling({ configurationFails: true });
  const res = response();
  await loaded.handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.28' }, query: { business: 'business-a' }, body: { message: 'Can you help with a repair?' } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(loaded.calls.filter(c => c.url.includes('consume_billing_ai_enquiry_allowance')).length, 0);
  assert.equal(loaded.calls.filter(c => c.url.includes('api.openai.com')).length, 0);
});

test('failed AI provider calls release the reserved allowance and direct human handover spends none', async () => {
  let loaded = await loadWithBilling({ providerFails: true });
  let res = response();
  await loaded.handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.26' }, query: { business: 'business-a' }, body: { message: 'Can you help with a repair?' } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(loaded.calls.filter(c => c.url.includes('consume_billing_ai_enquiry_allowance')).length, 1);
  assert.equal(loaded.calls.filter(c => c.url.includes('release_billing_ai_enquiry_allowance')).length, 1);

  loaded = await loadWithBilling(); res = response();
  await loaded.handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.27' }, query: { business: 'business-a' }, body: { message: 'Can I speak to someone?' } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.leadCaptured, false);
  assert.equal(loaded.calls.filter(c => c.url.includes('consume_billing_ai_enquiry_allowance')).length, 0);
  assert.equal(loaded.calls.filter(c => c.url.includes('api.openai.com')).length, 0);
});

test.after(() => { for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); globalThis.fetch = savedFetch; });

test('Settings save executes only on save, retains failed draft and displays saved mode', async () => {
  const { runInNewContext } = await import('node:vm');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const nodes = new Map();
  const $ = id => { if (!nodes.has(id)) nodes.set(id, { value: '', checked: false, textContent: '', innerHTML: '' }); return nodes.get(id); };
  const radios = modes.map(value => ({ value, checked: value === 'balanced' }));
  let calls = 0, fail = false;
  const context = { $, document: { querySelectorAll: () => radios, querySelector: () => radios.find(r => r.checked) }, businessConfiguration: { ai_handling_mode:'human_first',faqs:[] }, configurationTemplates:[], renderFaqs(){}, renderFirstRunGuide(){}, esc: String, toast(){}, api:async (_path, options) => { calls++; if(fail) throw new Error('Save failed'); return { configuration:JSON.parse(options.body) }; } };
  const controls = html.slice(html.indexOf('function selectedHandlingMode('),html.indexOf('function applySelectedIndustryTemplate('));
  const save = html.slice(html.indexOf('async function saveBusinessConfiguration('),html.indexOf('function renderHandovers('));
  runInNewContext(controls + save, context);
  context.fillBusinessConfiguration(); assert.equal(radios.find(r => r.checked).value, 'human_first');
  context.setHandlingMode('c','ai_first'); assert.equal(calls,0);
  await context.saveBusinessConfiguration(); assert.equal(calls,1); assert.equal(context.businessConfiguration.ai_handling_mode,'ai_first'); assert.equal($('configurationStatus').textContent,'Business profile saved.');
  context.setHandlingMode('c','balanced'); fail=true; await context.saveBusinessConfiguration();
  assert.equal(radios.find(r => r.checked).value,'balanced'); assert.equal(context.businessConfiguration.ai_handling_mode,'ai_first'); assert.match($('configurationStatus').innerHTML,/Save failed/);
});

test('onboarding selection persists through the existing configuration API', async () => {
  const { runInNewContext } = await import('node:vm');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const source = html.slice(html.indexOf('async function saveOnboardingProgress('), html.indexOf('async function beginConfigurationOnboarding('));
  for (const mode of modes) {
    const calls=[];
    const context={ onboardingWizardSteps:['ai','review'],onboardingWizardIndex:0,onboardingWizardData:{settings:{},configuration:{}},selectedHandlingMode:()=>mode,wizardValue:()=>'',$:()=>({value:'unspecified'}),api:async(path,options)=>{const body=JSON.parse(options.body);calls.push({path,body});return path.includes('configuration')?{configuration:body}:body;} };
    runInNewContext(source,context); await context.saveOnboardingProgress();
    assert.equal(calls.find(c=>c.path==='/api/business-configuration').body.ai_handling_mode,mode);
    assert.equal(context.onboardingWizardData.configuration.ai_handling_mode,mode);
    assert.equal(context.onboardingWizardData.onboarding.state,'review');
  }
});
test('failed persistence never claims that a human handover was sent', async () => {
  const { handler } = await load('balanced'); const workingFetch=globalThis.fetch;
  globalThis.fetch=async(url,options)=>url.includes('rpc/save_public_enquiry')?{ok:false,status:400,text:async()=>'{"message":"test failure"}'}:workingFetch(url,options);
  const res=response(); await handler({method:'POST',query:{business:'business-a'},body:{message:'Can someone call me on 07000000000?'}},res);
  assert.equal(res.statusCode,200);assert.equal(res.body.leadCaptured,false);assert.match(res.body.reply,/could not pass/);assert.doesNotMatch(res.body.reply,/I've passed/);
});
for (const mode of modes) test(`${mode}: public API safety bypasses autonomous generation`,async()=>{
  const { handler,calls }=await load(mode);
  for(const message of ['There is a fire. 07000000000','An electric shock. 07000000000','I have a complaint. 07000000000']){
    const res=response();await handler({method:'POST',query:{business:'business-a'},body:{message}},res);
    assert.equal(res.statusCode,200);assert.equal(res.body.leadCaptured,true);assert.match(res.body.reply,/personal response/);
  }
  assert.ok(!calls.some(c=>c.url.includes('api.openai.com')));
});
