import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUBLIC_DATA_EXIT_SCOPE, NON_PUBLIC_EXIT_DOMAINS,
  REQUIRED_EXIT_CONTROL_RECEIPTS, assessDataExitEvidence
} from '../lib/colzo-data-exit-coverage.js';

test('public-table scope covers the 53 inspected tables without duplicates', () => {
  assert.equal(PUBLIC_DATA_EXIT_SCOPE.length, 53);
  assert.equal(new Set(PUBLIC_DATA_EXIT_SCOPE.map(t => t.name)).size, 53);
  assert.equal(PUBLIC_DATA_EXIT_SCOPE.filter(t=>t.scope==='business_id').length,47);
  for (const [name,scope] of Object.entries({
    businesses:'business_primary_key',
    business_referrals:'two_business_parties',
    customer_profiles:'shared_user_records',
    user_legal_acceptances:'shared_user_records',
    platform_incident_controls:'platform_global',
    pilot_free_access_config:'platform_global'
  })) assert.equal(PUBLIC_DATA_EXIT_SCOPE.find(t=>t.name===name)?.scope,scope);
});

test('a blank or partly verified record cannot satisfy the evidence contract',()=>{
  const blank=assessDataExitEvidence();
  assert.equal(blank.readyForHumanReview,false);
  assert.equal(blank.pilotApproved,false);
  assert.equal(blank.missingPublicTables.length,53);
  assert.equal(blank.missingDomains.length,NON_PUBLIC_EXIT_DOMAINS.length);
  assert.equal(blank.missingControls.length,REQUIRED_EXIT_CONTROL_RECEIPTS.length);
  const incomplete=assessDataExitEvidence({publicTables:{leads:{status:'verified',receipt:'yes',reviewer:'reviewer'}}});
  assert.ok(incomplete.missingPublicTables.includes('leads'));
});

test('shared Auth user preservation and actual Storage bytes are mandatory for review',()=>{
  const verified={status:'verified',receipt:'signed synthetic receipt',reviewer:'independent synthetic reviewer'};
  const publicTables=Object.fromEntries(PUBLIC_DATA_EXIT_SCOPE.map(x=>[x.name,verified]));
  const controls=Object.fromEntries(REQUIRED_EXIT_CONTROL_RECEIPTS.map(x=>[x,verified]));
  const domains=Object.fromEntries(NON_PUBLIC_EXIT_DOMAINS.filter(x=>!['storage_metadata_and_object_bytes','auth_users_and_mfa'].includes(x)).map(x=>[x,verified]));
  const missing=assessDataExitEvidence({publicTables,controls,domains});
  assert.equal(missing.readyForHumanReview,false);
  assert.ok(missing.missingDomains.includes('storage_metadata_and_object_bytes'));
  assert.ok(missing.missingDomains.includes('auth_users_and_mfa'));
});

test('no documentation receipt can approve a pilot, even when every category is covered',()=>{
  const verified={status:'verified',receipt:'synthetic-evidence-reference',reviewer:'synthetic-independent-reviewer'};
  const publicTables=Object.fromEntries(PUBLIC_DATA_EXIT_SCOPE.map(x=>[x.name,verified]));
  const controls=Object.fromEntries(REQUIRED_EXIT_CONTROL_RECEIPTS.map(x=>[x,verified]));
  const domains=Object.fromEntries(NON_PUBLIC_EXIT_DOMAINS.map(x=>[x,verified]));
  const result=assessDataExitEvidence({publicTables,controls,domains});
  assert.equal(result.readyForHumanReview,true);
  assert.equal(result.pilotApproved,false);
  assert.equal(result.liveSchemaReconciliationRequired,true);
  assert.equal(result.missingPublicTables.length,0);
  assert.equal(result.missingDomains.length,0);
  assert.equal(result.missingControls.length,0);
});

test('excluded records require explicit documented reason and approver',()=>{
  const excluded={status:'excluded',receipt:'synthetic-recorded-exclusion',reason:'retained by statutory obligations',approver:'named-private-review-record'};
  const obj={publicTables:{platform_incident_controls:excluded}};
  assert.ok(!assessDataExitEvidence(obj).missingPublicTables.includes('platform_incident_controls'));
  assert.ok(assessDataExitEvidence({publicTables:{platform_incident_controls:{...excluded,approver:''}}}).missingPublicTables.includes('platform_incident_controls'));
  assert.ok(assessDataExitEvidence({controls:{verified_controller_instruction:excluded}}).missingControls.includes('verified_controller_instruction'));
});

test('new unrecognized public-table evidence blocks review until scope reconciled',()=>{
  const result=assessDataExitEvidence({publicTables:{unrecognized_new_table:{status:'verified',receipt:'test receipt',reviewer:'test reviewer'}}});
  assert.deepEqual(result.unknownPublicTables,['unrecognized_new_table']);
  assert.equal(result.readyForHumanReview,false);
});

test('unexpected domains and controls cannot silently count as complete readiness',()=>{
  const verified={status:'verified',receipt:'synthetic-evidence-reference',reviewer:'synthetic-independent-reviewer'};
  const publicTables=Object.fromEntries(PUBLIC_DATA_EXIT_SCOPE.map(x=>[x.name,verified]));
  const controls=Object.fromEntries(REQUIRED_EXIT_CONTROL_RECEIPTS.map(x=>[x,verified]));
  const domains=Object.fromEntries(NON_PUBLIC_EXIT_DOMAINS.map(x=>[x,verified]));
  domains.new_unclassified_provider={status:'verified',receipt:'test receipt',reviewer:'reviewer record'};
  controls.another_unreviewed_requirement={status:'verified',receipt:'test receipt',reviewer:'reviewer record'};
  const result=assessDataExitEvidence({publicTables,domains,controls});
  assert.equal(result.readyForHumanReview,false);
  assert.deepEqual(result.unknownDomains,['new_unclassified_provider']);
  assert.deepEqual(result.unknownControls,['another_unreviewed_requirement']);
});
