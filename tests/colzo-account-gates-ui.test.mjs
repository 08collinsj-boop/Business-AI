import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/colzo-account-journey.css',import.meta.url),'utf8');
function bodyOf(id){
 const start=html.indexOf('id="'+id+'"');
 assert.ok(start>0,'missing '+id);
 return html.slice(start,start+2600);
}
test('password recovery includes an obvious request-fresh-link route without dropping password checks',()=>{
 assert.match(bodyOf('passwordRecoveryForm'),/id="passwordRecoveryRequestAgain"[^>]*type="button"/);
 assert.match(html,/passwordRecoveryRequestAgain'\)\.addEventListener\('click',async/);
 assert.match(html,/clearPasswordRecoveryLocation\(\)/);
 assert.match(html,/supabaseClient\.auth\.signOut\(\)/);
 assert.match(html,/id="recoveryPasswordConfirm"[^>]*required/);
});
test('legal and DPA gates retain their mandatory acceptance controls and original document destinations',()=>{
 for(const id of ['legalAcceptanceForm','dpaAcceptanceForm']){
  const section=bodyOf(id);
  assert.match(section,/\/assets\/icons\/colzo-mark\.svg/);
  assert.match(section,/type="checkbox" required/);
  assert.match(section,/class="legal-gate-links"/);
  assert.match(section,/class="auth-message" role="alert"/);
 }
 assert.match(html,/href="\/legal\/dpa.html"/);
 assert.match(html,/href="\/legal\/privacy.html"/);
});
test('Colzo legal gates and recovery match native graphite and volt design with accessible mobile safe areas',()=>{
 assert.match(css,/#legalAcceptanceScreen/);
 assert.match(css,/#dpaAcceptanceScreen/);
 assert.match(css,/#passwordRecoveryForm/);
 assert.match(css,/\.legal-gate-links a:focus-visible/);
 assert.match(css,/max-width:\s*520px/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/prefers-reduced-motion:\s*reduce/);
});
