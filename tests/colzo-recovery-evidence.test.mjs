import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assessRecoveryReadiness} from '../scripts/colzo-recovery-evidence.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const inventory={
 projectRef:'mvwseobgkexzpmmkgcxe',
 requiredMigrations:['20261012223925','20261016153313'],
 storageBuckets:['business-knowledge','marketing-images','business-profile-media'],
 latestBackupVerified:false,isolatedRestoreTested:false,storageObjectsReconciled:false
};
test('missing SQL migration files and unverified backup keep Dev release NO-GO',()=>{
 const report=assessRecoveryReadiness({root,inventory});
 assert.equal(report.status,'BLOCKED');
 assert.deepEqual(report.missingMigrations,inventory.requiredMigrations);
 assert.equal(report.storageBuckets.length,3);
 assert.ok(report.blockers.includes('No verified restorable backup'));
 assert.ok(report.blockers.includes('No isolated restore drill'));
});
test('wrong Dev project identifier cannot be accepted',()=>{
 assert.throws(()=>assessRecoveryReadiness({root,inventory:{...inventory,projectRef:'not-dev'}}),/Expected the isolated Dev project/);
});
test('a claimed restore without source SQL or storage evidence is still blocked',()=>{
 const report=assessRecoveryReadiness({root,inventory:{...inventory,latestBackupVerified:true,isolatedRestoreTested:true}});
 assert.equal(report.status,'BLOCKED');
 assert.ok(report.blockers.some(x=>x.includes('migration')));
 assert.ok(report.blockers.some(x=>x.includes('Storage')));
});
test('manifest only reports metadata, never user data or credentials',()=>{
 const report=assessRecoveryReadiness({root,inventory});
 assert.equal(report.mode,'read-only-local-metadata');
 assert.equal(JSON.stringify(report).includes('SUPABASE_SERVICE_ROLE_KEY'),false);
 assert.equal(Object.hasOwn(report,'databaseRows'),false);
});
test('attesting a fabricated migration filename cannot pass source recovery check',()=>{
 const report=assessRecoveryReadiness({root,inventory:{
  ...inventory,migrationFilenames:inventory.requiredMigrations.map(x=>x+'_pretend.sql'),
  latestBackupVerified:true,isolatedRestoreTested:true,storageObjectsReconciled:true
 }});
 assert.equal(report.status,'BLOCKED');
 assert.deepEqual(report.missingMigrations,inventory.requiredMigrations);
});
