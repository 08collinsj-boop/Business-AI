import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { generateMarketing } from '../lib/marketing.js';
import { automationGroundingSources, validateAutomationGrounding } from '../lib/marketing-grounding.js';
import { runMarketingAutomation } from '../lib/marketing-automation.js';

const savedEnv = { ...process.env };
const savedFetch = globalThis.fetch;
afterEach(() => { process.env = { ...savedEnv }; globalThis.fetch = savedFetch; });

const facts = {
  business_name: 'Business AI', address: 'Hartlepool',
  approved_uploaded_knowledge: [
    { item_type: 'service', title: 'AI receptionist service', content: 'Business AI provides an AI receptionist service.' },
    { item_type: 'service', title: 'Marketing services', content: 'Business AI provides marketing services.' }
  ]
};
const clean = {
  main_copy: 'Business AI provides an AI receptionist service.\n\nBusiness AI provides marketing services.',
  short_alternative: 'Business AI provides marketing services.',
  call_to_action: 'Message us to find out more.', hashtags: ['#BusinessAI', '#Hartlepool'], missing_information: []
};
const observed = {
  ...clean,
  main_copy: "Hartlepool businesses often lose customers to unanswered calls and missed messages. Our AI receptionist service answers enquiries and collects leads so you don't have to miss the next one. We've also built marketing tools to help you stay visible without spending hours on content.\n\nWe're currently in a pilot phase and looking for local businesses to test the system. If you'd like to see how it works, message us and we can share the link. We want real feedback on what helps and what could be better.\n\nhttp://getbusiness-ai.com/",
  short_alternative: "Our AI receptionist answers enquiries and collects leads so you don't miss customers, plus marketing tools to keep you visible. Hartlepool businesses: message us to test it."
};
const input = { content_type: 'social_post', platform: 'facebook', tone: 'promotional', prompt: 'Create an automated post. Do not invent a discount, price, availability or testimonial.' };
const isGroundingError = error => error.code === 'MARKETING_GROUNDING_REJECTED' && error.status === 502;

test('the exact failed Pilot caption is rejected despite valid service names', () => {
  assert.throws(() => validateAutomationGrounding(observed, facts), isGroundingError);
});

test('approved service facts with a neutral CTA are accepted', () => {
  assert.equal(validateAutomationGrounding(clean, facts), clean);
  assert.doesNotThrow(() => validateAutomationGrounding({ ...clean,
    main_copy: '  BUSINESS AI provides an AI receptionist service!  '
  }, facts));
});

test('unsupported statements are checked independently in every output field', () => {
  for (const field of ['main_copy', 'short_alternative', 'call_to_action']) {
    for (const claim of [
      'Our marketing saves you hours.', 'Never miss another customer.',
      'Businesses in Hartlepool often lose customers.', 'Our AI receptionist collects leads.',
      'Get 20% off this week.', 'Our services cost £35.', 'We are looking for pilot testers.'
    ]) {
      assert.throws(() => validateAutomationGrounding({ ...clean, [field]: claim }, facts), isGroundingError);
    }
  }
  assert.throws(() => validateAutomationGrounding({ ...clean, hashtags: ['#GuaranteedResults'] }, facts), isGroundingError);
  assert.throws(() => validateAutomationGrounding({ ...clean, hashtags: ['#Free'] }, {
    ...facts, approved_uploaded_knowledge: [{ content: 'We do not offer free services.' }]
  }), isGroundingError);
});

test('metadata, titles and business type cannot authorise claims', () => {
  const poisoned = { ...facts, business_type: 'Our marketing saves you hours.',
    approved_uploaded_knowledge: [{ title: 'Our marketing saves you hours.', keywords: ['Our marketing saves you hours.'], content: facts.approved_uploaded_knowledge[0].content }]
  };
  assert.ok(!automationGroundingSources(poisoned).includes('Our marketing saves you hours.'));
  assert.throws(() => validateAutomationGrounding({ ...clean, main_copy: 'Our marketing saves you hours.' }, poisoned), isGroundingError);
});

test('a benefit needs its own approved statement, and cannot be transferred to another service', () => {
  const supported = { ...facts, approved_uploaded_knowledge: [...facts.approved_uploaded_knowledge,
    { content: 'Our marketing saves you hours.' }
  ] };
  assert.doesNotThrow(() => validateAutomationGrounding({ ...clean, main_copy: 'Our marketing saves you hours.' }, supported));
  assert.throws(() => validateAutomationGrounding({ ...clean, main_copy: 'Our AI receptionist saves you hours.' }, supported), isGroundingError);
  assert.throws(() => validateAutomationGrounding({ ...clean, main_copy: 'Our marketing saves you hours.' }, {
    ...facts, approved_uploaded_knowledge: [{ content: 'Our marketing does not save you hours.' }]
  }), isGroundingError);
});

test('empty evidence fails closed, including CTA-only copy', () => {
  assert.throws(() => validateAutomationGrounding(clean, {}), isGroundingError);
  assert.throws(() => validateAutomationGrounding({ ...clean, main_copy: 'Message us to find out more.' }, facts), isGroundingError);
});

