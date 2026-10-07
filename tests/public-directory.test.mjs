import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const savedEnv = { ...process.env };
const savedFetch = globalThis.fetch;
const reply = (body, ok = true) => ({ ok, text: async () => JSON.stringify(body) });
const response = () => ({ statusCode: 0, body: null, headers: {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader(key, value) { this.headers[key] = value; } });

async function loadDirectory() {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only';
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    if (String(url).includes('business_public_routes')) return reply([
      { business_id: 'business-a', route_value: 'collins-ltd' },
      { business_id: 'business-b', route_value: 'harbour-cafe' }
    ]);
    if (String(url).includes('business_settings')) {
      assert.match(String(url), /directory_search_enabled=eq.true/);
      return reply([
        { business_id: 'business-a', business_name: 'Collins LTD', business_type: 'Electrical services', services: 'Electrical repairs and maintenance', directory_search_enabled: true },
        { business_id: 'business-b', business_name: 'Harbour Cafe', business_type: 'Cafe', services: 'Coffee and lunch', directory_search_enabled: true }
      ]);
    }
    if (String(url).includes('business_configurations')) return reply([
      { business_id: 'business-a', description: 'Local electrical services', service_areas: 'Hartlepool' },
      { business_id: 'business-b', description: 'Independent cafe', service_areas: 'Hartlepool Marina' }
    ]);
    return reply([], false);
  };
  const module = await import(new URL('../lib/public-businesses-handler.js?directory=' + Math.random(), import.meta.url));
  return { handler: module.default, calls };
}

test('public directory searches public business-facing fields without exposing tenant IDs', { concurrency: false }, async () => {
  const { handler, calls } = await loadDirectory();
  const res = response();
  await handler({ method: 'GET', query: { q: 'electrical', business_id: 'attacker-business' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.businesses.length, 1);
  assert.deepEqual(res.body.businesses[0], {
    slug: 'collins-ltd',
    name: 'Collins LTD',
    type: 'Electrical services',
    description: 'Local electrical services',
    services: 'Electrical repairs and maintenance',
    service_areas: 'Hartlepool',
    profile_image_url: '',
    message_path: '/customer?business=collins-ltd',
    profile_path: '/customer?business=collins-ltd&view=profile'
  });
  assert.equal('business_id' in res.body.businesses[0], false);
  assert.ok(calls.every(url => !url.includes('attacker-business')));
});

test('public directory returns active businesses alphabetically when no search is supplied', { concurrency: false }, async () => {
  const { handler } = await loadDirectory();
  const res = response();
  await handler({ method: 'GET', query: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.businesses.map(item => item.name), ['Collins LTD', 'Harbour Cafe']);
  assert.equal(res.headers['Cache-Control'], 'public, max-age=30, stale-while-revalidate=60');
});

test('customer portal keeps owner login separate and supports search then direct messaging', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const vercel = await readFile(new URL('../vercel.json', import.meta.url), 'utf8');
  assert.match(html, /id="publicDirectoryScreen"/);
  assert.match(html, /id="publicDirectorySearch"/);
  assert.match(html, /<h2>Find the right business<\/h2>/);
  assert.match(html, /data-customer-account-label>Customer sign in/);
  assert.match(html, /Continue as guest/);
  assert.match(html, /new URL\('\/api\/public-businesses'/);
  assert.match(html, /new URL\('\/customer'/);
  assert.match(html, /customerPortalFromLocation/);
  assert.match(html, /Find a business/);
  const config = JSON.parse(vercel);
  assert.ok(config.rewrites.some(route => route.source === "/customer" && route.destination === "/index.html"));
  assert.ok(config.rewrites.some(route => route.source === "/api/public-businesses" && route.destination === "/api/operations?operation=public-businesses"));
});

test.after(() => {
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  globalThis.fetch = savedFetch;
});


test('directory visibility is server-enforced while direct public routes stay independent', async () => {
  const directory = await readFile(new URL('../lib/public-businesses-handler.js', import.meta.url), 'utf8');
  const direct = await readFile(new URL('../lib/public-business-handler.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(directory, /directory_search_enabled=eq.true/);
  assert.doesNotMatch(direct, /directory_search_enabled/);
  assert.match(html, /id="s_directory_search_enabled"/);
  assert.match(html, /Show my business in customer search/);
  assert.match(html, /direct-link only/);
});
