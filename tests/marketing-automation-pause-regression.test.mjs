import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { runMarketingAutomation, saveMarketingAutomationSettings } from '../lib/marketing-automation.js';
import { createPublication, processPublication } from '../lib/marketing-publication.js';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const BUSINESS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const GENERATION = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PUBLICATION = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ACCOUNT = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const OWNER = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

function ok(body) {
  return { ok: true, status: 200, text: async () => JSON.stringify(body) };
}

function stubRequests(settings = { enabled: false, mode: 'approval_required' }) {
  Object.assign(process.env, {
    BILLING_ENABLED: 'false',
    SUPABASE_URL: 'https://pilot-safety.example.test',
    SUPABASE_SERVICE_ROLE_KEY: 'simulated-key'
  });
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    calls.push({ href, options });
    if (!href.startsWith('https://pilot-safety.example.test/rest/v1/')) {
      throw Error('Unexpected external call; test cannot publish or call providers: ' + href);
    }
    if (href.includes('/business_feature_entitlements')) return ok([{ feature_key: 'ai_marketing', status: 'active' }]);
    if (href.includes('/business_incident_controls')) return ok([]);
    if (href.includes('/platform_incident_controls')) return ok([{ id: 'global' }]);
    if (href.includes('/business_memberships')) return ok([{ user_id: OWNER, role: 'owner' }]);
    if (href.includes('/marketing_automation_settings')) {
      if (options.method === 'POST') return ok([{ ...settings, ...JSON.parse(options.body) }]);
      return ok([settings]);
    }
    if (href.includes('/marketing_generations')) return ok([{
      id: GENERATION, business_id: BUSINESS, approval_status: 'approved', status: 'completed',
      output: {
        main_copy: 'We offer an AI receptionist service and marketing services.',
        call_to_action: 'Contact us to find out more.',
        hashtags: []
      }
    }]);
    if (href.includes('/marketing_social_accounts')) return ok([{ id: ACCOUNT, platform: 'facebook', selected: true, status: 'selected' }]);
    if (href.includes('/marketing_images')) return ok([]);
    if (href.includes('/marketing_publications') && options.method === 'PATCH') return ok(null);
    if (href.includes('/business_audit_events')) return ok(null);
    throw Error('Unexpected safety test request: ' + href);
  };
  return calls;
}

test('stale enabled snapshot and force flag cannot override a disabled owner setting', async () => {
  const calls = stubRequests();
  const value = await runMarketingAutomation({
    businessId: BUSINESS,
    settings: { enabled: true, mode: 'fully_automated' },
    force: true
  });
  assert.deepEqual(value, { skipped: true, reason: 'disabled' });
  assert.equal(calls.filter(x => x.href.includes('/rpc/reserve_marketing_generation')).length, 0);
  assert.equal(calls.filter(x => x.href.includes('/marketing_publications')).length, 0);
});

test('disabling automation resets a previously automated mode to approval_required', async () => {
  const calls = stubRequests();
  const result = await saveMarketingAutomationSettings({
    businessId: BUSINESS, actorUserId: OWNER,
    input: { enabled: false, mode: 'fully_automated', tone: 'friendly', image_enabled: false, posts_per_day: 1 }
  });
  const write = calls.find(x => x.href.includes('/marketing_automation_settings?on_conflict') && x.options.method === 'POST');
  assert.ok(write, 'disabled settings must be persisted');
  assert.equal(JSON.parse(write.options.body).mode, 'approval_required');
  assert.equal(result.enabled, false);
  assert.equal(result.mode, 'approval_required');
});

test('automatic publication cannot be created while automation is disabled', async () => {
  const calls = stubRequests();
  await assert.rejects(
    createPublication({
      businessId: BUSINESS, actorUserId: OWNER, generationId: GENERATION,
      platform: 'facebook', requestId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', isAutomated: true
    }),
    error => error.code === 'AUTOPUBLISH_PAUSED'
  );
  assert.equal(calls.some(x => x.href.includes('/marketing_publications?on_conflict')), false);
});

test('already claimed automatic publication is held before the Facebook request when paused', async () => {
  const calls = stubRequests();
  const result = await processPublication({
    id: PUBLICATION, business_id: BUSINESS, generation_id: GENERATION,
    social_account_id: ACCOUNT, platform: 'facebook', is_automated: true
  }, OWNER);
  assert.equal(result.status, 'failed');
  assert.equal(result.failure_code, 'AUTOPUBLISH_PAUSED');
  assert.equal(calls.some(x => /graph\.facebook|facebook\.com|\/photos$|\/feed$/.test(x.href)), false);
  const update = calls.find(x => x.href.includes('/marketing_publications?') && x.options.method === 'PATCH');
  assert.ok(update);
  assert.equal(JSON.parse(update.options.body).failure_code, 'AUTOPUBLISH_PAUSED');
});
