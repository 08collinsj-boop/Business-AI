/* Source-only evidence checks. NEVER execute SQL, restore data or access a provider. */
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const DEV_REF='mvwseobgkexzpmmkgcxe';
const VERSION=/^[0-9]{14}$/;
const DIRECTORY='docs/colzo-migration-recovery/applied-dev-snapshots/';
const PINNED=Object.freeze({
 '20261012223925':{name:'post_pilot_colzo_projects_quotes_clients',environment:'historical-dev',
  sha256:'29a7e140c2d3b387dab4f68fb6f305bbc6aaebb7df04fd75bc35ba06a76ba410'},
 '20261016153313':{name:'colzo_whatsapp_synthetic_inbox_dev_20261016',environment:'dev-only',
  sha256:'1e3ea3593d9814c348977a2ee5d7c62a245cb5dbba3e2e014a2ab979b274536c'}
});
function versionsValid(versions){
 return Array.isArray(versions)&&versions.every(v=>typeof v==='string'&&VERSION.test(v));
}
export function readArchivedMigrationSnapshots({root,versions}){
 if(typeof root!=='string'||!root||!versionsValid(versions))throw TypeError('Repository root and migration versions required');
 let manifest=null;
 try{manifest=JSON.parse(readFileSync(path.join(root,DIRECTORY,'manifest.json'),'utf8'));}catch{}
 return versions.map(version=>{
  const expected=PINNED[version];
  const relative=expected?DIRECTORY+version+'_'+expected.name+'.sql':'';
  const item=manifest?.migrations?.find(x=>x?.version===version);
  let verified=false;
  if(expected&&manifest?.projectRef===DEV_REF&&item?.path===relative&&item.name===expected.name
     &&item.environment===expected.environment&&item.sha256===expected.sha256
     &&item.application==='archive-only-not-auto-migrated'){
   try{
    const data=readFileSync(path.join(root,relative));
    verified=createHash('sha256').update(data).digest('hex')===expected.sha256;
   }catch{}
  }
  return {version,name:expected?.name||'not-recovered',environment:expected?.environment||'unknown',
    path:relative,verified};
 });
}
export function assessRecoveryReadiness({root,inventory}){
 if(typeof root!=='string'||!root)throw TypeError('A repository root is required');
 if(inventory?.projectRef!==DEV_REF)throw Error('Expected the isolated Dev project; no Production inventory allowed');
 if(!versionsValid(inventory.requiredMigrations))throw TypeError('Verified applied migration versions are required');
 if(!Array.isArray(inventory.storageBuckets)||!inventory.storageBuckets.every(x=>typeof x==='string'&&x.length>0))throw TypeError('Storage bucket inventory is required');
 // Inspect actual source files. A caller cannot forge an inventory with invented names.
 const dir=path.join(root,'supabase','migrations');
 const sqlFiles=existsSync(dir)?readdirSync(dir).filter(n=>VERSION.test(n.slice(0,14))&&n.endsWith('.sql')):[];
 const missingMigrations=inventory.requiredMigrations.filter(v=>!sqlFiles.some(n=>n.startsWith(v+'_')));
 const archivedAppliedMigrations=readArchivedMigrationSnapshots({root,versions:inventory.requiredMigrations});
 const blockers=[];
 if(archivedAppliedMigrations.some(m=>!m.verified))blockers.push('Applied Dev migration history source snapshot is missing or changed');
 if(missingMigrations.length)blockers.push('Applied Dev migration SQL is missing from the automatic migration source folder');
 if(!inventory.latestBackupVerified)blockers.push('No verified restorable backup');
 if(!inventory.isolatedRestoreTested)blockers.push('No isolated restore drill');
 if(!inventory.storageObjectsReconciled)blockers.push('Storage objects have not been reconciled with the restore');
 return {mode:'read-only-local-metadata',projectRef:DEV_REF,status:blockers.length?'BLOCKED':'READY_FOR_OWNER_REVIEW',
  archivedAppliedMigrations,missingMigrations,storageBuckets:[...inventory.storageBuckets].sort(),blockers,
  note:'Recovered historical SQL is archival evidence only. This never deploys, restores or certifies recovery.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+path.resolve(process.argv[1])).href){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const inventory={projectRef:DEV_REF,requiredMigrations:Object.keys(PINNED),
  storageBuckets:['business-knowledge','marketing-images','business-profile-media'],
  latestBackupVerified:false,isolatedRestoreTested:false,storageObjectsReconciled:false};
 const result=assessRecoveryReadiness({root,inventory});
 console.log(JSON.stringify(result,null,2));
 if(result.status==='BLOCKED')process.exitCode=1;
}
