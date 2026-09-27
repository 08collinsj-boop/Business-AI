import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { assertFacebookDailyPostLimit, facebookDailyPostUsage } from '../lib/marketing-limits.js';

const savedEnv = { ...process.env };
const originalFetch = globalThis.fetch;
afterEach(() => {
  process.env = { ...savedEnv };
  globalThis.fetch = originalFetch;
});

function response(body) {
  return { ok: true, status: 200, text: async () => JSON.stringify(body) };
}

function setup({ schedules = [], publications = [] } = {}) {
  Object.assign(process.env, {
    SUPABASE_URL: 'https://example.test',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key'
  });
  globalThis.fetch = async url => {
    const href = String(url);
    if (href.includes('/rest/v1/marketing_schedules')) return response(schedules);
    if (href.includes('/rest/v1/marketing_publications')) return response(publications);
    throw new Error('Unexpected request: ' + href);
  };
}

test('Facebook daily usage combines schedules and direct publications without double counting linked rows', async () => {
  setup({
    schedules: [
      { id: 'schedule-1', publication_id: 'publication-1' },
      { id: 'schedule-2', publication_id: null }
    ],
    publications: [
      { id: 'publication-1' },
      { id: 'publication-2' }
    ]
  });
  const usage = await facebookDailyPostUsage('business-a', '2026-09-27T12:00:00.000Z');
  assert.equal(usage.limit, 3);
  assert.equal(usage.used, 3);
  assert.equal(usage.remaining, 0);
});

test('third Facebook post is allowed but a fourth is rejected', async () => {
  setup({
    schedules: [
      { id: 'schedule-1', publication_id: null },
      { id: 'schedule-2', publication_id: null }
    ],
    publications: []
  });
  const beforeThird = await assertFacebookDailyPostLimit('business-a', '2026-09-27T12:00:00.000Z');
  assert.equal(beforeThird.used, 2);

  setup({
    schedules: [
      { id: 'schedule-1', publication_id: null },
      { id: 'schedule-2', publication_id: null },
      { id: 'schedule-3', publication_id: null }
    ],
    publications: []
  });
  await assert.rejects(
    () => assertFacebookDailyPostLimit('business-a', '2026-09-27T12:00:00.000Z'),
    error => error?.status === 429 && error?.code === 'MARKETING_DAILY_POST_LIMIT_REACHED'
  );
});
