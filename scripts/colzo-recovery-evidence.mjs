/* Strictly local recovery evidence assessment. No network, SQL, backups or writes. */
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const DEV_REF='mvwseobgkexzpmmkgcxe';
const MIGRATION_PATTERN=/^[0-9]{14}$/;
export function assessRecoveryReadiness({root,inventory}){
 if(typeof root!=='string'||!root)throw TypeError('A repository root is required');
 if(inventory?.projectRef!==DEV_REF)throw Error('Expected the isolated Dev project; no Production inventory allowed');
 if(!Array.isArray(inventory.requiredMigrations)||!inventory.requiredMigrations.every(x=>typeof x==='string'&&MIGRATION_PATTERN.test(x)))throw TypeError('Verified applied migration versions are required');
 if(!Array.isArray(inventory.storageBuckets)||!inventory.storageBuckets.every(x=>typeof x==='string'&&x.length>0))throw TypeError('Storage bucket inventory is required');
 const existing=inventory.requiredMigrations.filter(version=>{
   const dir=path.join(root,'supabase','migrations');
   if(!existsSync(dir))return false;
   return Array.from((new Set(inventory.migrationFilenames||[]))).some(n=>n.startsWith(version) && existsSync(path.join(dir,n)));
 });
 // Filename inventory is explicitly provided by the owner/recovery operator,
 // not guessed from the selected Supabase project.
 const missingMigrations=inventory.requiredMigrations.filter(x=>!existing.includes(x));
 const blockers=[];
 if(missingMigrations.length)blockers.push('Applied Dev migration SQL is missing from the source inventory');
 if(!inventory.latestBackupVerified)blockers.push('No verified restorable backup');
 if(!inventory.isolatedRestoreTested)blockers.push('No isolated restore drill');
 if(!inventory.storageObjectsReconciled)blockers.push('Storage objects have not been reconciled with the restore');
 return {mode:'read-only-local-metadata',projectRef:DEV_REF,status:blockers.length?'BLOCKED':'READY_FOR_OWNER_REVIEW',missingMigrations,
  storageBuckets:[...inventory.storageBuckets].sort(),blockers,note:'This report never certifies a backup or performs a restore. READY_FOR_OWNER_REVIEW is not launch approval.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+path.resolve(process.argv[1])).href){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const inventory={projectRef:DEV_REF,requiredMigrations:['20261012223925','20261016153313'],migrationFilenames:[],
  storageBuckets:['business-knowledge','marketing-images','business-profile-media'],
  latestBackupVerified:false,isolatedRestoreTested:false,storageObjectsReconciled:false};
 const result=assessRecoveryReadiness({root,inventory});
 console.log(JSON.stringify(result,null,2));if(result.status==='BLOCKED')process.exitCode=1;
}
