import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const [readiness, browser, rights, recovery, compliance, providers] = await Promise.all([
  readFile(new URL('../docs/PILOT_READINESS.md', import.meta.url), 'utf8'),
  readFile(new URL('../docs/PUBLIC_LAUNCH_BROWSER_CERTIFICATION.md', import.meta.url), 'utf8'),
  readFile(new URL('../docs/DATA_SUBJECT_RIGHTS_RUNBOOK.md', import.meta.url), 'utf8'),
  readFile(new URL('../docs/PILOT_DISASTER_RECOVERY.md', import.meta.url), 'utf8'),
  readFile(new URL('../docs/UK_COMPLIANCE_PACK.md', import.meta.url), 'utf8'),
  readFile(new URL('../docs/PROVIDER_DATA_PROCESSING_REVIEW.md', import.meta.url), 'utf8')
]);

test('public launch handoff keeps risky browser actions explicitly gated', () => {
  assert.match(browser, /Pilot only/i);
  assert.match(browser, /Do not make a real payment/i);
  assert.match(browser, /Do not guess answers to the ICO/i);
  assert.match(browser, /Do not upgrade Vercel or purchase anything without explicit approval/i);
  assert.match(browser, /Do not publish a real Facebook post unless/i);
});

test('soft launch records backup deferral as accepted risk, not a false pass', () => {
  assert.match(readiness, /accepted temporary soft-launch risk, not a technical PASS/i);
  assert.match(recovery, /does not turn backup\/recovery into a PASS/i);
  assert.match(compliance, /post-launch P1/i);
});

test('commercial launch documentation blocks paid use on Vercel Hobby', () => {
  assert.match(readiness, /Hobby terms are for personal\/non-commercial use/i);
  assert.match(providers, /Paid commercial blocker/i);
  assert.match(compliance, /before taking real paid customers/i);
});

test('rights runbook documents deadline, tenant scoping and fake-data browser acceptance', () => {
  assert.match(rights, /within one month/i);
  assert.match(rights, /tenant-scoped/i);
  assert.match(rights, /never test erasure on a real customer record/i);
});
