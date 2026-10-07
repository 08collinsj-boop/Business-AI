import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Marketing strategy UI uses the validated tenant planning backend', async () => {
  const js = await read('assets/marketing.js');
  assert.match(js, /action:'planning_save'/);
  assert.match(js, /buildWeekPlan/);
  assert.match(js, /automationState\?\.strategy/);
  assert.doesNotMatch(js, /\/api\/marketing-strategy/);
});

test('Marketing command centre exposes professional goal, planning and calendar controls', async () => {
  const html = await read('index.html');
  for (const id of ['marketingTabOverview','marketingTabCreate','marketingTabHistory','marketingTabSchedule','marketingPlanWeek','marketingSaveStrategy','marketingCalendar','marketingBrandTone','marketingBrandLength','marketingBrandEmojis','marketingBrandHashtags','marketingBrandSales','marketingBrandPerspective','marketingBrandLocal','marketingBrandAvoid']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /data-marketing-goal="more_enquiries"/);
  assert.match(html, /Marketing activity/);
});

test('Marketing command centre stylesheet has no known malformed declarations', async () => {
  const css = await read('assets/marketing.css');
  for (const bad of ['adisplay:', 'amargin-', '!mportant', '33width', '1fr=']) assert.equal(css.includes(bad), false, bad);
  assert.match(css, /@media\(max-width:900px\)[\s\S]*?\.marketing-overview-main\{grid-template-columns:1fr\}/);
  assert.match(css, /@media\(max-width:620px\)[\s\S]*?\.marketing-strategy-controls,\.marketing-brand-voice-grid\{grid-template-columns:1fr\}/);
});


test('Marketing automation exposes real frequency controls with a Vercel daily fallback', async () => {
  const [html, js, vercel] = await Promise.all([read('index.html'), read('assets/marketing.js'), read('vercel.json')]);
  assert.match(html, /id="marketingAutomationFrequency"/);
  assert.match(html, /1 post \/ day/);
  assert.match(html, /2 posts \/ day/);
  assert.match(html, /3 posts \/ day/);
  assert.match(js, /posts_per_day/);
  assert.equal(JSON.parse(vercel).crons.find(item => item.path === '/api/marketing-scheduler')?.schedule, '0 8 * * *');
});


test('Marketing Brand Voice is stored inside the tenant strategy and wired into generation', async () => {
  const [ui, marketing, automation, handler] = await Promise.all([
    read('assets/marketing.js'), read('lib/marketing.js'), read('lib/marketing-automation.js'), read('lib/marketing-handler.js')
  ]);
  assert.match(ui, /brand_voice/);
  assert.match(ui, /marketingBrandAvoid/);
  assert.match(marketing, /BRAND VOICE SETTINGS/);
  assert.match(marketing, /marketingBrandVoiceContext/);
  assert.match(automation, /brand_voice/);
  assert.match(automation, /brandVoice/);
  assert.match(handler, /brandVoice/);
});
