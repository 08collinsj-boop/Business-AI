import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const source=await readFile(new URL('../index.html',import.meta.url),'utf8');
const begin=source.indexOf('function classifyColzoPreviewApi401(');
const end=source.indexOf('\nconst api=async(',begin);
function classify(body, headers={},sent=true){
 assert.ok(begin>=0&&end>begin,'preview authentication diagnostic helper must exist');
 const snippet=source.slice(begin,end);
 const context={};
 runInNewContext(snippet+'\nresult=classifyColzoPreviewApi401(body,headers,sent)',Object.assign(context,{body,headers:{get:key=>headers[key.toLowerCase()]||null},sent}));
 return String(context.result);
}
test('Preview diagnostic identifies an outer Vercel deployment protection denial',()=>{
 assert.equal(classify({protection:{vercel_auth_enabled:true}},{}),'vercel-protection');
 assert.equal(classify({message:'Protected by Vercel Authentication',error:{code:'401'}},{}),'vercel-protection');
});
test('Preview diagnostic does not misdiagnose a rejected session as a missing bearer',()=>{
 assert.equal(classify({error:'Authentication is required'},{},true),'backend-session-unverified');
});
test('Preview diagnostic distinguishes invalid bearer tokens without displaying values',()=>{
 assert.equal(classify({error:'Authentication is invalid or expired'},{},true),'backend-token-rejected');
});
test('Preview diagnostic treats unknown and unrelated 401 errors as unclassified',()=>{
 assert.equal(classify({error:'Unexpected'}, {}, true),'unclassified');
 assert.equal(classify(null,{},true),'unclassified');
});
test('Preview diagnostic tracks when browser did not attach a token',()=>{
 assert.equal(classify({error:'Authentication is required'}, {}, false),'browser-token-missing');
});
test('Preview sign-in failure contains only classified codes, never bearer tokens or raw errors',()=>{
 assert.match(source,/classifyColzoPreviewApi401\(result,response\.headers,[^)]+\)/);
 assert.match(source,/colzoLoginFailure\.reason/);
 assert.match(source,/window\.colzoPreviewAuthTransportEnabled/);
 assert.doesNotMatch(source,/colzoLoginFailure\s*=\s*\{[^}]*access_token/);
});


test('obsolete unauthenticated Preview transport hints cannot override the actual backend diagnosis',()=>{
 assert.equal(classify({error:'Authentication is required',preview_auth_transport:'alternate-missing'}, {'x-colzo-auth-transport':'standard-not-bearer'},true),'backend-session-unverified');
});
