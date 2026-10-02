import assert from 'node:assert/strict';
import test from 'node:test';
import { MARKETING_GOALS, buildMarketingWeekPlan, defaultMarketingStrategy, validateMarketingStrategyInput } from '../lib/marketing-strategy-model.js';

test('default Marketing strategy is valid and balanced', () => {
  const strategy = defaultMarketingStrategy();
  const validated = validateMarketingStrategyInput(strategy);
  assert.equal(validated.weekly_posts, 4);
  assert.equal(validated.preferred_time, '18:30');
  assert.ok(validated.goals.includes('enquiries'));
  assert.ok(validated.pillars.filter(item => item.enabled).length >= 4);
});

test('strategy validation rejects unknown goals and unsafe weights', () => {
  const strategy = defaultMarketingStrategy();
  assert.throws(() => validateMarketingStrategyInput({ ...strategy, goals: ['invent_sales'] }), /valid Marketing goals/);
  assert.throws(() => validateMarketingStrategyInput({ ...strategy, pillars: strategy.pillars.map((item, index) => index === 0 ? { ...item, weight: 101 } : item) }), /weights/);
  assert.ok(MARKETING_GOALS.includes('build_trust'));
});

test('weekly planner creates the requested number of distinct Facebook plan items', () => {
  let id = 0;
  const plan = buildMarketingWeekPlan({ strategy: defaultMarketingStrategy(), start_date: '2026-10-05', id_factory: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`, now: new Date('2026-10-02T12:00:00Z') });
  assert.equal(plan.length, 4);
  assert.equal(new Set(plan.map(item => item.planned_date)).size, 4);
  assert.ok(plan.every(item => item.platform === 'facebook'));
  assert.ok(plan.every(item => item.brief.includes('approved') || item.brief.includes('Business Knowledge')));
});

test('weekly planner preserves linked plan items when replanning the same week', () => {
  const strategy = defaultMarketingStrategy();
  const existing = [{ id: '00000000-0000-4000-8000-000000000099', planned_date: '2026-10-05', planned_time: '18:30', pillar: 'services', goal: 'enquiries', content_type: 'promotional_post', platform: 'facebook', tone: 'friendly', brief: 'Existing linked brief', generation_id: '00000000-0000-4000-8000-000000000100', linked_at: '2026-10-02T12:00:00Z', created_at: '2026-10-02T12:00:00Z' }];
  let id = 200;
  const plan = buildMarketingWeekPlan({ strategy, start_date: '2026-10-05', existing_plan: existing, id_factory: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`, now: new Date('2026-10-02T13:00:00Z') });
  assert.equal(plan.length, 4);
  assert.equal(plan[0].generation_id, existing[0].generation_id);
  assert.equal(plan[0].id, existing[0].id);
});
