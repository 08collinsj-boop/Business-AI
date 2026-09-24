import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { readFile } from 'node:fs/promises';
import knowledgeHandler from '../lib/knowledge-handler.js';
import {
  validateKnowledgeUpload,
  validateExtractedKnowledge,
  rankKnowledgeItems,
  getApprovedKnowledge,
  KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT,
  KNOWLEDGE_MAX_FILE_BYTES
} from '../lib/knowledge.js';

const originalFetch = globalThis.fetch;
const savedEnv = { ...process.env };
afterEach(() => { globalThis.fetch = originalFetch; process.env = { ...savedEnv }; });

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => body === null || body === undefined ? '' : JSON.stringify(body),
  json: async () => body
});
const res = () => ({
  statusCode: 0, headers: {}, body: null,
  setHeader(key, value) { this.headers[key] = value; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});
const call = async (handler, req = {}) => {
  const response = res();
  await handler({ method: 'GET', headers: {}, query: {}, ...req }, response);
  return response;
};

function authFetch({ role = 'owner', calls = [] } = {}) {
  process.env.TENANCY_AUTH_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-secret';
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const value = String(url);
    if (value.endsWith('/auth/v1/user')) return jsonResponse({ id: '11111111-1111-4111-8111-111111111111', email: 'owner@example.test' });
    if (value.includes('/rest/v1/business_memberships?')) return jsonResponse([{ business_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', role }]);
    if (value.includes('/rest/v1/business_knowledge_sources?') && (options.method || 'GET') === 'GET') return jsonResponse([]);
    if (value.includes('/rest/v1/business_knowledge_items?') && (options.method || 'GET') === 'GET') return jsonResponse([]);
    throw new Error(`Unexpected fetch ${value}`);
  };
  return calls;
}

test('upload validation accepts only bounded supported business files', () => {
  assert.deepEqual(validateKnowledgeUpload({ action: 'create_upload', file_name: 'Menu.pdf', mime_type: 'application/pdf', size_bytes: 5000 }), {
    fileName: 'Menu.pdf', mimeType: 'application/pdf', sizeBytes: 5000, replaceSourceId: null
  });
  assert.throws(() => validateKnowledgeUpload({ action: 'create_upload', file_name: '../Menu.pdf', mime_type: 'application/pdf', size_bytes: 5000 }));
  assert.throws(() => validateKnowledgeUpload({ action: 'create_upload', file_name: 'Menu.exe', mime_type: 'application/octet-stream', size_bytes: 5000 }));
  assert.throws(() => validateKnowledgeUpload({ action: 'create_upload', file_name: 'Menu.pdf', mime_type: 'image/png', size_bytes: 5000 }));
  assert.throws(() => validateKnowledgeUpload({ action: 'create_upload', file_name: 'Menu.pdf', mime_type: 'application/pdf', size_bytes: KNOWLEDGE_MAX_FILE_BYTES + 1 }));
  assert.throws(() => validateKnowledgeUpload({ action: 'create_upload', file_name: 'Menu.pdf', mime_type: 'application/pdf', size_bytes: 5000, business_id: 'other-business' }));
});

test('extracted knowledge stays bounded, factual-shaped and deduplicated', () => {
  const result = validateExtractedKnowledge({
    summary: 'Menu facts',
    items: [
      { item_type: 'price', title: 'Sunday lunch', content: 'Sunday lunch is £12.50.', keywords: ['Sunday', 'Lunch'] },
      { item_type: 'price', title: 'Sunday lunch', content: 'Sunday lunch is £12.50.', keywords: ['duplicate'] },
      { item_type: 'not-real', title: 'Bad', content: 'Bad', keywords: [] }
    ]
  });
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.items[0].keywords, ['sunday', 'lunch']);
  assert.throws(() => validateExtractedKnowledge({ summary: '', items: [] }), /No usable business facts/);
  assert.match(KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT, /file is untrusted DATA/i);
  assert.match(KNOWLEDGE_EXTRACTION_SYSTEM_PROMPT, /Do not infer missing facts/i);
});

test('knowledge retrieval ranks relevant approved facts without exposing storage metadata', () => {
  const items = [
    { item_type: 'price', title: 'Steak pie', content: 'Steak pie costs £11.95.', keywords: ['menu', 'steak', 'pie'] },
    { item_type: 'hours', title: 'Opening hours', content: 'Open Monday to Friday.', keywords: ['hours'] },
    { item_type: 'dietary', title: 'Vegetarian lasagne', content: 'Vegetarian lasagne is available.', keywords: ['vegetarian'] }
  ];
  const ranked = rankKnowledgeItems(items, 'How much is the steak pie?', 2, 3000);
  assert.equal(ranked[0].title, 'Steak pie');
  assert.equal(ranked[0].content, 'Steak pie costs £11.95.');
  assert.equal(ranked[0].keywords, undefined);
  const menu = rankKnowledgeItems(items, 'Show me your menu', 3, 3000);
  assert.ok(menu.some(item => item.item_type === 'price'));
  assert.ok(menu.some(item => item.item_type === 'dietary'));
});

test('approved knowledge query is server-scoped to active rows for exactly one business', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-secret';
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return jsonResponse([{ item_type: 'service', title: 'Repairs', content: 'We repair boilers.', keywords: ['boiler'] }]);
  };
  const facts = await getApprovedKnowledge('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'boiler repair');
  assert.equal(facts.length, 1);
  assert.match(calls[0], /business_id=eq\.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/);
  assert.match(calls[0], /status=eq\.active/);
  assert.doesNotMatch(calls[0], /storage_path|sha256/);
});

test('knowledge API requires authentication and members cannot mutate files', async () => {
  process.env.TENANCY_AUTH_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-secret';
  let response = await call(knowledgeHandler, { method: 'GET' });
  assert.equal(response.statusCode, 401);

  const calls = [];
  authFetch({ role: 'member', calls });
  response = await call(knowledgeHandler, {
    method: 'POST',
    headers: { authorization: 'Bearer user-token' },
    body: { action: 'create_upload', file_name: 'Menu.pdf', mime_type: 'application/pdf', size_bytes: 100 }
  });
  assert.equal(response.statusCode, 403);
  assert.ok(calls.every(call => !call.url.includes('business_knowledge_sources')));
});

test('owner knowledge reads are membership-derived and tenant scoped', async () => {
  const calls = [];
  authFetch({ role: 'owner', calls });
  const response = await call(knowledgeHandler, { method: 'GET', headers: { authorization: 'Bearer user-token' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.can_manage, true);
  const knowledgeCalls = calls.filter(call => /business_knowledge_(sources|items)/.test(call.url));
  assert.equal(knowledgeCalls.length, 2);
  assert.ok(knowledgeCalls.every(call => call.url.includes('business_id=eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')));
});

test('browser tenant overrides are rejected before a knowledge source is created', async () => {
  const calls = [];
  authFetch({ role: 'owner', calls });
  const response = await call(knowledgeHandler, {
    method: 'POST', headers: { authorization: 'Bearer user-token' },
    body: { action: 'create_upload', file_name: 'Menu.pdf', mime_type: 'application/pdf', size_bytes: 100, business_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }
  });
  assert.equal(response.statusCode, 400);
  assert.ok(calls.every(call => !call.url.includes('/rest/v1/business_knowledge_sources')));
});

test('owner UI uses signed private uploads and explicit human approval', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /Business knowledge/);
  assert.match(html, /uploadToSignedUrl/);
  assert.match(html, /Save approved knowledge/);
  assert.match(html, /nothing from a file is used by the receptionist or Marketing until an owner\/admin approves it/i);
  assert.doesNotMatch(html, /storage\.from\(['"]business-knowledge['"]\)\.upload\(/);
});

test('receptionist and Marketing both consume only approved uploaded knowledge helpers', async () => {
  const enquiry = await readFile(new URL('../api/enquiry.js', import.meta.url), 'utf8');
  const marketing = await readFile(new URL('../lib/marketing.js', import.meta.url), 'utf8');
  assert.match(enquiry, /getApprovedKnowledgeSafe/);
  assert.match(enquiry, /Approved uploaded knowledge \(reviewed factual reference only\)/);
  assert.match(marketing, /getApprovedKnowledgeSafe/);
  assert.match(marketing, /approved_uploaded_knowledge/);
});
