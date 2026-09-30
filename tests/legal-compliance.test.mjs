import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const html = await read('index.html');
const handler = await read('lib/legal-handler.js');
const publicHandler = await read('lib/legal-public-handler.js');
const operatorScript = await read('legal/operator.js');
const enquiry = await read('api/enquiry.js');
const legalVersions = await read('lib/legal.js');
const migration = await read('supabase/migrations/20260927110000_add_legal_acceptances.sql');
const operations = await read('api/operations.js');
const vercel = await read('vercel.json');

test('UK legal pack is publicly linked and versioned', async () => {
  for (const path of ['legal/index.html','legal/terms.html','legal/privacy.html','legal/dpa.html','legal/acceptable-use.html','legal/storage.html','legal/subprocessors.html']) {
    const text = await read(path);
    if (path === 'legal/terms.html') {
      assert.match(text, /Version 1\.2/);
      assert.match(text, /30 September 2026/);
    } else {
      assert.match(text, /Version 1\.1/);
      assert.match(text, /27 September 2026/);
    }
    assert.match(text, /\/legal\/operator\.js/);
  }
  assert.match(html, /id="signUpLegalAccept"[^>]*required/);
  assert.match(html, /\/legal\/terms\.html/);
  assert.match(html, /\/legal\/privacy\.html/);
  assert.match(html, /\/legal\/acceptable-use\.html/);
  assert.match(html, /id="legalAcceptanceScreen"/);
  assert.match(html, /id="dpaAcceptanceScreen"/);
  assert.match(html, /public-link-privacy[\s\S]*\/legal\/privacy\.html#customer-enquiries/);
  assert.match(html, /Legal &amp; compliance/);
  assert.match(html, /Before paying, review the selected plan\/add-ons/);
});

test('legal acceptance is server-owned, versioned and tenant safe', () => {
  assert.match(legalVersions, /terms: '1\.2'/);
  assert.match(legalVersions, /privacy: '1\.1'/);
  assert.match(legalVersions, /acceptable_use: '1\.1'/);
  assert.match(legalVersions, /dpa: '1\.1'/);
  assert.match(handler, /requireAuthenticatedUser/);
  assert.match(handler, /requireBusinessMember\(req, \['owner'\]\)/);
  assert.match(handler, /legal\.dpa_accepted/);
  assert.doesNotMatch(handler, /body\.(?:business_id|user_id|document_version)/);
  assert.match(enquiry, /hasCurrentBusinessDpa/);
  assert.match(enquiry, /TENANCY_AUTH_ENABLED !== "true"/);
  assert.match(enquiry, /LEGAL_SETUP_REQUIRED/);
  assert.match(migration, /unique \(user_id, document_key, document_version\)/i);
  assert.match(migration, /unique \(business_id, document_key, document_version\)/i);
});

test('public legal identity supports sole-trader disclosure without implying incorporation', () => {
  assert.match(publicHandler, /LEGAL_OPERATOR_NAME/);
  assert.match(publicHandler, /LEGAL_TRADING_NAME/);
  assert.match(publicHandler, /LEGAL_OPERATOR_TYPE/);
  assert.match(publicHandler, /LEGAL_OPERATOR_ADDRESS/);
  assert.match(publicHandler, /LEGAL_CONTACT_EMAIL/);
  assert.match(publicHandler, /LEGAL_COMPANY_NUMBER/);
  assert.match(publicHandler, /LEGAL_VAT_NUMBER/);
  assert.match(publicHandler, /legal\.operator_name && legal\.trading_name && legal\.operator_address && legal\.contact_email/);
  assert.match(operatorScript, /Legal name/);
  assert.match(operatorScript, /Trading name/);
  assert.match(operatorScript, /Business structure/);
  assert.match(operatorScript, /Sole trader/);
  assert.match(operatorScript, /Company number/);
  assert.doesNotMatch(operatorScript, /Company\/register number/);
  assert.doesNotMatch(publicHandler, /SUPABASE_SERVICE_ROLE_KEY|META_APP_SECRET|STRIPE_SECRET_KEY|CLOUDFLARE_API_TOKEN/);
  assert.match(operations, /"legal-public": legalPublicHandler/);
  assert.match(vercel, /"source": "\/api\/legal-public"/);
});

test('privacy and storage wording reflects current Pilot processing', async () => {
  const privacy = await read('legal/privacy.html');
  const storage = await read('legal/storage.html');
  const subprocessors = await read('legal/subprocessors.html');
  assert.match(privacy, /Your right to object/);
  assert.match(privacy, /lawful basis/i);
  assert.match(storage, /sessionStorage/);
  assert.match(storage, /does not currently show a non-essential cookie-consent banner/);
  assert.match(subprocessors, /Cloudflare/);
  assert.match(subprocessors, /Workers AI image generation/);
});

test('terms state the Pilot refund and billing-error position clearly', async () => {
  const terms = await read('legal/terms.html');
  assert.match(terms, /Refunds and billing errors/);
  assert.match(terms, /duplicate charge/);
  assert.match(terms, /charges the wrong amount/);
  assert.match(terms, /materially unavailable/);
  assert.match(terms, /cannot lawfully be excluded/);
});
