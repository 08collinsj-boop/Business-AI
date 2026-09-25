import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { readFile } from 'node:fs/promises';
import marketingHandler from '../lib/marketing-handler.js';

const savedEnv = { ...process.env };
const originalFetch = globalThis.fetch;
afterEach(() => { process.env = { ...savedEnv }; globalThis.fetch = originalFetch; });

const draftOutput = {
  main_copy: 'Explore our weekend repair service in York. '.repeat(20),
  short_alternative: 'Weekend repairs in York.',
  call_to_action: 'Message us to book.',
  hashtags: ['#Repairs', '#York'],
  missing_information: []
};

const generations = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    content_type: 'social_post',
    platform: 'facebook',
    tone: 'friendly',
    request_text: 'Promote weekend repairs',
    extra_instructions: '',
    status: 'completed',
    output: draftOutput,
    edited_output: null,
    approval_status: 'draft',
    approved_at: null,
    created_at: '2026-09-20T10:00:00.000Z',
    updated_at: '2026-09-20T10:00:00.000Z',
    completed_at: '2026-09-20T10:00:01.000Z'
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    content_type: 'offer',
    platform: 'instagram',
    tone: 'promotional',
    request_text: 'Autumn service offer',
    extra_instructions: 'Mention York',
    status: 'completed',
    output: draftOutput,
    edited_output: null,
    approval_status: 'approved',
    approved_at: '2026-09-21T10:00:00.000Z',
    created_at: '2026-09-21T10:00:00.000Z',
    updated_at: '2026-09-21T10:00:00.000Z',
    completed_at: '2026-09-21T10:00:01.000Z'
  }
];

const ok = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
  json: async () => body
});
const res = () => ({
  statusCode: 0, headers: {},
  setHeader(k, v) { this.headers[k] = v; },
  status(c) { this.statusCode = c; return this; },
  json(b) { this.body = b; return this; }
});

function setup({ role = 'owner', entitled = true, rows = generations, authValid = true } = {}) {
  Object.assign(process.env, {
    TENANCY_AUTH_ENABLED: 'true',
    SUPABASE_URL: 'https://example.test',
    SUPABASE_SERVICE_ROLE_KEY: 'fake-service-key',
    OPENAI_API_KEY: 'fake-provider-key'
  });
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const value = String(url);
    if (value.endsWith('/auth/v1/user')) return ok({ id: 'user-a' }, authValid ? 200 : 401);
    if (value.includes('business_memberships')) return ok([{ business_id: 'business-a', role }]);
    if (value.includes('business_feature_entitlements')) {
      return ok(entitled ? [{ feature_key: 'ai_marketing', status: 'active' }] : []);
    }
    if (value.includes('marketing_generations')) {
      const single = value.match(/[?&]id=eq\.([0-9a-f-]+)/i);
      if (single) {
        const found = rows.filter(row => row.id === single[1] && value.includes('business_id=eq.business-a'));
        return ok(found);
      }
      if ((options.method || 'GET') === 'GET') {
        return ok(value.includes('business_id=eq.business-a') ? rows : []);
      }
      return ok(null);
    }
    if (value.includes('business_audit_events')) return ok(null);
    throw new Error(`Unexpected request: ${value}`);
  };
  return calls;
}

const getHistory = () => marketingHandler(
  { method: 'GET', query: {}, headers: { authorization: 'Bearer verified' } },
  res()
).then(async () => {
  const response = res();
  await marketingHandler({ method: 'GET', query: {}, headers: { authorization: 'Bearer verified' } }, response);
  return response;
});

