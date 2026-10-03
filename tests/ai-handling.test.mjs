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
    assert.equal(decideAIHandover(mode, { ...supported, type: 'quote' }, 'Quote for a kitchen rewire'), 'quote_or_commitment');
    assert.equal(decideAIHandover(mode, { ...supported, type: 'commitment' }, 'Guarantee tomorrow'), 'quote_or_commitment');
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
async function load(mode, intent = supported, model = null) {
  process.env.SUPABASE_URL = 'https://test.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-secret'; process.env.OPENAI_API_KEY = 'test-openai'; delete process.env.OPENROUTER_API_KEY;
  process.env.BILLING_ENABLED = 'false'; process.env.PUBLIC_ENQUIRY_RATE_LIMIT_MODE = 'memory';
  const calls = [];
  let requestedBooking = null;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes('business_public_routes')) return reply([{ business_id: 'business-a', route_type: 'slug', route_value: 'business-a', active: true }]);
    if (url.includes('business_incident_controls')) return reply([]);
    if (url.includes('platform_incident_controls')) return reply([{ id: 'global' }]);
    if (url.includes('business_settings')) return reply([{ business_name: 'Business A', business_type: 'Electrical services', phone: '01429 000000', email: 'hello@example.test', services: 'Repairs, Socket replacement', opening_hours: 'Monday 9–5', ai_instructions: 'Always ask which appliance needs repair.' }]);
    if (url.includes('business_configurations')) return reply([{ ai_handling_mode: mode, service_areas: 'Hartlepool' }]);
    if (url.includes('api.openai.com')) return reply({ output_text: JSON.stringify(model || { reply: 'Approved answer', intent, lead: { phone: '07000000000', job_type: 'Repair', handover_required: false } }) });
    if (url.includes('rpc/save_public_enquiry')) return reply({ id: 1, handover_reason: JSON.parse(options.body).p_reason });
    if (url.includes('bookings?')) return reply(requestedBooking ? [requestedBooking] : []);
    if (url.endsWith('/rest/v1/bookings') && options.method === 'POST') {
      const body = JSON.parse(options.body);
      requestedBooking = { id: 7, ...body };
      return reply([requestedBooking]);
    }
    if (url.endsWith('/rest/v1/lead_history') || url.endsWith('/rest/v1/business_audit_events')) return reply({}, true);
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
test('oversized customer input is rejected before tenant or provider work', async () => {
  const { handler, calls } = await load('balanced');

  let res = response();
  await handler({
    method: 'POST',
    query: { business: 'business-a' },
    body: { message: 'x'.repeat(2001) }
  }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /too long/i);
  assert.equal(calls.length, 0);

  res = response();
  await handler({
    method: 'POST',
    query: { business: 'business-a' },
    body: {
      message: 'Hello',
      messages: Array.from({ length: 31 }, () => ({ role: 'user', content: 'Previous message' }))
    }
  }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /too long/i);
  assert.equal(calls.length, 0);

  res = response();
  await handler({
    method: 'POST',
    query: { business: 'business-a' },
    body: {
      message: 'Hello',
      messages: [{ role: 'user', content: 'y'.repeat(2001) }]
    }
  }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /too long/i);
  assert.equal(calls.length, 0);
});

