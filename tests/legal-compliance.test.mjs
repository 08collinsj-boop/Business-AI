import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const html = await read('index.html');
const handler = await read('lib/legal-handler.js');
const migration = await read('supabase/migrations/20260927110000_add_legal_acceptances.sql');
const operations = await read('api/operations.js');
const vercel = await read('vercel.json');

test('UK legal pack is publicly linked and versioned', async () => {
  for (const path of ['legal/index.html','legal/terms.html','legal/privacy.html','legal/dpa.html','legal/acceptable-use.html','legal/storage.html','legal/subprocessors.html']) {
    const text = await read(path);
    assert.match(text, /Version 1\.0/);
    assert.match(text, /27 September 2026/);
  }
  assert.match(html, /id="signUpLegalAccept"[^>]*required/);
  assert.match(html, /\/legal\/terms\.html/);
  assert.match(html, /\/legal\/privacy\.html/);
  assert.match(html, /\/legal\/acceptable-use\.html/);
  assert.match(html, /id="legalAcceptanceScreen"/);
  assert.match(html, /id="dpaAcceptanceScreen"/);
  assert.match(html, /public-link-privacy[\s\S]*\/legal\/privacy\.html#customer-enquiries/);
  assert.match(html, /Legal &amp; compliance/);
});

test('legal acceptance is server-owned, versioned and tenant safe', () => {
  assert.match(handler, /LEGAL_VERSIONS = Object\.freeze/);
  assert.match(handler, /terms: '1\.0'/);
  assert.match(handler, /privacy: '1\.0'/);
  assert.match(handler, /acceptable_use: '1\.0'/);
  assert.match(handler, /dpa: '1\.0'/);
  assert.match(handler, /requireAuthenticatedUser/);
  assert.match(handler, /requireBusinessMember\(req, \['owner'\]\)/);
  assert.match(handler, /legal\.dpa_accepted/);
  assert.doesNotMatch(handler, /body\.(?:business_id|user_id|document_version)/);
  assert.match(migration, /unique \(user_id, document_key, document_version\)/i);
  assert.match(migration, /unique \(business_id, document_key, document_version\)/i);
  assert.match(migration, /revoke all on public\.user_legal_acceptances, public\.business_legal_acceptances from anon, authenticated/i);
});

test('legal API is routed through the existing operations dispatcher', () => {
  assert.match(operations, /legal: legalHandler/);
  assert.match(vercel, /"source": "\/api\/legal"/);
  assert.match(vercel, /operation=legal/);
});

test('storage notice matches the Pilot privacy posture', async () => {
  const storage = await read('legal/storage.html');
  assert.match(storage, /sessionStorage/);
  assert.match(storage, /Supabase Auth/);
  assert.match(storage, /does not intentionally configure advertising cookies or behavioural analytics trackers/);
});
