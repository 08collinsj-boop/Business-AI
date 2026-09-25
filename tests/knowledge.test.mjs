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

const OWNER_BUSINESS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_BUSINESS = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SOURCE_A = '22222222-2222-4222-8222-222222222222';
const SOURCE_B = '33333333-3333-4333-8333-333333333333';

function knowledgeScenario({ role = 'owner', sources = [], items = [] } = {}) {
  const calls = [];
  process.env.TENANCY_AUTH_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-secret';
  globalThis.fetch = async (url, options = {}) => {
    const value = String(url);
    const method = options.method || 'GET';
    calls.push({ url: value, method, body: options.body });
    if (value.endsWith('/auth/v1/user')) return jsonResponse({ id: '11111111-1111-4111-8111-111111111111', email: 'owner@example.test' });
    if (value.includes('/rest/v1/business_memberships?')) return jsonResponse([{ business_id: OWNER_BUSINESS, role }]);
    if (value.includes('/storage/v1/object/upload/sign/business-knowledge/')) {
      return jsonResponse({ url: `/storage/v1/object/upload/sign/token?token=signed-token-${calls.length}` });
    }
    if (value.includes('/storage/v1/object/business-knowledge')) {
      if (method === 'DELETE') return jsonResponse({});
      throw new Error(`Unexpected storage fetch ${method} ${value}`);
    }
    if (value.includes('/rest/v1/business_audit_events')) return jsonResponse(null);
    if (value.includes('/rest/v1/business_knowledge_sources')) {
      if (method === 'GET') {
        const tenantMatch = value.match(/business_id=eq\.([0-9a-f-]+)/i);
        const tenantId = tenantMatch ? tenantMatch[1] : null;
        const scoped = (sources || []).filter(row => !tenantId || row.business_id === tenantId);
        const idMatch = value.match(/[?&]id=eq\.([0-9a-f-]+)/i);
        if (idMatch) return jsonResponse(scoped.filter(row => row.id === idMatch[1]));
        return jsonResponse(scoped);
      }
      if (method === 'POST') {
        const posted = JSON.parse(options.body);
        return jsonResponse([{ ...posted, created_at: '2026-09-25T10:00:00.000Z', updated_at: '2026-09-25T10:00:00.000Z' }], 201);
      }
      if (method === 'DELETE' || method === 'PATCH') return jsonResponse(null);
    }
    if (value.includes('/rest/v1/business_knowledge_items')) return jsonResponse(items);
    throw new Error(`Unexpected fetch ${method} ${value}`);
  };
  return calls;
}

test('handler rejects unsupported file types before any storage call', async () => {
  const calls = knowledgeScenario({ role: 'owner' });
  const response = await call(knowledgeHandler, {
    method: 'POST', headers: { authorization: 'Bearer user-token' },
    body: { action: 'create_upload', file_name: 'Menu.exe', mime_type: 'application/octet-stream', size_bytes: 5000 }
  });
  assert.equal(response.statusCode, 400);
  assert.ok(calls.every(entry => !entry.url.includes('business_knowledge_sources') || entry.url.includes('business_memberships')));
});

test('handler rejects oversized files before any storage call', async () => {
  const calls = knowledgeScenario({ role: 'owner' });
  const response = await call(knowledgeHandler, {
    method: 'POST', headers: { authorization: 'Bearer user-token' },
    body: { action: 'create_upload', file_name: 'Menu.pdf', mime_type: 'application/pdf', size_bytes: KNOWLEDGE_MAX_FILE_BYTES + 1 }
  });
  assert.equal(response.statusCode, 400);
  assert.ok(calls.every(entry => !entry.url.includes('/rest/v1/business_knowledge_sources')));
});

test('owner valid upload returns private signed upload and pending source', async () => {
  const calls = knowledgeScenario({ role: 'owner', sources: [] });
  const response = await call(knowledgeHandler, {
    method: 'POST', headers: { authorization: 'Bearer user-token' },
    body: { action: 'create_upload', file_name: 'Menu.pdf', mime_type: 'application/pdf', size_bytes: 5000 }
  });
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.source.status, 'pending_upload');
  assert.equal(response.body.source.file_name, 'Menu.pdf');
  assert.equal(response.body.bucket, 'business-knowledge');
  assert.ok(response.body.path.startsWith('source/'));
  assert.ok(typeof response.body.token === 'string' && response.body.token.length > 0);
  assert.doesNotMatch(JSON.stringify(response.body), /service-secret/);
});

test('duplicate filenames are allowed with unique storage paths', async () => {
  const calls = knowledgeScenario({ role: 'owner', sources: [] });
  const first = await call(knowledgeHandler, {
    method: 'POST', headers: { authorization: 'Bearer user-token' },
    body: { action: 'create_upload', file_name: 'Menu.pdf', mime_type: 'application/pdf', size_bytes: 5000 }
  });
  const second = await call(knowledgeHandler, {
    method: 'POST', headers: { authorization: 'Bearer user-token' },
    body: { action: 'create_upload', file_name: 'Menu.pdf', mime_type: 'application/pdf', size_bytes: 5000 }
  });
  assert.equal(first.statusCode, 201);
  assert.equal(second.statusCode, 201);
  assert.notEqual(first.body.source.id, second.body.source.id);
  assert.notEqual(first.body.path, second.body.path);
});

