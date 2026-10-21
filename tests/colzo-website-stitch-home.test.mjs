import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('site/index.html', 'utf8');
const css = readFileSync('assets/colzo-public-site.css', 'utf8');
const doc = new JSDOM(html).window.document;
const hero = doc.querySelector('#top');

test('Work homepage concept headline appears in the single main heading', () => {
  assert.equal(doc.querySelectorAll('h1').length, 1);
  assert.match(hero.querySelector('h1').textContent, /Every enquiry\.\s*A clearer next step\./);
});
test('real Colzo icon and CSS-only illustrative enquiry journey replace fictional metrics', () => {
  assert.equal(hero.querySelector('.flow-window img')?.getAttribute('src'), '/assets/icons/colzo-mark.svg');
  assert.match(hero.querySelector('.flow-window')?.textContent ?? '', /Illustrative workflow/);
  assert.match(hero.querySelector('.flow-window')?.textContent ?? '', /Owner reviews/);
  assert.doesNotMatch(hero.textContent, /12\s*\+3 today|Booking confirmed|Here are the available times/);
});
test('pilot interest is a real no-payment contact path, not a public signup', () => {
  assert.match(hero.querySelector('.hero-actions .button-primary')?.getAttribute('href') ?? '', /^mailto:support@getbusiness-ai\.com\?subject=Colzo%20pilot%20interest$/);
  assert.match(hero.textContent, /pilot.*prepar/i);
  assert.equal(doc.querySelector('#pilot')?.tagName, 'SECTION');
});
test('hero description does not promise confirmed prices or confirmed appointments', () => {
  assert.doesNotMatch(hero.textContent, /appointments confirmed|always available|book appointments|24\/7/i);
  assert.match(hero.textContent, /booking requests/i);
});
test('site preserves help guides, legal pages and existing pilot login', () => {
  assert.ok(doc.querySelector('#how-to-use'));
  assert.ok(doc.querySelector('#pricing'));
  assert.ok(doc.querySelector('a[href="/legal/privacy.html"]'));
  assert.ok(doc.querySelector('a[href="/legal/terms.html"]'));
  assert.ok(doc.querySelector('a[data-colzo-app-link]'));
});
test('Stitch-inspired homepage styles provide mobile and reduced-motion paths', () => {
  assert.match(css, /\.colzo-public-site \.flow-window/);
  assert.match(css, /@media\s*\(max-width:\s*720px\)/);
  assert.match(css, /prefers-reduced-motion/);
});
