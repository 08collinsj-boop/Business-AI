import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const marketing = await readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../assets/marketing.css', import.meta.url), 'utf8');

test('destructive actions are visually separated from primary actions', () => {
  assert.match(html, /\.small-btn\.danger/);
  assert.ok(html.includes('id="marketingDelete" class="small-btn danger"'));
  for (const snippet of ['updateBooking', 'updateAction', 'removeKnowledgeSource', 'revokeTeamInvitation']) {
    assert.ok(html.includes('small-btn danger') && html.includes(`onclick="${snippet}`), snippet);
  }
  assert.ok(marketing.includes('data-delete-marketing="${esc(item.id)}">Delete</button>'.replace('">Delete', '" class="small-btn danger" type="button" data-delete-marketing') ) || marketing.includes('small-btn danger" type="button" data-delete-marketing'));
  assert.ok(marketing.includes('small-btn danger" type="button" data-cancel-schedule'));
  assert.ok(marketing.includes('small-btn danger" type="button" data-pub-action="cancel"'));
  assert.ok(!marketing.includes('primary-action" type="button" data-delete-marketing'));
  assert.ok(!marketing.includes('primary-action" type="button" data-cancel-schedule'));
});

test('long user content wraps safely on narrow screens', () => {
  assert.match(html, /\.work-item h4,\.work-meta,\.lead-name,\.lead-meta,\.description/);
  assert.match(html, /overflow-wrap:anywhere/);
  assert.match(css, /marketing-preview/);
  assert.match(css, /overflow-wrap:anywhere/);
});

test('keyboard focus stays visible across the owner app', () => {
  assert.match(html, /button:focus-visible/);
  assert.match(html, /outline:2px solid #48a7ff/);
});

test('icon-only refresh control has an accessible name', () => {
  assert.match(html, /aria-label="Refresh leads"/);
});

test('dashboard loading states are concise', () => {
  assert.match(html, /Loading bookings…/);
  assert.match(html, /Loading actions…/);
  assert.doesNotMatch(html, /are loading when available/);
});

test('marketing history heading matches the tab terminology', () => {
  assert.match(html, /Drafts &amp; history/);
  assert.match(html, /marketingTabHistory/);
});

test('workspace tabs switch panes without generating', () => {
  const start = marketing.indexOf('function tab(name)');
  assert.ok(start !== -1);
  const close = marketing.indexOf("if(current==='schedule')loadSchedules();");
  assert.ok(close !== -1);
  const body = marketing.slice(start, marketing.indexOf('}', close) + 1);
  assert.match(body, /marketingCreatePane/);
  assert.match(body, /marketingHistoryPane/);
  assert.match(body, /marketingSchedulePane/);
  assert.doesNotMatch(body, /POST/);
  assert.doesNotMatch(body, /api\('/);
});

test('polished templates keep user content escaped', () => {
  for (const file of [html, marketing]) {
    assert.ok(file.includes('esc('), 'esc helper in use');
  }
  assert.ok(marketing.includes('esc(item.platform)'));
  assert.ok(marketing.includes('esc(previewText(preview))'));
  assert.doesNotMatch(marketing, />\$\{item\.id\}</);
});

test('key empty states still render', () => {
  for (const text of ['No leads captured yet.', 'No bookings yet.', 'No actions yet.', 'No files uploaded yet.', 'No marketing drafts yet', 'No scheduled posts yet']) {
    assert.ok(html.includes(text) || marketing.includes(text), text);
  }
});
