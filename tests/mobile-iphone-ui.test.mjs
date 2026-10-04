import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const [css, marketing] = await Promise.all([
  readFile(new URL('../assets/mock-v3.css', import.meta.url), 'utf8'),
  readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8')
]);

test('iPhone shell reserves safe areas and bottom navigation space', () => {
  assert.match(css, /Business AI iPhone release guard/);
  assert.match(css, /top:0!important/);
  assert.match(css, /min-height:calc\(54px \+ env\(safe-area-inset-top\)\)!important/);
  assert.match(css, /padding:calc\(env\(safe-area-inset-top\) \+ 5px\) 0 9px!important/);
  assert.match(css, /padding-top:var\(--iphone-header-gap\)!important/);
  assert.match(css, /mock-trend\{position:absolute;right:12px;bottom:20px/);
  assert.match(css, /--iphone-nav-reserve:132px/);
  assert.match(css, /padding-bottom:calc\(var\(--iphone-nav-reserve\) \+ env\(safe-area-inset-bottom\)\)!important/);
  assert.match(css, /height:100dvh!important/);
});

test('iPhone auth and Marketing controls avoid clipping and cramped grids', () => {
  assert.match(css, /auth-input input\{min-width:0!important;font-size:16px!important\}/);
  assert.match(css, /marketing-goal-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(css, /toast\{[\s\S]*safe-area-inset-top/);
});

test('trial-included Marketing access is not rendered as locked or purchasable', () => {
  assert.match(marketing, /const hasAccess = addon\.entitlement === 'active' \|\| addon\.trial_included/);
  assert.match(marketing, /Included in trial/);
  assert.match(marketing, /addon\.purchasable && addon\.entitlement !== 'active' && !addon\.trial_included/);
});
