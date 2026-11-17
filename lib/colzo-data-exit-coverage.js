// Internal, read-only acceptance evidence contract. This does NOT execute exports,
// deletion, database requests, Storage access, or any customer-data operation.
// Snapshot of the 53 public tables in Business-AI-Dev on 14 November 2026.
// Reconcile against the live schema before every real tenant data-exit rehearsal.
const BY_BUSINESS_ID = `leads lead_history business_settings business_memberships bookings actions voice_provider_connections voice_phone_numbers voice_calls voice_call_events business_configurations business_public_routes business_audit_events public_enquiry_rate_limit_buckets business_data_lifecycle_policies business_team_invitations lead_handovers business_billing_accounts business_billing_usage stripe_webhook_events business_feature_entitlements marketing_generations business_knowledge_sources business_knowledge_items marketing_meta_oauth_states marketing_meta_connections marketing_social_accounts marketing_publications pilot_feedback marketing_automation_settings marketing_images business_legal_acceptances marketing_schedules marketing_image_usage_events customer_enquiry_access business_referral_profiles business_referral_rewards marketing_automation_media marketing_strategy_settings business_incident_controls customer_complaints review_email_outbox colzo_projects colzo_quotes colzo_clients colzo_whatsapp_demo_threads colzo_pilot_access`.split(' ');

const SPECIAL_CASES = Object.freeze({
  businesses: 'business_primary_key',
  user_legal_acceptances: 'shared_user_records',
  customer_profiles: 'shared_user_records',
  business_referrals: 'two_business_parties',
  platform_incident_controls: 'platform_global',
  pilot_free_access_config: 'platform_global'
});

export const PUBLIC_DATA_EXIT_SCOPE = Object.freeze([
  ...BY_BUSINESS_ID.map(name => Object.freeze({name, scope: 'business_id'})),
  ...Object.entries(SPECIAL_CASES).map(([name, scope]) => Object.freeze({name, scope}))
].sort((a, b) => a.name.localeCompare(b.name)));

// A DB table can carry encrypted credentials, unrelated users or legally retained
// audit/billing records. Scope inventory is never permission to export entire rows.
export const NON_PUBLIC_EXIT_DOMAINS = Object.freeze([
  'private_audit', 'auth_users_and_mfa', 'auth_sessions_and_refresh',
  'storage_metadata_and_object_bytes', 'vault_and_encrypted_credentials',
  'connected_provider_records_and_revocation', 'backups_and_legal_holds'
]);

export const REQUIRED_EXIT_CONTROL_RECEIPTS = Object.freeze([
  'verified_controller_instruction', 'owner_role_and_two_tenant_isolation',
  'approved_inventory_and_secret_redaction', 'complete_export_and_customer_delivery',
  'independent_compatible_restore_and_rollback', 'shared_identity_preservation',
  'approved_deletion_execution_and_failures', 'independent_post_exit_verification',
  'operator_and_independent_reviewer_approval'
]);

/**
 * Compare only the names, business-key columns and RLS switches of a
 * read-only pg_catalog public BASE/PARTITIONED-table query with the recorded
 * tenant-exit inventory. This must never be mistaken for a data-export or
 * erasure receipt, full schema coverage, or permission to launch a pilot.
 *
 * Inputs contain structural metadata only. No SQL, provider calls, row data,
 * credentials, Storage operations or mutations occur in this function.
 */
