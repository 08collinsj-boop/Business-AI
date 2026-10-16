import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {assessRecoveryReadiness, readArchivedMigrationSnapshots} from '../scripts/colzo-recovery-evidence.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEV='mvwseobgkexzpmmkgcxe';
const required=['20261012223925','20261016153313'];
const inventory={projectRef:DEV,requiredMigrations:required,storageBuckets:['business-knowledge','marketing-images','business-profile-media'],
 latestBackupVerified:false,isolatedRestoreTested:false,storageObjectsReconciled:false};

test('exact source snapshots of the two Dev-applied migrations are hash verified',()=>{
 const found=readArchivedMigrationSnapshots({root,versions:required});
 assert.deepEqual(found.map(x=>x.version),required);
 assert.ok(found.every(x=>x.verified),JSON.stringify(found));
 assert.ok(found.every(x=>x.path.startsWith('docs/colzo-migration-recovery/applied-dev-snapshots/')));
 assert.ok(found.every(x=>!existsSync(path.join(root,'supabase/migrations',path.basename(x.path)))));
});
test('Dev-only WhatsApp snapshot cannot be a production auto migration',()=>{
 const found=readArchivedMigrationSnapshots({root,versions:required});
 const devOnly=found.find(x=>x.version==='20261016153313');
 assert.equal(devOnly.environment,'dev-only');
 assert.equal(devOnly.name,'colzo_whatsapp_synthetic_inbox_dev_20261016');
 assert.equal(devOnly.verified,true);
});
test('recovered history must not claim backup or environment rebuild is complete',()=>{
 const result=assessRecoveryReadiness({root,inventory});
 assert.equal(result.status,'BLOCKED');
 assert.deepEqual(result.archivedAppliedMigrations.map(x=>x.version),required);
 assert.ok(result.archivedAppliedMigrations.every(x=>x.verified));
 assert.ok(result.blockers.includes('No verified restorable backup'));
 assert.ok(result.blockers.includes('No isolated restore drill'));
 assert.ok(result.blockers.includes('Storage objects have not been reconciled with the restore'));
 assert.ok(result.missingMigrations.includes('20261016153313'));
});
test('changed archived SQL bytes are rejected even if the manifest is unchanged',async t=>{
 const fs=await import('node:fs');
 const os=await import('node:os');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'colzo-snapshot-test-'));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const relative='docs/colzo-migration-recovery/applied-dev-snapshots';
 fs.mkdirSync(path.join(tmp,relative),{recursive:true});
 for(const name of ['manifest.json','20261012223925_post_pilot_colzo_projects_quotes_clients.sql','20261016153313_colzo_whatsapp_synthetic_inbox_dev_20261016.sql']){
  fs.copyFileSync(path.join(root,relative,name),path.join(tmp,relative,name));
 }
 const target=path.join(tmp,relative,'20261016153313_colzo_whatsapp_synthetic_inbox_dev_20261016.sql');
 fs.appendFileSync(target,'\n-- an unauthorised change\n');
 const snapshots=readArchivedMigrationSnapshots({root:tmp,versions:required});
 assert.equal(snapshots[0].verified,true);
 assert.equal(snapshots[1].verified,false);
});
test('migration snapshot guard does not accept caller-invented versions or fake manifest paths',()=>{
 const found=readArchivedMigrationSnapshots({root,versions:['20261012223925','20261016153313','20990101000000']});
 assert.equal(found[2].verified,false);
 assert.equal(found[2].path,'');
 assert.throws(()=>readArchivedMigrationSnapshots({root,versions:['../etc/passwd']}),/migration versions required/);
});
