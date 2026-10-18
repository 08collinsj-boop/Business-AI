import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html=readFileSync('index.html','utf8');
const native=readFileSync('assets/colzo-native.css','utf8');
const motion=readFileSync('assets/colzo-motion.css','utf8');
const stitch=readFileSync('assets/colzo-stitch-integration.css','utf8');
const document=new JSDOM(html).window.document;
const nav=document.querySelector('#colzoOwner .cn-nav');
const buttons=[...nav.querySelectorAll(':scope > button')];

test('bottom navigation presents exactly five primary routes including More',()=>{
 assert.deepEqual(buttons.map(b=>b.getAttribute('data-cn-screen')),['home','enquiries','bookings','clients','more']);
 assert.equal(buttons.length,5);
 assert.ok(buttons.every(b=>b.querySelector('.cn-navicon svg')),'each tab has its icon');
});
test('mobile base and approved mobile nav use five evenly sized grid tracks',()=>{
 assert.match(native,/#colzoOwner \.cn-nav\{[^}]*display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(native,/#colzoOwner \.cn-nav\{[^}]*repeat\(4,/);
 assert.match(native,/#colzoOwner \.cn-nav\{[^}]*width:min\(calc\(100% - 16px\),530px\);[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\);gap:0/);
});
test('mobile nav items cannot force overflow and remain reachable tappable targets',()=>{
 assert.match(native,/#colzoOwner \.cn-nav button\{[^}]*min-width:0;[^}]*overflow:hidden/);
 assert.match(stitch,/#colzoOwner \.cn-nav button\{[^}]*min-width:0/);
 assert.match(native,/#colzoOwner \.cn-nav button\{[^}]*min-height:59px/);
});
test('selection plate remains aligned to five tabs, including the More tab',()=>{
 assert.match(motion,/#colzoOwner \.cn-nav::before\{[^}]*width:calc\(\(100% - 2 \* var\(--cn-pill-padding\)\)\/5\)/);
 assert.match(motion,/translate3d\(calc\(var\(--cn-active-index\) \* 100%\),0,0\)/);
});
test('navigation remains centred above the iPhone safe area without a horizontal scroll row',()=>{
 assert.match(native,/#colzoOwner \.cn-nav\{[^}]*left:50%;bottom:max\(8px,env\(safe-area-inset-bottom\)\);[^}]*width:min\(calc\(100% - 16px\),530px\)/);
 assert.match(native,/#colzoOwner \.cn-nav\{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(native,/#colzoOwner \.cn-nav\{[^}]*overflow-x:scroll/);
});
test('desktop navigation remains vertical at widths 920px and above',()=>{
 assert.match(native,/@media\(min-width:920px\)\{[\s\S]*?#colzoOwner \.cn-nav\{[^}]*display:flex;flex-direction:column/);
 assert.match(stitch,/@media\(min-width:920px\)\{#colzoOwner \.cn-nav\{[^}]*display:flex;flex-direction:column/);
});

