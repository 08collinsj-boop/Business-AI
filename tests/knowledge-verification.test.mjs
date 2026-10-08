import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import verifiedKnowledgeHandler, { KNOWLEDGE_ACCURACY_CONFIRMATION_VERSION } from '../lib/knowledge-verified-handler.js';

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

test('knowledge approval rejects a missing buyer accuracy confirmation before auth or storage work', async () => {
  const res = response();
  await verifiedKnowledgeHandler({
    method: 'PATCH',
    body: { action: 'approve', source_id: '22222222-2222-4222-8222-222222222222', items: [] }
  }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /reviewed the knowledge/i);
});

test('knowledge approval rejects an old or unknown confirmation version', async () => {
  const res = response();
  await verifiedKnowledgeHandler({
    method: 'PATCH',
    body: {
      action: 'approve',
      source_id: '22222222-2222-4222-8222-222222222222',
      items: [],
      confirmation: true,
      confirmation_version: 'knowledge_accuracy_old'
    }
  }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(KNOWLEDGE_ACCURACY_CONFIRMATION_VERSION, 'knowledge_accuracy_v1');
});

test('owner UI loads the knowledge verification layer and submits the versioned confirmation', async () => {
  const [premium, client, operations] = await Promise.all([
    readFile(new URL('../assets/premium-ui.js', import.meta.url), 'utf8'),
    readFile(new URL('../assets/knowledge-verification.js', import.meta.url), 'utf8'),
    readFile(new URL('../api/operations.js', import.meta.url), 'utf8')
  ]);
  assert.match(premium, /knowledge-verification\.js/);
  assert.match(client, /Confirm knowledge accuracy/);
  assert.match(client, /to the best of my knowledge/);
  assert.match(client, /confirmation:true,confirmation_version:VERSION/);
  assert.match(client, /Review required/);
  assert.match(operations, /knowledge-verified-handler\.js/);
});


test('knowledge approval preserves the original request object when delegating auth', async () => {
  const source = await readFile(new URL('../lib/knowledge-verified-handler.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /knowledgeHandler\(\{\s*\.\.\.req/);
  assert.match(source, /const originalBody = req\.body/);
  assert.match(source, /req\.body = delegatedBody/);
  assert.match(source, /knowledgeHandler\(req, res\)/);
  assert.match(source, /finally[\s\S]*req\.body = originalBody/);
});
