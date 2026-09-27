import assert from 'node:assert/strict';
import test from 'node:test';
import { assertFacebookDailyPostLimit, facebookDailyPostUsage, marketingUsageLimitsForPlan } from '../lib/marketing-limits.js';

const savedEnv = { ...process.env };
const originalFetch = globalThis.fetch;

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



test('Marketing daily usage limits scale by base plan', () => {
  assert.deepEqual(marketingUsageLimitsForPlan('trial'), { drafts: 10, images: 3 });
  assert.deepEqual(marketingUsageLimitsForPlan('starter'), { drafts: 10, images: 3 });
  assert.deepEqual(marketingUsageLimitsForPlan('pro'), { drafts: 25, images: 10 });
  assert.deepEqual(marketingUsageLimitsForPlan('business'), { drafts: 50, images: 20 });
});

test('Facebook daily post limit allows three slots, deduplicates linked rows and rejects a fourth', async () => {
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
  const combined = await facebookDailyPostUsage('business-a', '2026-09-27T12:00:00.000Z');
  assert.equal(combined.limit, 3);
  assert.equal(combined.used, 3);
  assert.equal(combined.remaining, 0);

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

test.after(() => {
  process.env = savedEnv;
  globalThis.fetch = originalFetch;
});
