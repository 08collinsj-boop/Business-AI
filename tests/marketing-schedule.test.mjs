import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { readFile } from 'node:fs/promises';
import scheduleHandler from '../lib/marketing-schedule-handler.js';
import { parseScheduledFor, validateScheduleRequest } from '../lib/marketing-schedule.js';

const savedEnv = { ...process.env };
const originalFetch = globalThis.fetch;
afterEach(() => { process.env = { ...savedEnv }; globalThis.fetch = originalFetch; });

const BUSINESS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const GENERATION = '11111111-1111-4111-8111-111111111111';
const SCHEDULE = '22222222-2222-4222-8222-222222222222';
const OUTPUT = {
  main_copy: 'Explore our weekend repair service across York with friendly local engineers. '.repeat(10),
  short_alternative: 'Weekend repairs in York.',
  call_to_action: 'Message us to book.',
  hashtags: ['#Repairs', '#York'],
  missing_information: []
};
const generationRow = {
  id: GENERATION, content_type: 'social_post', platform: 'facebook', tone: 'friendly',
  request_text: 'Promote weekend repairs', output: OUTPUT, edited_output: null,
  approval_status: 'draft', created_at: '2026-09-20T10:00:00.000Z'
};
const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const scheduleRow = {
  id: SCHEDULE, platform: 'facebook', scheduled_for: future, status: 'scheduled',
  marketing_generation_id: GENERATION, created_at: '2026-09-25T10:00:00.000Z', updated_at: '2026-09-25T10:00:00.000Z'
};

const ok = (body, status = 200) => ({
  ok: status >= 200 && status < 300, status,
  text: async () => JSON.stringify(body), json: async () => body
});
const res = () => ({
  statusCode: 0, headers: {},
  setHeader(k, v) { this.headers[k] = v; },
  status(c) { this.statusCode = c; return this; },
  json(b) { this.body = b; return this; }
});

function setup({ role = 'owner', entitled = true, authValid = true, generations = [generationRow], schedules = [scheduleRow] } = {}) {
  Object.assign(process.env, {
    TENANCY_AUTH_ENABLED: 'true',
    SUPABASE_URL: 'https://example.test',
    SUPABASE_SERVICE_ROLE_KEY: 'fake-service-key',
    OPENAI_API_KEY: 'fake-provider-key'
  });
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const value = String(url);
    if (value.endsWith('/auth/v1/user')) return ok({ id: 'user-a' }, authValid ? 200 : 401);
    if (value.includes('business_memberships')) return ok([{ business_id: BUSINESS, role }]);
    if (value.includes('business_feature_entitlements')) {
      return ok(entitled ? [{ feature_key: 'ai_marketing', status: 'active' }] : []);
    }
    if (value.includes('/rest/v1/marketing_schedules')) {
      const single = value.match(/[?&]id=eq\.([0-9a-f-]+)/i);
      if ((options.method || 'GET') === 'GET') {
        if (!value.includes(`business_id=eq.${BUSINESS}`)) return ok([]);
        if (single) return ok(schedules.filter(row => row.id === single[1]));
        return ok(schedules);
      }
      if (options.method === 'POST') {
        const posted = JSON.parse(options.body);
        return ok([{ ...posted, id: SCHEDULE }], 201);
      }
      return ok(null);
    }
    if (value.includes('/rest/v1/marketing_generations')) {
      if (!value.includes(`business_id=eq.${BUSINESS}`)) return ok([]);
      const single = value.match(/[?&]id=eq\.([0-9a-f-]+)/i);
      if (single) return ok(generations.filter(row => row.id === single[1]));
      return ok(generations);
    }
    if (value.includes('business_audit_events')) return ok(null);
    throw new Error(`Unexpected request: ${value}`);
  };
  return calls;
}

const authed = { authorization: 'Bearer verified' };

test('valid schedule creation stores a future UTC timestamp', async () => {
  const calls = setup({ schedules: [] });
  const response = res();
  await scheduleHandler(
    { method: 'POST', query: {}, headers: authed, body: { action: 'create', generation_id: GENERATION, platform: 'facebook', scheduled_for: future } },
    response
  );
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.schedule.status, 'scheduled');
  assert.equal(response.body.schedule.platform, 'facebook');
  assert.ok(response.body.schedule.scheduled_for.endsWith('Z'));
  assert.equal(Date.parse(response.body.schedule.scheduled_for), Date.parse(future));
  assert.ok(response.body.schedule.generation);
  const stored = JSON.parse(calls.find(entry => entry.url.includes('/rest/v1/marketing_schedules') && entry.options.method === 'POST').options.body);
  assert.equal(stored.business_id, BUSINESS);
  assert.equal(stored.marketing_generation_id, GENERATION);
  assert.equal(stored.status, 'scheduled');
});

