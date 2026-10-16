import test from 'node:test';
import assert from 'node:assert/strict';
import {checkLaunch} from '../scripts/colzo-launch-preflight.mjs';

const expected='mvwseobgkexzpmmkgcxe',origin='https://colzo-preview.example';
const legal=[
 '/legal/index.html','/legal/terms.html','/legal/privacy.html','/legal/dpa.html',
 '/legal/acceptable-use.html','/legal/storage.html','/legal/subprocessors.html','/legal/data-deletion.html'
];
function fixture({ref=expected,identity=true,operator='sole_trader',company='',brand='Colzo',broken=null}={}){
 const calls=[];
 const fetcher=async (url,options)=>{
  const path=new URL(url).pathname;
  calls.push({path,options});
  if(path===broken)throw Error('Offline');
  let body;
  if(path==='/')return new Response('<html><head><title>Colzo | Business workspace</title></head><body><main id="colzoOwner"></main></body></html>',{status:200});
  if(['/api/business-onboarding','/api/colzo-records','/api/operations'].includes(path))return new Response('',{status:401});
  if(path==='/api/health')body={status:'ok'};
  else if(path==='/api/public-config')body={frontendAuthEnabled:true,supabaseUrl:'https://'+ref+'.supabase.co'};
  else if(path==='/api/legal-public')body={legal:{identity_configured:identity,operator_type:operator,company_number:company}};
  else if(legal.includes(path))body='<html><head><title>'+brand+' Legal Notice</title></head><body>'+brand+'</body></html>';
  else throw Error('Unrecognised path '+path);
  return new Response(typeof body==='string'?body:JSON.stringify(body),{status:200});
 };
 return {calls,fetcher};
}
test('positive synthetic preflight is read only and contains 18 checks',async()=>{
 const f=fixture(),result=await checkLaunch({origin,expectedRef:expected,fetcher:f.fetcher});
 assert.equal(result.status,'PASS');
 assert.equal(result.checks.length,18);
 assert.ok(f.calls.every(c=>c.options.method==='GET'&&!c.options.headers.Authorization));
 assert.ok(f.calls.every(c=>c.options.redirect==='error'));
});
test('blocks wrong dev database and old brand pages',async()=>{
 const f=fixture({ref:'fxpultshnyvbfjjgaxwv',brand:'Business AI'});
 const result=await checkLaunch({origin,expectedRef:expected,fetcher:f.fetcher});
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.checks.find(c=>c.name==='Correct Supabase project').status,'BLOCKED');
 assert.equal(result.checks.find(c=>c.name==='Colzo legal page /legal/terms.html').status,'BLOCKED');
});
test('blocks unconfigured and incorrectly registered company identities',async()=>{
 const f=fixture({identity:false,operator:'limited_company',company:'123'});
 const result=await checkLaunch({origin,expectedRef:expected,fetcher:f.fetcher});
 for(const name of ['Approved public operator identity','Operator is a sole trader','No limited-company number'])
  assert.equal(result.checks.find(c=>c.name===name).status,'BLOCKED');
});
test('network outage blocks release, never sends writes',async()=>{
 const f=fixture({broken:'/api/legal-public'});
 const result=await checkLaunch({origin,expectedRef:expected,fetcher:f.fetcher});
 assert.equal(result.status,'UNVERIFIED');
 assert.ok(f.calls.every(c=>c.options.method==='GET'));
});
test('rejects insecure public hosts, credential-bearing URLs and missing project ID',async()=>{
 const f=fixture();
 for(const item of [
  {origin:'http://colzo-preview.example',expectedRef:expected},
  {origin:'https://name:password@colzo-preview.example',expectedRef:expected},
  {origin,expectedRef:''}
 ]) await assert.rejects(checkLaunch({...item,fetcher:f.fetcher}));
 assert.equal(f.calls.length,0);
});
test('public launch preflight demands Colzo owner shell and denies unauthenticated protected APIs',async()=>{
 const f=fixture();
 const fetcher=async(url,options)=>{
  const path=new URL(url).pathname;
  if(path==='/')return new Response('<!doctype html><html><head><title>Colzo | Business workspace</title></head><body><main id="colzoOwner"></main></body></html>',{status:200,headers:{'content-type':'text/html'}});
  if(['/api/business-onboarding','/api/colzo-records','/api/operations'].includes(path))return new Response('{"error":"Authentication required"}',{status:401});
  return f.fetcher(url,options);
 };
 const result=await checkLaunch({origin,expectedRef:expected,fetcher});
 assert.equal(result.status,'PASS');
 assert.equal(result.checks.length,18);
 for(const name of ['Colzo owner shell deployed','Protected business onboarding','Protected Colzo records','Protected records dispatcher'])
  assert.equal(result.checks.find(x=>x.name===name)?.status,'PASS',name);
});
test('release blocks missing Colzo shell and unauthenticated records disclosure',async()=>{
 const f=fixture();
 const fetcher=async(url,options)=>{
  const p=new URL(url).pathname;
  if(p==='/')return new Response('<title>Business AI Pilot</title><div id="dashboardApp"></div>',{status:200});
  if(p==='/api/colzo-records')return new Response('[{"id":"exposed"}]',{status:200});
  if(p==='/api/business-onboarding'||p==='/api/operations')return new Response('',{status:404});
  return f.fetcher(url,options);
 };
 const result=await checkLaunch({origin,expectedRef:expected,fetcher});
 assert.equal(result.status,'BLOCKED');
 for(const name of ['Colzo owner shell deployed','Protected business onboarding','Protected Colzo records','Protected records dispatcher'])
  assert.equal(result.checks.find(x=>x.name===name)?.status,'BLOCKED');
});
test('unreachable protected API must not count as authenticated denial',async()=>{
 const f=fixture();
 const fetcher=async(url,options)=>{
  const p=new URL(url).pathname;
  if(p==='/')return new Response('<title>Colzo</title><main id="colzoOwner"></main>',{status:200});
  if(p==='/api/colzo-records')throw Error('timeout');
  if(p==='/api/business-onboarding'||p==='/api/operations')return new Response('',{status:403});
  return f.fetcher(url,options);
 };
 const result=await checkLaunch({origin,expectedRef:expected,fetcher});
 assert.equal(result.status,'UNVERIFIED');
 assert.equal(result.checks.find(x=>x.name==='Protected Colzo records')?.status,'UNVERIFIED');
});

test('outer Vercel deployment protection cannot masquerade as successful Colzo API auth',async()=>{
 const fetcher=async()=>new Response('{"error":"Authentication Required"}',{status:401,headers:{'content-type':'application/json'}});
 const result=await checkLaunch({origin,expectedRef:expected,fetcher});
 assert.equal(result.status,'UNVERIFIED');
 for(const name of ['Protected business onboarding','Protected Colzo records','Protected records dispatcher']){
  assert.equal(result.checks.find(x=>x.name===name)?.status,'UNVERIFIED',name);
 }
});
