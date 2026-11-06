import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {JSDOM} from 'jsdom';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function fixture({mfa=true,session=true,verifyError=false,updateError=null,checkError=false}={}){
 const form=html.match(/<form id="passwordRecoveryForm"[\s\S]*?<\/form>/)[0];
 const dom=new JSDOM(form);const handlers=new Map();
 for(const element of dom.window.document.querySelectorAll('*')){element.addEventListener=(type,handler)=>handlers.set(element.id+':'+type,handler);}
 const $=id=>dom.window.document.getElementById(id);
 const calls={updates:0,challenges:0,verifies:0,signouts:0,modes:[]};let verified=false;
 const client={auth:{getSession:async()=>({data:{session:session?{user:{email:'qa@example.invalid'}}:null}}),mfa:{
  getAuthenticatorAssuranceLevel:async()=>checkError?{error:{code:'unexpected_failure'}}:{data:{currentLevel:verified?'aal2':'aal1',nextLevel:mfa?'aal2':'aal1'}},
  listFactors:async()=>({data:{totp:[{id:'synthetic-factor',status:'verified',factor_type:'totp'}]}}),
  challenge:async()=>{calls.challenges++;return {data:{id:'synthetic-challenge'}};},
  verify:async()=>{calls.verifies++;if(verifyError)return {error:{code:'mfa_verification_failed'}};verified=true;return {data:{}};}
 },updateUser:async()=>{calls.updates++;return {error:updateError};},signOut:async()=>{calls.signouts++;return {error:null};}}};
 const context={$: $,supabaseClient:client,passwordRecoveryActive:true,clearPasswordRecoveryLocation(){},passwordPolicyIssue:()=>'',setAuthenticationMode:(...a)=>calls.modes.push(a)};
 const marker=html.indexOf('let passwordRecoveryMfaReady=');
 const start=marker>=0?marker:html.indexOf("$('passwordRecoveryForm').addEventListener('submit'");
 const end=html.indexOf("\n$('signUpForm').addEventListener",start);
 runInNewContext(html.slice(start,end),context);
 async function runEvent(id,type){let result;const e=new dom.window.Event(type,{cancelable:true});
  // Handlers are installed below through the actual application script.
  result=handlers.get(id+':'+type)?.(e);await result;}
 return {dom,$,calls,context,runEvent,client};
}

test('recovery exposes account identity and requires actual MFA before password update',async()=>{
 const f=fixture();
 assert.equal(typeof f.context.preparePasswordRecoveryMfa,'function','recovery needs a pre-save security check');
 await f.context.preparePasswordRecoveryMfa();
 assert.equal(f.$('passwordRecoveryMfa').hidden,false);
 assert.match(f.$('passwordRecoveryAccount').textContent,/qa@example.invalid/);
 assert.equal(f.$('passwordRecoverySubmit').disabled,true);
 assert.equal(f.calls.updates,0);
 f.$('passwordRecoveryCode').value='123456';
 await f.context.verifyPasswordRecoveryMfa();
 assert.equal(f.calls.challenges,1);assert.equal(f.calls.verifies,1);
 assert.equal(f.$('passwordRecoverySubmit').disabled,false);
 assert.equal(f.$('passwordRecoveryCode').value,'');
 f.dom.window.close();
});
test('missing session, unavailable assurance and rejected MFA cannot unlock password save',async()=>{
 for(const options of [{session:false},{checkError:true},{verifyError:true}]){
  const f=fixture(options);
  assert.equal(typeof f.context.preparePasswordRecoveryMfa,'function');
  await f.context.preparePasswordRecoveryMfa();
  if(options.verifyError){f.$('passwordRecoveryCode').value='123456';await f.context.verifyPasswordRecoveryMfa();}
  assert.equal(f.$('passwordRecoverySubmit').disabled,true);assert.equal(f.calls.updates,0);
  f.dom.window.close();
 }
});
test('a legitimate recovery session with no enrolled factor can set a password',async()=>{
 const f=fixture({mfa:false});
 assert.equal(typeof f.context.preparePasswordRecoveryMfa,'function');
 await f.context.preparePasswordRecoveryMfa();
 assert.equal(f.$('passwordRecoveryMfa').hidden,true);
 assert.equal(f.$('passwordRecoverySubmit').disabled,false);
 f.dom.window.close();
});

test('password submission waits for MFA and succeeds only on a separate explicit submit',async()=>{
 const f=fixture();f.$('recoveryPassword').value=f.$('recoveryPasswordConfirm').value='Synthetic-only-123!';
 await f.runEvent('passwordRecoveryForm','submit');assert.equal(f.calls.updates,0);
 f.$('passwordRecoveryCode').value='123456';await f.context.verifyPasswordRecoveryMfa();assert.equal(f.calls.updates,0);
 await f.runEvent('passwordRecoveryForm','submit');assert.equal(f.calls.updates,1);assert.equal(f.calls.signouts,1);
 assert.equal(f.$('recoveryPassword').value,'');assert.equal(f.calls.modes[0][0],'login');f.dom.window.close();
});
test('server MFA rejection and other update errors give actionable messages without leaking details',async()=>{
 for(const code of ['insufficient_aal','same_password','weak_password','session_expired','unexpected_failure']){
  const f=fixture({mfa:false,updateError:{code,message:'PRIVATE SERVER DETAIL'}});
  await f.context.preparePasswordRecoveryMfa();f.$('recoveryPassword').value=f.$('recoveryPasswordConfirm').value='Synthetic-only-123!';
  await f.runEvent('passwordRecoveryForm','submit');const message=f.$('passwordRecoveryMessage').textContent;
  assert.doesNotMatch(message,/PRIVATE SERVER DETAIL/);assert.equal(f.calls.signouts,0);
  if(code==='insufficient_aal')assert.match(message,/authenticator/);
  if(code==='session_expired')assert.match(message,/no longer available/);
  if(code==='unexpected_failure')assert.equal(f.$('passwordRecoverySubmit').disabled,true);
  f.dom.window.close();
 }
});
