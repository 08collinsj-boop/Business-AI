import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = p => readFile(new URL('../'+p,import.meta.url),'utf8');
const screens = ['authScreen','legalAcceptanceScreen','dpaAcceptanceScreen','businessSetupScreen','configurationOnboardingScreen'];

test('Colzo Graphite & Volt auth theme is loaded after legacy premium CSS and scopes every account stage',async()=>{
  const [html,css] = await Promise.all([read('index.html'),read('assets/colzo-mfa-theme.css')]);
  assert.ok(html.indexOf('/assets/colzo-mfa-theme.css?v=') > html.indexOf('/assets/premium-v2.css'));
  assert.match(css,/--colzo-auth-bg:#0d1115/);
  assert.match(css,/--colzo-auth-volt:#c8ff2e/);
  for (const id of screens) {
    assert.match(html,new RegExp('id="'+id+'"'));
    assert.match(css,new RegExp('#'+id));
  }
  assert.match(css,/body\.colzo-interface/);
});

test('all account forms display Colzo marks instead of old Business AI art',async()=>{
  const [html,css] = await Promise.all([read('index.html'),read('assets/colzo-mfa-theme.css')]);
  for (const id of screens) assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(css,/content:url\(["']?\/assets\/icons\/colzo-mark\.svg/);
  assert.match(css,/\.auth-mark\.auth-mark-brand img/);
  assert.match(html,/id="passwordResetRequestForm"/);
  assert.match(html,/id="passwordRecoveryForm"/);
  assert.match(html,/id="signUpForm"/);
  assert.match(html,/id="loginForm"/);
  assert.match(html,/id="customerSignInForm"/);
  assert.match(html,/id="customerSignUpForm"/);
});

test('all auth controls are accessible Graphite & Volt without changing authentication actions',async()=>{
  const [html,css]=await Promise.all([read('index.html'),read('assets/colzo-mfa-theme.css')]);
  for(const s of ['.auth-main-action','.auth-role-switch','.auth-role-slider','.auth-field','.legal-consent-row','.wizard-step',':focus-visible',':disabled','prefers-reduced-motion','safe-area-inset-bottom'])assert.ok(css.includes(s),s);
  assert.match(css,/min-height:44px/);
  assert.match(css,/font-size:16px/);
  assert.match(css,/color:#141b0c/);
  assert.doesNotMatch(css,/@import|https?:\/\//);
  assert.match(html,/supabaseClient\.auth\.signInWithPassword/);
  assert.match(html,/resetPasswordForEmail/);
  assert.match(html,/supabaseClient\.auth\.signUp/);
});
