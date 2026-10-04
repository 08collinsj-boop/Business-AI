import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const source = html.slice(html.indexOf('const api=async('), html.indexOf("$('knowledgeFileInput')?.addEventListener"));

function setup(responses, verified=true) {
  const calls=[]; let challenges=0; let sessions=0;
  const context=vm.createContext({URL,Headers,frontendAuthEnabled:true,
    window:{location:{origin:'https://pilot.example'},businessAiVerifyProtectedAction:async()=>{challenges++;return verified;}},
    supabaseClient:{auth:{getSession:async()=>({data:{session:{access_token:`test-session-${++sessions}`}}})}},
    fetch:async(url,options)=>{calls.push({url,headers:options.headers});const next=responses.shift();return {status:next.status,ok:next.status===200,json:async()=>next.body};}
  });
  vm.runInContext(`${source};this.callApi=api;`,context);
  return {run:()=>context.callApi('/api/billing',{method:'POST',body:'{"action":"portal"}'}),calls,challenges:()=>challenges};
}
const mfa={status:403,body:{code:'MFA_REQUIRED',error:'Multi-factor authentication is required'}};

test('owner request retries only after completed step-up and uses the refreshed session',async()=>{
  const flow=setup([mfa,{status:200,body:{portal_url:'https://billing.example'}}]);
  assert.equal((await flow.run()).portal_url,'https://billing.example');
  assert.equal(flow.challenges(),1);assert.equal(flow.calls.length,2);
  assert.equal(flow.calls[0].headers.get('Authorization'),'Bearer test-session-1');
  assert.equal(flow.calls[1].headers.get('Authorization'),'Bearer test-session-2');
});
test('cancelled or unenrolled step-up does not repeat the protected request',async()=>{
  const flow=setup([mfa],false);
  await assert.rejects(flow.run(),/Account security/);assert.equal(flow.calls.length,1);
});
test('repeated MFA denial cannot loop',async()=>{
  const flow=setup([mfa,mfa]);
  await assert.rejects(flow.run(),/Two-step verification is required/);
  assert.equal(flow.calls.length,2);assert.equal(flow.challenges(),1);
});
test('ordinary permission denial does not start MFA',async()=>{
  const flow=setup([{status:403,body:{error:'You are not authorised for this action'}}]);
  await assert.rejects(flow.run(),/permission/);assert.equal(flow.challenges(),0);assert.equal(flow.calls.length,1);
});
