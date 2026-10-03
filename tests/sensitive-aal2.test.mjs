import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const [billing, team, marketing] = await Promise.all([
  readFile(new URL('../lib/billing-handler.js', import.meta.url), 'utf8'),
  readFile(new URL('../lib/team-handler.js', import.meta.url), 'utf8'),
  readFile(new URL('../lib/marketing-automation-handler.js', import.meta.url), 'utf8')
]);

test('sensitive billing controls require AAL2 while initial checkout remains available', () => {
  assert.match(billing, /requireAal2/);
  for (const action of ['change_plan', 'cancel_plan_change', 'portal', 'cancel']) {
    assert.match(billing, new RegExp(`protectedBillingActions[^\n]*${action}`));
  }
  assert.doesNotMatch(billing, /protectedBillingActions[^\n]*checkout/);
  assert.match(billing, /protectedBillingActions\.has\(body\.action\)[\s\S]{0,180}requireAal2\(req\)/);
});

test('owner Team writes require AAL2 without blocking invitation acceptance', () => {
  assert.match(team, /requireAal2/);
  const acceptBranch = team.indexOf('body.action === "accept"');
  const aal2Guard = team.indexOf('await requireAal2(req)');
  assert.ok(acceptBranch >= 0 && aal2Guard > acceptBranch, 'invitation acceptance must remain outside the owner AAL2 write gate');
  assert.match(team, /req\.method !== "GET"[\s\S]{0,160}requireAal2\(req\)/);
});

test('Marketing requires AAL2 only when entering enabled fully automated publishing', () => {
  assert.match(marketing, /input\.enabled && input\.mode === 'fully_automated'/);
  assert.match(marketing, /current\.enabled && current\.mode === 'fully_automated'/);
  assert.match(marketing, /current[\s\S]{0,220}requireAal2\(req\)/);
});
