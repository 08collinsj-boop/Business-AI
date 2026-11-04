import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../lib/legal-handler.js';
import { LEGAL_VERSIONS } from '../lib/legal.js';

const BUSINESS='11111111-1111-4111-8111-111111111111';
const USER='33333333-3333-4333-8333-333333333333';
const OTHER='44444444-4444-4444-8444-444444444444';
const keys=['terms','privacy','acceptable_use'];
const docs=user => keys.map(key=>({user_id:user,document_key:key,document_version:LEGAL_VERSIONS[key],accepted_at:'2026-10-29T12:00:00.000Z'}));
const reply=(data,status=200)=>({ok:status>=200&&status<300,status,text:async()=>data==null?'':JSON.stringify(data),json:async()=>data});

test('user terms acceptance verifies returned Auth user and never skips missing legitimate acceptance', {concurrency:false},async t=>{
 const env={...process.env},oldFetch=globalThis.fetch;
 Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'false',
  SUPABASE_URL:'https://fictional.invalid',SUPABASE_SERVICE_ROLE_KEY:'test-key-only'});
 let returnedRows=[],inserted=[];
 globalThis.fetch=async(input,opts={})=>{
  const u=new URL(String(input)),method=opts.method||'GET';
  if(u.pathname.endsWith('/auth/v1/user'))return reply({id:USER,email:'user@example.invalid'});
  if(u.pathname.endsWith('/user_legal_acceptances')){
   if(method!=='POST') assert.equal(u.searchParams.get('user_id'),'eq.'+USER);
   if(method==='POST'){
    const inputRows=JSON.parse(opts.body);inserted.push(...inputRows);
    returnedRows=[...returnedRows,...inputRows.map(row=>({...row,accepted_at:'2026-10-29T13:00:00.000Z'}))];
    return reply(null,201);
   }
   return reply(returnedRows);
  }
  if(u.pathname.endsWith('/business_memberships'))return reply([{business_id:BUSINESS,role:'owner'}]);
  if(u.pathname.endsWith('/business_legal_acceptances'))return reply([]);
  throw Error('Unexpected fake route '+u.pathname);
 };
 t.after(()=>{
  globalThis.fetch=oldFetch;
  for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];
  Object.assign(process.env,env);
 });
 const call=async(method='GET',body=null)=>{
  const res={statusCode:0,result:null,setHeader(){},status(n){this.statusCode=n;return this},json(v){this.result=v;return this}};
  await handler({method,headers:{authorization:'Bearer fictional-test'},body},res);return res;
 };
 await t.test('current user has complete current terms when own rows are present',async()=>{
  returnedRows=docs(USER);inserted=[];
  const v=await call();
  assert.equal(v.statusCode,200);assert.equal(v.result.needs_user_acceptance,false);
  assert.equal(v.result.user_accepted_at,'2026-10-29T12:00:00.000Z');
 });
 await t.test('foreign user acceptance rows do not satisfy current user consent',async()=>{
  returnedRows=docs(OTHER);inserted=[];
  const v=await call();
  assert.equal(v.statusCode,200);assert.equal(v.result.needs_user_acceptance,true);
  assert.equal(v.result.user_accepted_at,null);
 });
 await t.test('user acceptance action does not skip writing own terms because foreign rows existed',async()=>{
  returnedRows=docs(OTHER);inserted=[];
  const v=await call('POST',{action:'accept_user'});
  assert.equal(v.statusCode,200);
  assert.equal(inserted.length,3);
  assert.ok(inserted.every(row=>row.user_id===USER));
  assert.equal(v.result.needs_user_acceptance,false);
 });
});
