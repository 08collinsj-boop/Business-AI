import test from 'node:test';
import assert from 'node:assert/strict';
import { PREVIEW_DATASETS } from '../lib/colzo-tenant-export-engine.js';
import { readDraftExportPage } from '../lib/colzo-tenant-export-handler.js';

const business='10000000-0000-4000-8000-000000000001';
const env={
  COLZO_TENANT_EXPORT_PREVIEW_ENABLED:'true', COLZO_SCOPED_PILOT_ACCESS:'true',
  TENANCY_AUTH_ENABLED:'true', VERCEL_ENV:'preview',
  VERCEL_GIT_COMMIT_REF:'feature/colzo-connected-workspace-20261112',
  SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',
  COLZO_TENANT_EXPORT_FIXTURE_BUSINESS_ID:business,
  SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-key'
};
const fetch0=globalThis.fetch;

test('reader uses stable primary-key ordering for idless and compound tables',async()=>{
  const calls=[];
  globalThis.fetch=async (url,opts)=>{calls.push({url:new URL(url),opts});return {ok:true,headers:{get:()=>null},text:async()=>'[]'};};
  try {
    for (const [table,order] of [['business_configurations','business_id.asc'],['business_feature_entitlements','business_id.asc,feature_key.asc'],['lead_handovers','id.asc']]){
      await readDraftExportPage({table,businessId:business,fields:PREVIEW_DATASETS[table],order,offset:0,limit:200},env);
    }
  }finally{globalThis.fetch=fetch0;}
  assert.deepEqual(calls.map(x=>x.url.searchParams.get('order')),['business_id.asc','business_id.asc,feature_key.asc','id.asc']);
  assert.ok(calls.every(x=>x.url.searchParams.get('business_id')==='eq.'+business));
  assert.ok(calls.every(x=>x.opts.method==='GET' && x.opts.cache==='no-store'));
});

test('reader rejects unapproved table, extra projected credential, foreign tenant and unbounded page before network',async()=>{
  const calls=[];globalThis.fetch=async()=>{calls.push('called');throw Error('network must not be invoked')};
  const good={table:'business_configurations',businessId:business,fields:PREVIEW_DATASETS.business_configurations,order:'business_id.asc',offset:0,limit:200};
  try {
    for(const bad of [
      {...good,table:'marketing_meta_connections'},
      {...good,fields:good.fields+',token_ciphertext'},
      {...good,businessId:'20000000-0000-4000-8000-000000000002'},
      {...good,limit:9999},
      {...good,offset:-1},
      {...good,order:'id.asc'}
    ]) await assert.rejects(readDraftExportPage(bad,env),/Export unavailable/);
  }finally{globalThis.fetch=fetch0;}
  assert.deepEqual(calls,[]);
});

test('reader remains gated off without exact preview opt-in and fixture ID',async()=>{
  await assert.rejects(readDraftExportPage({table:'leads',businessId:business,fields:PREVIEW_DATASETS.leads,order:'id.asc',offset:0,limit:200},{...env,COLZO_TENANT_EXPORT_PREVIEW_ENABLED:'false'}),/Export unavailable/);
});


test('reader fails closed on oversized or malformed responses and uses 8-second abort deadline',async()=>{
 const original=globalThis.fetch;
 const request={table:'leads',businessId:business,fields:PREVIEW_DATASETS.leads,order:'id.asc',offset:0,limit:200};
 try{
  globalThis.fetch=async (_url,opts)=>{
   assert.ok(opts.signal instanceof AbortSignal);
   return {ok:true,headers:{get:()=> '3000000'},text:async()=>{throw Error('must not read oversized body')}};
  };
  await assert.rejects(readDraftExportPage(request,env),/Export unavailable/);
  globalThis.fetch=async()=>({ok:true,headers:{get:()=>null},text:async()=>'not-json'});
  await assert.rejects(readDraftExportPage(request,env),/Export unavailable/);
 }finally{globalThis.fetch=original}
});
