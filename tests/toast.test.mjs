import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('toast fully hides after its timer, including on iOS safe-area layouts', () => {
  assert.match(html, /\.toast\{[\s\S]*?opacity:0;[\s\S]*?visibility:hidden;[\s\S]*?pointer-events:none;/);
  assert.match(html, /\.toast\.show\{[\s\S]*?opacity:1;[\s\S]*?visibility:visible;/);
  assert.match(html, /\.toast\{top:max\(15px,calc\(env\(safe-area-inset-top\) \+ 10px\)\)\}/);
  assert.match(html, /max-width:calc\(100vw - 32px\)/);
  assert.match(html, /toast\.timer=setTimeout\(\(\)=>\{[\s\S]*?classList\.remove\('show'\)[\s\S]*?aria-hidden','true'/);
});

test('toast is announced politely while shown', () => {
  assert.match(html, /id="toast" class="toast" role="status" aria-live="polite" aria-atomic="true" aria-hidden="true"/);
  assert.match(html, /setAttribute\('aria-hidden','false'\)/);
});
