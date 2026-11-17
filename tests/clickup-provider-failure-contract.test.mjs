import test from 'node:test';
import assert from 'node:assert/strict';
import {listClickupTasks,updateClickupTask} from '../lib/clickup-provider.js';

const token='fictional-provider-token-no-real-credentials';
const workspace='123';
const task={id:'task-fixture',name:'Synthetic task',status:{status:'to do'},list:{id:'456',name:'Sample'},assignees:[]};

async function rejectionFor(fetchImpl){
  return assert.rejects(()=>listClickupTasks(token,workspace,{fetchImpl}),error=>{
    assert.equal(typeof error?.status,'number');
    assert.equal(typeof error?.code,'string');
    assert.ok(!JSON.stringify({message:error.message,code:error.code}).includes(token),
      'Provider credentials must not be copied into errors');
    return true;
  });
}

test('ClickUp expiry and rate limiting fail closed without leaking provider response bodies',async()=>{
 for(const [code,expectedStatus,expectedCode] of [
  [401,401,'CLICKUP_RECONNECT'],[403,401,'CLICKUP_RECONNECT'],
  [429,429,'CLICKUP_RATE_LIMIT'],[503,502,'CLICKUP_PROVIDER_ERROR']
 ]){
  let n=0;
  await assert.rejects(()=>listClickupTasks(token,workspace,{fetchImpl:async(url,options)=>{
    n++;
    assert.equal(new URL(url).hostname,'api.clickup.com');
    assert.equal(options.headers.Authorization,'Bearer '+token);
    return new Response(JSON.stringify({raw_token:token,private_note:'must not leak'}),{status:code});
  }}),error=>{
    assert.equal(error.status,expectedStatus,code+' status');
    assert.equal(error.code,expectedCode,code+' error');
    assert.ok(!error.message.includes(token));
    assert.ok(!error.message.includes('private_note'));
    return true;
  });
  assert.equal(n,1,'A failed provider request must not be retried automatically');
 }
});

test('network failures, malformed JSON and invalid provider tasks never appear as empty current tasks',async()=>{
 for(const [label,fetchImpl,expectedCode] of [
  ['network unavailable',async()=>{throw Error('private '+token)},'CLICKUP_UNAVAILABLE'],
  ['invalid JSON',async()=>new Response('not json',{status:200}),'CLICKUP_INVALID_RESPONSE'],
  ['wrong tasks schema',async()=>new Response(JSON.stringify({tasks:{secret:token}}),{status:200}),'CLICKUP_INVALID_RESPONSE']
 ]){
  await assert.rejects(()=>listClickupTasks(token,workspace,{fetchImpl}),error=>{
    assert.equal(error.status,502,label);
    assert.equal(error.code,expectedCode,label);
    assert.ok(!error.message.includes(token),label);
    return true;
  });
 }
});

test('an ambiguously failed ClickUp update never yields confirmed success',async()=>{
 let updates=0;
 await assert.rejects(()=>updateClickupTask(token,'task-fixture',{status:'in progress'},{fetchImpl:async(url,options)=>{
   updates++;assert.equal(options.method,'PUT');
   assert.match(url,/\/api\/v2\/task\/task-fixture$/);
   throw Error('timeout after possibly committing provider write '+token);
 }}),error=>{
   assert.equal(error.status,502);
   assert.equal(error.code,'CLICKUP_UNAVAILABLE');
   assert.ok(!error.message.includes(token));
   return true;
 });
 assert.equal(updates,1,'Do not resend ambiguous provider write automatically');
});

test('unconfirmed provider update cannot be reported as a successful task mutation',async()=>{
 await assert.rejects(()=>updateClickupTask(token,'task-fixture',{status:'in progress'},{fetchImpl:async()=>new Response(JSON.stringify(task),{status:200})}),
  error=>error.status===502&&error.code==='CLICKUP_UNCONFIRMED');
});
