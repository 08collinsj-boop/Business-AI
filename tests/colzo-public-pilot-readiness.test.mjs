import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const doc=new JSDOM(html).window.document;
test('public homepage does not present development access or deferred replies as pilot capabilities',()=>{
  assert.doesNotMatch(doc.body.textContent,/Development preview|existing development account|Track your enquiries and replies/i);
  assert.match(doc.querySelector('.pilot-access').textContent,/approval/i);
});
test('billing guide distinguishes existing accounts from the free pilot',()=>{
  const guide=[...doc.querySelectorAll('details')].find(el=>el.textContent.includes('Manage your subscription'));
  assert.ok(guide);
  assert.match(guide.textContent,/existing paid accounts/i);
  assert.match(guide.textContent,/no payment card|no automatic charges/i);
});
test('contact page retains human support and privacy routes alongside demo interest',()=>{
 const contact=readFileSync(new URL('../site/contact/index.html',import.meta.url),'utf8');
 assert.match(contact,/account help/i);
 assert.match(contact,/privacy questions/i);
 assert.match(contact,/pilot interest/i);
 assert.match(contact,/do not send passwords/i);
});
