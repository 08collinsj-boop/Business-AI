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


test('demo uses the actual Colzo native shell, sidebar and Work Hub styles rather than invented chrome', async () => {
  const html=await readFile(new URL('../demo/connected-workflow/index.html',import.meta.url),'utf8');
  assert.match(html, /id="colzoOwner" class="colzo-native"/);
  assert.match(html, /class="cn-header"/);
  assert.match(html, /class="cn-nav"/);
  assert.match(html, /class="cn-desktop-workspace-context"/);
  assert.match(html, /data-cn-screen="clickup" aria-current="page"/);
  assert.match(html, /id="cnContent" class="cn-content"/);
  assert.match(html, /\/assets\/icons\/colzo-mark\.svg/);
  for(const stylesheet of ['colzo-native.css','colzo-desktop-command-centre.css','colzo-connected-workspace.css'])
    assert.ok(html.includes('/assets/'+stylesheet), 'Reuse the actual '+stylesheet);
  assert.doesNotMatch(html, /class="sidebar"|class="brand-mark"/);
});

test('demo matches native Work Hub wording and does not pretend its navigation is a live signed-in workspace', async () => {
  const html=await readFile(new URL('../demo/connected-workflow/index.html',import.meta.url),'utf8');
  assert.match(html, /Work Hub/);
  assert.match(html, /Fictional demonstration/);
  assert.match(html, /No external actions/);
  assert.match(html, /concept preview/i);
  assert.match(html, /No live integrations/);
  assert.doesNotMatch(html, /verified connected provider|synced from your account/i);
});


test('actual authenticated Work Hub includes fictional-demo link only behind the feature-preview flag', async () => {
  const native=await readFile(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
  const start=native.indexOf('function renderWorkHubCatalog()');
  const end=native.indexOf('function myWorkScreen()',start);
  assert.ok(start>=0 && end>start);
  const catalog=native.slice(start,end);
  assert.match(catalog,/colzoFictionalDemoEnabled === true/);
  assert.match(catalog,/\/demo\/connected-workflow\//);
  assert.match(catalog,/fictional/i);
  assert.match(catalog,/not connected/i);
  assert.doesNotMatch(native.slice(native.indexOf('const WORK_HUB_PROVIDERS='),start),/LeadConnector/);
});

test('only the exact demonstration Preview build exposes the live-app entry point', async () => {
  const build=await readFile(new URL('../scripts/build-colzo-react.mjs',import.meta.url),'utf8');
  const start=build.indexOf("if (process.env.VERCEL_ENV === 'preview'\n      && process.env.VERCEL_GIT_COMMIT_REF === 'feature/colzo-fictional-cross-app-demo-20261117')");
  assert.ok(start>=0, 'Feature Preview gate must remain exact');
  const gated=build.slice(start,build.indexOf('\n  }',start));
  assert.match(gated,/colzoFictionalDemoEnabled/);
  assert.match(gated,/public\/index\.html/);
});


test('visual QA captures native fixed navigation in viewport rather than a stitched full-page image', async () => {
  const script=await readFile(new URL('../scripts/colzo-cross-app-demo-browser.cjs',import.meta.url),'utf8');
  const start=script.indexOf("path:dir+'/approved-'+width+'.png'");
  assert.ok(start>=0, 'Approved screenshot must be captured');
  const call=script.slice(start,start+125);
  assert.match(call,/fullPage:\s*false/, 'Fixed native Colzo nav must be captured in its viewport position');
});


test('visual evidence includes a top-of-page native Colzo overview before simulated clicks scroll it', async () => {
  const script=await readFile(new URL('../scripts/colzo-cross-app-demo-browser.cjs',import.meta.url),'utf8');
  const capture=script.indexOf("path:dir+'/native-shell-'+width+'.png'");
  const firstClick=script.indexOf("await page.locator('#reviewAction').click()");
  assert.ok(capture>=0, 'Native shell overview must have its own screenshot');
  assert.ok(capture<firstClick, 'Capture the native topbar and KPI cards before scrolling to approval');
  assert.match(script.slice(capture,capture+125),/fullPage:\s*false/);
});