test('admin can manage uploads while member reads without managing', async () => {
  let calls = knowledgeScenario({ role: 'admin', sources: [] });
  let list = await call(knowledgeHandler, { method: 'GET', headers: { authorization: 'Bearer user-token' } });
  assert.equal(list.statusCode, 200);
  assert.equal(list.body.can_manage, true);
  const created = await call(knowledgeHandler, {
    method: 'POST', headers: { authorization: 'Bearer user-token' },
    body: { action: 'create_upload', file_name: 'Prices.csv', mime_type: 'text/csv', size_bytes: 200 }
  });
  assert.equal(created.statusCode, 201);

  calls = knowledgeScenario({ role: 'member', sources: [] });
  list = await call(knowledgeHandler, { method: 'GET', headers: { authorization: 'Bearer user-token' } });
  assert.equal(list.statusCode, 200);
  assert.equal(list.body.can_manage, false);
  calls.length = 0;
  const denied = await call(knowledgeHandler, {
    method: 'POST', headers: { authorization: 'Bearer user-token' },
    body: { action: 'create_upload', file_name: 'Prices.csv', mime_type: 'text/csv', size_bytes: 200 }
  });
  assert.equal(denied.statusCode, 403);
  assert.ok(calls.every(entry => !entry.url.includes('/rest/v1/business_knowledge_sources')));
});

test('cross-tenant knowledge reads return not found', async () => {
  const otherSource = {
    id: SOURCE_A, business_id: OTHER_BUSINESS, file_name: 'Secret.pdf',
    storage_path: 'source/other/Secret.pdf', mime_type: 'application/pdf',
    size_bytes: 100, status: 'active', created_at: '2026-09-25T10:00:00.000Z', updated_at: '2026-09-25T10:00:00.000Z'
  };
  knowledgeScenario({ role: 'owner', sources: [otherSource] });
  const response = await call(knowledgeHandler, {
    method: 'GET', headers: { authorization: 'Bearer user-token' }, query: { source_id: SOURCE_A }
  });
  assert.equal(response.statusCode, 404);
});

test('cross-tenant knowledge deletes return not found without touching storage', async () => {
  const otherSource = {
    id: SOURCE_A, business_id: OTHER_BUSINESS, file_name: 'Secret.pdf',
    storage_path: 'source/other/Secret.pdf', mime_type: 'application/pdf',
    size_bytes: 100, status: 'active', created_at: '2026-09-25T10:00:00.000Z', updated_at: '2026-09-25T10:00:00.000Z'
  };
  const calls = knowledgeScenario({ role: 'owner', sources: [otherSource] });
  const response = await call(knowledgeHandler, {
    method: 'POST', headers: { authorization: 'Bearer user-token' },
    body: { action: 'remove', source_id: SOURCE_A }
  });
  assert.equal(response.statusCode, 404);
  assert.ok(calls.every(entry => !(entry.url.includes('/storage/v1/object/business-knowledge') && entry.method === 'DELETE')));
});

test('owner deletion removes only their own storage object and metadata', async () => {
  const ownSource = {
    id: SOURCE_B, business_id: OWNER_BUSINESS, file_name: 'Menu.pdf',
    storage_path: 'source/mine/Menu.pdf', mime_type: 'application/pdf',
    size_bytes: 100, status: 'failed', created_at: '2026-09-25T10:00:00.000Z', updated_at: '2026-09-25T10:00:00.000Z'
  };
  const calls = knowledgeScenario({ role: 'owner', sources: [ownSource] });
  const response = await call(knowledgeHandler, {
    method: 'POST', headers: { authorization: 'Bearer user-token' },
    body: { action: 'remove', source_id: SOURCE_B }
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { removed: true });
  const storageDelete = calls.find(entry => entry.url.includes('/storage/v1/object/business-knowledge') && entry.method === 'DELETE');
  assert.ok(storageDelete);
  assert.match(String(storageDelete.body), /source\/mine\/Menu\.pdf/);
  const metadataDelete = calls.find(entry => entry.url.includes('/rest/v1/business_knowledge_sources') && entry.method === 'DELETE');
  assert.ok(metadataDelete);
  assert.ok(metadataDelete.url.includes(`business_id=eq.${OWNER_BUSINESS}`));
  assert.ok(metadataDelete.url.includes(`id=eq.${SOURCE_B}`));
});

test('deleting a missing knowledge file returns a safe not-found error', async () => {
  knowledgeScenario({ role: 'owner', sources: [] });
  const response = await call(knowledgeHandler, {
    method: 'POST', headers: { authorization: 'Bearer user-token' },
    body: { action: 'remove', source_id: SOURCE_A }
  });
  assert.equal(response.statusCode, 404);
  assert.equal(response.body.error, 'Knowledge source not found');
});

test('client-supplied business IDs cannot bypass tenancy on remove or finalize', async () => {
  const calls = knowledgeScenario({ role: 'owner', sources: [] });
  for (const action of ['remove', 'finalize']) {
    const response = await call(knowledgeHandler, {
      method: 'POST', headers: { authorization: 'Bearer user-token' },
      body: { action, source_id: SOURCE_A, business_id: OTHER_BUSINESS }
    });
    assert.equal(response.statusCode, 400);
  }
  assert.ok(calls.every(entry => !entry.url.includes('/rest/v1/business_knowledge_sources')));
});

test('empty knowledge library lists zero sources with an empty state', async () => {
  knowledgeScenario({ role: 'owner', sources: [], items: [] });
  const response = await call(knowledgeHandler, { method: 'GET', headers: { authorization: 'Bearer user-token' } });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.sources, []);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /No files uploaded yet/);
});

test('knowledge list rows expose file name, type, size, upload date and status', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /source\.file_name/);
  assert.match(html, /source\.mime_type/);
  assert.match(html, /knowledgeBytes\(source\.size_bytes\)/);
  assert.match(html, /timeLabel\(source\.created_at\)/);
  assert.match(html, /knowledgeStatusLabel\(source\.status\)/);
});
