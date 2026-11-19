import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('const api=async(');
const end=html.indexOf("\n\n$('knowledgeFileInput')",start);
assert.ok(start>0&&end>start,'Private API helper must be testable');

function fixture(response,authUser={id:'owner-1'},authError=null){
  const calls={signouts:[],getUser:0,fetches:0};
  const auth={
    getSession:async()=>({data:{session:{access_token:'session-token',user:{id:'owner-1'}}}}),
    getUser:async()=>{calls.getUser++;return {data:{user:authUser},error:authError};},
    signOut:async options=>{calls.signouts.push(options);}
  };
  const context={
    window:{location:{origin:'https://pilot.example'},businessAiVerifyProtectedAction:null},
    frontendAuthEnabled:true,
    privateDataEpoch:0, // Same generation guard provided by the actual page bootstrap.
    supabaseClient:{auth},
    Headers, URL,
    fetch:async()=>{calls.fetches++;return {status:response.status,ok:response.status>=200&&response.status<300,json:response.json||(async()=>response.body)};},
    handleSession:async()=>{throw Error('Unexpected navigation');}
  };
  // Bridge is loaded before the owner script in the actual browser.
  context.window.colzoBackendFetch=context.fetch;
  const api=runInNewContext(html.slice(start,end)+';api;',context);
  return {api,calls,context};
}

test('unrelated API 401 with a verified session does not sign the owner out',async()=>{
  const {api,calls}=fixture({status:401,body:{error:'Authentication is required'}});
  await assert.rejects(api('/api/knowledge',{method:'PATCH'}),/application rejected a valid sign-in/);
  assert.equal(calls.getUser,1);
  assert.equal(calls.signouts.length,0);
});
test('only a Supabase-confirmed invalid token triggers a local sign-out',async()=>{
  const {api,calls}=fixture({status:401,body:{error:'Authentication is required'}},null,{status:401});
  await assert.rejects(api('/api/knowledge',{method:'PATCH'}),/session has expired/);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.signouts)),[{scope:'local'}]);
});
test('temporary Auth verification errors preserve the session',async()=>{
  const {api,calls}=fixture({status:401,body:{}},null,{status:503});
  await assert.rejects(api('/api/knowledge'),/sign-in has been preserved/);
  assert.equal(calls.signouts.length,0);
});
test('protected MFA response keeps the owner session and never bypasses step-up',async()=>{
  const {api,calls,context}=fixture({status:403,body:{code:'MFA_REQUIRED'}});
  context.window.businessAiVerifyProtectedAction=async()=>false;
  await assert.rejects(api('/api/knowledge',{method:'PATCH'}),/two-step verification/i);
  assert.equal(calls.fetches,1);
  assert.equal(calls.signouts.length,0);
});
test('auth bootstrap ignores token refresh, deduplicates same user and defers work',()=>{
  assert.match(html,/if\(event!=='SIGNED_IN'&&event!=='SIGNED_OUT'\)return;/);
  assert.match(html,/if\(authBootstrapInFlight\?\.userId===userId\)return authBootstrapInFlight\.promise;/);
  assert.match(html,/userId===readyAuthUserId&&document\.body\.classList\.contains\('auth-ready'\)/);
  assert.match(html,/window\.setTimeout\(\(\)=>\{bootstrapAuthSession\(/);
  assert.match(html,/if\(event==='PASSWORD_RECOVERY'\)/);
  assert.match(html,/if\(passwordRecoveryActive&&nextSession\)return;/);
});

test('a response decoded after logout cannot launch MFA or reverify the former session', async()=>{
  for (const status of [200,401,403]) {
    let decode, started;
    const bodyPending=new Promise(resolve=>{decode=resolve});
    const decoding=new Promise(resolve=>{started=resolve});
    const {api,calls,context}=fixture({status,json:()=>{started();return bodyPending;}});
    let mfa=0;
    context.window.businessAiVerifyProtectedAction=async()=>{mfa++;return false;};
    const pending=api('/api/knowledge');
    const denied=assert.rejects(pending,/Session changed/);
    await decoding;
    context.privateDataEpoch++;
    decode(status===403?{code:'MFA_REQUIRED'}:{privateRecord:'fictional former workspace'});
    await denied;
    assert.equal(mfa,0,'stale responses cannot reopen the MFA flow');
    assert.equal(calls.getUser,0,'stale responses cannot verify the current session');
    assert.equal(calls.signouts.length,0);
  }
});

test('logout during MFA verification prevents retrying the former authenticated request', async()=>{
  const {api,calls,context}=fixture({status:403,body:{code:'MFA_REQUIRED'}});
  let finish,started;
  const verification=new Promise(resolve=>{finish=resolve});
  const verifying=new Promise(resolve=>{started=resolve});
  context.window.businessAiVerifyProtectedAction=()=>{started();return verification;};
  const pending=api('/api/knowledge');
  const denied=assert.rejects(pending,/Session changed/);
  await verifying;
  context.privateDataEpoch++;
  finish(true);
  await denied;
  assert.equal(calls.fetches,1,'the old request must not retry in the new session');
});

test('logout during session lookup prevents sending a request with the former token', async()=>{
  const {api,calls,context}=fixture({status:200,body:{}});
  let finish,started;
  const lookup=new Promise(resolve=>{finish=resolve});
  const lookingUp=new Promise(resolve=>{started=resolve});
  context.supabaseClient.auth.getSession=()=>{started();return lookup;};
  const pending=api('/api/knowledge');
  const denied=assert.rejects(pending,/Session changed/);
  await lookingUp;
  context.privateDataEpoch++;
  finish({data:{session:{access_token:'former-synthetic-token'}}});
  await denied;
  assert.equal(calls.fetches,0);
});

test('logout during token verification cannot sign out a replacement session', async()=>{
  const {api,calls,context}=fixture({status:401,body:{}});
  let finish,started;
  const lookup=new Promise(resolve=>{finish=resolve});
  const lookingUp=new Promise(resolve=>{started=resolve});
  context.supabaseClient.auth.getUser=()=>{started();return lookup;};
  const pending=api('/api/knowledge');
  const denied=assert.rejects(pending,/Session changed/);
  await lookingUp;
  context.privateDataEpoch++;
  finish({data:{user:null},error:{status:401}});
  await denied;
  assert.equal(calls.signouts.length,0);
});
