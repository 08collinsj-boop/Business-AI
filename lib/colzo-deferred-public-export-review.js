// Internal, metadata-only checklist for the 13 public tables deliberately omitted
// from Colzo's fictional draft tenant exporter. This never queries a database,
// returns row data, approves an export, or performs a deletion.
import { PUBLIC_DATA_EXIT_SCOPE } from './colzo-data-exit-coverage.js';
import { PREVIEW_DATASETS } from './colzo-tenant-export-engine.js';
import { DEFERRED_PUBLIC_DATA_CLASSES } from './colzo-tenant-export-classification.js';

// Reuse the existing classification: do not create a second, diverging 13-table registry.
export const DEFERRED_PUBLIC_EXPORT_RISKS = DEFERRED_PUBLIC_DATA_CLASSES;

const IDENTIFIER = /^[a-z][a-z0-9_]*$/;
const RECORDED_SCOPES = new Map(PUBLIC_DATA_EXIT_SCOPE.map(row => [row.name, row.scope]));
function documentedReview(entry) {
  return entry && typeof entry === 'object' && !Array.isArray(entry)
    && Object.hasOwn(entry, 'disposition') && entry.disposition === 'requires_separate_legal_review'
    && ['reason', 'receipt', 'reviewer'].every(key =>
      Object.hasOwn(entry, key) && typeof entry[key] === 'string' && entry[key].trim().length >= 8);
}

// Scope/projections are dependency-injected only to enable synthetic drift tests.
// Default values use the checked-in metadata declarations, not live database rows.
export function assessDeferredPublicExportReview({
  publicScope = PUBLIC_DATA_EXIT_SCOPE,
  previewDatasets = PREVIEW_DATASETS,
  reviews = {}
} = {}) {
  const known = Object.keys(DEFERRED_PUBLIC_EXPORT_RISKS).sort();
  const scopeMap = new Map();
  const duplicatePublicTables = [];
  const malformedPublicEntries = [];
  const validScope = Array.isArray(publicScope);
  if (validScope) {
    for (const [i, entry] of publicScope.entries()) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)
          || typeof entry.name !== 'string' || !IDENTIFIER.test(entry.name)
          || typeof entry.scope !== 'string' || !entry.scope.trim()) {
        malformedPublicEntries.push(i);
      } else if (scopeMap.has(entry.name)) {
        duplicatePublicTables.push(entry.name);
      } else {
        scopeMap.set(entry.name, entry);
      }
    }
  } else {
    malformedPublicEntries.push(-1);
  }
  const validDatasets = previewDatasets && typeof previewDatasets === 'object'
    && !Array.isArray(previewDatasets);
  const included = validDatasets ? Object.keys(previewDatasets) : [];
  const includedSet = new Set(included);
  const deferredTables = [...scopeMap.keys()].filter(name => !includedSet.has(name)).sort();
  const unrecognisedDeferredTables = deferredTables.filter(name => !Object.hasOwn(DEFERRED_PUBLIC_EXPORT_RISKS, name));
  const unexpectedlyIncludedTables = known.filter(name => includedSet.has(name));
  const missingRecordedDeferrals = known.filter(name => !scopeMap.has(name));
  const unknownPublicTables = [...scopeMap.keys()].filter(name => !RECORDED_SCOPES.has(name)).sort();
  const missingExpectedPublicTables = [...RECORDED_SCOPES.keys()].filter(name => !scopeMap.has(name)).sort();
  const unknownPreviewTables = included.filter(name => !scopeMap.has(name)).sort();
  const previewProjectionMismatches = included.filter(name =>
    Object.hasOwn(PREVIEW_DATASETS, name)
      && previewDatasets[name] !== PREVIEW_DATASETS[name]).sort();
  const ownershipScopeMismatches = [...scopeMap.values()]
    .filter(row => RECORDED_SCOPES.has(row.name)
      && RECORDED_SCOPES.get(row.name) !== row.scope)
    .map(row => ({table_name:row.name, expectedScope:RECORDED_SCOPES.get(row.name), observedScope:row.scope}))
    .sort((a,b) => a.table_name.localeCompare(b.table_name));
  const validReviews = reviews && typeof reviews === 'object' && !Array.isArray(reviews);
  const reviewRecords = validReviews ? reviews : {};
  const missingReviews = known.filter(name =>
    !Object.hasOwn(reviewRecords, name) || !documentedReview(reviewRecords[name]));
  const unknownReviewTables = Object.keys(reviewRecords).filter(name =>
    !Object.hasOwn(DEFERRED_PUBLIC_EXPORT_RISKS, name)).sort();
  const matchesRecordedDeferrals = validScope && validDatasets
    && malformedPublicEntries.length === 0 && duplicatePublicTables.length === 0
    && ownershipScopeMismatches.length === 0
    && unknownPublicTables.length === 0 && missingExpectedPublicTables.length === 0
    && previewProjectionMismatches.length === 0
    && scopeMap.size === 53 && included.length === 40
    && unrecognisedDeferredTables.length === 0 && unexpectedlyIncludedTables.length === 0
    && missingRecordedDeferrals.length === 0 && unknownPreviewTables.length === 0
    && deferredTables.length === known.length;
  return Object.freeze({
    matchesRecordedDeferrals,
    deferredTables: Object.freeze(deferredTables),
    unrecognisedDeferredTables: Object.freeze(unrecognisedDeferredTables),
    unexpectedlyIncludedTables: Object.freeze(unexpectedlyIncludedTables),
    missingRecordedDeferrals: Object.freeze(missingRecordedDeferrals),
    unknownPublicTables: Object.freeze(unknownPublicTables),
    missingExpectedPublicTables: Object.freeze(missingExpectedPublicTables),
    unknownPreviewTables: Object.freeze(unknownPreviewTables),
    previewProjectionMismatches: Object.freeze(previewProjectionMismatches),
    duplicatePublicTables: Object.freeze(duplicatePublicTables.sort()),
    ownershipScopeMismatches: Object.freeze(ownershipScopeMismatches),
    malformedPublicEntries: Object.freeze(malformedPublicEntries),
    missingReviews: Object.freeze(missingReviews),
    unknownReviewTables: Object.freeze(unknownReviewTables),
    reviewPackComplete: matchesRecordedDeferrals && validReviews
      && missingReviews.length === 0 && unknownReviewTables.length === 0,
    completeDataReturnVerified: false,
    deletionAuthorised: false,
    pilotApproved: false
  });
}
