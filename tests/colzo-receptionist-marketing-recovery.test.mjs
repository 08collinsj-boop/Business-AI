import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const native=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const config=readFileSync(new URL('../api/business-configuration.js',import.meta.url),'utf8');
const marketing=readFileSync(new URL('../lib/marketing-handler.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/colzo-native.css',import.meta.url),'utf8');

test('receptionist loading uses authenticated existing configuration and handover endpoints',()=>{
  assert.match(native,/api\('\/api\/business-configuration'\)/);
  assert.match(native,/api\('\/api\/handovers'\)/);
  assert.match(native,/if\(screen==='receptionist'\)\{loadVoiceStatus\(\);loadReceptionConfig\(\);loadNativeHandovers\(\);\}/);
  assert.match(config,/can_manage: \['owner','admin'\]\.includes\(auth\.role\)/);
  assert.match(native,/state\.receptionCanManage=result\.can_manage===true/);
});
test('receptionist only saves the four approved configuration fields with a persistence confirmation',()=>{
  assert.match(native,/function captureReceptionDraft\(\)/);
  assert.match(native,/name="ai_handling_mode"/);
  assert.match(native,/name="customer_enquiry_instructions"/);
  assert.match(native,/name="handover_instructions"/);
  assert.match(native,/data-reception-question/);
  assert.match(native,/data-reception-answer/);
  assert.match(native,/api\('\/api\/business-configuration',\{method:'PATCH'/);
  assert.match(native,/result\.configuration\.ai_handling_mode!==next\.ai_handling_mode/);
  assert.match(native,/Changing handling mode never overrides safety routing or enables phone answering/);
  assert.doesNotMatch(native.slice(native.indexOf('async function saveReceptionConfig'),native.indexOf('async function updateNativeHandover')),/enabled_modules|voice_enabled|twilio|onboarding_step/);
});
test('handover update is explicitly confirmed and checks id and persisted status',()=>{
  assert.match(native,/Acknowledge this handover as received/);
  assert.match(native,/Mark this handover as resolved/);
  assert.match(native,/api\('\/api\/handovers',\{method:'PATCH'/);
  assert.match(native,/String\(result\?\.id\)!==String\(id\)\|\|result\?\.status!==status/);
  assert.match(native,/does not send a message to the customer/);
});
test('Marketing GET exposes owner-only approval capability while preserving original generations',()=>{
  assert.match(marketing,/can_approve: auth\.role === 'owner'/);
  assert.match(native,/state\.marketingCanApprove=result\.can_approve===true/);
  assert.match(native,/state\.marketingCanApprove\?drafts\.filter/);
});
test('Facebook marketing approval uses safe preview and matching hash, never directly schedules or publishes',()=>{
  const preview=native.slice(native.indexOf('async function prepareMarketingApproval'),native.indexOf('async function approveMarketingDraft'));
  const approve=native.slice(native.indexOf('async function approveMarketingDraft'),native.indexOf('function marketing(){'));
  assert.match(preview,/action:'preview',generation_id:draft\.id/);
  assert.match(preview,/caption_sha256/);
  assert.match(approve,/action:'approve',generation_id:draft\.id/);
  assert.match(approve,/body\.preview_sha256=preview\.caption_sha256/);
  assert.match(approve,/result\?\.generation\?\.approval_status!=='approved'/);
  assert.doesNotMatch(approve,/marketing-schedules|marketing-publications|action:'create'/);
  assert.match(native,/Review the exact saved draft before it may be scheduled/);
});
test('all new screens are owner-scoped and mobile accessible without changing customer authentication',()=>{
  assert.match(css,/#colzoOwner \.cn-reception-faq/);
  assert.match(css,/#colzoOwner \.cn-marketing-caption/);
  assert.match(native,/#cnReceptionForm\[data-cn-dirty="true"\]/);
  assert.match(native,/if\(!state\.receptionCanManage\|\|!state\.receptionConfig/);
  assert.doesNotMatch(css,/#authScreen|#customerPortalScreen|#customerSignUpForm/);
});
