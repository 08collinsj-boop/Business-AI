import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('pilot denials explain access and recovery without logging out a valid session',async()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const start=html.indexOf('const api=async('),end=html.indexOf("$('knowledgeFileInput')",start);
 let code='PILOT_ACCESS_REQUIRED',signedOut=0,mfaRequested=0;
 const context={URL,Headers,frontendAuthEnabled:true,supabaseClient:{auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}}),signOut:async()=>{signedOut++;}}},window:{location:{origin:'https://example.invalid'},colzoBackendFetch:async()=>({status:403,ok:false,json:async()=>({code})}),businessAiVerifyProtectedAction:async()=>{mfaRequested++;return false;}}};
 vm.runInNewContext(html.slice(start,end)+'globalThis.fixtureApi=api;',context);
 await assert.rejects(context.fixtureApi('/api/leads'),/pilot.*approval|pilot.*ended|pilot.*unavailable/i);
 code='PILOT_TEAM_MANAGED';await assert.rejects(context.fixtureApi('/api/team'),/pilot.*team|team.*approval/i);
 code='PILOT_PROVISIONING_MANAGED';await assert.rejects(context.fixtureApi('/api/business-onboarding'),/pilot.*approval/i);
 assert.equal(signedOut,0);assert.equal(mfaRequested,0);
});
