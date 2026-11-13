import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const security=readFileSync(new URL('../assets/security-center.js',import.meta.url),'utf8');
const start=html.indexOf('const handleSession=async (session)=>{');
const end=html.indexOf('let readyAuthUserId=null;',start);
assert.ok(start>0&&end>start);
const handlerSource=html.slice(start,end);

function fixture({requireMfa=true,mfaResult=null,assurance='aal2'}={}){
 let releaseChallenge,resolvePromise;
 const promise=new Promise(resolve=>resolvePromise=resolve);
 const events=[];let view='auth-required',cache='PRIVATE_FROM_OLD_SESSION',acl=assurance;
 const session={user:{id:'fictional-owner-id'},access_token:'fake-test-only'};
 const context={
  frontendAuthEnabled:true,colzoLoginFailure:null,window:{},
  setAppLoading:v=>events.push(['loading',v]),
  setAuthView:(state)=>{events.push(['view',state]);view=state;},
  clearPrivateState:()=>{events.push(['clear']);cache='';},
  loadLegalState:async()=>{events.push(['legal']);return{needs_user_acceptance:false,dpa_required:false}},
  invitationIdFromLocation:()=>null,
  applyBusinessContext:()=>events.push(['business-context']),
  beginConfigurationOnboarding:async()=>events.push(['begin-onboarding']),
  registerOwnerPwa:()=>events.push(['pwa']),
  loadAll:async()=>{events.push(['loadAll']);cache='SIMULATED_PRIVATE_LEAD';},
  api:async path=>{events.push(['api',path]);if(path==='/api/business-onboarding')return{role:'owner',public_slug:'fictional',needs_business:false};if(path==='/api/business-configuration')return{onboarding:{completed:true}};throw Error('Unexpected '+path);},
  authenticatedBusinessRole:'owner',supabaseClient:{auth:{
    getSession:async()=>({data:{session}}),
    mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:acl}})}
  }},
  document:{body:{classList:{contains:()=>view==='auth-ready'}}},
  Error,Date,console
 };
 context.window.colzoRequireWorkspaceAal2=requireMfa?async()=>{events.push(['mfa']);const value=await promise;return value;}:undefined;
 vm.createContext(context);
 vm.runInContext(handlerSource+'\nthis.execute=handleSession;',context);
 return{context,session,events,get view(){return view},get cache(){return cache},resolve:v=>resolvePromise(v),setAssurance:v=>acl=v};
}

test('P1 reproduction: an AAL1 password session never loads or hydrates business records while the MFA dialog waits',async()=>{
 const f=fixture();
 const operation=f.context.execute(f.session);
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.deepEqual(f.events.filter(([type])=>type==='api'||type==='loadAll'),[]);
 assert.equal(f.view,'auth-pending');
 assert.equal(f.cache,'');
 f.resolve(false);await operation;
 assert.equal(f.view,'auth-required');
 assert.equal(f.cache,'');
});

test('a completed MFA challenge unlocks the tenant exactly once and only after a fresh AAL2 assurance check',async()=>{
 const f=fixture();const operation=f.context.execute(f.session);
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(f.events.some(([e])=>e==='api'||e==='loadAll'),false);
 f.resolve(true);await operation;
 assert.equal(f.view,'auth-ready');
 assert.deepEqual(f.events.filter(([e])=>e==='loadAll'),[['loadAll']]);
 assert.ok(f.events.findIndex(([e])=>e==='mfa')<f.events.findIndex(([e])=>e==='api'));
});

test('stale AAL1 after MFA UI success fails closed before any tenant request',async()=>{
 const f=fixture({assurance:'aal1'});const operation=f.context.execute(f.session);
 await new Promise(resolve=>setTimeout(resolve,0));f.resolve(true);await operation;
 assert.equal(f.view,'auth-required');
 assert.equal(f.events.some(([e])=>e==='api'||e==='loadAll'),false);
});

test('MFA helper not loaded fails closed rather than entering the workspace',async()=>{
 const f=fixture({requireMfa:false});await f.context.execute(f.session);
 assert.equal(f.view,'auth-required');
 assert.equal(f.cache,'');
 assert.equal(f.events.some(([e])=>e==='api'||e==='loadAll'),false);
});

test('MFA challenge is driven by account assurance and never a cosmetic overlay alone',()=>{
 assert.match(security,/window\.colzoRequireWorkspaceAal2\s*=/);
 assert.match(security,/challengeForAal2\(\{blocking:true/);
 assert.match(security,/currentLevel\s*===\s*'aal2'/);
 assert.match(handlerSource,/clearPrivateState\(\);/);
});