export function reconcilePublicDataExitSchema(observedTables) {
  const expected = new Map(PUBLIC_DATA_EXIT_SCOPE.map(item => [item.name, item]));
  const observed = new Map();
  const duplicateTables = [];
  const malformedEntries = [];

  if (!Array.isArray(observedTables)) {
    malformedEntries.push(-1);
    observedTables = [];
  }

  for (const [index, row] of observedTables.entries()) {
    if (!row || typeof row !== 'object' || Array.isArray(row)
        || typeof row.table_name !== 'string'
        || !/^[a-z][a-z0-9_]*$/.test(row.table_name)
        || typeof row.has_business_id !== 'boolean'
        || typeof row.rls_enabled !== 'boolean') {
      malformedEntries.push(index);
      continue;
    }
    if (observed.has(row.table_name)) {
      duplicateTables.push(row.table_name);
      continue;
    }
    observed.set(row.table_name, row);
  }

  const unknownTables = [...observed.keys()].filter(name => !expected.has(name)).sort();
  const missingTables = [...expected.keys()].filter(name => !observed.has(name)).sort();
  const ownershipMismatches = [...observed.values()]
    .filter(row => expected.has(row.table_name)
      && row.has_business_id !== (expected.get(row.table_name).scope === 'business_id'))
    .map(row => Object.freeze({
      table_name: row.table_name,
      expectedScope: expected.get(row.table_name).scope,
      has_business_id: row.has_business_id
    }))
    .sort((a,b) => a.table_name.localeCompare(b.table_name));
  const publicTablesWithoutRls = [...observed.values()]
    .filter(row => !row.rls_enabled)
    .map(row => row.table_name).sort();
  duplicateTables.sort();

  const schemaMatchesRecordedScope = (
    unknownTables.length === 0
    && missingTables.length === 0
    && ownershipMismatches.length === 0
    && publicTablesWithoutRls.length === 0
    && duplicateTables.length === 0
    && malformedEntries.length === 0
  );

  return Object.freeze({
    schemaMatchesRecordedScope,
    observedTableCount: observedTables.length,
    matchedTableCount: [...observed.keys()].filter(name => expected.has(name)).length,
    unknownTables: Object.freeze(unknownTables),
    missingTables: Object.freeze(missingTables),
    ownershipMismatches: Object.freeze(ownershipMismatches),
    publicTablesWithoutRls: Object.freeze(publicTablesWithoutRls),
    duplicateTables: Object.freeze(duplicateTables),
    malformedEntries: Object.freeze(malformedEntries),
    // A structural match is not an inventory of row contents, Auth, Storage
    // bytes, Vault, provider data, retention obligations or restore receipts.
    completeDataReturnVerified: false,
    pilotApproved: false,
    recordedSchemaSnapshotDate: '2026-11-14'
  });
}

function hasReference(value) {
  return typeof value === 'string' && value.trim().length >= 8;
}
function hasEvidence(entry, allowExcluded = false) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
  if (entry.status === 'verified') {
    return hasReference(entry.receipt) && hasReference(entry.reviewer);
  }
  if (allowExcluded && entry.status === 'excluded') {
    return hasReference(entry.reason) && hasReference(entry.approver) && hasReference(entry.receipt);
  }
  return false;
}

export function assessDataExitEvidence(input = {}) {
  const publicTables = input.publicTables || {};
  const domains = input.domains || {};
  const controls = input.controls || {};
  const missingPublicTables = PUBLIC_DATA_EXIT_SCOPE.filter(({name}) => !hasEvidence(publicTables[name], true)).map(({name}) => name);
  const missingDomains = NON_PUBLIC_EXIT_DOMAINS.filter(name => !hasEvidence(domains[name], true));
  const missingControls = REQUIRED_EXIT_CONTROL_RECEIPTS.filter(name => !hasEvidence(controls[name], false));
  const unknownPublicTables = Object.keys(publicTables).filter(name => !PUBLIC_DATA_EXIT_SCOPE.some(t => t.name === name)).sort();
  const unknownDomains = Object.keys(domains).filter(name => !NON_PUBLIC_EXIT_DOMAINS.includes(name)).sort();
  const unknownControls = Object.keys(controls).filter(name => !REQUIRED_EXIT_CONTROL_RECEIPTS.includes(name)).sort();
  return Object.freeze({
    // This is paperwork/readiness for independent *human* scrutiny, not a GO.
    readyForHumanReview: missingPublicTables.length === 0 && missingDomains.length === 0 && missingControls.length === 0 && unknownPublicTables.length === 0 && unknownDomains.length === 0 && unknownControls.length === 0,
    pilotApproved: false,
    missingPublicTables,
    missingDomains,
    missingControls,
    unknownPublicTables,
    unknownDomains,
    unknownControls,
    publicSchemaSnapshotDate: '2026-11-14',
    liveSchemaReconciliationRequired: true
  });
}