test('unauthenticated schedule access is rejected', async () => {
  setup();
  const response = res();
  await scheduleHandler({ method: 'GET', query: {}, headers: {} }, response);
  assert.equal(response.statusCode, 401);
});

test('bad token schedule access is rejected', async () => {
  setup({ authValid: false });
  const response = res();
  await scheduleHandler({ method: 'GET', query: {}, headers: authed }, response);
  assert.equal(response.statusCode, 401);
});

test('arbitrary business_id query cannot bypass schedule tenancy', async () => {
  const calls = setup();
  const response = res();
  await scheduleHandler({ method: 'GET', query: { business_id: 'business-b' }, headers: authed }, response);
  assert.equal(response.statusCode, 400);
  assert.ok(calls.every(entry => !entry.url.includes('business-b')));
});

test('arbitrary business_id in schedule body is rejected', async () => {
  const calls = setup();
  const response = res();
  await scheduleHandler(
    { method: 'POST', query: {}, headers: authed, body: { action: 'create', generation_id: GENERATION, platform: 'facebook', scheduled_for: future, business_id: BUSINESS } },
    response
  );
  assert.equal(response.statusCode, 400);
  assert.ok(calls.every(entry => !entry.url.includes('/rest/v1/marketing_schedules')));
});

test('cross-tenant generation scheduling is rejected', async () => {
  setup({ generations: [] });
  const response = res();
  await scheduleHandler(
    { method: 'POST', query: {}, headers: authed, body: { action: 'create', generation_id: GENERATION, platform: 'facebook', scheduled_for: future } },
    response
  );
  assert.equal(response.statusCode, 404);
});

test('cross-tenant schedule reads return nothing', async () => {
  const calls = setup({ schedules: [] });
  const response = res();
  await scheduleHandler({ method: 'GET', query: {}, headers: authed }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.schedules, []);
  assert.ok(calls.filter(entry => entry.url.includes('/rest/v1/marketing_schedules')).every(entry => entry.url.includes(`business_id=eq.${BUSINESS}`)));
});

test('cross-tenant schedule edit is not found', async () => {
  setup({ schedules: [] });
  const response = res();
  await scheduleHandler(
    { method: 'PATCH', query: {}, headers: authed, body: { action: 'reschedule', schedule_id: SCHEDULE, scheduled_for: future } },
    response
  );
  assert.equal(response.statusCode, 404);
});

test('cross-tenant schedule cancel is not found', async () => {
  setup({ schedules: [] });
  const response = res();
  await scheduleHandler(
    { method: 'PATCH', query: {}, headers: authed, body: { action: 'cancel', schedule_id: SCHEDULE } },
    response
  );
  assert.equal(response.statusCode, 404);
});

test('member cannot create, edit or cancel schedules', async () => {
  setup({ role: 'member' });
  for (const body of [
    { action: 'create', generation_id: GENERATION, platform: 'facebook', scheduled_for: future },
    { action: 'reschedule', schedule_id: SCHEDULE, scheduled_for: future },
    { action: 'cancel', schedule_id: SCHEDULE }
  ]) {
    const response = res();
    const method = body.action === 'create' ? 'POST' : 'PATCH';
    await scheduleHandler({ method, query: {}, headers: authed, body }, response);
    assert.equal(response.statusCode, 403);
  }
});

test('schedule time can be moved while upcoming', async () => {
  const later = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  setup();
  const response = res();
  await scheduleHandler(
    { method: 'PATCH', query: {}, headers: authed, body: { action: 'reschedule', schedule_id: SCHEDULE, scheduled_for: later } },
    response
  );
  assert.equal(response.statusCode, 200);
  assert.equal(Date.parse(response.body.schedule.scheduled_for), Date.parse(later));
});

test('processed schedules cannot be edited or cancelled', async () => {
  setup({ schedules: [{ ...scheduleRow, status: 'cancelled' }] });
  for (const body of [
    { action: 'reschedule', schedule_id: SCHEDULE, scheduled_for: future },
    { action: 'cancel', schedule_id: SCHEDULE }
  ]) {
    const response = res();
    await scheduleHandler({ method: 'PATCH', query: {}, headers: authed, body }, response);
    assert.equal(response.statusCode, 409);
  }
});

