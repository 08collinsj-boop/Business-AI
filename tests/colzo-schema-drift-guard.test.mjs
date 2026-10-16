import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {assessColzoCatalog,assessBackupInventory} from '../scripts/colzo-schema-drift-guard.mjs';

const evidence=JSON.parse(readFileSync(new URL('../docs/colzo-migration-recovery/dev-catalog-evidence-20261017.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(evidence);
const failures=result=>result.checks.filter(x=>x.status==='FAIL');

test('snapshot evidence from read-only Dev catalog matches approved Colzo table invariants',()=>{
 const result=assessColzoCatalog(copy());
 assert.equal(result.status,'SNAPSHOT_MATCH');
 assert.ok(result.checks.length>=20);
 assert.deepEqual(failures(result),[]);
 assert.equal(result.liveVerified,false,'local snapshot must never certify the current database or release');
});

test('missing tenant FK or weaker business isolation is a failed catalog check',()=>{
 const x=copy();
 x.constraints=x.constraints.filter(c=>c.name!=='colzo_quotes_lead_tenant_fkey');
 x.roles.find(r=>r.table_name==='colzo_quotes').authenticated_select=true;
 const result=assessColzoCatalog(x);
 assert.equal(result.status,'SCHEMA_MISMATCH');
 assert.ok(failures(result).some(c=>c.id==='quotes-tenant-foreign-key'));
 assert.ok(failures(result).some(c=>c.id==='quotes-role-deny'));
});

test('RLS off, missing required column or index fails closed',()=>{
 const x=copy();
 x.roles.find(r=>r.table_name==='colzo_clients').rls_enabled=false;
 x.columns=x.columns.filter(c=>!(c.table_name==='colzo_clients'&&c.column_name==='business_id'));
 x.indexes=x.indexes.filter(i=>i.name!=='colzo_clients_business_idx');
 const result=assessColzoCatalog(x);
 assert.equal(result.status,'SCHEMA_MISMATCH');
 for(const id of ['clients-rls','clients-column-business_id','clients-business-index'])
  assert.ok(failures(result).some(c=>c.id===id),id);
});

test('WhatsApp synthetic inbox must keep an owner/admin-only authenticated read policy',()=>{
 const x=copy();
 x.policies[0].qual='true';
 const result=assessColzoCatalog(x);
 assert.equal(result.status,'SCHEMA_MISMATCH');
 assert.ok(failures(result).some(c=>c.id==='whatsapp-owner-admin-policy'));
});

test('snapshot is explicitly tied to Dev and never a current authenticated entitlement',()=>{
 const x=copy();x.projectRef='different-project';
 assert.throws(()=>assessColzoCatalog(x),/expected Dev project/);
 const valid=assessColzoCatalog(copy());
 assert.equal(valid.projectRef,'mvwseobgkexzpmmkgcxe');
 assert.equal(valid.liveVerified,false);
});

test('zero listed managed backups and no PITR means restore is NOT VERIFIED',()=>{
 const result=assessBackupInventory(copy());
 assert.equal(result.status,'NO_RESTORABLE_BACKUP_VERIFIED');
 assert.ok(result.blockers.includes('No listed provider-managed database backup'));
 assert.ok(result.blockers.includes('Point-in-time recovery disabled'));
 assert.equal(result.walgEnabledIsBackupProof,false);
});

test('WAL-G internal flag never upgrades backup evidence to usable restore',()=>{
 const x=copy();x.backupInventory={...x.backupInventory,walg_enabled:true};
 assert.equal(assessBackupInventory(x).status,'NO_RESTORABLE_BACKUP_VERIFIED');
});
test('an existing backup listing still does not certify a successful restore',()=>{
 const x=copy();x.backupInventory.backups_count=1;x.backupInventory.backups='LISTED_OR_UNKNOWN';
 const result=assessBackupInventory(x);
 assert.equal(result.status,'RESTORE_NOT_VERIFIED');
 assert.equal(result.listedBackups,1);
 assert.ok(result.blockers.includes('No isolated database and Storage restore drill verified'));
});
test('any public role privilege granted to a protected records table fails the guard',()=>{
 for(const property of ['anon_select','anon_insert','authenticated_insert','authenticated_update']){
  const x=copy();x.roles.find(r=>r.table_name==='colzo_projects')[property]=true;
  const result=assessColzoCatalog(x);
  assert.equal(result.status,'SCHEMA_MISMATCH');
  assert.ok(result.checks.some(c=>c.id==='projects-role-deny'&&c.status==='FAIL'),property);
 }
});
