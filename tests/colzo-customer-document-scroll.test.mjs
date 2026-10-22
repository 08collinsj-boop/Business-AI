import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const customer=readFileSync(new URL('../assets/colzo-customer-stitch.css',import.meta.url),'utf8');
const legacy=readFileSync(new URL('../assets/mock-v3.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function cssBlock(selector) {
  const position=customer.lastIndexOf(selector+'{');
  assert.notEqual(position,-1,'Missing customer selector '+selector);
  return customer.slice(position+selector.length+1,customer.indexOf('}',position));
}

test('customer auth overrides fixed iPhone viewport with natural document scrolling',()=>{
  assert.match(legacy,/\.auth-screen\s*\{[^}]*position:fixed!important/s,'legacy rule being corrected');
  const root=cssBlock('body#colzoApp.customer-account.customer-auth-active');
  const auth=cssBlock('body#colzoApp.customer-account.customer-auth-active #authScreen.auth-screen');
  assert.match(root,/height:auto!important/);
  assert.match(root,/overflow-y:auto!important/);
  assert.match(auth,/position:relative!important/);
  assert.match(auth,/inset:auto!important/);
  assert.match(auth,/height:auto!important/);
  assert.match(auth,/max-height:none!important/);
  assert.match(auth,/overflow:visible!important/);
  assert.match(auth,/touch-action:pan-y!important/);
  assert.ok(html.indexOf('/assets/colzo-customer-stitch.css?v=')>html.indexOf('/assets/mock-v3.css?v='));
});

test('customer privacy and registration submit remain below confirm password in same normal-flow form',()=>{
  const start=html.indexOf('<form id="customerSignUpForm"');
  const end=html.indexOf('</form>',start);
  assert.ok(start>=0&&end>start);
  const signup=html.slice(start,end);
  for(const id of ['customerSignUpName','customerSignUpEmail','customerSignUpPassword','customerSignUpConfirm','customerPrivacyAcknowledgement','customerSignUpMessage'])assert.match(signup,new RegExp('id="'+id+'"'));
  assert.ok(signup.indexOf('id="customerPrivacyAcknowledgement"')>signup.indexOf('id="customerSignUpConfirm"'));
  assert.ok(signup.indexOf('type="submit">Create account')>signup.indexOf('id="customerPrivacyAcknowledgement"'));
  assert.match(html,/id="customerSignInForm"/);
  assert.match(html,/id="loginForm"/);
});

test('document-flow fix is limited to customer auth, not business login or authenticated portal',()=>{
  assert.doesNotMatch(customer,/body#colzoApp\.auth-required\s*#authScreen\.auth-screen\s*\{/);
  assert.doesNotMatch(customer,/body#colzoApp\.customer-account\.customer-portal-ready\s*#authScreen\.auth-screen\s*\{/);
});
