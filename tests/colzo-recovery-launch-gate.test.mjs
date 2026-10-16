import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {assessRecoveryGate} from '../scripts/colzo-recovery-launch-gate.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const data=JSON.parse(readFileSync(path.join(root,'docs/colzo-migration-recovery/dev-catalog-evidence-20261017.json'),'utf8'));
const checkedAt=Date.parse(data.observedAtUTC)+60*60*1000;
const withClock=(source,at=checkedAt)=>assessRecoveryGate({root,catalog:source,asOfMs:at});

test('actual Dev provider snapshot must block launch when no backups and no restore are certified',()=>{
 const x=withClock(structuredClone(data));
 assert.equal(x.status,'NO_GO');
 assert.ok(x.checks.find(c=>c.id==='catalog-fresh')?.ok);
 assert.ok(x.checks.find(c=>c.id==='catalog-matches')?.ok);
 assert.equal(x.checks.find(c=>c.id==='provider-backup-listed')?.ok,false);
 assert.equal(x.checks.find(c=>c.id==='isolated-restore-certified')?.ok,false);
 assert.ok(x.blockers.length>=4);
});

test('catalog snapshot older than one day or from the future fails closed',()=>{
 const stale=withClock(structuredClone(data),Date.parse(data.observedAtUTC)+25*60*60*1000);
 assert.equal(stale.checks.find(c=>c.id==='catalog-fresh')?.ok,false);
 const future=withClock(structuredClone(data),Date.parse(data.observedAtUTC)-6*60*1000);
 assert.equal(future.checks.find(c=>c.id==='catalog-fresh')?.ok,false);
 assert.equal(stale.status,'NO_GO');
});

test('a malformed timestamp or incorrect project identifier cannot claim recovery readiness',()=>{
 const malformed=structuredClone(data);malformed.observedAtUTC='unknown';
 assert.equal(withClock(malformed).checks.find(c=>c.id==='catalog-fresh')?.ok,false);
 const wrong=structuredClone(data);wrong.projectRef='some-other-project';
 assert.throws(()=>withClock(wrong),/expected Dev project/i);
});

test('privilege drift prevents launch even if a backup gets listed',()=>{
 const x=structuredClone(data);
 x.roles.find(r=>r.table_name==='colzo_quotes').authenticated_select=true;
 x.backupInventory.backups_count=1;
 assert.equal(withClock(x).checks.find(c=>c.id==='catalog-matches')?.ok,false);
 assert.equal(withClock(x).status,'NO_GO');
});

test('manual restore attestations or arbitrary booleans cannot turn read-only evidence into release approval',()=>{
 const x=structuredClone(data);
 x.backupInventory.backups_count=1;
 x.backupInventory.pitr_enabled=true;
 x.latestBackupVerified=true;
 x.isolatedRestoreTested=true;
 x.storageObjectsReconciled=true;
 const result=withClock(x);
 assert.equal(result.status,'NO_GO');
 assert.equal(result.checks.find(c=>c.id==='isolated-restore-certified')?.ok,false);
});

test('missing or unexpected Storage buckets are a blocker, not an implicit success',()=>{
 const x=structuredClone(data);
 x.storageBuckets=['business-knowledge'];
 assert.equal(withClock(x).checks.find(c=>c.id==='storage-inventory')?.ok,false);
});
