import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('Pilot Home has a six-step real-use progress checklist', () => {
  assert.match(html, /id="pilotProgressCard"/);
  assert.match(html, /aria-label="Pilot testing progress"/);
  for (const label of [
    'Complete Business Knowledge',
    'Test your AI Receptionist',
    'Review a lead or action',
    'Try a booking',
    'Try AI Marketing',
    'Give us feedback'
  ]) assert.ok(html.includes(label), label);
});

test('Pilot progress derives completion from real app state', () => {
  assert.match(html, /source\?\.status==='active'/);
  assert.match(html, /leads\.length>0\|\|Boolean\(local\.receptionist_tested_at\)/);
  assert.match(html, /\['Contacted','Converted'\]\.includes/);
  assert.match(html, /bookings\.length>0/);
  assert.match(html, /pilotMarketingDraftCount>0/);
  assert.match(html, /pilotFeedbackItems\.length>0/);
});

test('safe receptionist simulation records Pilot progress without creating customer data', () => {
  const marker = html.indexOf('markPilotReceptionistTested();');
  const safeCopy = html.indexOf('No lead, booking or handover was saved');
  assert.ok(marker !== -1);
  assert.ok(safeCopy > marker);
});

test('Pilot progress routes each unfinished step to the relevant app surface', () => {
  assert.match(html, /pilotProgressGo\('knowledge'\)|key==='knowledge'/);
  assert.match(html, /key==='receptionist'/);
  assert.match(html, /key==='lead_action'/);
  assert.match(html, /key==='booking'/);
  assert.match(html, /key==='marketing'/);
  assert.match(html, /key==='feedback'/);
  assert.match(html, /businessKnowledgeCard/);
  assert.match(html, /pilotFeedbackForm/);
});

test('Pilot progress stays readable on narrow mobile screens', () => {
  assert.match(html, /\.pilot-progress-step\{display:grid/);
  assert.match(html, /@media\(max-width:560px\)\{\.pilot-progress-step/);
  assert.match(html, /\.pilot-progress-step \.small-btn\{grid-column:2;width:100%/);
});
