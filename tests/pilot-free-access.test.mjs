import assert from 'node:assert/strict';
import test from 'node:test';
import { entitlementFromAccount, isPilotFreeStarterMarketingEnabled } from '../lib/billing.js';
import { marketingAccess } from '../lib/addons.js';
const withPilot = (fn) => {
  const previous = process.env.PILOT_FREE_STARTER_MARKETING;
  process.env.PILOT_FREE_STARTER_MARKETING = 'true';
  try { return fn(); }
  finally { if (previous === undefined) delete process.env.PILOT_FREE_STARTER_MARKETING; else process.env.PILOT_FREE_STARTER_MARKETING = previous; }
};
test('free Pilot access is opt in and defaults off', () => {
  const prev = process.env.PILOT_FREE_STARTER_MARKETING;
  delete process.env.PILOT_FREE_STARTER_MARKETING;
  try { assert.equal(isPilotFreeStarterMarketingEnabled(), false); }
  finally { if (prev !== undefined) process.env.PILOT_FREE_STARTER_MARKETING = prev; }
});
test('Pilot grants Starter with the normal 250 enquiries and two seats', () => withPilot(() => {
  const access = entitlementFromAccount({plan:'pro',status:'past_due'}, 12, new Date('2026-10-10T12:00:00Z'));
  assert.equal(access.active, true);
  assert.equal(access.plan, 'starter');
  assert.equal(access.status, 'pilot');
  assert.equal(access.enquiryAllowance, 250);
  assert.equal(access.enquiriesRemaining, 238);
  assert.equal(access.staffAllowance, 2);
  assert.equal(access.pilotFreeAccess, true);
  assert.equal(access.currentPeriodEndsAt,'2026-11-01T00:00:00.000Z');
  assert.equal(entitlementFromAccount(null, 250).enquiriesRemaining, 0);
}));
test('Pilot Marketing is included for all businesses irrespective of Stripe row', () => withPilot(() => {
  const m = marketingAccess(null, null, Date.parse('2026-10-10T12:00:00Z'));
  assert.equal(m.active, true);
  assert.equal(m.allowance, 100);
  assert.equal(m.periodStartedAt,'2026-10-01T00:00:00.000Z');
  assert.equal(m.periodEndsAt,'2026-11-01T00:00:00.000Z');
  assert.equal(m.trial, false);
}));
