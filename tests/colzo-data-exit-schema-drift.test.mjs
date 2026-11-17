import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUBLIC_DATA_EXIT_SCOPE,
  reconcilePublicDataExitSchema
} from '../lib/colzo-data-exit-coverage.js';

// Metadata-only synthetic inputs; no credentials, tenant rows, Storage bytes or SQL mutations.
function recordedSchema() {
  return PUBLIC_DATA_EXIT_SCOPE.map(({name, scope}) => ({
    table_name: name,
    has_business_id: scope === 'business_id',
    rls_enabled: true
  }));
}

test('unchanged 53-table public schema is structurally reconciled without pilot approval', () => {
  const report = reconcilePublicDataExitSchema(recordedSchema());
  assert.equal(report.schemaMatchesRecordedScope, true);
  assert.equal(report.observedTableCount, 53);
  assert.equal(report.matchedTableCount, 53);
  assert.deepEqual(report.unknownTables, []);
  assert.deepEqual(report.missingTables, []);
  assert.deepEqual(report.ownershipMismatches, []);
  assert.deepEqual(report.publicTablesWithoutRls, []);
  assert.deepEqual(report.duplicateTables, []);
  assert.deepEqual(report.malformedEntries, []);
  assert.equal(report.pilotApproved, false);
  assert.equal(report.completeDataReturnVerified, false);
  assert.equal(Object.isFrozen(report), true);
});

test('a newly created table blocks schema reconciliation until explicitly classified', () => {
  const report = reconcilePublicDataExitSchema([
    ...recordedSchema(),
    {table_name: 'new_sensitive_table', has_business_id: true, rls_enabled: true}
  ]);
  assert.equal(report.schemaMatchesRecordedScope, false);
  assert.deepEqual(report.unknownTables, ['new_sensitive_table']);
  assert.equal(report.pilotApproved, false);
});

test('a missing recorded public table blocks reconciliation', () => {
  const report = reconcilePublicDataExitSchema(recordedSchema().filter(x=>x.table_name!=='leads'));
  assert.equal(report.schemaMatchesRecordedScope, false);
  assert.deepEqual(report.missingTables, ['leads']);
  assert.equal(report.matchedTableCount, 52);
});

test('business-id column removed or added to a special case blocks reconciliation', () => {
  const schema = recordedSchema().map(row => {
    if (row.table_name==='leads') return {...row, has_business_id:false};
    if (row.table_name==='business_referrals') return {...row, has_business_id:true};
    return row;
  });
  const report = reconcilePublicDataExitSchema(schema);
  assert.equal(report.schemaMatchesRecordedScope, false);
  assert.deepEqual(report.ownershipMismatches, [
    {table_name:'business_referrals', expectedScope:'two_business_parties', has_business_id:true},
    {table_name:'leads', expectedScope:'business_id', has_business_id:false}
  ]);
});

test('disabled row-level security blocks reconciliation even without table drift', () => {
  const report = reconcilePublicDataExitSchema(recordedSchema().map(row=>
    row.table_name==='bookings' ? {...row,rls_enabled:false}: row));
  assert.equal(report.schemaMatchesRecordedScope, false);
  assert.deepEqual(report.publicTablesWithoutRls, ['bookings']);
});

test('duplicate or malformed table metadata cannot silently satisfy the inventory', () => {
  const schema = recordedSchema();
  const report = reconcilePublicDataExitSchema([
    ...schema,
    schema[0],
    {table_name:'leads',has_business_id:'true',rls_enabled:true},
    {table_name:'',has_business_id:true,rls_enabled:true},
    null
  ]);
  assert.equal(report.schemaMatchesRecordedScope, false);
  assert.deepEqual(report.duplicateTables, [schema[0].table_name]);
  assert.deepEqual(report.malformedEntries, [54,55,56]);
  assert.equal(report.pilotApproved, false);
});

test('missing, null or non-array schema observations fail closed instead of implying zero drift', () => {
  for (const value of [undefined,null,{},'[]']) {
    const report=reconcilePublicDataExitSchema(value);
    assert.equal(report.schemaMatchesRecordedScope, false);
    assert.equal(report.missingTables.length,53);
    assert.ok(report.malformedEntries.length>0);
    assert.equal(report.pilotApproved,false);
  }
});
