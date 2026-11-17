import assert from 'node:assert/strict';
import test from 'node:test';
import { PREVIEW_DATASETS, TENANT_EXPORT_PRIMARY_KEYS } from '../lib/colzo-tenant-export-engine.js';
import { assessDraftTenantExportSchema } from '../lib/colzo-tenant-export-schema-audit.js';

// Fictional pg_catalog-shaped metadata, never exported rows or credentials.
function approvedMetadata() {
  return Object.entries(PREVIEW_DATASETS).map(([table_name, fields]) => ({
    table_name,
    columns: fields.split(','),
    primary_key: TENANT_EXPORT_PRIMARY_KEYS[table_name] || ['id'],
    rls_enabled: true
  }));
}

test('all forty explicit field projections and pagination keys reconcile without approval', () => {
  const report = assessDraftTenantExportSchema(approvedMetadata());
  assert.equal(Object.keys(PREVIEW_DATASETS).length, 40);
  assert.equal(report.schemaMatchesDeclaredExport, true);
  assert.equal(report.matchedDatasets, 40);
  assert.equal(report.selectedFieldCount, 390);
  assert.deepEqual(report.missingTables, []);
  assert.deepEqual(report.missingSelectedColumns, []);
  assert.deepEqual(report.primaryKeyMismatches, []);
  assert.deepEqual(report.tablesWithoutRls, []);
  assert.deepEqual(report.unknownTables, []);
  assert.deepEqual(report.duplicateTables, []);
  assert.deepEqual(report.malformedEntries, []);
  assert.equal(report.realExportVerified, false);
  assert.equal(report.pilotApproved, false);
  assert.ok(Object.isFrozen(report));
});

test('a selected field missing from the live table fails closed without adding new fields', () => {
  const observed = approvedMetadata().map(x =>
    x.table_name === 'leads' ? {...x,columns:x.columns.filter(y=>y!=='notes')} : x);
  const r=assessDraftTenantExportSchema(observed);
  assert.equal(r.schemaMatchesDeclaredExport,false);
  assert.deepEqual(r.missingSelectedColumns,[{table_name:'leads',column:'notes'}]);
});

test('a changed or shortened composite primary key fails closed even when the fields still exist', () => {
  const observed = approvedMetadata().map(x =>
    x.table_name === 'business_feature_entitlements'
      ? {...x,primary_key:['business_id']} : x);
  const r=assessDraftTenantExportSchema(observed);
  assert.equal(r.schemaMatchesDeclaredExport,false);
  assert.deepEqual(r.primaryKeyMismatches,[{
    table_name:'business_feature_entitlements',
    expected:['business_id','feature_key'],
    actual:['business_id']
  }]);
});

test('RLS disabled on any selected table blocks this structural preflight', () => {
  const observed = approvedMetadata().map(x =>
    x.table_name === 'bookings' ? {...x,rls_enabled:false} : x);
  const r=assessDraftTenantExportSchema(observed);
  assert.equal(r.schemaMatchesDeclaredExport,false);
  assert.deepEqual(r.tablesWithoutRls,['bookings']);
});

test('missing or extra tables block the projection contract', () => {
  const observed = approvedMetadata().filter(x=>x.table_name!=='actions');
  observed.push({table_name:'unknown_tenant_secrets',columns:['id'],primary_key:['id'],rls_enabled:true});
  const r=assessDraftTenantExportSchema(observed);
  assert.equal(r.schemaMatchesDeclaredExport,false);
  assert.deepEqual(r.missingTables,['actions']);
  assert.deepEqual(r.unknownTables,['unknown_tenant_secrets']);
});

test('duplicate or malformed metadata cannot be counted as 40 valid tables', () => {
  const observed = approvedMetadata();
  observed.push(observed[0],{table_name:'leads',columns:['id'],primary_key:'id',rls_enabled:true},null);
  const r=assessDraftTenantExportSchema(observed);
  assert.equal(r.schemaMatchesDeclaredExport,false);
  assert.deepEqual(r.duplicateTables,[observed[0].table_name]);
  assert.deepEqual(r.malformedEntries,[41,42]);
});

test('an absent or untrusted schema result does not accidentally approve a data exit', () => {
  for(const value of [undefined,null,{},'[]']) {
    const r=assessDraftTenantExportSchema(value);
    assert.equal(r.schemaMatchesDeclaredExport,false);
    assert.equal(r.missingTables.length,40);
    assert.ok(r.malformedEntries.length>0);
    assert.equal(r.realExportVerified,false);
    assert.equal(r.pilotApproved,false);
  }
});
