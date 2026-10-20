import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../assets/colzo-customer-stitch.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

function rule(selector) {
  const at=css.lastIndexOf(selector+'{');
  assert.notEqual(at,-1,'Missing scoped customer action rule: '+selector);
  const end=css.indexOf('}',at);
  assert.ok(end>at);
  return css.slice(at+selector.length+1,end);
}

test('portal home action cards do not reserve an empty icon column',()=>{
  const parent='body#colzoApp.customer-account.customer-portal-ready .customer-home-actions .customer-quick-card';
  const layout=rule(parent);
  assert.match(css,/body#colzoApp \.customer-quick-card>i\{display:none!important\}/);
  assert.match(layout,/grid-template-columns:minmax\(0,1fr\) 24px!important/);
  assert.match(layout,/grid-template-rows:auto!important/);
  const copy=rule(parent+'>div');
  assert.match(copy,/grid-column:1/);
  assert.match(copy,/grid-row:1/);
  assert.match(copy,/min-width:0/);
  const chevron=rule(parent+'>b');
  assert.match(chevron,/grid-column:2/);
  assert.match(chevron,/grid-row:1/);
  assert.match(chevron,/place-items:center/);
  assert.ok(css.lastIndexOf(parent+'{')>css.indexOf('body#colzoApp .customer-quick-card{'));
});

test('both customer overview cards retain their intended actions and accessible labels',()=>{
  for(const [target,label] of [['find','Find a business'],['enquiries','My enquiries']]){
    const escaped=label.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&');
    assert.match(html,new RegExp('<button class="customer-quick-card[^"]*" type="button" data-customer-go="'+target+'"[\\s\\S]*?<strong>'+escaped+'<\\/strong>'));
  }
  assert.match(html,/id="customerPortalScreen"/);
  assert.match(html,/id="customerSignInForm"/);
  assert.match(html,/id="customerSignUpForm"/);
});

test('home action fix is gated to signed-in customer portal, not auth or business owner',()=>{
  assert.match(css,/body#colzoApp\.customer-account\.customer-portal-ready \.customer-home-actions \.customer-quick-card\{/);
  assert.doesNotMatch(css,/body#colzoApp\.customer-account\.customer-auth-active \.customer-home-actions \.customer-quick-card\{/);
  assert.match(css,/Customer auth document-flow scrolling/);
});
