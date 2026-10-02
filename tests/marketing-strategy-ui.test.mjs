import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Marketing strategy UI uses the dedicated tenant strategy API', async () => {
  const js = await read('assets/marketing.js');
  assert.match(js, /api\('\/api\/marketing-strategy'/);
  assert.match(js, /action:'plan_week'/);
  assert.match(js, /action:'link_generation'/);
  assert.match(js, /loadStrategy\(\)/);
  assert.doesNotMatch(js, /planning_save/);
});

test('Marketing command centre exposes professional goal, planning and calendar controls', async () => {
  const html = await read('index.html');
  for (const id of ['marketingTabOverview','marketingTabCreate','marketingTabHistory','marketingTabSchedule','marketingPlanWeek','marketingSaveStrategy','marketingCalendar']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /data-marketing-goal="more_enquiries"/);
  assert.match(html, /Marketing activity/);
});

test('Marketing command centre stylesheet has no known malformed declarations', async () => {
  const css = await read('assets/marketing.css');
  for (const bad of ['adisplay:', 'amargin-', '!mportant', '33width', '1fr=']) assert.equal(css.includes(bad), false, bad);
  assert.match(css, /@media\(max-width:900px\)[\s\S]*?\.marketing-overview-main\{grid-template-columns:1fr\}/);
  assert.match(css, /@media\(max-width:620px\)[\s\S]*?\.marketing-strategy-controls\{grid-template-columns:1fr\}/);
});
