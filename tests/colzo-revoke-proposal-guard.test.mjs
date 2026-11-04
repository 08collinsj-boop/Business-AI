import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const proposal=readFileSync(new URL('../docs/colzo-pilot-review/ISOLATED_FIXTURE_REVOKE_20261028.CORRECTED.PROPOSED.sql',import.meta.url),'utf8');
// These are source-shape guardrails, NOT a substitute for native PostgreSQL or live JWT acceptance.
const sql=proposal.replace(/--[^\r\n]*/g,'');

test('fictional revoke temporarily grants SET without enabling inheritance',()=>{
  const grants=[...sql.matchAll(/^GRANT\s+colzo_pilot_operator\s+TO\s+postgres\s+WITH\s+([^;]+);/gim)];
  assert.equal(grants.length,1,'exactly one temporary operator grant');
  assert.match(grants[0][1].trim(),/^SET TRUE,\s*INHERIT FALSE$/i);
  assert.equal((sql.match(/^BEGIN;$/gm)||[]).length,1);
  assert.equal((sql.match(/^COMMIT;$/gm)||[]).length,1);
});

test('fictional revoke removes only the additional postgres-granted membership',()=>{
  assert.match(sql,/REVOKE\s+colzo_pilot_operator\s+FROM\s+postgres\s+GRANTED\s+BY\s+postgres\s+RESTRICT\s*;/i);
  assert.match(sql,/grantor\.rolname='supabase_admin'/i);
  assert.match(sql,/g\.rolname='supabase_admin'/i);
  assert.match(sql,/pg_has_role\('postgres','colzo_pilot_operator','SET'\)/);
  assert.match(sql,/pg_has_role\('postgres','colzo_pilot_operator','USAGE'\)/);
  assert.match(sql,/m\.rolname='postgres'\)<>1/);
});

test('fictional revoke calls only the audited target operation and no direct DML',()=>{
  assert.equal((sql.match(/\bcolzo_pilot_private\.revoke_access\s*\(/gi)||[]).length,1);
  assert.doesNotMatch(sql,/\bcolzo_pilot_private\.(?:grant_access|invite|accept_invite|provision_workspace|record_expiry)\s*\(/i);
  assert.doesNotMatch(sql,/\b(?:INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM|TRUNCATE\s+)\b/i);
  assert.match(sql,/End of authorised isolated fictional acceptance tests/);
  assert.match(sql,/result->>'status'='revoked'/);
});
