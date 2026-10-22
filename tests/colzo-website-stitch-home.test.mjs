import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('site/index.html', 'utf8');
const css = readFileSync('assets/colzo-public-site.css', 'utf8');
const doc = new JSDOM(html).window.document;
const hero = doc.querySelector('#top');

test('homepage uses the specific small-business editorial headline instead of generic AI copy', () => {
  assert.equal(doc.querySelectorAll('h1').length, 1);
  assert.match(hero.querySelector('h1')?.textContent ?? '', /You're doing the work\.\s*Enquiries don't wait\./);
  assert.doesNotMatch(hero.textContent, /always available|unlock your potential|transform your business/i);
});
test('hero uses a real licensed workshop photograph, not a fictional AI product mockup', () => {
  assert.equal(hero.querySelector('.hero-photograph img')?.getAttribute('src'), '/site/media/workshop-pexels.jpg');
  assert.match(hero.querySelector('.hero-photograph img')?.getAttribute('alt') || '', /mechanic/i);
  assert.match(hero.querySelector('figcaption')?.textContent || '', /Artem Podrez/);
  assert.equal(hero.querySelector('.flow-window'), null);
  assert.doesNotMatch(hero.textContent, /12\s*\+3 today|Booking confirmed|Here are the available times/);
});
test('honest pre-pilot interest link is not a paid signup', () => {
  assert.equal(hero.querySelector('.hero-actions .button-primary')?.getAttribute('href'),
    '/pilot/');
  assert.match(hero.textContent, /pilot.*prepar/i);
  assert.ok(doc.querySelector('#pilot'));
});
test('feature rows are real product capabilities, not ornamental cards or invented data', () => {
  const rows = doc.querySelectorAll('#features .editorial-feature');
  assert.equal(rows.length, 4);
  assert.equal(doc.querySelectorAll('#features .feature-card').length, 0);
  assert.match(doc.querySelector('#features')?.textContent||'', /human handover/i);
  assert.match(doc.querySelector('#features')?.textContent||'', /booking requests/i);
});
test('existing support, app and legal routes remain accessible', () => {
  assert.ok(doc.querySelector('#how-to-use'));
  assert.ok(doc.querySelector('#pricing'));
  assert.ok(doc.querySelector('a[href="/legal/privacy.html"]'));
  assert.ok(doc.querySelector('a[href="/legal/terms.html"]'));
  assert.ok(doc.querySelector('a[data-colzo-app-link]'));
  const ids=new Set([...doc.querySelectorAll('[id]')].map(el=>el.id));
  for(const a of doc.querySelectorAll('a[href^="#"]')){
    if(a.getAttribute('href')==='#') continue;
    assert.ok(ids.has(a.getAttribute('href').slice(1)), 'missing target for '+a.getAttribute('href'));
  }
});
test('design is mobile-first and respects reduced motion', () => {
  assert.match(css, /\.colzo-public-site \.hero-photograph/);
  assert.match(css, /@media\s*\(max-width:\s*720px\)/);
  assert.match(css, /prefers-reduced-motion/);
});
