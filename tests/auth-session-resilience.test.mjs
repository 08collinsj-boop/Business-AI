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
    supabaseClient:{auth},
    Headers, URL,
    fetch:async()=>{calls.fetches++;return {status:response.status,ok:response.status>=200&&response.status<300,json:async()=>response.body};},
    handleSession:async()=>{throw Error('Unexpected navigation');}
  };
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
