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
   const status=config.status?.[path]||200;
   return {ok:status===200,status,headers:{get:key=>({ 'x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}[key])},json:async()=>config.data?.[path]||docs[path]};
 };
 return {f,calls};
}
test('read-only metadata preflight reads only four named GET routes without credentials or mutations',async()=>{
 const {f,calls}=mockFetch();
 const r=await checkPreview({previewUrl:PREVIEW,fetchFn:f});
 assert.equal(r.passed,6);
 assert.equal(r.blocked,0);
 assert.equal(r.launchApproved,false);
 assert.equal(calls.length,4);
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
 assert.equal(r.launchApproved,false);
 const denied=await checkPreview({previewUrl:PREVIEW,fetchFn:async()=>{throw Error('network secret');}});
 assert.equal(denied.blocked,6);
 assert.doesNotMatch(JSON.stringify(denied),/network secret/);
});
test('rejects Production, Pilot, unsafe schemes, URL paths and endpoint-switch tricks',()=>{
 for(const url of ['https://getbusiness-ai.com','https://business-ai-pilot.vercel.app','http://business-qa123.vercel.app','https://business-qa123.vercel.app/api/health','https://business-qa123.vercel.app?token=hidden','https://business-qa123.vercel.app#secret','https://business-qa123.vercel.app.evil.example','https://admin:password@business-qa123.vercel.app']){
  assert.throws(()=>normalisePreviewUrl(url),url);
 }
 assert.equal(normalisePreviewUrl(PREVIEW+'/'),PREVIEW);
});
