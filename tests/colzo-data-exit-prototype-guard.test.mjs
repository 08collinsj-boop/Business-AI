import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_DATA_EXIT_SCOPE, NON_PUBLIC_EXIT_DOMAINS, REQUIRED_EXIT_CONTROL_RECEIPTS, assessDataExitEvidence} from '../lib/colzo-data-exit-coverage.js';

const verified = {status:'verified', receipt:'synthetic-evidence-123456', reviewer:'synthetic-reviewer-456'};
function fullRecord() { return {
  publicTables:Object.fromEntries(PUBLIC_DATA_EXIT_SCOPE.map(x => [x.name,{...verified}])),
  domains:Object.fromEntries(NON_PUBLIC_EXIT_DOMAINS.map(x => [x,{...verified}])),
  controls:Object.fromEntries(REQUIRED_EXIT_CONTROL_RECEIPTS.map(x => [x,{...verified}]))
}; }

test('documented own evidence remains ready for human review, but never authorises launch', () => {
  const result=assessDataExitEvidence(fullRecord());
  assert.equal(result.readyForHumanReview,true);
  assert.equal(result.pilotApproved,false);
});

test('inherited table receipts cannot satisfy a complete human review', () => {
  const pack=fullRecord();
  const inherited=Object.create(pack.publicTables);
  pack.publicTables=inherited;
  const result=assessDataExitEvidence(pack);
  assert.equal(result.readyForHumanReview,false);
  assert.equal(result.missingPublicTables.length,53);
});

test('inherited fields inside a purported verified evidence receipt fail closed', () => {
  const pack=fullRecord();
  pack.domains.private_audit=Object.create(verified);
  const result=assessDataExitEvidence(pack);
  assert.equal(result.readyForHumanReview,false);
  assert.deepEqual(result.missingDomains,['private_audit']);
});

test('inherited exclusion approver or reason is not sufficient', () => {
  const pack=fullRecord();
  pack.publicTables.businesses=Object.assign(Object.create({approver:'inherited-approved'}), {
    status:'excluded',receipt:'synthetic-legal-hold-123',reason:'synthetic-record-retention'
  });
  const result=assessDataExitEvidence(pack);
  assert.equal(result.readyForHumanReview,false);
  assert.ok(result.missingPublicTables.includes('businesses'));
});

test('malformed receipt maps fail closed rather than throwing or treating an array as reviewed', () => {
  for(const publicTables of [[], 'invalid', 123, null]) {
    const pack=fullRecord();pack.publicTables=publicTables;
    const result=assessDataExitEvidence(pack);
    assert.equal(result.readyForHumanReview,false);
  }
});
