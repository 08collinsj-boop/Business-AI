import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('site/index.html','utf8');
const doc = new JSDOM(html).window.document;
const hero = doc.querySelector('#concept-hybrid');

test('homepage is the approved Enterprise and Cinematic hybrid, not an older editorial page',()=>{
  assert.ok(hero);
  assert.equal(doc.querySelectorAll('h1').length,1);
  assert.match(doc.querySelector('h1')?.textContent||'',/Your business,\s*in flow\./);
  assert.ok(doc.querySelector('.hybrid-product'), 'approved product stage');
  assert.ok(doc.querySelector('.hybrid-floating'), 'approved floating cards');
  assert.match(html,/data:image\/webp;base64,/, 'original illustration is embedded');
});

test('approved homepage keeps honest pilot CTA, fictional dashboard and human review',()=>{
  assert.ok(doc.querySelector('a[href="/pilot/"]'));
  assert.match(doc.body.textContent,/fictional (workspace|data)/i);
  assert.match(doc.body.textContent,/no payment card/i);
  assert.match(doc.body.textContent,/does not convert automatically/i);
  assert.match(doc.body.textContent,/approval|approved/i);
  assert.doesNotMatch(doc.body.textContent,/telephone answering is now live/i);
});

test('former guides and all essential site and app routes remain accessible',()=>{
  assert.ok(existsSync('site/how-to-use/index.html'));
  assert.ok(doc.querySelector('a[href="/how-to-use/#how-to-use"]'));
  for (const path of ['/about/','/contact/','/resources/','/legal/privacy.html','/legal/terms.html']) assert.ok(doc.querySelector('a[href="'+path+'"]'),path);
  const appLinks=[...doc.querySelectorAll('[data-colzo-app-link]')];
  for(const path of ['/','/customer/account','/customer']) assert.ok(appLinks.some(a=>a.getAttribute('data-colzo-app-path')===path),path);
  const ids=new Set([...doc.querySelectorAll('[id]')].map(el=>el.id));
  for(const a of doc.querySelectorAll('a[href^="#"]')) {
    const target=a.getAttribute('href')?.slice(1);
    if(target) assert.ok(ids.has(target),'missing target #'+target);
  }
});

test('responsive experience retains accessible controls and reduced-motion styles',()=>{
  assert.ok(doc.querySelector('meta[name="viewport"]'));
  assert.match(html,/@media\(max-width:560px\)/);
  assert.match(html,/prefers-reduced-motion/);
  assert.match(html,/focus-visible/);
});

test('legacy public marketing links still reach the redesigned product and process sections',()=>{
  for (const id of ['features','how','pricing']) assert.ok(doc.getElementById(id), 'missing #'+id);
});
