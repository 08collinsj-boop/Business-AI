import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const savedEnv = { ...process.env };
const savedFetch = globalThis.fetch;

function reply(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body), json: async () => body };
}
function res() {
  return {
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader() {}
  };
}

async function loadHandler() {
  process.env.TENANCY_AUTH_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    if (href.includes('/auth/v1/user')) return reply({ id: 'customer-user', email: 'customer@example.com' });
    if (href.includes('/rest/v1/customer_profiles')) return reply([{ user_id: 'customer-user', display_name: 'Alex Customer' }]);
    if (href.includes('/rest/v1/customer_enquiry_access')) return reply([
      { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', business_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', lead_id: 42, created_at: '2026-09-27T20:00:00Z' }
    ]);
    if (href.includes('/rest/v1/leads?')) return reply([
      { id: 42, business_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', job_type: 'Electrical repair', description: 'Socket repair enquiry', status: 'New', created_at: '2026-09-27T20:00:00Z' }
    ]);
    if (href.includes('/rest/v1/business_settings?')) return reply([
      { business_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', business_name: 'Collins LTD', business_type: 'Electrical services' }
    ]);
    if (href.includes('/rest/v1/business_public_routes?')) return reply([
      { business_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', route_value: 'collins-ltd' }
    ]);
    if (href.includes('/rest/v1/lead_handovers?')) return reply([
      { lead_id: 42, status: 'requires_attention', reason: 'human_first_mode' }
    ]);
    throw new Error('Unexpected request: ' + href);
  };
  const module = await import(new URL('../lib/customer-portal-handler.js?portal=' + Math.random(), import.meta.url));
  return module.default;
}

test('customer portal returns only customer-safe tracked enquiry data', { concurrency: false }, async () => {
  const handler = await loadHandler();
  const response = res();
  await handler({ method: 'GET', headers: { authorization: 'Bearer customer-token' } }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.customer, { email: 'customer@example.com', display_name: 'Alex Customer' });
  assert.equal(response.body.enquiries.length, 1);
  const enquiry = response.body.enquiries[0];
  assert.equal(enquiry.business.name, 'Collins LTD');
  assert.equal(enquiry.status, 'Awaiting business response');
  assert.equal(enquiry.status_key, 'awaiting_business');
  assert.equal(enquiry.business_path, '/customer?business=collins-ltd');
  assert.equal('business_id' in enquiry, false);
  assert.equal('lead_id' in enquiry, false);
  assert.equal('notes' in enquiry, false);
  assert.equal('email' in enquiry, false);
});

test('customer portal requires a verified server-side auth session', { concurrency: false }, async () => {
  process.env.TENANCY_AUTH_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  globalThis.fetch = async () => reply({}, 401);
  const module = await import(new URL('../lib/customer-portal-handler.js?auth=' + Math.random(), import.meta.url));
  const response = res();
  await module.default({ method: 'GET', headers: {} }, response);
  assert.equal(response.statusCode, 401);
});

test('public enquiry links tracking only from server-verified customer auth', async () => {
  const source = await readFile(new URL('../api/enquiry.js', import.meta.url), 'utf8');
  assert.match(source, /extractBearerToken/);
  assert.match(source, /requireAuthenticatedUser/);
  assert.match(source, /customer_enquiry_access\?on_conflict=customer_user_id,lead_id/);
  assert.match(source, /customerAccount\?\.email/);
  assert.match(source, /trackingAvailable/);
  assert.doesNotMatch(source, /body\.customer_user_id/);
});

test('customer portal UI is separate from business sign in and preserves guest access', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../assets/customer-portal.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../assets/customer-portal.css', import.meta.url), 'utf8');
  const vercel = await readFile(new URL('../vercel.json', import.meta.url), 'utf8');

  assert.match(html, /data-auth-role-switch/);
  assert.match(html, /data-auth-role-target="business"/);
  assert.match(html, /data-auth-role-target="customer"/);
  assert.match(html, /Continue as guest/);
  assert.match(html, /id="customerAuthScreen"/);
  assert.match(html, /id="customerPortalScreen"/);
  assert.match(html, /data-customer-tab="find"/);
  assert.match(html, /data-customer-tab="enquiries"/);
  assert.match(html, /id="publicCustomerAccountHint"/);
  assert.match(html, /customerPortalAuthHeaders/);
  assert.match(script, /Awaiting business response|customer-status/);
  assert.match(script, /\/api\/customer-portal/);
  assert.match(script, /\/api\/public-businesses/);
  assert.match(script, /const existingSignIn=await client\.auth\.signInWithPassword\(\{email,password\}\)/, 'existing Business AI credentials are reused for Customer access');
  assert.match(script, /same account works for Customer/);
  assert.match(css, /customer-portal-hero/);
  assert.match(css, /customer-enquiry-card/);
  assert.match(css, /auth-role-slider/);
  assert.match(css, /transition:transform \.22s/);
  assert.match(css, /customer-portal-ready/);
  assert.match(css, /\.customer-auth-shell\{[\s\S]{0,240}min-height:0;[\s\S]{0,240}align-items:flex-start;[\s\S]{0,120}justify-content:center;/, 'customer auth shares the same top-anchored composition as business auth');
  assert.match(css, /\.customer-auth-card\{[\s\S]{0,180}max-width:370px;[\s\S]{0,180}padding:0 4px 28px;/, 'customer auth matches the business auth content width and inset');
  assert.match(script, /bindAuthRoleSwitches/);
  assert.doesNotMatch(script, /window\.location\.assign\(link\.href\)/);
  assert.match(script, /history\.pushState\(\{authRole:'customer'\},'', '\/customer\/account'\)/);
  assert.match(script, /history\.pushState\(\{authRole:'business'\},'', '\/'\)/);
  assert.match(script, /showCustomerAuthSurface/);
  assert.match(script, /showBusinessAuthSurface/);
  assert.match(script, /setAppLoading==='function'\)setAppLoading\(false\)/);
  const businessLogin = html.match(/<form id="loginForm"[\s\S]*?<\/form>/)?.[0] || '';
  const customerLogin = html.match(/<main id="customerAuthScreen"[\s\S]*?<\/main>/)?.[0] || '';
  assert.match(businessLogin, /business-active/);
  assert.doesNotMatch(businessLogin, /Continue as guest/);
  assert.match(customerLogin, /customer-active/);
  assert.match(customerLogin, /Continue as guest/);
  assert.doesNotMatch(customerLogin, /customerAuthTabSignIn|customerAuthTabSignUp/);
  assert.match(customerLogin, /customer-auth-mascot/);
  assert.match(html, /id="customerPortalScreen" hidden inert aria-hidden="true"/);
  assert.match(css, /#customerPortalScreen\[hidden\][\s\S]{0,180}display:none!important/);
  assert.match(css, /customer-portal-ready/);
  assert.match(css, /position:fixed[\s\S]{0,260}customer-portal-nav|customer-portal-nav[\s\S]{0,260}position:fixed/);
  assert.match(script, /function setCustomerSurface\(portalReady\)/);
  assert.match(script, /portal\.inert=!portalReady/);
  assert.match(script, /setCustomerSurface\(false\);[\s\S]{0,500}await loadPortal\(\);[\s\S]{0,180}setCustomerSurface\(true\)/);
  assert.match(vercel, /"source": "\/customer\/account"/);
  assert.match(vercel, /"source": "\/api\/customer-portal"/);
});

test.after(() => {
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  globalThis.fetch = savedFetch;
});