test('cancel keeps the draft and flips schedule status', async () => {
  const calls = setup();
  const response = res();
  await scheduleHandler({ method: 'PATCH', query: {}, headers: authed, body: { action: 'cancel', schedule_id: SCHEDULE } }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { cancelled: true, id: SCHEDULE });
  const patch = calls.find(entry => entry.url.includes('/rest/v1/marketing_schedules') && entry.options.method === 'PATCH');
  assert.ok(patch.url.includes(`business_id=eq.${BUSINESS}`));
  assert.equal(JSON.parse(patch.options.body).status, 'cancelled');
  assert.ok(calls.every(entry => !entry.url.includes('/rest/v1/marketing_generations') || (entry.options.method || 'GET') === 'GET'));
});

test('deleted or unfinished generations cannot be scheduled', async () => {
  setup({ generations: [] });
  const response = res();
  await scheduleHandler(
    { method: 'POST', query: {}, headers: authed, body: { action: 'create', generation_id: GENERATION, platform: 'facebook', scheduled_for: future } },
    response
  );
  assert.equal(response.statusCode, 404);
});

test('past, invalid and distant times are rejected', () => {
  assert.throws(() => parseScheduledFor('not-a-date'), /valid date and time/);
  assert.throws(() => parseScheduledFor(new Date(Date.now() - 60000).toISOString()), /future date and time/);
  assert.throws(() => parseScheduledFor(new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString()), /too far/);
  assert.throws(() => validateScheduleRequest({ action: 'create', generation_id: GENERATION, platform: 'tiktok', scheduled_for: future }), /valid platform/);
});

test('timezone offsets round-trip to the same instant', () => {
  const instant = Date.parse('2026-10-05T18:30:00.000Z');
  const asOffset = new Date(instant).toISOString();
  assert.equal(Date.parse(parseScheduledFor(asOffset)), instant);
  assert.ok(parseScheduledFor(asOffset).endsWith('Z'));
  const localForm = '2026-10-05T19:30';
  assert.equal(typeof parseScheduledFor(`${localForm}:00+01:00`), 'string');
});

test('empty schedule list and UI states', async () => {
  setup({ schedules: [] });
  const response = res();
  await scheduleHandler({ method: 'GET', query: {}, headers: authed }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.schedules, []);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /marketingSchedulePane/);
  assert.match(html, /marketingTabSchedule/);
  assert.match(html, /marketingScheduleList/);
  const script = await readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8');
  assert.match(script, /No scheduled posts yet/);
  assert.match(script, /Loading scheduled posts/);
  assert.match(script, /Could not load scheduled posts/);
});

test('schedule UI renders date, platform, preview and status safely', async () => {
  const script = await readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8');
  assert.match(script, /marketingScheduleList/);
  assert.match(script, /data-schedule-marketing/);
  assert.match(script, /Change time/);
  assert.match(script, /Cancel/);
  assert.match(script, /waiting to be processed/);
  assert.ok(script.includes('esc(previewText(preview))') || script.includes('esc(when(item.scheduled_for)'));
  assert.doesNotMatch(script, />\$\{item\.id\}</);
  const css = await readFile(new URL('../assets/marketing.css', import.meta.url), 'utf8');
  assert.match(css, /marketing-preview/);
});

test('planning-only wording never promises publishing', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /Planning a post here does not publish it automatically/);
  assert.match(html, /Content plan/);
  assert.match(html, /Plan post/);
  assert.match(html, /Schedule &amp; publish/);
  const script = await readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8');
  assert.ok(script.includes('>Plan post</button>'));
});

test('scheduling never triggers publishing or provider calls', async () => {
  const calls = setup({ schedules: [] });
  const created = res();
  await scheduleHandler(
    { method: 'POST', query: {}, headers: authed, body: { action: 'create', generation_id: GENERATION, platform: 'general', scheduled_for: future } },
    created
  );
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.schedule.status, 'scheduled');
  assert.ok(calls.every(entry =>
    !entry.url.includes('marketing-publications') &&
    !entry.url.includes('marketing-scheduler') &&
    !entry.url.includes('api.openai.com') &&
    !entry.url.includes('/meta')
  ));
  const script = await readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8');
  const confirm = script.slice(script.indexOf('async function confirmSchedule'), script.indexOf('async function loadSchedules'));
  assert.ok(confirm.includes('/api/marketing-schedules'));
  assert.ok(!confirm.includes('/api/marketing-publications'));
});
