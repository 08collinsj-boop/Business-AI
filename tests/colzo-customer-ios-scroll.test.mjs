import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../assets/colzo-customer-stitch.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

function block(selector){
  const start=css.indexOf(selector+'{');
  assert.notEqual(start,-1,'missing CSS rule: '+selector);
  return css.slice(start+selector.length+1,css.indexOf('}',start));
}

test('iOS customer auth gets a dedicated viewport scroller without changing owner or portal scroll',()=>{
  const root=block('body#colzoApp.customer-account.customer-auth-active');
  const screen=block('body#colzoApp.customer-account.customer-auth-active #authScreen.auth-screen');
  assert.match(root,/height:100dvh!important/);
  assert.match(root,/padding-bottom:0!important/);
  assert.match(root,/overflow:hidden!important/);
  assert.match(screen,/height:100dvh!important/);
  assert.match(screen,/min-height:0!important/);
  assert.match(screen,/overflow-y:auto!important/);
  assert.match(screen,/-webkit-overflow-scrolling:touch/);
  assert.match(screen,/touch-action:pan-y/);
  assert.match(screen,/scroll-padding-bottom:calc\(32px \+ env\(safe-area-inset-bottom\)\)/);
  assert.doesNotMatch(css,/body#colzoApp\.customer-account\.customer-portal-ready\s+#authScreen\.auth-screen\{/);
  assert.ok(html.indexOf('/assets/colzo-customer-stitch.css?v=')>html.indexOf('/assets/colzo-mfa-theme.css?v='));
});

test('full customer sign-up and privacy controls remain inside the scrollable auth screen',()=>{
  const begin=html.indexOf('<main id="authScreen"');
  const end=html.indexOf('</main>',begin);
  const auth=html.slice(begin,end);
  for(const id of ['customerSignUpForm','customerSignUpName','customerSignUpEmail','customerSignUpPassword','customerSignUpConfirm','customerPrivacyAcknowledgement','customerSignUpMessage']){
    assert.match(auth,new RegExp('id="'+id+'"'));
  }
  assert.ok(auth.indexOf('id="customerPrivacyAcknowledgement"')>auth.indexOf('id="customerSignUpForm"'));
  assert.ok(auth.indexOf('type="submit">Create account')>auth.indexOf('id="customerPrivacyAcknowledgement"'));
});
