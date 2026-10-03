import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../api/manual-leads.js', import.meta.url), 'utf8');

test('manual lead endpoint is authenticated and server-scoped to the current business', () => {
  assert.match(source, /requireBusinessMember\(req\)/);
  assert.match(source, /business_id:\s*auth\.businessId/);
  assert.match(source, /if \(!auth\?\.enforced \|\| !auth\.businessId\)/);
  assert.doesNotMatch(source, /body\.business_id/);
});

test('manual lead endpoint creates only New leads with validated owner fields', () => {
  assert.match(source, /status:\s*"New"/);
  assert.match(source, /priority = body\.priority === "High" \? "High" : "Normal"/);
  assert.match(source, /Number\.isFinite\(estimatedValue\)/);
  assert.match(source, /lead\.manual_created/);
});
