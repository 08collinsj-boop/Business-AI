import test from 'node:test';
import assert from 'node:assert/strict';
import {checkPreview,normalisePreviewUrl} from '../scripts/colzo-beta-readonly-preflight.mjs';

const PREVIEW='https://business-qa123-buisness-ai1.vercel.app';
function mockFetch(config={}){
 const calls=[];
 const docs={
  '/api/health':{status:'ok'},
  '/api/public-config':{frontendAuthEnabled:true,supabaseUrl:'https://mvwseobgkexzpmmkgcxe.supabase.co',supabaseAnonKey:'sb_publishable_synthetic_qa'},
  '/api/legal-public':{legal:{identity_configured:true,trading_name:'Colzo',operator_type:'sole_trader'}},
  '/api/public-business?business=colzo':{business:{assistant_available:true}}
 };
 const f=async(url,options)=>{
   const path=url.slice(PREVIEW.length);calls.push({url,options});
   const status=config.status?.[path]||(['/api/audit-log','/api/team'].includes(path)?401:200);
   return {ok:status===200,status,headers:{get:key=>({ 'x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}[key])},json:async()=>config.data?.[path]||docs[path]};
 };
 return {f,calls};
}
test('read-only metadata preflight reads only six named GET routes without credentials or mutations',async()=>{
 const {f,calls}=mockFetch();
 const r=await checkPreview({previewUrl:PREVIEW,fetchFn:f});
 assert.equal(r.passed,7);
 assert.equal(r.blocked,0);
 assert.equal(r.launchApproved,false);
 assert.equal(calls.length,6);
 for(const c of calls){
  assert.equal(c.options.method,'GET');
  assert.equal(c.options.redirect,'manual');
  assert.ok(!('Authorization' in c.options.headers));
  assert.ok(c.url.startsWith(PREVIEW+'/api/'));
 }
 assert.doesNotMatch(JSON.stringify(r),/sb_publishable_synthetic_qa/);
});
test('wrong Supabase project and unavailable customer assistant remain blocked rather than claimed ready',async()=>{
 const {f}=mockFetch({data:{
  '/api/public-config':{frontendAuthEnabled:true,supabaseUrl:'https://wrong-project.supabase.co',supabaseAnonKey:'sb_publishable_synthetic_qa'},
  '/api/public-business?business=colzo':{business:{assistant_available:false}}
 }});
 const r=await checkPreview({previewUrl:PREVIEW,fetchFn:f});
 assert.equal(r.checks.find(c=>c.name==='Dev authentication target').status,'BLOCKED');
 assert.equal(r.checks.find(c=>c.name==='Assistant availability flag').status,'BLOCKED');
 assert.equal(r.launchApproved,false);
});
test('Preview authentication protection or network failure cannot produce a false pass',async()=>{
 const {f}=mockFetch({status:{'/api/health':401,'/api/public-config':401}});
 const r=await checkPreview({previewUrl:PREVIEW,fetchFn:f});
 assert.equal(r.checks[0].status,'BLOCKED');
 assert.equal(r.checks[1].status,'BLOCKED');
 assert.equal(r.checks.find(c=>c.name==='Anonymous private API denial').status,'BLOCKED');
 assert.equal(r.launchApproved,false);
 const denied=await checkPreview({previewUrl:PREVIEW,fetchFn:async()=>{throw Error('network secret');}});
 assert.equal(denied.blocked,7);
 assert.doesNotMatch(JSON.stringify(denied),/network secret/);
});
test('rejects Production, Pilot, unsafe schemes, URL paths and endpoint-switch tricks',()=>{
 for(const url of ['https://getbusiness-ai.com','https://business-ai-pilot.vercel.app','http://business-qa123.vercel.app','https://business-qa123.vercel.app/api/health','https://business-qa123.vercel.app?token=hidden','https://business-qa123.vercel.app#secret','https://business-qa123.vercel.app.evil.example','https://admin:password@business-qa123.vercel.app']){
  assert.throws(()=>normalisePreviewUrl(url),url);
 }
 assert.equal(normalisePreviewUrl(PREVIEW+'/'),PREVIEW);
});

test('target validation rejects lookalike Supabase URLs and unsafe browser keys',async()=>{
 for(const url of ['https://mvwseobgkexzpmmkgcxe.supabase.co.evil.invalid','https://evil.invalid/mvwseobgkexzpmmkgcxe','https://mvwseobgkexzpmmkgcxe.supabase.co?token=hidden']){
  const {f}=mockFetch({data:{'/api/public-config':{frontendAuthEnabled:true,supabaseUrl:url,supabaseAnonKey:'sb_publishable_synthetic_qa'}}});
  const r=await checkPreview({previewUrl:PREVIEW,fetchFn:f});assert.equal(r.checks.find(c=>c.name==='Dev authentication target').status,'BLOCKED',url);
 }
 const {f}=mockFetch({data:{'/api/public-config':{frontendAuthEnabled:true,supabaseUrl:'https://mvwseobgkexzpmmkgcxe.supabase.co',supabaseAnonKey:'sb_secret_synthetic_not_for_browser'}}});
 const r=await checkPreview({previewUrl:PREVIEW,fetchFn:f});assert.equal(r.checks.find(c=>c.name==='Dev authentication target').status,'BLOCKED');
});
test('fictional business and configured operator type are checked without assuming a real business',async()=>{
 const {f,calls}=mockFetch({data:{'/api/public-business?business=qa-example-electrical-a':{business:{assistant_available:true}},'/api/legal-public':{legal:{identity_configured:true,trading_name:'Colzo',operator_type:'limited_company'}}}});
 const r=await checkPreview({previewUrl:PREVIEW,businessSlug:'qa-example-electrical-a',fetchFn:f});
 assert.equal(r.blocked,0);assert.ok(calls.some(x=>x.url.endsWith('business=qa-example-electrical-a')));
 assert.ok(!calls.some(x=>x.url.endsWith('business=colzo')));
 const bad=mockFetch();await assert.rejects(checkPreview({previewUrl:PREVIEW,businessSlug:'qa-example&business=other',fetchFn:bad.f}),/business slug/);assert.equal(bad.calls.length,0);
});
test('anonymous private APIs must deny access and never echo returned private data',async()=>{
 const {f}=mockFetch({status:{'/api/audit-log':200,'/api/team':200},data:{'/api/audit-log':{leads:[{secret:'synthetic_private_record'}]}}});
 const r=await checkPreview({previewUrl:PREVIEW,fetchFn:f});
 assert.equal(r.checks.find(c=>c.name==='Anonymous private API denial').status,'BLOCKED');
 assert.doesNotMatch(JSON.stringify(r),/synthetic_private_record/);
});

test('anonymous probe handlers never contact a backend when server auth is disabled',async()=>{
 const saved={...process.env},oldFetch=globalThis.fetch;let calls=0;
 try{
  process.env.TENANCY_AUTH_ENABLED='false';process.env.COLZO_SCOPED_PILOT_ACCESS='false';
  globalThis.fetch=async()=>{calls++;throw Error('unexpected backend access');};
  for(const path of ['../lib/audit-log-handler.js','../lib/team-handler.js']){
   const handler=(await import(path)).default;
   const out={statusCode:0,status(c){this.statusCode=c;return this;},json(){return this;}};
   await handler({method:'GET',headers:{}},out);assert.equal(out.statusCode,503);
  }
  assert.equal(calls,0);
 }finally{for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);globalThis.fetch=oldFetch;}
});
