import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  SIMULATED_RECORDS,
  createDemoState, reviewHandoff, approveHandoff,
  declineHandoff, setProviderScenario, resetDemo
} from '../demo/connected-workflow/model.js';

test('source records are unmistakably fictional and LeadConnector remains source of truth', () => {
  assert.equal(SIMULATED_RECORDS.enquiry.source, 'LeadConnector');
  assert.equal(SIMULATED_RECORDS.appointment.source, 'LeadConnector');
  assert.equal(SIMULATED_RECORDS.task.target, 'ClickUp');
  assert.match(SIMULATED_RECORDS.enquiry.contactEmail, /@example\.invalid$/);
  assert.equal(Object.isFrozen(SIMULATED_RECORDS.enquiry), true);
  assert.equal(Object.isFrozen(SIMULATED_RECORDS.task), true);
});

test('initial view shows the suggested action but creates no task or provider connection', () => {
  const s=createDemoState();
  assert.equal(s.phase, 'idle');
  assert.equal(s.providerScenario, 'available');
  assert.equal(s.simulatedTask, null);
  assert.equal(s.activity.length, 0);
});

test('review phase does not create task before a separate explicit approval', () => {
  const review=reviewHandoff(createDemoState());
  assert.equal(review.phase, 'review');
  assert.equal(review.simulatedTask, null);
  assert.equal(review.activity.length, 0);
});

test('explicit approval creates one clearly simulated task and is idempotent', () => {
  const approved=approveHandoff(reviewHandoff(createDemoState()));
  assert.equal(approved.phase, 'approved');
  assert.equal(approved.simulatedTask.target, 'ClickUp');
  assert.equal(approved.simulatedTask.simulatedOnly, true);
  assert.equal(approved.activity.length, 1);
  const again=approveHandoff(approved);
  assert.deepEqual(again.simulatedTask,approved.simulatedTask);
  assert.equal(again.activity.length,1);
});

test('approval without the review step cannot create a simulated task', () => {
  const s=approveHandoff(createDemoState());
  assert.equal(s.simulatedTask,null);
  assert.equal(s.phase,'idle');
  assert.equal(s.activity.length,0);
});

test('declining review prevents simulated task creation and is recoverable by reset', () => {
  const rejected=declineHandoff(reviewHandoff(createDemoState()));
  assert.equal(rejected.phase,'declined');
  assert.equal(rejected.simulatedTask,null);
  assert.equal(approveHandoff(rejected).simulatedTask,null);
  assert.equal(resetDemo().phase,'idle');
});

test('fictional provider-unavailable scenario blocks approval, then resets safely', () => {
  const blocked=setProviderScenario(createDemoState(),'unavailable');
  assert.equal(blocked.providerScenario,'unavailable');
  assert.equal(reviewHandoff(blocked).phase,'blocked');
  assert.equal(approveHandoff(reviewHandoff(blocked)).simulatedTask,null);
  const restored=setProviderScenario(blocked,'available');
  assert.equal(restored.phase,'idle');
  assert.equal(restored.simulatedTask,null);
});

test('review and approval leave fictional LeadConnector source records unchanged', () => {
  const before=JSON.stringify(SIMULATED_RECORDS);
  const state=approveHandoff(reviewHandoff(createDemoState()));
  assert.equal(JSON.stringify(SIMULATED_RECORDS),before);
  assert.equal(state.simulatedTask?.sourceEnquiryId,SIMULATED_RECORDS.enquiry.id);
});

test('standalone page prominently distinguishes the concept from live provider integrations', async () => {
  const html=await readFile(new URL('../demo/connected-workflow/index.html',import.meta.url),'utf8');
  assert.match(html,/Fictional (?:data|demonstration)/i);
  assert.match(html,/not connected/i);
  assert.match(html,/no external actions/i);
  assert.match(html,/LeadConnector/);
  assert.match(html,/ClickUp/);
  assert.doesNotMatch(html,/https?:\/\/(?:api|auth)\./i);
});

test('demo publication is restricted to the exact protected feature Preview branch', async () => {
  const source=await readFile(new URL('../scripts/build-colzo-react.mjs',import.meta.url),'utf8');
  assert.match(source,/feature\/colzo-fictional-cross-app-demo-20261117/);
  assert.match(source,/VERCEL_ENV === 'preview'/);
  assert.match(source,/demo\/connected-workflow/);
});