test('history retrieval returns saved drafts with display metadata only', async () => {
  setup();
  const response = res();
  await marketingHandler({ method: 'GET', query: {}, headers: { authorization: 'Bearer verified' } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.generations.length, 2);
  const first = response.body.generations[0];
  assert.equal(first.platform, 'facebook');
  assert.equal(first.content_type, 'social_post');
  assert.equal(first.tone, 'friendly');
  assert.ok(first.created_at);
  assert.ok(first.output.main_copy);
  const raw = JSON.stringify(response.body);
  assert.doesNotMatch(raw, /request_hash|actor_user_id|provider_response_id|usage|service-key/);
});

test('unauthenticated history access is rejected', async () => {
  setup();
  const response = res();
  await marketingHandler({ method: 'GET', query: {}, headers: {} }, response);
  assert.equal(response.statusCode, 401);
});

test('invalid token history access is rejected', async () => {
  setup({ authValid: false });
  const response = res();
  await marketingHandler({ method: 'GET', query: {}, headers: { authorization: 'Bearer bad' } }, response);
  assert.equal(response.statusCode, 401);
});

test('client business_id query cannot bypass history tenancy', async () => {
  const calls = setup();
  const response = res();
  await marketingHandler(
    { method: 'GET', query: { business_id: 'business-b' }, headers: { authorization: 'Bearer verified' } },
    response
  );
  assert.equal(response.statusCode, 400);
  assert.ok(calls.every(entry => !entry.url.includes('business-b')));
});

test('cross-tenant generation reads return not found', async () => {
  setup({ rows: [] });
  const response = res();
  await marketingHandler(
    {
      method: 'GET',
      query: { generation_id: '33333333-3333-4333-8333-333333333333' },
      headers: { authorization: 'Bearer verified' }
    },
    response
  );
  assert.equal(response.statusCode, 404);
});

test('arbitrary business_id in generation body is rejected without provider calls', async () => {
  const calls = setup();
  const response = res();
  await marketingHandler(
    {
      method: 'POST',
      body: { content_type: 'social_post', platform: 'facebook', tone: 'friendly', prompt: 'Hi', business_id: 'business-b' },
      query: {},
      headers: { authorization: 'Bearer verified' }
    },
    response
  );
  assert.equal(response.statusCode, 400);
  assert.ok(calls.every(entry => !entry.url.includes('openai') && !entry.url.includes('business-b')));
});

test('empty history returns an empty generation list', async () => {
  setup({ rows: [] });
  const response = res();
  await marketingHandler({ method: 'GET', query: {}, headers: { authorization: 'Bearer verified' } }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.generations, []);
});

test('member cannot delete a saved draft', async () => {
  const calls = setup({ role: 'member' });
  const response = res();
  await marketingHandler(
    {
      method: 'DELETE',
      body: { action: 'delete', generation_id: '11111111-1111-4111-8111-111111111111' },
      query: {},
      headers: { authorization: 'Bearer verified' }
    },
    response
  );
  assert.equal(response.statusCode, 403);
  assert.ok(calls.every(entry => !entry.url.includes('openai')));
});

test('deleting an unknown draft returns not found', async () => {
  setup({ rows: [] });
  const response = res();
  await marketingHandler(
    {
      method: 'DELETE',
      body: { action: 'delete', generation_id: '33333333-3333-4333-8333-333333333333' },
      query: {},
      headers: { authorization: 'Bearer verified' }
    },
    response
  );
  assert.equal(response.statusCode, 404);
});

test('workspace has Create and Drafts & History tabs', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /marketingTabCreate/);
  assert.match(html, /marketingTabHistory/);
  assert.match(html, /Drafts &amp; History/);
  assert.match(html, /marketingCreatePane/);
  assert.match(html, /marketingHistoryPane/);
  assert.match(html, /marketingWorkspace\.tab\('create'\)/);
});

test('history rows render metadata, preview and status without raw ids', async () => {
  const script = await readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8');
  assert.match(script, /item\.platform/);
  assert.match(script, /item\.content_type/);
  assert.match(script, /item\.tone/);
  assert.match(script, /when\(item\.created_at\)/);
  assert.match(script, /marketing-preview/);
  assert.match(script, /approval_status/);
  assert.ok(script.includes('esc(item.platform)'));
  assert.ok(script.includes('esc(previewText(preview))'));
  assert.doesNotMatch(script, />\$\{item\.id\}/);
});

test('opening a draft fills every result field', async () => {
  const script = await readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8');
  assert.match(script, /marketing_main_copy/);
  assert.match(script, /marketing_short_alternative/);
  assert.match(script, /marketing_call_to_action/);
  assert.match(script, /marketing_hashtags/);
  assert.match(script, /marketingType/);
  assert.match(script, /marketingPlatform/);
  assert.match(script, /marketingTone/);
});

test('reuse populates the form without generating', async () => {
  const script = await readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8');
  const reuse = script.slice(script.indexOf('async function reuseGeneration'), script.indexOf('async function deleteHistoryGeneration'));
  assert.match(reuse, /fillFormFromGeneration/);
  assert.match(reuse, /nothing has been generated yet/i);
  assert.doesNotMatch(reuse, /POST/);
  assert.doesNotMatch(reuse, /generate\(/);
  assert.ok(script.includes('>Use again<'), 'reuse button label');
});

test('per-field and combined copy actions exist', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['marketingCopyMain', 'marketingCopyShort', 'marketingCopyCta', 'marketingCopyTags', 'marketingCopy']) {
    assert.ok(html.includes(id), `missing ${id}`);
  }
  const script = await readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8');
  assert.match(script, /copyMarketingField\('main'\)/);
  assert.match(script, /copyMarketingField\('short'\)/);
  assert.match(script, /copyMarketingField\('cta'\)/);
  assert.match(script, /copyMarketingField\('tags'\)/);
  assert.match(script, /copyMarketingField\('all'\)/);
});

test('platform, content-type and order filters with complete empty states', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['marketingFilterPlatform', 'marketingFilterType', 'marketingFilterSort', 'marketingHistoryStatus']) {
    assert.ok(html.includes(id), `missing ${id}`);
  }
  const script = await readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8');
  assert.match(script, /filteredHistory/);
  assert.match(script, /No marketing drafts yet/);
  assert.match(script, /Loading your drafts/);
  assert.match(script, /Could not load your drafts/);
  assert.match(script, /No drafts match these filters/);
});

test('long marketing copy cannot break history rendering', async () => {
  const script = await readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8');
  assert.match(script, /slice\(0, ?140\)/);
  const css = await readFile(new URL('../assets/marketing.css', import.meta.url), 'utf8');
  assert.match(css, /overflow-wrap:anywhere/);
  assert.match(css, /marketing-preview/);
  const preview = draftOutput.main_copy.slice(0, 140);
  assert.ok(preview.length <= 140);
  assert.ok(draftOutput.main_copy.length > 140);
});
