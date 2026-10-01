import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const html = await read('index.html');
const customer = await read('assets/customer-portal.js');
const legal = await read('lib/legal-handler.js');
const publicLegal = await read('lib/legal-public-handler.js');

test('DPA acceptance is server-blocked until provider identity is configured', () => {
  assert.match(legal, /providerIdentityConfigured\(\)/);
  assert.match(legal, /LEGAL_OPERATOR_ADDRESS_PUBLIC_CONFIRMED !== 'true'/);
  assert.match(legal, /provider_identity_configured: providerIdentityConfigured\(\)/);
  assert.match(legal, /if \(!providerIdentityConfigured\(\)\) \{[\s\S]*status\(409\)/);
  assert.match(html, /DPA acceptance is unavailable until Business AI provider identity is fully configured/);
  assert.match(html, /dpaButton\.disabled=!dpaReady/);
  assert.match(publicLegal, /LEGAL_OPERATOR_ADDRESS_PUBLIC_CONFIRMED === 'true'/);
  assert.match(publicLegal, /operator_address: publicAddressConfirmed \? safe\(process\.env\.LEGAL_OPERATOR_ADDRESS, 500\) : ''/);
  assert.match(publicLegal, /publicAddressConfirmed &&[\s\S]*legal\.operator_address/);
  assert.doesNotMatch(publicLegal, /SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|META_APP_SECRET/);
});

test('owner password reset uses a recovery marker and a one-minute request cooldown', () => {
  assert.match(html, /PASSWORD_RESET_REQUEST_COOLDOWN_MS=60000/);
  assert.match(html, /redirect\.searchParams\.set\('auth','recovery'\)/);
  assert.match(html, /rememberPasswordRecoveryRequest\(\)/);
  assert.match(html, /setTimeout\(\(\)=>\{button\.disabled=false;\},PASSWORD_RESET_REQUEST_COOLDOWN_MS\)/);
});

test('customer password reset lands in the shared recovery flow and avoids duplicate recover requests', () => {
  assert.match(customer, /redirect\.searchParams\.set\('auth','recovery'\)/);
  assert.match(customer, /rememberPasswordRecoveryRequest/);
  assert.match(customer, /resetPasswordForEmail\(email,\{redirectTo:redirect\.toString\(\)\}\)/);
  assert.match(customer, /setTimeout\(\(\)=>\{if\(button\)button\.disabled=false;\},60000\)/);
  assert.match(customer, /if\(button\?\.disabled\)return/);
});
