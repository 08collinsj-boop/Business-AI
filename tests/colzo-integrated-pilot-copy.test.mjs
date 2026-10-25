import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const text = path => new JSDOM(readFileSync(path,'utf8')).window.document.body.textContent;
test('integrated website preserves scoped pilot duration, seats and exclusions',()=>{
 const pilot=text('site/pilot/index.html');
 assert.match(pilot,/exactly 14 days from activation/i);
 assert.match(pilot,/two authorised users/i);
 assert.match(pilot,/no payment card/i);
 assert.match(pilot,/no automatic paid subscription or conversion/i);
 assert.match(pilot,/telephone answering and AI Marketing are not included/i);
 assert.doesNotMatch(pilot,/marketing drafts where enabled/i);
});
test('home and contact preserve approval-only pilot terms after website integration',()=>{
 for(const path of ['site/index.html','site/contact/index.html']){
  const body=text(path);
  assert.match(body,/no payment card/i,path);
  assert.match(body,/no automatic paid conversion|do not convert automatically|does not convert automatically/i,path);
  assert.match(body,/approval|approved/i,path);
 }
});
