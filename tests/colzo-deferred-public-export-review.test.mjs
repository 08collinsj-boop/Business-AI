import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_DATA_EXIT_SCOPE } from '../lib/colzo-data-exit-coverage.js';
import { PREVIEW_DATASETS } from '../lib/colzo-tenant-export-engine.js';
import { DEFERRED_PUBLIC_EXPORT_RISKS, assessDeferredPublicExportReview } from '../lib/colzo-deferred-public-export-review.js';

const expected = [
  'business_audit_events','business_referrals','businesses',
  'colzo_pilot_access','colzo_whatsapp_demo_threads','customer_enquiry_access',
  'customer_profiles','marketing_meta_oauth_states','pilot_free_access_config',
  'platform_incident_controls','public_enquiry_rate_limit_buckets',
  'stripe_webhook_events','user_legal_acceptances'
];

const reviewed = Object.fromEntries(expected.map(table=>[table,{
  disposition:'requires_separate_legal_review',
  reason:'Synthetic reviewer notes the tenant and legal hold risks',
  receipt:'fictional-risk-review-2026', reviewer:'fictional-independent-reviewer'
}]));

test('the thirteen recorded deferrals match the existing 53-table / 40-allowlist snapshot', () => {
  assert.equal(PUBLIC_DATA_EXIT_SCOPE.length,53);
  assert.equal(Object.keys(PREVIEW_DATASETS).length,40);
  assert.deepEqual(Object.keys(DEFERRED_PUBLIC_EXPORT_RISKS).sort(),expected);
  const report=assessDeferredPublicExportReview();
  assert.equal(report.matchesRecordedDeferrals,true);
  assert.deepEqual(report.deferredTables,expected);
  assert.deepEqual(report.missingReviews,expected);
  assert.equal(report.reviewPackComplete,false);
  assert.equal(report.completeDataReturnVerified,false);
  assert.equal(report.deletionAuthorised,false);
  assert.equal(report.pilotApproved,false);
});

test('unrecognised table names or an included deferred class fail closed', () => {
  const foreignScope=[...PUBLIC_DATA_EXIT_SCOPE,{name:'new_sensitive_records',scope:'business_id'}];
  const drift=assessDeferredPublicExportReview({publicScope:foreignScope,reviews:reviewed});
  assert.deepEqual(drift.unrecognisedDeferredTables,['new_sensitive_records']);
  assert.equal(drift.reviewPackComplete,false);
  const widened={...PREVIEW_DATASETS,customer_profiles:'id,business_id'};
  const overreach=assessDeferredPublicExportReview({previewDatasets:widened,reviews:reviewed});
  assert.deepEqual(overreach.unexpectedlyIncludedTables,['customer_profiles']);
  assert.equal(overreach.reviewPackComplete,false);
});

test('no review can be considered documented without full explicit receipt fields',()=>{
  const invalid={...reviewed,businesses:{...reviewed.businesses,reviewer:''}};
  const result=assessDeferredPublicExportReview({reviews:invalid});
  assert.deepEqual(result.missingReviews,['businesses']);
  assert.equal(result.reviewPackComplete,false);
  const unknown=assessDeferredPublicExportReview({reviews:{...reviewed,unexpected_secret:{...reviewed.businesses}}});
  assert.deepEqual(unknown.unknownReviewTables,['unexpected_secret']);
  assert.equal(unknown.reviewPackComplete,false);
});

test('even all documented synthetic reviews never activate export, deletion or pilot',()=>{
  const result=assessDeferredPublicExportReview({reviews:reviewed});
  assert.equal(result.reviewPackComplete,true);
  assert.equal(result.completeDataReturnVerified,false);
  assert.equal(result.deletionAuthorised,false);
  assert.equal(result.pilotApproved,false);
});

