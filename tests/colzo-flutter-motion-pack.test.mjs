import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const owner=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const customer=readFileSync(new URL('../assets/customer-portal.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/colzo-flutter-motion.css',import.meta.url),'utf8');

test('Flutter-inspired motion layer is after approved customer and owner styles',()=>{
 const previous=html.indexOf('/assets/colzo-customer-stitch.css?v=');
 const pack=html.indexOf('/assets/colzo-flutter-motion.css?v=');
 assert.ok(previous>=0&&pack>previous);
 assert.ok(html.indexOf('/assets/colzo-motion.css?v=')<pack);
});
test('owner navigation uses distinct Fade Through and card-origin detail transition without scroll locks',()=>{
 assert.match(owner,/function rememberDetailSource\(element\)/);
 assert.match(owner,/const source=detailSourceRect;detailSourceRect=null/);
 assert.match(owner,/const detail=kind==='detail'/);
 assert.match(owner,/duration:detail\?300:215/);
 assert.match(owner,/Math\.max\(-36,Math\.min\(36/);
 assert.match(owner,/Math\.max\(-28,Math\.min\(28/);
 assert.match(owner,/if\(kind==='none'\|\|kind==='filter'\|\|!allowMotion\(\)/);
 assert.match(owner,/rememberDetailSource\(target\);const resource=target\.getAttribute\('data-colzo-detail'\)/);
 assert.match(owner,/render\(\{motion:screen==='lead'\?'detail':'page',direction\}\)/);
 assert.match(owner,/restoreScroll\(state\.scrollByScreen\.get\(screen\)\|\|0\)/);
});
test('customer portal uses directional Fade Through and retains original pane/nav switching',()=>{
 assert.match(customer,/const order=\['home','find','enquiries','account'\]/);
 assert.match(customer,/shell\.dataset\.customerDirection=order\.indexOf\(name\)<order\.indexOf\(previous\)\?'backward':'forward'/);
 assert.match(customer,/document\.querySelectorAll\('\[data-customer-pane\]'\)\.forEach\(p=>p\.hidden=p\.dataset\.customerPane!==name\)/);
 assert.match(customer,/aria-current','page'/); // keep accessible nav state
 assert.match(css,/cz-pack-customer-tab/);
 assert.match(css,/customer-portal-pane:not\(\[hidden\]\)/);
 assert.match(css,/data-customer-direction=backward/);
});
test('sheet and nav effects keep existing overlay focus, pointer and drag routes',()=>{
 assert.match(css,/#colzoOwner \.cn-work-dialog-backdrop>\.cn-work-dialog/);
 assert.match(css,/#colzoOwner \.cn-command-sheet:not\(\[hidden\]\) \.cn-command-panel/);
 assert.match(css,/cz-pack-sheet-in/);
 assert.doesNotMatch(css,/overflow:[ ]?hidden!important|touch-action:[ ]?none|height:[ ]?100dvh!important/);
});
test('system reduced-motion preference and quiet motion stop animations',()=>{
 assert.match(owner,/const allowMotion=\(\)=>!state\.quietMotion&&!window\.matchMedia\?\./);
 assert.match(owner,/motionPreference\?\.addEventListener\?\.\('change'/);
 assert.match(owner,/if\(event\.matches\)\{detailSourceRect=null;stopMotion\(\);\}/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
 assert.match(css,/animation:none!important/);
 assert.match(css,/transition:none!important/);
});
test('motion pack only changes presentation, not authentication, user input, credentials, APIs or billing',()=>{
 assert.doesNotMatch(css,/#authScreen|#sharedAuthShell|#customerSignUpForm|#customerSignInForm/);
 assert.doesNotMatch(css,/position:fixed|overflow-y:|scroll-behavior:smooth/);
 assert.doesNotMatch(css,/font-size:|display:none|height:[0-9]+/);
 assert.doesNotMatch(customer.slice(customer.indexOf('function showPortalTab('),customer.indexOf('function resetCustomerBusinessSearch(')),/client\.auth|signInWithPassword|supabase|portalApi|history\.pushState/);
 assert.match(html,/id="customerSignUpForm"/);
});
