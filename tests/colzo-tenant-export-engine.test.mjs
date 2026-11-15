import test from 'node:test';
import assert from 'node:assert/strict';
import {PREVIEW_DATASETS, TENANT_EXPORT_LIMITS, collectDraftTenantExport, planTenantDeletion} from '../lib/colzo-tenant-export-engine.js';

const tenant='10000000-0000-4000-8000-000000000001';
const foreign='20000000-0000-4000-8000-000000000002';
const manyRows=(count,table, businessId=tenant)=>Array.from({length:count},(_,i)=>({id:i+1,business_id:businessId,...(table==='leads'?{name:`Customer ${i}`}:{})}));
const fixture=({counts={},foreignTable=null,duplicateTable=null,extraSecretTable=null,failedTable=null}={})=>{
 const calls=[];
 const readPage=async ({table,businessId,fields,offset,limit})=>{
  calls.push({table,businessId,fields,offset,limit});
  if(table===failedTable)throw Error('database failed');
  const all=manyRows(counts[table]??0,table,table===foreignTable?foreign:tenant);
  if(table===duplicateTable&&all.length>1)all[1].id=all[0].id;
  if(table===extraSecretTable&&all.length)all[0].token_ciphertext='secret';
  return all.slice(offset,offset+limit);
 };
 return {readPage,calls};
};

test('fictional tenant draft includes only allowlisted fields, and never claims complete exit',async()=>{
 const x=fixture({counts:{leads:2,actions:1}});
 const e=await collectDraftTenantExport({businessId:tenant,readPage:x.readPage});
 assert.equal(e.business_id,tenant);assert.equal(e.export_complete,false);assert.equal(e.deletion_authorised,false);
 assert.equal(e.snapshot_consistent,false);assert.equal(e.data.leads.length,2);
 assert.equal(e.counts.actions,1);
 assert.ok(e.missing_nonpublic_domains.includes('storage_metadata_and_object_bytes'));
 assert.ok(e.omitted_public_tables.includes('marketing_meta_oauth_states')); assert.ok(!PREVIEW_DATASETS.marketing_meta_connections.includes('token_ciphertext'));
 assert.equal(x.calls.length,Object.keys(PREVIEW_DATASETS).length);
 assert.ok(x.calls.every(a=>a.businessId===tenant&&a.fields.includes('business_id')&&!a.fields.includes('token_ciphertext')));
});

test('reads every page beyond default first-page limits rather than truncate',async()=>{
 const x=fixture({counts:{leads:421}});
 const e=await collectDraftTenantExport({businessId:tenant,readPage:x.readPage});
 assert.equal(e.data.leads.length,421);
 assert.deepEqual(x.calls.filter(c=>c.table==='leads').map(c=>c.offset),[0,200,400]);
});

test('exact page boundary probes the next page to confirm completeness',async()=>{
 const x=fixture({counts:{leads:200}});
 const e=await collectDraftTenantExport({businessId:tenant,readPage:x.readPage});
 assert.equal(e.data.leads.length,200);
 assert.deepEqual(x.calls.filter(c=>c.table==='leads').map(c=>c.offset),[0,200]);
});

test('wrong tenant, duplicate IDs and provider secrets fail closed with no result',async()=>{
 for(const option of [{foreignTable:'leads'},{duplicateTable:'leads'},{extraSecretTable:'leads'}]){
  const x=fixture({counts:{leads:2},...option});
  await assert.rejects(collectDraftTenantExport({businessId:tenant,readPage:x.readPage}),/unavailable or incomplete/);
 }
});

test('failed page prevents a partial successful export',async()=>{
 const x=fixture({counts:{leads:3},failedTable:'bookings'});
 await assert.rejects(collectDraftTenantExport({businessId:tenant,readPage:x.readPage}),/database failed/);
});

test('row cap fails closed without truncating and accepting incomplete result',async()=>{
 const x=fixture({counts:{leads:TENANT_EXPORT_LIMITS.maxRowsPerTable+1}});
 await assert.rejects(collectDraftTenantExport({businessId:tenant,readPage:x.readPage}),/unavailable or incomplete/);
});

test('missing UUID and missing readPage never reach retrieval',async()=>{
 await assert.rejects(collectDraftTenantExport({businessId:foreign+'junk',readPage:()=>[]}),/unavailable or incomplete/);
 await assert.rejects(collectDraftTenantExport({businessId:tenant}),/unavailable or incomplete/);
});

test('deletion gate remains inert even with hypothetical restore and approval',()=>{
 const x=planTenantDeletion({businessId:tenant,restoreVerified:true,approved:true});
 assert.equal(x.executable,false);assert.equal(x.deletion_performed,false);
 assert.ok(x.blockers.includes('transactional_tenant_erasure_unimplemented'));
 assert.throws(()=>planTenantDeletion({businessId:'not-a-uuid'}),/unavailable or incomplete/);
});

test('unexpected zero or negative record identifiers cannot enter a draft export',async()=>{
 for(const id of [0,-1]){
  await assert.rejects(collectDraftTenantExport({businessId:tenant,
    readPage:async ({table})=>table==='leads'?[{id,business_id:tenant}]:[]}),/unavailable or incomplete/);
 }
});
