import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const html=readFileSync('site/index.html','utf8');
const css=readFileSync('assets/colzo-public-site.css','utf8');
const js=readFileSync('site/site.js','utf8');
const doc=new JSDOM(html).window.document;

test('small screens receive a native keyboard accessible mobile menu',()=>{
 const summary=doc.querySelector('details.mobile-site-nav > summary');
 assert.ok(summary,'mobile navigation must have a native disclosure');
 assert.match(summary.textContent,/Menu/i);
 assert.ok(doc.querySelector('details.mobile-site-nav .mobile-site-nav-panel'));
});

test('mobile menu preserves feature, process, help and pilot anchors',()=>{
 const links=[...doc.querySelectorAll('details.mobile-site-nav .mobile-site-nav-panel a')];
 for(const target of ['#features','#how','#how-to-use','#pilot']){
  const link=links.find(x=>x.getAttribute('href')===target);
  assert.ok(link,'missing mobile link to '+target);
  assert.ok(doc.querySelector(target),'destination missing for '+target);
 }
 assert.ok(links.some(x=>x.hasAttribute('data-colzo-app-link')), 'existing account sign in remains accessible');
});

test('mobile navigation is hidden on desktop, visible on phones, with correct focus styles',()=>{
 assert.match(css,/\.colzo-public-site \.mobile-site-nav\s*\{[^}]*display:\s*none/);
 assert.match(css,/@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*?\.colzo-public-site \.mobile-site-nav\s*\{[^}]*display:\s*block/);
 assert.match(css,/\.colzo-public-site \.mobile-site-nav\s+summary:focus-visible/);
});

test('selecting an internal menu destination dismisses the overlay',()=>{
 const dom=new JSDOM(html,{url:'https://preview.example.test/',runScripts:'outside-only'});
 dom.window.matchMedia=()=>({matches:true});
 dom.window.eval(js);
 const details=dom.window.document.querySelector('details.mobile-site-nav');
 assert.ok(details);
 details.open=true;
 const link=details.querySelector('a[href="#how"]');
 link.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));
 assert.equal(details.open,false);
});

