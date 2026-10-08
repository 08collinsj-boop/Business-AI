import assert from 'node:assert/strict';
import test from 'node:test';
import { isMarketingAutopublishPermitted } from '../lib/marketing-safety.js';

test('marketing automatic publishing fails closed by default', () => {
  assert.equal(isMarketingAutopublishPermitted({ enabled: true, mode: 'fully_automated' }, false), false);
  assert.equal(isMarketingAutopublishPermitted(null, true), false);
  assert.equal(isMarketingAutopublishPermitted({ enabled: false, mode: 'fully_automated' }, true), false);
  assert.equal(isMarketingAutopublishPermitted({ enabled: true, mode: 'approval_required' }, true), false);
});
test('automatic publication needs both an explicit server flag and saved owner opt-in', () => {
  assert.equal(isMarketingAutopublishPermitted({ enabled: true, mode: 'fully_automated' }, true), true);
  assert.equal(isMarketingAutopublishPermitted({ enabled: true, mode: 'fully_automated' }, false), false);
});
