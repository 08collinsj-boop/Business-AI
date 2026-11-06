import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync('assets/security-center.js','utf8');
const tick=()=>new Promise(r=>setTimeout(r,20));
function fixture(){
 const dom=new JSDOM('<body class="dpa-acceptance-required"><div id="settingsView"><div class="settings-hub"></div></div></body>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://qa.invalid'});
 const w=dom.window;let verified=false,tenantReads=0;
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:true});
 w.supabaseClient={auth:{getSession:async()=>({data:{session:{user:{id:'synthetic'}}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:verified?'aal2':'aal1',nextLevel:verified?'aal2':'aal1'}}),listFactors:async()=>({data:{totp:[]}})}}};
 w.colzoBackendFetch=()=>{tenantReads++;throw Error('No tenant requests allowed');};w.eval(source);
 return {w,dom,verify:()=>verified=true,reads:()=>tenantReads};
}
test('first-time MFA is available at DPA gate without exposing workspace or accepting legal terms',async()=>{
 const f=fixture();let result;const pending=f.w.businessAiVerifyProtectedAction().then(x=>result=x);await tick();
 const dialog=f.w.document.querySelector('#securityPreWorkspaceGate');assert.ok(dialog,'pre-workspace setup must be reachable');
 assert.ok(dialog.querySelector('#accountSecurityCard'));assert.equal(dialog.querySelector('#incidentCentreCard'),null);assert.equal(f.reads(),0);assert.equal(result,undefined);
 assert.ok(f.w.document.body.classList.contains('dpa-acceptance-required'));f.verify();dialog.querySelector('#securityPreWorkspaceContinue').click();await pending;
 assert.equal(result,true);assert.equal(f.w.document.querySelector('#securityPreWorkspaceGate'),null);assert.equal(f.reads(),0);f.dom.window.close();
});
test('pre-workspace continue fails closed without AAL2 and cancel releases the pending action',async()=>{
 const f=fixture();let result;const pending=f.w.businessAiVerifyProtectedAction().then(x=>result=x);await tick();
 f.w.document.querySelector('#securityPreWorkspaceContinue').click();await tick();assert.equal(result,undefined);
 f.w.document.querySelector('#securityPreWorkspaceCancel').click();await pending;assert.equal(result,false);f.dom.window.close();
});

test('sign-out closes setup and denies the pending action without retaining setup UI',async()=>{
 const f=fixture();const pending=f.w.businessAiVerifyProtectedAction();await tick();
 f.w.document.body.className='auth-required';assert.equal(await pending,false);await tick();
 assert.equal(f.w.document.querySelector('#securityPreWorkspaceGate'),null);
 assert.equal(f.w.document.querySelector('#securityCenterShell'),null);assert.equal(f.reads(),0);f.dom.window.close();
});
