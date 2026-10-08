import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { knowledgeProviderFetch, knowledgeProviderDiagnostic, retryAfterMilliseconds, checkOpenRouterFreeAllowance, resetKnowledgeProviderCooldowns } from '../lib/knowledge-provider-policy.js';
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;resetKnowledgeProviderCooldowns();});
const response=(status, error={}, retry=null)=>({status,ok:status===200,headers:{get:()=>retry},text:async()=>JSON.stringify(status===200?{ok:true}:{error})});
test('numeric and date Retry-After are respected without shortening long waits',async()=>{
 assert.equal(retryAfterMilliseconds('2'),2000);
 assert.equal(retryAfterMilliseconds('Thu, 08 Oct 2026 20:00:05 GMT',Date.parse('2026-10-08T20:00:00Z')),5000);
 assert.equal(retryAfterMilliseconds('bad'),null);
 let calls=0;const sleeps=[];
 globalThis.fetch=async()=>++calls===1?response(429,{code:'rate_limit_exceeded'},'2'):response(200);
 await knowledgeProviderFetch('test',{},'openai',{sleep:async ms=>sleeps.push(ms),random:()=>0});
 assert.deepEqual(sleeps,[2000]);assert.equal(calls,2);
 globalThis.fetch=async()=>response(429,{code:'rate_limit_exceeded'},'60');
 await assert.rejects(knowledgeProviderFetch('test',{},'openai',{sleep:async()=>assert.fail('must not wait/retry'),random:()=>0}));
});
test('quota and unknown 429 errors are never retried, transient retries are bounded',async()=>{
 for(const error of [{code:'insufficient_quota'},{code:'credit_balance_exhausted'},{message:'Free-models-per-day limit exceeded'},{message:'unknown'}]){
  resetKnowledgeProviderCooldowns();let calls=0;globalThis.fetch=async()=>{calls++;return response(429,error);};
  await assert.rejects(knowledgeProviderFetch('test',{},'openrouter',{sleep:async()=>assert.fail('quota retry')}));assert.equal(calls,1);
 }
 resetKnowledgeProviderCooldowns();let calls=0;const delays=[];globalThis.fetch=async()=>{calls++;return response(429,{code:'rate_limit_exceeded'});};
 await assert.rejects(knowledgeProviderFetch('test',{},'openrouter',{sleep:async ms=>delays.push(ms),random:()=>0}));assert.equal(calls,2);assert.deepEqual(delays,[1000]);
});
test('diagnostics never echo arbitrary provider messages, prompts or keys',()=>{
 const diag=knowledgeProviderDiagnostic(response(429),{error:{code:'sk-secret',type:'customer@example.test',message:'private customer prompt',metadata:{raw:'secret'}}});
 assert.deepEqual(diag,{status:429,code:'unknown',type:'unknown',quota_exhausted:false,transient_rate_limit:false});
});
test('exhausted read-only free allowance prevents an inference request',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({data:{free_model_daily_requests:{used:50,limit:50,remaining:0}}})};};
 await assert.rejects(checkOpenRouterFreeAllowance(),e=>e.status===429);assert.equal(calls,1);
});
test('fast fallback rejection during slow OpenAI cleanup stays handled',()=>{
 const script=`import {extractKnowledgeFromFile} from './lib/knowledge.js';process.env.OPENAI_API_KEY='fake';process.env.OPENROUTER_API_KEY='fake';globalThis.fetch=async(url,opts={})=>{const u=String(url);if(u.endsWith('/v1/files'))return {ok:true,status:200,text:async()=>JSON.stringify({id:'file-test'})};if(u.includes('/v1/files/file-test')){await new Promise(r=>setTimeout(r,30));return {ok:true};}if(u.endsWith('/api/v1/key'))return {ok:true,json:async()=>({data:{free_model_daily_requests:{remaining:1}}})};return {ok:false,status:429,headers:{get:()=>null},text:async()=>JSON.stringify({error:{code:'insufficient_quota'}})};};try{await extractKnowledgeFromFile({buffer:Buffer.from('Synthetic fact'),fileName:'test.txt',mimeType:'text/plain'});}catch{}await new Promise(r=>setTimeout(r,50));`;
 const run=spawnSync(process.execPath,['--unhandled-rejections=strict','--input-type=module','-e',script],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
});

test('a known unavailable quota blocks repeated requests during the provider cooldown',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return response(429,{code:'insufficient_quota'});};
 for(let i=0;i<2;i++)await assert.rejects(knowledgeProviderFetch('test',{},'openai'));
 assert.equal(calls,1);
});