test('human-first answers simple supported coverage questions without handing over', async () => {
  const model = {
    reply: 'I have passed this to the team.',
    intent: { ...supported, type: 'normal_enquiry', requires_human: true },
    lead: { phone: null, email: null, job_type: null, qualified: false, handover_required: true }
  };
  const { handler, calls } = await load('human_first', supported, model);
  const res = response();
  await handler({
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.88' },
    query: { business: 'business-a' },
    body: { message: 'Do you cover Hartlepool for socket replacement?' }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.leadCaptured, false);
  assert.equal(res.body.continuation, null);
  assert.match(res.body.reply, /lists Socket replacement as a service and covers Hartlepool/i);
  assert.ok(!calls.some(call => call.url.includes('api.openai.com')), 'trusted coverage FAQ should not call the AI provider');
  assert.ok(!calls.some(call => call.url.includes('rpc/save_public_enquiry')), 'trusted coverage FAQ should not create a handover or lead');
});

test('public API uses routed configuration, persists policy metadata and never returns a lead row', async () => {
  const { handler, calls } = await load('human_first', { ...supported, type: 'quote' });
  const res = response(); await handler({ method: 'POST', body: { message: 'Quote for rewiring my kitchen' }, query: { business: 'business-a', business_id: 'other', ai_handling_mode: 'ai_first' } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.leadCaptured, true); assert.match(res.body.reply, /personal response/);
  assert.ok(calls.find(c => c.url.includes('business_configurations')).url.includes('business_id=eq.business-a'));
  const persisted = JSON.parse(calls.find(c => c.url.includes('rpc/save_public_enquiry')).options.body);
  assert.equal(persisted.p_business_id, 'business-a'); assert.equal(persisted.p_mode, 'human_first'); assert.equal(persisted.p_reason, 'quote_or_commitment');
  assert.equal(res.body.id, undefined); assert.equal(res.body.business_id, undefined);
  const prompt = JSON.parse(calls.find(c => c.url.includes('api.openai.com')).options.body).instructions;
  assert.match(prompt, /Server-selected handling mode: human_first/);
  assert.match(prompt, /Electrical services/);
  assert.match(prompt, /01429 000000/);
  assert.match(prompt, /Always ask which appliance needs repair/);
});

test('realistic quote with contact details is captured even when the fallback model misclassifies it', async () => {
  const liveMessage = 'QA-SIM-QUOTE-RETEST-928 — I would like a quote to replace two indoor sockets in Hartlepool. My name is Alex QA and my email is alex.qa@example.test.';
  const weakIntent = { type: 'unsupported', supported: false, requires_human: false, safety_reason: 'none', unsupported_reason: 'off_topic' };
  const model = {
    reply: 'Please confirm your full name. You can also reach me directly at alex.qa@example.test.',
    intent: weakIntent,
    lead: { name: null, phone: null, email: null, location: null, job_type: null, description: null, urgency: null, qualified: false, priority: 'Normal', notes: null, handover_required: false }
  };
  const { handler, calls } = await load('balanced', weakIntent, model);
  const res = response();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.40' }, query: { business: 'business-a' }, body: { message: liveMessage } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.leadCaptured, true);
  assert.match(res.body.reply, /saved your enquiry for Business A|passed your enquiry/i);
  assert.doesNotMatch(res.body.reply, /alex\.qa@example\.test|confirm your full name/i);
  assert.ok(!calls.some(c => c.url.includes('api.openai.com')), 'complete quote details should not wait on the AI provider');

  const saveCall = calls.find(c => c.url.includes('rpc/save_public_enquiry'));
  assert.ok(saveCall);
  const savedRequest = JSON.parse(saveCall.options.body);
  const persisted = savedRequest.p_lead;
  assert.equal(savedRequest.p_reason, 'quote_or_commitment');
  assert.equal(persisted.name, 'Alex QA');
  assert.equal(persisted.email, 'alex.qa@example.test');
  assert.equal(persisted.location, 'Hartlepool');
  assert.equal(persisted.priority, 'Normal');
  assert.match(persisted.job_type, /quote to replace two indoor sockets in Hartlepool/i);
});

test('complete customer booking creates one pending AI booking request and never claims confirmation', async () => {
  const { handler, calls } = await load('balanced');
  const message = 'I would like to book an appointment to replace two indoor sockets in Hartlepool. My name is Casey QA and my email is casey.qa@example.test.';

  let res = response();
  await handler({
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.42' },
    query: { business: 'business-a' },
    body: { message }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.leadCaptured, true);
  assert.equal(res.body.bookingRequested, true);
  assert.match(res.body.reply, /saved your booking request/i);
  assert.match(res.body.reply, /still needs to confirm availability and a time/i);
  assert.doesNotMatch(res.body.reply, /confirmed appointment|appointment is confirmed/i);
  assert.ok(!calls.some(c => c.url.includes('api.openai.com')), 'complete booking details should not wait on the AI provider');

  const bookingPosts = calls.filter(c => c.url.endsWith('/rest/v1/bookings') && c.options.method === 'POST');
  assert.equal(bookingPosts.length, 1);
  const booking = JSON.parse(bookingPosts[0].options.body);
  assert.equal(booking.business_id, 'business-a');
  assert.equal(booking.lead_id, 1);
  assert.equal(booking.status, 'requested');
  assert.equal(booking.source, 'ai_request');
  assert.equal(booking.customer_name, 'Casey QA');
  assert.equal(booking.customer_email, 'casey.qa@example.test');
  assert.equal(booking.location, 'Hartlepool');
  assert.equal(booking.starts_at, undefined);
  assert.match(booking.notes, /request only; confirm availability/i);

  const firstSession = res.body.session;
  res = response();
  await handler({
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.42' },
    query: { business: 'business-a' },
    body: { message, session: firstSession }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.bookingRequested, true);
  assert.equal(
    calls.filter(c => c.url.endsWith('/rest/v1/bookings') && c.options.method === 'POST').length,
    1,
    'repeated customer messages must not create a second pending AI booking'
  );
});

test('clearly off-topic requests stay off-topic even when they contain contact details and a want phrase', async () => {
  const { handler, calls } = await load('ai_first', supported);
  const res = response();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.41' }, query: { business: 'business-a' }, body: { message: 'I want the football score. My email is fan@example.test.' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.leadCaptured, false);
  assert.match(res.body.reply, /questions and enquiries about Business A/);
  assert.ok(!calls.some(c => c.url.includes('rpc/save_public_enquiry')));
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

async function loadWithBilling({ providerFails = false, providerStatus = 500, fallbackSucceeds = false, fallbackFailsOnce = false, fallbackResult = null, configurationFails = false } = {}) {
  process.env.SUPABASE_URL = 'https://test.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-secret'; process.env.OPENAI_API_KEY = 'test-openai';
  if (fallbackSucceeds) process.env.OPENROUTER_API_KEY = 'test-openrouter'; else delete process.env.OPENROUTER_API_KEY;
  process.env.BILLING_ENABLED = 'true'; process.env.PUBLIC_ENQUIRY_RATE_LIMIT_MODE = 'memory';
  const calls = [];
  let openRouterAttempts = 0;
  let requestedBooking = null;
  const account = { business_id: 'business-a', plan: 'starter', status: 'active', current_period_started_at: '2026-09-01T00:00:00.000Z', current_period_ends_at: '2099-10-01T00:00:00.000Z', cancel_at_period_end: false };
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes('business_public_routes')) return reply([{ business_id: 'business-a', route_type: 'slug', route_value: 'business-a', active: true }]);
    if (url.includes('business_incident_controls')) return reply([]);
    if (url.includes('platform_incident_controls')) return reply([{ id: 'global' }]);
    if (url.includes('business_settings')) return reply([{ business_name: 'Business A', business_type: 'Electrical services', services: 'Repairs', opening_hours: 'Monday 9–5', ai_instructions: 'Stay focused on this business.' }]);
    if (url.includes('business_configurations')) return configurationFails ? { ok: false, status: 400, text: async () => JSON.stringify({ message: 'configuration unavailable' }) } : reply([{ ai_handling_mode: 'ai_first', description: 'Electrical repairs' }]);
    if (url.includes('business_billing_accounts')) return reply([account]);
    if (url.includes('business_billing_usage')) return reply([{ quantity: 0 }]);
    if (url.includes('consume_billing_ai_enquiry_allowance')) return reply(true);
    if (url.includes('release_billing_ai_enquiry_allowance')) return reply(true);
    if (url.includes('api.openai.com')) {
      if (providerFails) return { ok: false, status: providerStatus, text: async () => JSON.stringify({ error: 'provider failed' }) };
      return reply({ output_text: JSON.stringify({ reply: 'Approved answer', intent: supported, lead: { phone: null, email: null, job_type: null, description: null, qualified: false, handover_required: false } }) });
    }
    if (url.includes('openrouter.ai')) {
      openRouterAttempts++;
      if (!fallbackSucceeds) return { ok: false, status: 503, text: async () => JSON.stringify({ error: 'fallback failed' }) };
      if (fallbackFailsOnce && openRouterAttempts === 1) return reply({ model: 'liquid/lfm-2.5-2.6b:free', choices: [{ message: { content: 'not-json' }, finish_reason: 'length' }] });
      const result = fallbackResult || { reply: 'Fallback answer', intent: supported, lead: { phone: null, email: null, job_type: null, description: null, qualified: false, handover_required: false } };
      return reply({ model: 'liquid/lfm-2.5-2.6b:free', choices: [{ message: { content: JSON.stringify(result) }, finish_reason: 'stop' }] });
    }
    if (url.includes('rpc/save_public_enquiry')) return reply({ id: 1, handover_reason: null });
    if (url.includes('bookings?')) return reply(requestedBooking ? [requestedBooking] : []);
    if (url.endsWith('/rest/v1/bookings') && options.method === 'POST') {
      const body = JSON.parse(options.body);
      requestedBooking = { id: 8, ...body };
      return reply([requestedBooking]);
    }
    if (url.endsWith('/rest/v1/lead_history') || url.endsWith('/rest/v1/business_audit_events')) return reply({}, true);
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

test('OpenAI authentication failures fall back to OpenRouter when it is configured', async () => {
  for (const providerStatus of [401, 403]) {
    const loaded = await loadWithBilling({ providerFails: true, providerStatus, fallbackSucceeds: true });
    const res = response();
    await loaded.handler({ method: 'POST', headers: { 'x-forwarded-for': `203.0.113.${providerStatus === 401 ? 31 : 32}` }, query: { business: 'business-a' }, body: { message: 'Can you help with a repair?' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.reply, 'Fallback answer');
    assert.equal(loaded.calls.filter(c => c.url.includes('api.openai.com')).length, 1);
    assert.equal(loaded.calls.filter(c => c.url.includes('openrouter.ai')).length, 1);
    assert.equal(loaded.calls.filter(c => c.url.includes('release_billing_ai_enquiry_allowance')).length, 0);
  }
});

test('OpenAI 429 falls back to OpenRouter without releasing the reserved allowance', async () => {
  const loaded = await loadWithBilling({ providerFails: true, providerStatus: 429, fallbackSucceeds: true, fallbackFailsOnce: true });
  const res = response();
  await loaded.handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.29' }, query: { business: 'business-a' }, body: { message: 'Can you help with a repair?' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.reply, 'Fallback answer');
  assert.equal(loaded.calls.filter(c => c.url.includes('api.openai.com')).length, 1);
  assert.equal(loaded.calls.filter(c => c.url.includes('openrouter.ai')).length, 2);
  assert.equal(loaded.calls.filter(c => c.url.includes('consume_billing_ai_enquiry_allowance')).length, 1);
  assert.equal(loaded.calls.filter(c => c.url.includes('release_billing_ai_enquiry_allowance')).length, 0);
  const fallbackCalls = loaded.calls.filter(c => c.url.includes('openrouter.ai'));
  const firstFallbackBody = JSON.parse(fallbackCalls[0].options.body);
  const retryFallbackBody = JSON.parse(fallbackCalls[1].options.body);
  assert.equal(firstFallbackBody.response_format.type, 'json_schema');
  assert.equal(firstFallbackBody.provider.require_parameters, true);
  assert.equal(firstFallbackBody.max_tokens, 1400);
  assert.equal(retryFallbackBody.max_tokens, 3200);
  assert.match(retryFallbackBody.messages[0].content, /Return compact JSON only/);
});

test('fallback quote is captured even when the model marks it unsupported and persistence wording is server-owned', async () => {
  const fallbackResult = {
    reply: 'Thanks, I have recorded your quote request for the team.',
    intent: { type: 'quote', supported: false, requires_human: false, safety_reason: 'none', unsupported_reason: 'missing_knowledge' },
    lead: {
      name: 'Casey QA', phone: null, email: 'casey.qa@example.test', location: 'Hartlepool',
      job_type: 'Consumer unit replacement quote', description: 'Customer wants a quote for a consumer unit replacement.',
      urgency: null, qualified: false, priority: 'Normal', notes: null, handover_required: false
    }
  };
  const loaded = await loadWithBilling({ providerFails: true, providerStatus: 429, fallbackSucceeds: true, fallbackResult });
  const res = response();
  await loaded.handler({
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.34' },
    query: { business: 'business-a' },
    body: { message: 'Could I get a quote for a consumer unit replacement?' }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.leadCaptured, true);
  assert.match(res.body.reply, /saved your enquiry|passed your enquiry/i);
  assert.notEqual(res.body.reply, fallbackResult.reply);
  assert.ok(loaded.calls.some(c => c.url.includes('rpc/save_public_enquiry')));
});

test('model cannot claim an enquiry was recorded when no lead was persisted', async () => {
  const fallbackResult = {
    reply: 'I have recorded your enquiry and the team will contact you.',
    intent: { type: 'basic_faq', supported: true, requires_human: false, safety_reason: 'none', unsupported_reason: 'none' },
    lead: { name: null, phone: null, email: null, location: null, job_type: null, description: null, urgency: null, qualified: false, priority: 'Normal', notes: null, handover_required: false }
  };
  const loaded = await loadWithBilling({ providerFails: true, providerStatus: 429, fallbackSucceeds: true, fallbackResult });
  const res = response();
  await loaded.handler({
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.35' },
    query: { business: 'business-a' },
    body: { message: 'Can you help me?' }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.leadCaptured, false);
  assert.doesNotMatch(res.body.reply, /recorded|saved|passed|team will contact/i);
  assert.match(res.body.reply, /phone number|email address/i);
  assert.ok(!loaded.calls.some(c => c.url.includes('rpc/save_public_enquiry')));
});

test('provider outage still captures a quote lead with deterministic customer details', async () => {
  const loaded = await loadWithBilling({ providerFails: true });
  const res = response();
  await loaded.handler({
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.33' },
    query: { business: 'business-a' },
    body: {
      message: 'I would like a quote to replace two indoor sockets in Hartlepool. My name is Alex QA and my email is alex.qa@example.test.'
    }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.leadCaptured, true);
  assert.match(res.body.reply, /saved your enquiry|captured your enquiry|passed your enquiry/i);
  assert.equal(loaded.calls.filter(c => c.url.includes('consume_billing_ai_enquiry_allowance')).length, 1);
  assert.equal(loaded.calls.filter(c => c.url.includes('release_billing_ai_enquiry_allowance')).length, 0);
  assert.equal(loaded.calls.filter(c => c.url.includes('api.openai.com')).length, 0);
  assert.equal(loaded.calls.filter(c => c.url.includes('openrouter.ai')).length, 0);
  assert.ok(res.body.session, 'a counted complete enquiry should keep the same session for follow-up turns');

  const saveCall = loaded.calls.find(c => c.url.includes('rpc/save_public_enquiry'));
  assert.ok(saveCall, 'the quote should still be persisted');
  const payload = JSON.parse(saveCall.options.body);
  assert.equal(payload.p_reason, 'quote_or_commitment');
  assert.equal(payload.p_lead.email, 'alex.qa@example.test');
  assert.match(payload.p_lead.name || '', /Alex QA/i);
  assert.equal(payload.p_lead.location, 'Hartlepool');
  assert.equal(payload.p_lead.priority, 'Normal');
  assert.match(payload.p_lead.job_type || '', /quote|replace|socket/i);
  assert.equal(payload.p_lead.qualified, true);
});

test('business configuration failure happens before billing allowance is consumed', async () => {
  const loaded = await loadWithBilling({ configurationFails: true });
  const res = response();
  await loaded.handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.28' }, query: { business: 'business-a' }, body: { message: 'Can you help with a repair?' } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(loaded.calls.filter(c => c.url.includes('consume_billing_ai_enquiry_allowance')).length, 0);
  assert.equal(loaded.calls.filter(c => c.url.includes('api.openai.com')).length, 0);
});

test('failed AI providers degrade safely, release allowance, and direct human handover spends none', async () => {
  let loaded = await loadWithBilling({ providerFails: true });
  let res = response();
  await loaded.handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.26' }, query: { business: 'business-a' }, body: { message: 'Can you help with a repair?' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.leadCaptured, false);
  assert.match(res.body.reply, /contact details|phone number|email address/i);
  assert.equal(loaded.calls.filter(c => c.url.includes('consume_billing_ai_enquiry_allowance')).length, 1);
  assert.equal(loaded.calls.filter(c => c.url.includes('release_billing_ai_enquiry_allowance')).length, 1);
  assert.equal(res.body.session, null, 'a degraded provider failure must not mint a free AI session');

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


async function loadReceptionistTest(model = null, role = 'owner') {
  process.env.SUPABASE_URL = 'https://test.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-secret';
  process.env.OPENAI_API_KEY = 'test-openai';
  delete process.env.OPENROUTER_API_KEY;
  process.env.TENANCY_AUTH_ENABLED = 'true';
  process.env.BILLING_ENABLED = 'true';
  process.env.PUBLIC_ENQUIRY_RATE_LIMIT_MODE = 'memory';
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/v1/user')) return reply({ id: 'owner-user', email: 'owner@example.test' });
    if (url.includes('business_memberships')) return reply([{ business_id: 'business-a', role }]);
    if (url.includes('business_incident_controls')) return reply([]);
    if (url.includes('platform_incident_controls')) return reply([{ id: 'global' }]);
    if (url.includes('business_legal_acceptances')) return reply([{ id: 'dpa-current' }]);
    if (url.includes('business_settings')) return reply([{ business_name: 'Business A', business_type: 'Electrical services', phone: '01429 000000', email: 'hello@example.test', address: 'Hartlepool', services: 'Repairs, Socket replacement', opening_hours: 'Monday 9–5', ai_instructions: 'Stay focused on this business.', automatic_follow_up_enabled: true, automatic_follow_up_hours: 24 }]);
    if (url.includes('business_configurations')) return reply([{ ai_handling_mode: 'balanced', description: 'Electrical repairs', service_areas: 'Hartlepool', customer_enquiry_instructions: 'Collect useful job details.', handover_instructions: 'Escalate when appropriate.', faqs: [] }]);
    if (url.includes('api.openai.com')) return reply({ output_text: JSON.stringify(model || { reply: 'We can help with that. What details can you share?', intent: supported, lead: { name: null, phone: null, email: null, location: null, job_type: 'Service enquiry', description: 'Customer asked about availability', urgency: null, qualified: true, priority: 'Normal', notes: null, handover_required: false } }) });
    throw new Error(`Unexpected call: ${url}`);
  };
  const handler = (await import(new URL(`../api/enquiry.js?receptionist_test=${Math.random()}`, import.meta.url))).default;
  return { handler, calls };
}

test('receptionist test mode requires authenticated business admin access', async () => {
  const { handler, calls } = await loadReceptionistTest();
  const res = response();
  await handler({ method: 'POST', headers: {}, query: {}, body: { test_mode: true, message: 'Test the receptionist' } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'Authentication is required');
  assert.equal(calls.length, 0);
});

test('receptionist test mode is limited to business owners and admins', async () => {
  const { handler } = await loadReceptionistTest(null, 'member');
  const res = response();
  await handler({ method: 'POST', headers: { authorization: 'Bearer qa-member-token' }, query: {}, body: { test_mode: true, message: 'Test the receptionist' } }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'You are not authorised for this action');
});

test('receptionist test mode previews workflow without consuming allowance or writing customer records', async () => {
  const { handler, calls } = await loadReceptionistTest();
  const res = response();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer qa-owner-token' },
    query: {},
    body: { test_mode: true, message: 'Hi, I’m Casey QA. I need a quote for a socket replacement in Hartlepool. Email qa.customer@example.test.' }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.test_mode, true);
  assert.equal(res.body.preview.handling_mode, 'balanced');
  assert.equal(res.body.preview.would_create.lead, true);
  assert.equal(res.body.preview.would_create.handover, true);
  assert.match(res.body.preview.handover_summary, /Casey QA/);
  assert.match(res.body.preview.handover_summary, /socket replacement/i);
  assert.match(res.body.preview.handover_summary, /Why handed over:/);
  assert.equal(res.body.preview.would_create.booking_request, false);
  assert.equal(res.body.preview.automatic_follow_up_eligible, true);
  assert.equal(res.body.preview.lead.email, 'qa.customer@example.test');
  assert.ok(res.body.preview.context.available.includes('Services'));
  assert.ok(!calls.some(call => call.url.includes('consume_billing_ai_enquiry_allowance')));
  assert.ok(!calls.some(call => call.url.includes('business_billing_accounts')));
  assert.ok(!calls.some(call => call.url.includes('business_legal_acceptances')), 'owner test mode must not depend on the public DPA gate');
  assert.doesNotMatch(JSON.stringify(res.body.preview), /owner@example\.test/, 'owner auth identity must not become simulated customer data');
  assert.ok(!calls.some(call => call.url.includes('consume_public_enquiry_quota')));
  assert.ok(!calls.some(call => call.url.includes('rpc/save_public_enquiry')));
  assert.ok(!calls.some(call => call.url.endsWith('/rest/v1/bookings') && call.options.method === 'POST'));
  assert.ok(!calls.some(call => call.url.endsWith('/rest/v1/business_audit_events') && call.options.method === 'POST'));
});

test('receptionist test mode can call the real AI reasoning path without using customer allowance', async () => {
  const { handler, calls } = await loadReceptionistTest();
  const res = response();
  await handler({ method: 'POST', headers: { authorization: 'Bearer qa-owner-token' }, query: {}, body: { test_mode: true, message: 'Do you have same-day availability for a service?' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.test_mode, true);
  assert.equal(calls.filter(call => call.url.includes('api.openai.com')).length, 1);
  assert.equal(res.body.preview.would_create.lead, false);
  assert.ok(!calls.some(call => call.url.includes('consume_billing_ai_enquiry_allowance')));
  assert.ok(!calls.some(call => call.url.includes('rpc/save_public_enquiry')));
});

test('owner UI uses dedicated receptionist test mode and exposes an outcome inspector', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<h2>AI Receptionist<\/h2>/);
  assert.match(html, /Safe customer simulation/);
  assert.match(html, /test_mode:true/);
  assert.match(html, /No lead, booking or handover was saved/);
  assert.match(html, /What Business AI would do/);
  assert.match(html, /business-ai-receptionist-test:/);
  assert.match(html, /qa\.customer@example\.test/);
});
