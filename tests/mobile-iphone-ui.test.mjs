import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const [css, marketing] = await Promise.all([
  readFile(new URL('../assets/mock-v3.css', import.meta.url), 'utf8'),
  readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8')
]);

test('iPhone shell reserves safe areas and bottom navigation space', () => {
  assert.match(css, /Business AI iPhone release guard/);
  assert.match(css, /iPhone shell final geometry/);
  assert.match(css, /padding-top:calc\(env\(safe-area-inset-top\) \+ 7px\)!important/);
  assert.match(css, /position:relative!important;top:auto!important;min-height:54px!important;padding:5px 0 9px!important/);
  assert.match(css, /mock-trend\{position:absolute;right:12px;bottom:32px/);
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


test('five-tab iPhone bottom navigation centres each icon and label', () => {
  assert.match(css, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
  assert.match(css, /display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;text-align:center!important/);
  assert.match(css, /nav-btn>span:last-child\{[^}]*text-align:center!important/);
});


test('mobile Add Lead action stays compact and aligned with the Leads heading', () => {
  assert.match(css, /Mobile Leads header action/);
  assert.match(css, /#leadsView > \.screen-title\{[\s\S]*padding-right:116px!important/);
  assert.match(css, /#leadsView > \.mock-add-lead\{[\s\S]*height:40px!important/);
  assert.match(css, /#leadsView > \.mock-add-lead\{[\s\S]*min-width:104px!important/);
  assert.match(css, /@media \(max-width:380px\)\{[\s\S]*min-width:96px!important/);
});
