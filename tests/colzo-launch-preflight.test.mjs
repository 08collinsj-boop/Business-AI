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
  if(path==='/api/health')body={status:'ok'};
  else if(path==='/api/public-config')body={frontendAuthEnabled:true,supabaseUrl:'https://'+ref+'.supabase.co'};
  else if(path==='/api/legal-public')body={legal:{identity_configured:identity,operator_type:operator,company_number:company}};
  else if(legal.includes(path))body='<html><head><title>'+brand+' Legal Notice</title></head><body>'+brand+'</body></html>';
  else throw Error('Unrecognised path '+path);
  return new Response(typeof body==='string'?body:JSON.stringify(body),{status:200});
 };
 return {calls,fetcher};
}
test('positive synthetic preflight is read only and contains 14 checks',async()=>{
 const f=fixture(),result=await checkLaunch({origin,expectedRef:expected,fetcher:f.fetcher});
 assert.equal(result.status,'PASS');
 assert.equal(result.checks.length,14);
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