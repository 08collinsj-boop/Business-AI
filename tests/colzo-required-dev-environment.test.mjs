import test from 'node:test';
import assert from 'node:assert/strict';
import publicConfig,{isApprovedSupabaseTarget} from '../lib/public-config-handler.js';
import enquiryHandler from '../api/enquiry.js';

const ref='mvwseobgkexzpmmkgcxe';
const original={...process.env};
function withEnv(vars,fn){
 const previous=Object.fromEntries(Object.keys(vars).map(k=>[k,process.env[k]]));
 Object.entries(vars).forEach(([k,v])=>v===null?delete process.env[k]:process.env[k]=v);
 try{return fn()}finally{Object.entries(previous).forEach(([k,v])=>v===undefined?delete process.env[k]:process.env[k]=v)}
}
function fakeRes(){return {code:0,body:null,status(code){this.code=code;return this},json(data){this.body=data;return this},setHeader(){return this}}}

test('No branch-specific expected project preserves normal existing deployments',()=>{
 assert.equal(isApprovedSupabaseTarget({expectedRef:'',supabaseUrl:'https://example.supabase.co'}),true);
});
test('Exact HTTPS expected project is accepted, but generic and other projects are denied',()=>{
 assert.equal(isApprovedSupabaseTarget({expectedRef:ref,supabaseUrl:'https://'+ref+'.supabase.co/'}),true);
 for(const value of ['https://fxpultshnyvbfjjgaxwv.supabase.co','http://'+ref+'.supabase.co','https://'+ref+'.supabase.co.evil.example','https://'+ref+'.supabase.co/path','',undefined]){
  assert.equal(isApprovedSupabaseTarget({expectedRef:ref,supabaseUrl:value}),false,String(value));
 }
 assert.equal(isApprovedSupabaseTarget({expectedRef:'bad',supabaseUrl:'https://'+ref+'.supabase.co'}),false);
});
test('Public auth config fails closed to HTTP 503 with no browser-accessible credentials on mismatched preview',()=>{
 withEnv({FRONTEND_AUTH_ENABLED:'true',COLZO_EXPECTED_SUPABASE_PROJECT_REF:ref,SUPABASE_URL:'https://fxpultshnyvbfjjgaxwv.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture-pub'},()=>{
  const response=fakeRes();publicConfig({},response);
  assert.equal(response.code,503);assert.equal(response.body.error,'Authentication is unavailable');
  assert.equal(response.body.supabaseAnonKey,undefined);
 });
});
test('Correct isolated environment serves expected browser-safe config',()=>{
 withEnv({FRONTEND_AUTH_ENABLED:'true',COLZO_EXPECTED_SUPABASE_PROJECT_REF:ref,SUPABASE_URL:'https://'+ref+'.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture-pub'},()=>{
  const response=fakeRes();publicConfig({},response);
  assert.equal(response.code,200);assert.equal(response.body.supabaseUrl,'https://'+ref+'.supabase.co');
 });
});

test('Public enquiry writes cannot reach an unexpected Preview database',async()=>{
 const oldRef=process.env.COLZO_EXPECTED_SUPABASE_PROJECT_REF,oldUrl=process.env.SUPABASE_URL;
 process.env.COLZO_EXPECTED_SUPABASE_PROJECT_REF=ref;process.env.SUPABASE_URL='https://fxpultshnyvbfjjgaxwv.supabase.co';
 try{
  const response=fakeRes();await enquiryHandler({method:'POST',body:{message:'test'}},response);
  assert.equal(response.code,503);
  assert.equal(response.body.error,'Enquiries are temporarily unavailable');
 }finally{oldRef===undefined?delete process.env.COLZO_EXPECTED_SUPABASE_PROJECT_REF:process.env.COLZO_EXPECTED_SUPABASE_PROJECT_REF=oldRef;oldUrl===undefined?delete process.env.SUPABASE_URL:process.env.SUPABASE_URL=oldUrl;}
});
