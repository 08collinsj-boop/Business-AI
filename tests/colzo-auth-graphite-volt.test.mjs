import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const flows = [
  'authScreen', 'legalAcceptanceScreen', 'dpaAcceptanceScreen',
  'businessSetupScreen', 'configurationOnboardingScreen'
];
const formIds = [
  'loginForm', 'customerSignInForm', 'customerSignUpForm',
  'signUpForm', 'passwordResetRequestForm', 'passwordRecoveryForm'
];

test('all Colzo authentication and onboarding stages load one final Graphite & Volt stylesheet', async () => {
  const html = await read('index.html');
  const css = await read('assets/colzo-auth-graphite-volt.css');
  const styles = Array.from(html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g), m => m[0]);
  assert.match(html, /\/assets\/colzo-auth-graphite-volt\.css\?v=/);
  assert.match(styles.at(-1), /\/assets\/colzo-auth-graphite-volt\.css/);
  assert.match(css, /--colzo-auth-volt:\s*#c8ff2e/i);
  assert.match(css, /--colzo-auth-bg:\s*#0d1115/i);
  assert.match(css, /body\.colzo-interface/);
  for (const id of flows) {
    assert.match(html, new RegExp('id="' + id + '"'));
    assert.match(css, new RegExp('#' + id));
  }
  for (const id of formIds) assert.match(html, new RegExp('id="' + id + '"'));
});

test('auth and account-setup screens use Colzo icon, not old Business AI mascot', async () => {
  const html = await read('index.html');
  for (const id of flows) {
    const start = html.indexOf('<main id="' + id + '"');
    assert.notEqual(start, -1);
    const end = html.indexOf('</main>', start);
    assert.notEqual(end, -1);
    const region = html.slice(start, end);
    assert.doesNotMatch(region, /business-ai-mascot\.png/);
    assert.match(region, /colzo-mark\.svg/);
  }
});

test('authentication palette includes accessible controls without changing auth behaviour', async () => {
  const css = await read('assets/colzo-auth-graphite-volt.css');
  for (const selector of [
    '#authScreen', '.auth-main-action', '.auth-role-switch', '.auth-role-slider',
    '.auth-field', '.legal-consent-row', '.wizard-step',
    ':focus-visible', ':disabled', 'prefers-reduced-motion',
    'safe-area-inset-bottom'
  ]) assert.ok(css.includes(selector), selector);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /color:\s*#141b0c/);
  assert.doesNotMatch(css, /@import|https?:\/\/|\/api\//);
  assert.doesNotMatch(css, /visibility:\s*hidden\s*!important|pointer-events:\s*none\s*!important/);
  const auth = await read('index.html');
  assert.match(auth, /supabaseClient\.auth\.signInWithPassword/);
  assert.match(auth, /resetPasswordForEmail/);
  assert.match(auth, /supabaseClient\.auth\.signUp/);
});
