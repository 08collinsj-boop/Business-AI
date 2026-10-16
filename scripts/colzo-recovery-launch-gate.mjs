/* Local-only recovery release gate. Never performs database, network, secret or file writes.
   A stored JSON receipt is not an independent proof of an isolated restore. */
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {assessColzoCatalog,assessBackupInventory} from './colzo-schema-drift-guard.mjs';
import {assessRecoveryReadiness} from './colzo-recovery-evidence.mjs';

const DEV_REF='mvwseobgkexzpmmkgcxe';
const BUCKETS=['business-knowledge','business-profile-media','marketing-images'];
const MIGRATIONS=['20261012223925','20261016153313'];
const DAY_MS=24*60*60*1000, CLOCK_SKEW_MS=5*60*1000;
const ISO_UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|\+00:00)$/;
function fresh(snapshotTime,asOfMs) {
 if(typeof snapshotTime!=='string'||!ISO_UTC.test(snapshotTime)||!Number.isFinite(asOfMs))return false;
 const observed=Date.parse(snapshotTime);
 return Number.isFinite(observed)&&observed<=asOfMs+CLOCK_SKEW_MS
  &&observed>=asOfMs-DAY_MS;
}
function bucketCoverage(value){
 return Array.isArray(value)&&value.length===BUCKETS.length
  &&BUCKETS.every(b=>value.includes(b))
  &&value.every(b=>typeof b==='string');
}
export function assessRecoveryGate({root,catalog,asOfMs=Date.now()}){
 if(catalog?.projectRef!==DEV_REF)throw Error('Recovery gate requires expected Dev project only');
 if(typeof root!=='string'||!root)throw TypeError('A local repository root is required');
 const schema=assessColzoCatalog(catalog);
 const backup=assessBackupInventory(catalog);
 const historical=assessRecoveryReadiness({root,inventory:{
  projectRef:DEV_REF,requiredMigrations:MIGRATIONS,storageBuckets:BUCKETS,
  latestBackupVerified:false,isolatedRestoreTested:false,storageObjectsReconciled:false
 }});
 const checks=[];
 const add=(id,ok,note)=>checks.push({id,ok:ok===true,note});
 add('catalog-fresh',fresh(catalog.observedAtUTC,asOfMs),'Snapshot must be within 24h and no more than 5m in the future');
 add('catalog-matches',schema.status==='SNAPSHOT_MATCH','Required Colzo tables, grants, indexes, policy and tenant keys');
 add('source-history-archived',historical.archivedAppliedMigrations.every(m=>m.verified),'Historical source recovered with pinned checksums');
 add('auto-migration-reproducible',historical.missingMigrations.length===0,
  'Historical Dev migrations must not be blindly copied to Production');
 add('provider-backup-listed',Number.isSafeInteger(backup.listedBackups)&&backup.listedBackups>0,
  'Provider backup list alone is not proof of restoration');
 add('storage-inventory',bucketCoverage(catalog.storageBuckets),
  'All three Storage buckets require separate object backup and reconciliation evidence');
 // No mutable JSON flags or developer-only fixtures can assert successful restore.
 // Actual restore certification requires an independently authorised drill and owner acceptance.
 add('isolated-restore-certified',false,'Requires separately verified isolated restore test, outside this local metadata tool');
 add('owner-release-approval',false,'Requires explicit owner approval of verified release SHA, cost ceiling and recovery evidence');
 return {status:'NO_GO',projectRef:DEV_REF,evidenceAtUTC:catalog.observedAtUTC,
  mode:'read-only-metadata-preflight',automaticReleaseAllowed:false,
  checks,blockers:checks.filter(c=>!c.ok).map(c=>({id:c.id,reason:c.note})),
  summary:{snapshotChecksPassed:schema.checked-schema.failed,snapshotChecksFailed:schema.failed,
   listedProviderBackups:backup.listedBackups,pointInTimeRecovery:backup.pitrEnabled,
   archiveSourcesVerified:historical.archivedAppliedMigrations.filter(m=>m.verified).length,
   missingAutomatedMigrations:historical.missingMigrations},
  note:'No local JSON file or success-looking boolean may authorise deployment; metadata preflight requires independent restore and owner evidence.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const input=process.argv[2];
 if(!input)throw Error('Provide a local metadata snapshot path');
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const catalog=JSON.parse(readFileSync(path.resolve(input),'utf8'));
 const result=assessRecoveryGate({root,catalog});
 console.log(JSON.stringify(result,null,2));
 process.exitCode=result.status==='NO_GO'?1:0;
}
