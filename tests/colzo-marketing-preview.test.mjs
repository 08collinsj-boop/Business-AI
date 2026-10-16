import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const file=n=>path.join(root,n);
const read=n=>readFileSync(file(n),'utf8');

test('Colzo visual marketing preview is self-contained, indexed nowhere and independent of actual checkout',()=>{
 const html=read('colzo-preview.html');
 assert.match(html,/<title>Colzo \| Enquiries, organised<\/title>/);
 assert.match(html,/<meta name="robots" content="noindex, nofollow, noarchive"/);
 assert.match(html,/assets\/colzo-marketing-preview\.css/);
 assert.ok(existsSync(file('assets/colzo-marketing-preview.css')));
 assert.ok(existsSync(file('assets/icons/colzo-mark.svg')));
 assert.doesNotMatch(html,/https?:\/\/app\.getbusiness-ai\.com|href="\/api\/|<form\b|<script\b/);
 assert.doesNotMatch(html,/Booking confirmed|Follow up automatically|Priority support|24\/7 phone|WhatsApp connected/i);
});
test('visual-only preview distinguishes requests from confirmations and has no fake live controls',()=>{
 const html=read('colzo-preview.html');
 for(const text of ['Booking request','Draft quote','Human handover','Marketing drafts','Indicative prices','Not a checkout','Illustrative interface','Coming soon']){
  assert.ok(html.includes(text),text);
 }
 const hrefs=[...html.matchAll(/<a\s[^>]*href="([^"]+)"/g)].map(x=>x[1]);
 assert.ok(hrefs.length>=4);
 assert.ok(hrefs.every(h=>h.startsWith('#')),'all links must be on-page anchors');
 for(const href of hrefs)assert.ok(html.includes('id="'+href.slice(1)+'"'),href);
 assert.doesNotMatch(html,/href=""|href="#"|onclick=/);
});
test('preview CSS includes phone breakpoints, focus visibility, iOS safe-area and reduced-motion support',()=>{
 const css=read('assets/colzo-marketing-preview.css');
 assert.match(css,/@media\s*\(max-width:\s*720px\)/);
 assert.match(css, /prefers-reduced-motion:\s*reduce/);
 assert.match(css, /:focus-visible/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.doesNotMatch(css, /url\(\s*https?:/);
});