function mockRequests(providerOutput) {
  // All fetches are replaced. Unknown destinations fail; no live API is used.
  process.env = { SUPABASE_URL: 'https://grounding.example.test', SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
    OPENROUTER_API_KEY: 'mock-key', BILLING_ENABLED: 'false' };
  const calls = [];
  const ok = value => ({ ok: true, status: 200, text: async () => JSON.stringify(value) });
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ href, method: options.method || 'GET', body });
    if (href === 'https://openrouter.ai/api/v1/chat/completions') {
      return ok({ model: 'mock-model', id: 'mock-response', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(providerOutput) } }] });
    }
    assert.ok(href.startsWith('https://grounding.example.test/rest/v1/'), 'Unexpected destination: ' + href);
    if (href.includes('/business_feature_entitlements')) return ok([{ feature_key: 'ai_marketing', status: 'active' }]);
    if (href.includes('/business_incident_controls')) return ok([]);
    if (href.includes('/platform_incident_controls')) return ok([{ id: 'global' }]);
    if (href.includes('/business_memberships')) return ok([{ user_id: 'owner-grounding', role: 'owner' }]);
    if (href.includes('/business_settings')) return ok([{ business_name: facts.business_name, address: facts.address }]);
    if (href.includes('/business_configurations')) return ok([]);
    if (href.includes('/business_knowledge_items')) {
      assert.ok(href.includes('business_id=eq.business-grounding') && href.includes('status=eq.active'));
      return ok(facts.approved_uploaded_knowledge);
    }
    if (href.includes('/marketing_automation_settings')) return ok([{ enabled: true, mode: 'approval_required', tone: 'promotional', image_enabled: false }]);
    if (href.includes('/marketing_automation_media')) return ok([]);
    if (href.includes('/marketing_publications') && !options.method) return ok([]);
    if (href.includes('/rpc/reserve_marketing_generation')) return ok({ allowed: true, id: 'generation-grounding' });
    if (href.includes('/marketing_generations') && options.method === 'PATCH') return ok(null);
    if (href.includes('/business_audit_events') && options.method === 'POST') return ok(null);
    throw Error('Unexpected fixture request: ' + href);
  };
  return calls;
}

test('automated provider rejects contaminated style, photo and request evidence without retrying', async () => {
  const calls = mockRequests({ ...clean, main_copy: 'Our marketing saves you hours.' });
  await assert.rejects(generateMarketing({ ...input, prompt: 'Our marketing saves you hours.' }, facts, {
    automated: true, styleContext: [{ main_copy: 'Our marketing saves you hours.' }],
    visualContext: 'Our marketing saves you hours.'
  }), isGroundingError);
  const provider = calls.filter(call => call.href.includes('openrouter.ai'));
  assert.equal(provider.length, 1);
  assert.match(provider[0].body.messages[0].content, /AUTOMATED DRAFT FACTUALITY/);
  assert.deepEqual(JSON.parse(provider[0].body.messages[1].content)['AUTOMATION FACT SOURCES'], automationGroundingSources(facts));
});

test('rejected automation cannot persist completed output, approve or publish; failure and audit have an error code', async () => {
  const calls = mockRequests(observed);
  await assert.rejects(runMarketingAutomation({ businessId: 'business-grounding', force: true }), isGroundingError);
  assert.equal(calls.filter(call => call.href.includes('openrouter.ai')).length, 1);
  const writes = calls.filter(call => call.method !== 'GET');
  const failed = writes.find(call => call.href.includes('/marketing_generations') && call.body.status === 'failed');
  assert.ok(failed && failed.href.includes('business_id=eq.business-grounding'));
  assert.equal(writes.some(call => call.body?.status === 'completed' || call.body?.approval_status === 'approved'), false);
  assert.equal(writes.some(call => call.href.includes('/marketing_publications') || call.href.includes('/marketing_schedules')), false);
  const audit = writes.find(call => call.body?.action === 'marketing.automation_grounding_rejected');
  assert.equal(audit.body.resource_id, 'generation-grounding');
  assert.equal(audit.body.metadata.error_code, 'MARKETING_GROUNDING_REJECTED');
  assert.ok(!JSON.stringify(audit.body).includes('lose customers'));
  const state = writes.find(call => call.href.includes('/marketing_automation_settings') && call.body?.last_status === 'failed');
  assert.equal(state.body.last_error_code, 'MARKETING_GROUNDING_REJECTED');
});

test('supported automation saves exactly one unapproved draft with a success audit and no delivery writes', async () => {
  const calls = mockRequests(clean);
  const result = await runMarketingAutomation({ businessId: 'business-grounding', force: true });
  assert.equal(result.status, 'draft_created');
  assert.equal(result.approval_required, true);
  const completed = calls.filter(call => call.href.includes('/marketing_generations') && call.body?.status === 'completed');
  assert.equal(completed.length, 1);
  assert.deepEqual(completed[0].body.output, clean);
  assert.equal(completed[0].body.approval_status, 'draft');
  assert.equal(completed[0].body.approved_at, null);
  assert.equal(completed[0].body.approved_by, null);
  assert.equal(calls.filter(call => call.body?.action === 'marketing.automation_generated').length, 1);
  assert.equal(calls.some(call => call.method !== 'GET' && /marketing_publications|marketing_schedules/.test(call.href)), false);
});

test('sparse facts do not force automation to invent novelty to avoid a previous caption', async () => {
  mockRequests(clean);
  const result = await generateMarketing(input, facts, { automated: true, styleContext: [{ main_copy: clean.main_copy }] });
  assert.deepEqual(result.output, clean);
});
