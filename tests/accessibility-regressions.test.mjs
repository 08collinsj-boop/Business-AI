import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('dashboard secondary navigation uses native keyboard controls', () => {
  assert.doesNotMatch(html, /<span[^>]*onclick="showView\('(leads|bookings|actions)'\)/);
  assert.match(html, /class="card-head-action"[^>]*onclick="showView\('leads'\)"/);
  assert.match(html, /class="card-head-action"[^>]*onclick="showView\('bookings'\)"/);
  assert.match(html, /class="card-head-action"[^>]*onclick="showView\('actions'\)"/);
});

test('booking and action controls have programmatic labels', () => {
  for (const id of ['bookingTitle','bookingLead','bookingStatus','bookingStart','bookingEnd','bookingLocation','bookingNotes']) {
    assert.match(html, new RegExp(`<label for="${id}">`), id);
  }
  for (const id of ['actionTitle','actionType','actionLead','actionDue','actionPriority','actionDescription']) {
    assert.match(html, new RegExp(`<label for="${id}">`), id);
  }
  assert.match(html, /function wireAccessibleLabels\(\)/);
  assert.match(html, /new MutationObserver\(\(\)=>wireAccessibleLabels\(\)\)/);
});

test('public chat retains visible keyboard focus and AA placeholder contrast token', () => {
  assert.match(html, /public-chat-form input:focus-visible\{outline:2px solid #66b7ff/);
  assert.match(html, /public-directory-search input::placeholder\{color:#7a91aa\}/);
  assert.doesNotMatch(html, /public-directory-search input::placeholder\{color:#61758c\}/);
});

test('booking and action errors are live alerts associated with title controls', () => {
  assert.match(html, /id="bookingsStatus" role="alert" aria-live="assertive" aria-atomic="true"/);
  assert.match(html, /id="actionsStatus" role="alert" aria-live="assertive" aria-atomic="true"/);
  assert.match(html, /id="bookingTitle"[^>]*aria-describedby="bookingFormStatus"/);
  assert.match(html, /id="actionTitle"[^>]*aria-describedby="actionFormStatus"/);
  assert.match(html, /id="bookingFormStatus"[^>]*role="alert"/);
  assert.match(html, /bookingTitle'\)\?\.setAttribute\('aria-invalid','true'\)/);
  assert.match(html, /id="actionFormStatus"[^>]*role="alert"/);
  assert.match(html, /actionTitle'\)\?\.setAttribute\('aria-invalid','true'\)/);
});

test('work dialogs trap focus, close with Escape and restore focus', () => {
  assert.match(html, /function closeWorkDialog\(card,restoreFocus=true\)/);
  assert.match(html, /if\(event\.key==='Escape'\)/);
  assert.match(html, /event\.key!=='Tab'/);
  assert.match(html, /element\.inert=true/);
  assert.match(html, /trigger\?\.isConnected\)trigger\.focus\(\)/);
  assert.match(html, /aria-controls="bookingsFormCard" aria-expanded="false"/);
  assert.match(html, /aria-controls="actionsFormCard" aria-expanded="false"/);
});

test('collapsed public quick actions are removed from keyboard navigation', () => {
  assert.match(html, /id="publicQuickActionsBody"[^>]*aria-hidden="true" inert/);
  assert.match(html, /body\.inert=!expanded/);
});

test('owner navigation, lead filters and sort expose state and names', () => {
  assert.match(html, /data-view="dashboard" aria-current="page"/);
  assert.match(html, /setAttribute\('aria-current','page'\)/);
  assert.match(html, /data-filter="All"\s+aria-pressed="true"/);
  assert.match(html, /button\.setAttribute\('aria-pressed',active\?'true':'false'\)/);
  assert.match(html, /id="sort"\s+aria-label="Sort leads"/);
});

test('owner receptionist send button and marketing tabs are named and related', () => {
  assert.match(html, /<button type="submit" aria-label="Send message">\s*↑\s*<\/button>/);
  for (const [tab,pane] of [['marketingTabCreate','marketingCreatePane'],['marketingTabHistory','marketingHistoryPane'],['marketingTabSchedule','marketingSchedulePane']]) {
    assert.match(html, new RegExp(`id="${tab}"[^>]*aria-controls="${pane}"`));
    assert.match(html, new RegExp(`id="${pane}"[^>]*aria-labelledby="${tab}"`));
  }
});
