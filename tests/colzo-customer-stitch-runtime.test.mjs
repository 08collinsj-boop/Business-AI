import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const markup=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../assets/customer-portal.js',import.meta.url),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(fetcher){
 const dom=new JSDOM(markup,{url:'https://customer.example.invalid/customer/account',runScripts:'outside-only'});
 const w=dom.window;
 w.Headers=Headers;
 w.supabaseClient={auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}};
 w.colzoBackendFetch=fetcher||(async()=>({ok:true,json:async()=>({businesses:[]})}));
 w.setAppLoading=()=>{};
 w.eval(source);
 await tick();
 return {dom,w,doc:w.document,search(query){w.document.querySelector('#customerPortalSearchInput').value=query;w.document.querySelector('#customerPortalSearchForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));}};
}

test('customer search presents HTTP failure as unavailable, retains query and offers a retry',async()=>{
 let requests=0;
 const f=await fixture(async()=>{requests++;return {ok:false,json:async()=>({error:'Unavailable'})};});
 try{
  f.search('Hartlepool');await tick();
  const target=f.doc.querySelector('#customerPortalSearchResults');
  assert.match(target.textContent,/temporarily unavailable/i);
  assert.doesNotMatch(target.textContent,/No matching businesses/);
  assert.equal(f.doc.querySelector('#customerPortalSearchInput').value,'Hartlepool');
  target.querySelector('button').click();await tick();
  assert.equal(requests,2);
  assert.equal(target.getAttribute('aria-busy'),'false');
 }finally{f.dom.window.close();}
});

test('older search responses cannot replace the latest customer query',async()=>{
 const pending=[];
 const f=await fixture(()=>new Promise(resolve=>pending.push(resolve)));
 try{
  f.search('Old query');f.search('New query');
  pending[1]({ok:true,json:async()=>({businesses:[{name:'New match',slug:'new'}]})});await tick();
  pending[0]({ok:true,json:async()=>({businesses:[{name:'Old match',slug:'old'}]})});await tick();
  const text=f.doc.querySelector('#customerPortalSearchResults').textContent;
  assert.match(text,/New match/);assert.doesNotMatch(text,/Old match/);
 }finally{f.dom.window.close();}
});

test('clearing a search invalidates an outstanding response without showing stale results',async()=>{
 let finish;
 const f=await fixture(()=>new Promise(resolve=>{finish=resolve;}));
 try{
  f.search('Pending');f.search('');
  finish({ok:true,json:async()=>({businesses:[{name:'Stale match',slug:'stale'}]})});await tick();
  assert.match(f.doc.querySelector('#customerPortalSearchResults').textContent,/Start typing/);
  assert.doesNotMatch(f.doc.querySelector('#customerPortalSearchResults').textContent,/Stale match/);
 }finally{f.dom.window.close();}
});

test('customer submit controls follow required fields, password rules and privacy acknowledgement',async()=>{
 const f=await fixture();
 try{
  const login=f.doc.querySelector('#customerSignInForm');
  assert.equal(login.querySelector('[type="submit"]').disabled,true);
  f.doc.querySelector('#customerSignInEmail').value='alex@example.invalid';
  f.doc.querySelector('#customerSignInPassword').value='ExamplePassword123!';
  login.dispatchEvent(new f.w.Event('input',{bubbles:true}));
  assert.equal(login.querySelector('[type="submit"]').disabled,false);
  const form=f.doc.querySelector('#customerSignUpForm');
  for(const [id,value] of Object.entries({customerSignUpName:'Alex Example',customerSignUpEmail:'alex@example.invalid',customerSignUpPassword:'ExamplePassword123!',customerSignUpConfirm:'ExamplePassword123!'}))f.doc.getElementById(id).value=value;
  form.dispatchEvent(new f.w.Event('input',{bubbles:true}));
  assert.equal(form.querySelector('[type="submit"]').disabled,true);
  f.doc.querySelector('#customerPrivacyAcknowledgement').checked=true;
  form.dispatchEvent(new f.w.Event('change',{bubbles:true}));
  assert.equal(form.querySelector('[type="submit"]').disabled,false);
  f.doc.querySelector('#customerSignUpConfirm').value='Mismatch';
  form.dispatchEvent(new f.w.Event('input',{bubbles:true}));
  assert.equal(form.querySelector('[type="submit"]').disabled,true);
 }finally{f.dom.window.close();}
});
