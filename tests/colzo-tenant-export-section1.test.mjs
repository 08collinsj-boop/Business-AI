import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {PREVIEW_DATASETS,collectDraftTenantExport,planTenantDeletion} from '../lib/colzo-tenant-export-engine.js';
import {classifyTenantExit,buildStorageAttachmentManifest} from '../lib/colzo-tenant-export-classification.js';
import {buildFictionalDraftPackage} from '../lib/colzo-tenant-export-package.js';
import {makeInertDeletionReview} from '../lib/colzo-tenant-deletion-review.js';
import {makeTenantExportHandler} from '../lib/colzo-tenant-export-handler.js';

const tenant='10000000-0000-4000-8000-000000000001';
const other='20000000-0000-4000-8000-000000000002';
const fixture=()=>collectDraftTenantExport({businessId:tenant,reconcile:true,readPage:async({table,offset})=>
table==='leads'&&offset===0?[{id:1,business_id:tenant,name:'FICTIONAL sample'}]:
table==='marketing_images'&&offset===0?[{id:7,business_id:tenant,storage_bucket:'test-media',storage_path:'demo/example.png'}]:[]});

test('53 public tables are classified into 40 redacted selections and 13 reviewed exclusions',()=>{
 const x=classifyTenantExit();
 assert.equal(x.totalPublic,53);assert.equal(x.allowed.length,40);assert.equal(x.deferred.length,13);
 assert.equal(x.unaccounted.length,0);assert.equal(x.fullBusinessExportAvailable,false);
 for(const t of ['stripe_webhook_events','customer_profiles','business_referrals','marketing_meta_oauth_states','public_enquiry_rate_limit_buckets'])
   assert.ok(x.deferred.find(a=>a.table===t)?.reason.length>20);
});

test('allowlist explicitly excludes token and Stripe identifier fields',()=>{
 const selected=Object.values(PREVIEW_DATASETS).join(',').split(',');
 for(const secret of ['token_ciphertext','token_iv','token_tag','stripe_customer_id','stripe_subscription_id','webhook_secret_reference','source_fingerprint','state_hash'])
   assert.ok(!selected.includes(secret),secret);
});

test('second read detects concurrent changes without claiming an ACID snapshot',async()=>{
 let count=0;
 await assert.rejects(collectDraftTenantExport({businessId:tenant,reconcile:true,readPage:async({table,offset})=>{
   if(table==='leads'&&offset===0){count++;return count===1?[{id:1,business_id:tenant}]:[];}
   return [];
 }}),/unavailable or incomplete/);
 const x=await fixture();assert.equal(x.reconciliation_passed,true);assert.equal(x.snapshot_consistent,false);assert.equal(x.export_complete,false);
});

test('Storage manifest is references only, without file bytes or signed URLs',()=>{
 const input={business_knowledge_sources:[{id:1,business_id:tenant,storage_path:'docs/guide.pdf'}],
 marketing_images:[{id:5,business_id:tenant,storage_bucket:'media',storage_path:'sample.png'}],
 business_settings:[{business_id:tenant,profile_image_path:'logos/logo.svg'}]};
 const x=buildStorageAttachmentManifest({businessId:tenant,data:input});
 assert.equal(x.items.length,3);assert.equal(x.storage_bytes_included,false);
 assert.ok(x.items.every(a=>a.safe_to_download===false));
 assert.equal(x.unresolved_buckets,2);
 assert.ok(!JSON.stringify(x).includes('signed_url'));
});

test('Storage manifest rejects traversal and cross-tenant records',()=>{
 for(const row of [{business_id:tenant,storage_path:'../secrets'},{business_id:other,storage_path:'image.png'},{business_id:tenant,storage_path:'https://evil.invalid/a'}])
  assert.throws(()=>buildStorageAttachmentManifest({businessId:tenant,data:{business_knowledge_sources:[row]}}),/Invalid/);
});

test('downloaded fictional gzip has verified transport and content SHA256 and cannot claim full exit',async()=>{
 const x=buildFictionalDraftPackage(await fixture());
 assert.equal(x.filename,'colzo-fictional-tenant-review.json.gz');
 assert.equal(x.sha256,createHash('sha256').update(x.buffer).digest('hex'));
 const raw=gunzipSync(x.buffer);
 assert.equal(x.dataSha256,createHash('sha256').update(raw).digest('hex'));
 const json=JSON.parse(raw);
 assert.equal(json.export_complete,false);
 assert.equal(json.storage_manifest.items.length,1);
 assert.equal(json.snapshot_consistent,false);
});

test('package rejects forged completeness and unexpected provider token',async()=>{
 const x=await fixture();
 for(const forged of [{...x,export_complete:true},{...x,reconciliation_passed:false},
  {...x,business_id:other},{...x,data:{...x.data,leads:[{id:1,business_id:tenant,token_ciphertext:'never'}]}}])
 assert.throws(()=>buildFictionalDraftPackage(forged),/unavailable/);
});

const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-connected-workspace-20261112',
 SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',TENANCY_AUTH_ENABLED:'true',
 COLZO_SCOPED_PILOT_ACCESS:'true',COLZO_TENANT_EXPORT_PREVIEW_ENABLED:'true',
 COLZO_TENANT_EXPORT_FIXTURE_BUSINESS_ID:tenant};
const res=()=>({statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this},
 json(x){this.body=x;return this},send(x){this.sent=x;return this}});
const handler=(audit=true)=>makeTenantExportHandler({env,approvedTarget:()=>true,
 authMember:async()=>({enforced:true,userId:'fictional-owner',businessId:tenant,role:'owner'}),
 authAal2:async()=>({enforced:true,userId:'fictional-owner'}),
 readPage:async({table,offset})=>table==='leads'&&offset===0?[{id:1,business_id:tenant,name:'FICTIONAL'}]:[],
 audit:async()=>audit});

test('download sends audited no-store gzip with checksum, and audit refusal leaks nothing',async()=>{
 let r=res();await handler()({method:'GET',query:{download:'1'}},r);
 assert.equal(r.statusCode,200);
 assert.equal(r.headers['Cache-Control'],'private, no-store');
 assert.equal(r.headers['Content-Type'],'application/gzip');
 assert.ok(Buffer.isBuffer(r.sent));
 assert.equal(r.headers['X-Colzo-Transport-SHA256'],createHash('sha256').update(r.sent).digest('hex'));
 r=res();await handler(false)({method:'GET',query:{download:'1'}},r);
 assert.equal(r.statusCode,503);assert.equal(r.sent,undefined);
});

test('download rejects client-selected business and unsupported options before reading',async()=>{
 for(const q of [{business_id:other,download:'1'},{download:'zip'},{access_token:'bad'}]){
  const r=res();await handler()({method:'GET',query:q},r);assert.equal(r.statusCode,400);assert.equal(r.sent,undefined);
 }
});

test('inert deletion review cannot construct SQL or claim execution even with fake approvals',()=>{
 const r=makeInertDeletionReview({businessId:tenant,restoreVerified:true,approved:true,storageBytesVerified:true});
 assert.equal(r.executable,false);assert.equal(r.deletion_performed,false);assert.equal(r.sql,undefined);
 assert.ok(r.blockers.includes('transactional_deletion_not_implemented'));
 assert.ok(r.unreviewed_public.length>=13);
 const p=planTenantDeletion({businessId:tenant,restoreVerified:true,approved:true});
 assert.equal(p.executable,false);
});
