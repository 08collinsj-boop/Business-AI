import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import publicConfigHandler from '../lib/public-config-handler.js';

const keys = ['FRONTEND_AUTH_ENABLED','SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_PUBLISHABLE_KEY','PILOT_FREE_STARTER_MARKETING'];
function withEnvironment(values, fn) {
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    Object.assign(process.env, values);
    return fn();
  } finally {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
}
function fakeResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    setHeader(name,value) { this.headers[name] = value; return this; },
    json(body) { this.body = body; return this; }
  };
}
const baseConfig = { FRONTEND_AUTH_ENABLED: 'true', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'sb_publishable_fixture_only' };

test('public config shows free Pilot offer only with server flag enabled', () => withEnvironment({ ...baseConfig, PILOT_FREE_STARTER_MARKETING: 'true' }, () => {
  const res = fakeResponse();
  publicConfigHandler({},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.frontendAuthEnabled,true);
  assert.equal(res.body.pilotFreeAccess,true);
  assert.equal(res.headers['Cache-Control'],'no-store');
}));

test('public config keeps normal paid signup offer when flag is disabled', () => withEnvironment({ ...baseConfig, PILOT_FREE_STARTER_MARKETING: 'false' }, () => {
  const res = fakeResponse();
  publicConfigHandler({},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.pilotFreeAccess,false);
}));

test('public config stays inaccessible when frontend auth is off', () => withEnvironment({ PILOT_FREE_STARTER_MARKETING: 'true' }, () => {
  const res = fakeResponse();
  publicConfigHandler({},res);
  assert.equal(res.statusCode,404);
  assert.equal(res.body.error,'Not found');
}));

test('signup offer is hidden by default and only shown when flag is on', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="pilotFreeSignUpOffer"[^>]*hidden/);
  assert.match(html, /pilotOffer\.hidden=!pilotFree/);
  assert.match(html, /pilotOffer\.style\.display=pilotFree\?'':'none'/);
  assert.match(html, /const pilotFree=Boolean\(config\?\.pilotFreeAccess\)/);
});

test('Pilot-specific onboarding copy does not ask owners to buy a plan', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="onboardingPilotHint"/);
  assert.match(html, /if\(onboardingPilotHint&&pilotFree\)/);
  assert.match(html, /No plan, paid trial or checkout is required during testing/);
  assert.match(html, /classList\.contains\('pilot-free-access'\)\?'Setup complete\. Starter and AI Marketing are included free during the Pilot/);
  assert.match(html, /:'Setup complete\. Choose a plan or trial to start using AI enquiries\.'/);
});