test('missing, malformed and duplicated snapshot inputs cannot produce review completion',()=>{
  for(const input of [null,{},'wrong',[]]){
    const result=assessDeferredPublicExportReview({publicScope:input,reviews:reviewed});
    assert.equal(result.matchesRecordedDeferrals,false);
    assert.equal(result.reviewPackComplete,false);
  }
  const duplicate=assessDeferredPublicExportReview({publicScope:[...PUBLIC_DATA_EXIT_SCOPE,PUBLIC_DATA_EXIT_SCOPE[0]],reviews:reviewed});
  assert.equal(duplicate.reviewPackComplete,false);
  assert.deepEqual(duplicate.duplicatePublicTables,[PUBLIC_DATA_EXIT_SCOPE[0].name]);
});

test('changing a recorded public ownership scope fails closed, even with valid review receipts',()=>{
  const changed = PUBLIC_DATA_EXIT_SCOPE.map(row => row.name === 'business_referrals'
    ? {...row,scope:'business_id'} : row);
  const result = assessDeferredPublicExportReview({publicScope:changed,reviews:reviewed});
  assert.equal(result.matchesRecordedDeferrals,false);
  assert.equal(result.reviewPackComplete,false);
  assert.deepEqual(result.ownershipScopeMismatches,[{
    table_name:'business_referrals', expectedScope:'two_business_parties', observedScope:'business_id'
  }]);
});

test('replacement of an ordinary recorded table with an unrecognised included table fails closed', () => {
  const replacedScope=PUBLIC_DATA_EXIT_SCOPE.filter(row=>row.name!=='leads');
  replacedScope.push({name:'previously_unknown_sensitive_dataset',scope:'business_id'});
  const substitutedPreview={...PREVIEW_DATASETS};
  delete substitutedPreview.leads;
  substitutedPreview.previously_unknown_sensitive_dataset='id,business_id';
  const result=assessDeferredPublicExportReview({
    publicScope:replacedScope, previewDatasets:substitutedPreview, reviews:reviewed
  });
  assert.equal(result.matchesRecordedDeferrals,false);
  assert.equal(result.reviewPackComplete,false);
  assert.deepEqual(result.unknownPublicTables,['previously_unknown_sensitive_dataset']);
  assert.deepEqual(result.missingExpectedPublicTables,['leads']);
});

test('inherited review entries and inherited receipt fields never satisfy documented review', () => {
  const inheritedReviews=Object.assign(Object.create({businesses:reviewed.businesses}),reviewed);
  delete inheritedReviews.businesses;
  const inheritedEntry=Object.assign(Object.create({reviewer:'fictional-independent-reviewer'}),{
    disposition:'requires_separate_legal_review',
    receipt:'fictional-risk-review-2026',
    reason:'Synthetic reviewer notes the tenant and legal hold risks'
  });
  inheritedReviews.business_referrals=inheritedEntry;
  const result=assessDeferredPublicExportReview({reviews:inheritedReviews});
  assert.deepEqual(result.missingReviews,['business_referrals','businesses']);
  assert.equal(result.reviewPackComplete,false);
});

// Governance: only one canonical classification list can exist.
test('deferred reviewer uses the existing canonical export classification', async () => {
  const {DEFERRED_PUBLIC_DATA_CLASSES} = await import('../lib/colzo-tenant-export-classification.js');
  assert.equal(DEFERRED_PUBLIC_EXPORT_RISKS, DEFERRED_PUBLIC_DATA_CLASSES);
});

test('a review disposition must be an own property, not inherited from a prototype', () => {
  const pretendApproval = Object.assign(Object.create({disposition:'requires_separate_legal_review'}), {
    reason:'Synthetic reviewer records a provisional risk',
    receipt:'synthetic-receipt-12345',
    reviewer:'synthetic-reviewer-abc'
  });
  const reviews=Object.fromEntries(Object.keys(DEFERRED_PUBLIC_EXPORT_RISKS).map(name=>[name,{
    disposition:'requires_separate_legal_review',reason:'Synthetic reviewer records a provisional risk',
    receipt:'synthetic-receipt-12345',reviewer:'synthetic-reviewer-abc'
  }]));
  reviews.business_referrals=pretendApproval;
  const result=assessDeferredPublicExportReview({reviews});
  assert.deepEqual(result.missingReviews,['business_referrals']);
  assert.equal(result.reviewPackComplete,false);
});
