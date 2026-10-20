import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../assets/customer-portal.js',import.meta.url),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const twice=async()=>{await tick();await tick();};

async function setup(authOverrides={}){
 const dom=new JSDOM(html,{url:'https://synthetic.example.invalid/customer/account',runScripts:'outside-only'});
 const w=dom.window;w.Headers=Headers;
 const calls={signUp:0,signIn:0,resend:0,session:0,portal:0};
 const defaultAuth={
  getSession:async()=>{calls.session++;return {data:{session:null}};},
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  signUp:async()=>{calls.signUp++;return {data:{session:null},error:null};},
  signInWithPassword:async()=>{calls.signIn++;return {data:{session:null},error:{message:'Invalid credentials'}};},
  resend:async()=>{calls.resend++;return {error:null};},
  signOut:async()=>({error:null})
 };
 const auth={...defaultAuth,...authOverrides};
 w.supabaseClient={auth};
 w.setAppLoading=()=>{};
 w.colzoBackendFetch=async()=>{calls.portal++;return {ok:true,json:async()=>({customer:{display_name:'Synthetic user',email:'synthetic@example.invalid'},enquiries:[]})};};
 w.eval(source);await twice();
 const d=w.document;
 const input=(id,value)=>{d.getElementById(id).value=value;};
 const readySignup=()=>{
   for(const [id,v] of Object.entries({customerSignUpName:'Synthetic User',customerSignUpEmail:'synthetic@example.invalid',customerSignUpPassword:'SampleStrongPassword29!',customerSignUpConfirm:'SampleStrongPassword29!'}))input(id,v);
   d.getElementById('customerPrivacyAcknowledgement').checked=true;
   d.getElementById('customerSignUpForm').dispatchEvent(new w.Event('input',{bubbles:true}));
 };
 const readySignIn=()=>{
   input('customerSignInEmail','synthetic@example.invalid');input('customerSignInPassword','SampleStrongPassword29!');
   d.getElementById('customerSignInForm').dispatchEvent(new w.Event('input',{bubbles:true}));
 };
 const submit=id=>d.getElementById(id).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 return {dom,w,d,auth,calls,readySignup,readySignIn,submit,input,close:()=>dom.window.close()};
}
function deferred(){
 let resolve,reject;
 const promise=new Promise((res,rej)=>{resolve=res;reject=rej});
 return {promise,resolve,reject};
}

test('customer registration refuses duplicate in-flight submits and restores valid form',async()=>{
 const pending=deferred();
 const f=await setup({signUp:()=>{f.calls.signUp++;return pending.promise;}});
 try{
  f.readySignup();const form=f.d.getElementById('customerSignUpForm'),btn=form.querySelector('[type=submit]');
  assert.equal(btn.disabled,false);
  f.submit('customerSignUpForm');f.submit('customerSignUpForm');
  assert.equal(f.calls.signUp,1);
  assert.equal(btn.disabled,true);
  pending.resolve({data:{session:null},error:null});await twice();
  assert.equal(btn.disabled,false);
  assert.equal(f.calls.signIn,1);
  assert.match(f.d.getElementById('customerSignUpMessage').textContent,/check your inbox/i);
  assert.equal(f.d.getElementById('customerConfirmationActions').hidden,false);
 }finally{f.close();}
});
test('customer sign-up network errors fail safely, remain retryable and disclose no existence info',async()=>{
 const f=await setup({signUp:async()=>{f.calls.signUp++;throw Error('PRIVATE API URL / secret-token');}});
 try{
  f.readySignup();f.submit('customerSignUpForm');await twice();
  const m=f.d.getElementById('customerSignUpMessage').textContent;
  assert.match(m,/temporarily unavailable/i);assert.doesNotMatch(m,/PRIVATE|secret|URL/);
  assert.equal(f.d.querySelector('#customerSignUpForm [type=submit]').disabled,false);
  assert.equal(f.calls.signUp,1);
  assert.equal(f.calls.signIn,0);
 }finally{f.close();}
});
test('customer sign-in requires a returned authenticated session, prevents double submit and handles failure',async()=>{
 const pending=deferred();
 const f=await setup({signInWithPassword:()=>{f.calls.signIn++;return pending.promise;}});
 try{
  f.readySignIn();f.submit('customerSignInForm');f.submit('customerSignInForm');
  assert.equal(f.calls.signIn,1);
  assert.equal(f.d.querySelector('#customerSignInForm [type=submit]').disabled,true);
  pending.resolve({data:{session:null},error:null});await twice();
  assert.match(f.d.getElementById('customerSignInMessage').textContent,/could not be verified/);
  assert.equal(f.d.querySelector('#customerSignInForm [type=submit]').disabled,false);
 }finally{f.close();}
});
test('customer sign-in provider rejection does not leave loading button locked',async()=>{
 const f=await setup({signInWithPassword:async()=>{f.calls.signIn++;throw Error('private provider details');}});
 try{
  f.readySignIn();f.submit('customerSignInForm');await twice();
  assert.match(f.d.getElementById('customerSignInMessage').textContent,/temporarily unavailable/);
  assert.doesNotMatch(f.d.getElementById('customerSignInMessage').textContent,/provider details/);
  assert.equal(f.d.querySelector('#customerSignInForm [type=submit]').disabled,false);
 }finally{f.close();}
});
test('confirmation resend cannot duplicate while pending and safely recovers after failure',async()=>{
 const pending=deferred();
 const f=await setup({resend:()=>{f.calls.resend++;return pending.promise;}});
 try{
  f.readySignup();
  const button=f.d.getElementById('customerResendConfirmation');
  button.click();button.click();
  assert.equal(f.calls.resend,1);assert.equal(button.disabled,true);
  pending.reject(new Error('provider detail'));await twice();
  assert.equal(button.disabled,false);
  assert.match(f.d.getElementById('customerSignUpMessage').textContent,/try again shortly/i);
  assert.doesNotMatch(f.d.getElementById('customerSignUpMessage').textContent,/provider detail/);
 }finally{f.close();}
});
test('invalid password and missing privacy acknowledgement never call registration',async()=>{
 const f=await setup();
 try{
  f.readySignup();f.d.getElementById('customerPrivacyAcknowledgement').checked=false;
  f.submit('customerSignUpForm');
  assert.equal(f.calls.signUp,0);
  f.d.getElementById('customerPrivacyAcknowledgement').checked=true;
  f.input('customerSignUpConfirm','not a match');
  f.submit('customerSignUpForm');
  assert.equal(f.calls.signUp,0);
 }finally{f.close();}
});
test('valid customer sign-in sets the authenticated session and loads only the customer portal',async()=>{
 let confirmedSession=null;
 const validSession={access_token:'synthetic-local-session-only'};
 const f=await setup({
   getSession:async()=>({data:{session:confirmedSession}}),
   signInWithPassword:async()=>{confirmedSession=validSession;return {data:{session:validSession},error:null};}
 });
 try{
  f.readySignIn();
  f.submit('customerSignInForm');
  await twice();await twice();
  assert.equal(f.d.getElementById('customerPortalScreen').hidden,false);
  assert.equal(f.d.getElementById('customerPortalScreen').getAttribute('aria-hidden'),'false');
  assert.equal(f.d.getElementById('customerAuthScreen').hidden,true);
  assert.ok(f.calls.portal>=1,'session must be verified through customer portal handler');
  assert.doesNotMatch(f.d.getElementById('customerSignInMessage').textContent,/failed|unavailable/i);
 }finally{f.close();}
});
