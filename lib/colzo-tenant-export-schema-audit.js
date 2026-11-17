// Metadata-only, synthetic-testable contract for the 40 allowlisted draft
// tenant-export projections. This module performs no SQL, network requests,
// row exports, deletion, Storage access, or customer-facing approval.
import {
  PREVIEW_DATASETS, TENANT_EXPORT_PRIMARY_KEYS
} from './colzo-tenant-export-engine.js';

const IDENTIFIER = /^[a-z][a-z0-9_]*$/;

function validIdentifiers(items) {
  return Array.isArray(items)
    && items.length > 0
    && items.every(item => typeof item === 'string' && IDENTIFIER.test(item))
    && new Set(items).size === items.length;
}

export function assessDraftTenantExportSchema(observedTables) {
  const definitions = Object.entries(PREVIEW_DATASETS).map(([name, fields]) => ({
    name,
    selectedFields: fields.split(','),
    primaryKey: TENANT_EXPORT_PRIMARY_KEYS[name] || ['id']
  }));
  const expected = new Map(definitions.map(row => [row.name, row]));
  const observed = new Map();
  const duplicateTables = [];
  const malformedEntries = [];

  if (!Array.isArray(observedTables)) {
    malformedEntries.push(-1);
    observedTables = [];
  }

  for (const [index, entry] of observedTables.entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)
        || typeof entry.table_name !== 'string' || !IDENTIFIER.test(entry.table_name)
        || !validIdentifiers(entry.columns)
        || !validIdentifiers(entry.primary_key)
        || typeof entry.rls_enabled !== 'boolean') {
      malformedEntries.push(index);
      continue;
    }
    if (observed.has(entry.table_name)) {
      duplicateTables.push(entry.table_name);
      continue;
    }
    observed.set(entry.table_name, entry);
  }

  const missingTables = definitions.filter(row => !observed.has(row.name))
    .map(row => row.name).sort();
  const unknownTables = [...observed.keys()].filter(name => !expected.has(name)).sort();
  const missingSelectedColumns = [];
  const primaryKeyMismatches = [];
  const tablesWithoutRls = [];

  for (const definition of definitions) {
    const row = observed.get(definition.name);
    if (!row) continue;
    const columns = new Set(row.columns);
    for (const column of definition.selectedFields) {
      if (!columns.has(column)) {
        missingSelectedColumns.push(Object.freeze({
          table_name: definition.name, column
        }));
      }
    }
    if (JSON.stringify(row.primary_key) !== JSON.stringify(definition.primaryKey)) {
      primaryKeyMismatches.push(Object.freeze({
        table_name: definition.name,
        expected: Object.freeze([...definition.primaryKey]),
        actual: Object.freeze([...row.primary_key])
      }));
    }
    if (!row.rls_enabled) tablesWithoutRls.push(definition.name);
  }

  missingSelectedColumns.sort((a,b) =>
    a.table_name.localeCompare(b.table_name) || a.column.localeCompare(b.column));
  primaryKeyMismatches.sort((a,b) => a.table_name.localeCompare(b.table_name));
  tablesWithoutRls.sort();
  duplicateTables.sort();

  const schemaMatchesDeclaredExport = [
    missingTables, unknownTables, missingSelectedColumns,
    primaryKeyMismatches, tablesWithoutRls, duplicateTables, malformedEntries
  ].every(items => items.length === 0);

  return Object.freeze({
    schemaMatchesDeclaredExport,
    matchedDatasets: definitions.filter(row => observed.has(row.name)).length,
    selectedFieldCount: definitions.reduce((sum,row) => sum + row.selectedFields.length, 0),
    missingTables: Object.freeze(missingTables),
    unknownTables: Object.freeze(unknownTables),
    missingSelectedColumns: Object.freeze(missingSelectedColumns),
    primaryKeyMismatches: Object.freeze(primaryKeyMismatches),
    tablesWithoutRls: Object.freeze(tablesWithoutRls),
    duplicateTables: Object.freeze(duplicateTables),
    malformedEntries: Object.freeze(malformedEntries),
    // Structural compatibility does not prove tenant ownership, RLS policy
    // enforcement, API privileges, consistency, storage bytes, recovery,
    // legal authorisation, or a complete data exit.
    realExportVerified: false,
    pilotApproved: false
  });
}
