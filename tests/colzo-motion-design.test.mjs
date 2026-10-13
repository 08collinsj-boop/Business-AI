import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('Colzo motion system is scoped, accessible, reduced-motion safe and visually integrated',async()=>{
 const [html,css,js]=await Promise.all(['index.html','assets/colzo-motion.css','assets/colzo-native.js'].map(read));
 assert.ok(html.indexOf('colzo-motion.css')>html.indexOf('colzo-security-choice.css'));
 assert.match(css,/#colzoOwner \.cn-nav::before/);
 assert.match(css,/--cn-active-index/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/body\.colzo-owner-enabled\.auth-ready\.colzo-legacy-mode #dashboardApp \.view\.active/);
 assert.doesNotMatch(css,/@import|@font-face|url\(https?:|animation-iteration-count\s*:\s*infinite/);
 assert.equal((html.match(/class="cn-navicon" aria-hidden="true"><svg/g)||[]).length,5);
 assert.match(html,/id="cnScreenAnnounce" class="cn-visually-hidden" role="status" aria-live="polite"/);
 assert.doesNotMatch(html,/id="cnContent"[^>]*aria-live="polite"/);
 assert.match(html,/aria-modal="true" aria-labelledby="cnCommandTitle"/);
 assert.match(js,/state\.scrollByScreen\.clear\(\)/);
 assert.match(js,/liveRegion\.textContent=''/);
 assert.match(js,/security-mfa-required/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(js,/DRAFT ESTIMATE — NOT ISSUED/);
 assert.doesNotMatch(js,/sessionStorage\.|localStorage\./);
});

test('Existing billing and team screens tolerate the relocated Colzo/Business AI navigation',async()=>{
 const js=await read('assets/final-showcase.js');
 assert.equal((js.match(/app\.insertBefore\(s,nav\.parentNode===app\?nav:null\)/g)||[]).length,2);
 assert.doesNotMatch(js,/app\.insertBefore\(s,nav\)/);
});
