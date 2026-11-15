import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {PREVIEW_DATASETS,TENANT_EXPORT_LIMITS} from './colzo-tenant-export-engine.js';
import {buildStorageAttachmentManifest} from './colzo-tenant-export-classification.js';
const sha256=buf=>createHash('sha256').update(buf).digest('hex');
const fail=()=>{throw Error('Incomplete or invalid fictional tenant export — unavailable');};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function buildFictionalDraftPackage(draft,{now=new Date()}={}){
 if(!draft||typeof draft!=='object'||!UUID.test(String(draft.business_id||''))||draft.format!=='colzo-fictional-tenant-draft-v1'
 ||draft.export_complete!==false||draft.snapshot_consistent!==false||draft.deletion_authorised!==false
 ||draft.reconciliation_passed!==true||!draft.data||typeof draft.data!=='object'||!draft.counts)fail();
 const tables=Object.keys(PREVIEW_DATASETS);
 if(Object.keys(draft.data).length!==tables.length||Object.keys(draft.counts).length!==tables.length
  ||!tables.every(t=>Object.hasOwn(draft.data,t)&&Object.hasOwn(draft.counts,t)))fail();
 let bytes=0,total=0;
 for(const table of tables){
  const allowed=new Set(PREVIEW_DATASETS[table].split(','));
  const rows=draft.data[table];
  if(!Array.isArray(rows)||rows.length>TENANT_EXPORT_LIMITS.maxRowsPerTable||draft.counts[table]!==rows.length)fail();
  total+=rows.length;
  for(const row of rows){
   if(!row||typeof row!=='object'||Array.isArray(row)||row.business_id!==draft.business_id
   ||Object.keys(row).some(k=>!allowed.has(k)))fail();
   bytes+=Buffer.byteLength(JSON.stringify(row),'utf8');
   if(bytes>TENANT_EXPORT_LIMITS.maxJsonBytes)fail();
  }
 }
 if(total>TENANT_EXPORT_LIMITS.maxTotalRows)fail();
 const storage_manifest=buildStorageAttachmentManifest({businessId:draft.business_id,data:draft.data});
 const timestamp=now instanceof Date&&Number.isFinite(now.getTime())?now.toISOString():null;
 if(!timestamp)fail();
 const raw=Buffer.from(JSON.stringify({...draft,generated_at:timestamp,storage_manifest,
  download_notice:'PARTIAL FICTIONAL DEVELOPMENT REVIEW. NOT FULL BUSINESS DATA RETURN OR DELETION RECEIPT.'}),'utf8');
 if(raw.byteLength>TENANT_EXPORT_LIMITS.maxJsonBytes+100_000)fail();
 const buffer=gzipSync(raw,{level:6});
 if(buffer.byteLength>TENANT_EXPORT_LIMITS.maxJsonBytes+100_000)fail();
 return Object.freeze({buffer,filename:'colzo-fictional-tenant-review.json.gz',contentType:'application/gzip',
  sha256:sha256(buffer),dataSha256:sha256(raw),compressedBytes:buffer.length,uncompressedBytes:raw.length});
}
