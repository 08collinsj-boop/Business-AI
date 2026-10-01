import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { observeOperation } from '../lib/operations-observability.js';

const root=new URL('../',import.meta.url);
const html=await readFile(new URL('index.html',root),'utf8');
const customer=await readFile(new URL('assets/customer-portal.js',root),'utf8');
const marketing=await readFile(new URL('assets/marketing.js',root),'utf8');
const loadSmoke=await readFile(new URL('scripts/load-smoke.mjs',root),'utf8');

test('dashboard receptionist status is driven by the public availability source of truth',()=>{
  assert.match(html,/id="dashboardAiStatus"/);
  assert.match(html,/loadOwnerReceptionistAvailability/);
  assert.match(html,/assistant_available===true/);
  assert.doesNotMatch(html,/<div class="ai-status">[\s\S]{0,80}AI receptionist online/);
});

test('public human fallback works when the AI input is unavailable',()=>{
  assert.match(html,/onclick="requestPublicHuman\(\);setPublicQuickActions\(false\)"/);
  assert.match(html,/publicBusinessPhoneNumber/);
  assert.match(html,/window\.location\.href='tel:'\+dial/);
});

test('completed and cancelled Actions expose their status visibly',()=>{
  assert.match(html,/const statusLabel=action\.status==='completed'\?'Completed':action\.status==='cancelled'\?'Cancelled':'Pending'/);
  assert.match(html,/\$\{esc\(statusLabel\)\}<\/span>/);
});

test('signed-in customer account waits for verification before revealing a surface',()=>{
  assert.match(html,/customerAccountFromLocation\(\)\)\{setAppLoading\(true\)/);
  assert.match(customer,/if\(!signedIn\)\{[\s\S]*setAppLoading==='function'\)setAppLoading\(false\)/);
  assert.match(customer,/await loadPortal\(\);[\s\S]*setCustomerSurface\(true\);/);
});

test('locked Marketing does not offer an Open button that loops back to the locked workspace',()=>{
  assert.match(marketing,/const canOpen=addon\.key!=='ai_marketing'\|\|addon\.entitlement==='active'\|\|addon\.trial_included/);
});

test('operations observability emits only bounded operational metadata for server failures',()=>{
  const original=console.error;const logs=[];console.error=value=>logs.push(String(value));
  try{
    const listeners={};const res={statusCode:503,once:(name,fn)=>{listeners[name]=fn;}};
    observeOperation({method:'POST',headers:{authorization:'secret-token'},query:{email:'private@example.com'}},res,'marketing');
    listeners.finish();
    assert.equal(logs.length,1);
    const event=JSON.parse(logs[0]);
    assert.deepEqual(Object.keys(event).sort(),['duration_ms','event','method','operation','slow','status'].sort());
    assert.equal(event.operation,'marketing');assert.equal(event.status,503);
    assert.doesNotMatch(logs[0],/secret-token|private@example\.com/);
  }finally{console.error=original;}
});

test('load smoke tool is bounded and read-only',()=>{
  assert.match(loadSmoke,/Math\.min\(200/);
  assert.match(loadSmoke,/Math\.min\(20/);
  assert.match(loadSmoke,/\/api\/health/);
  assert.doesNotMatch(loadSmoke,/method\s*:\s*['"](?:POST|PATCH|PUT|DELETE)/i);
});
