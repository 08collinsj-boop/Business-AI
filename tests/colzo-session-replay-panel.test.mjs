import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync('assets/colzo-session-replay-panel.js','utf8');
const host='business-ai-git-feature-colzo-preview-self-daffcb-buisness-ai1.vercel.app';
const B='6da33602-1b8f-474d-84a6-e003d1c713fd',U='10000000-0000-4000-8000-000000000001';
const tick=()=>new Promise(r=>setTimeout(r,20));
function fixture({aal='aal2',replayAllowed=false,logoutError=false,foreign=false,expiry=Date.now()/1000+600,enabled=true}={}){
 const dom=new JSDOM('<body></body>',{url:'https://'+host+'/?'+(enabled?'qaReplay=1':''),runScripts:'outside-only'}),w=dom.window,calls=[];
 const token='synthetic.'+Buffer.from(JSON.stringify({sub:U,session_id:'20000000-0000-4000-8000-000000000001',exp:expiry})).toString('base64url')+'.signature';
 let ended=false;
 w.supabaseClient={auth:{getSession:async()=>({data:{session:{access_token:token,user:{id:U}}}}),getUser:async()=>({data:{user:{id:U}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:aal}})},signOut:async options=>{calls.push({logout:options});if(logoutError)return {error:{message:'private-error-sentinel'}};ended=true;return {error:null};}}};
 const reply=(status,body)=>({status,ok:status>=200&&status<300,json:async()=>body});
 w.fetch=async(input,options={})=>{
  calls.push({input,options});
  if(input==='/api/public-config')return reply(200,{supabaseUrl:'https://mvwseobgkexzpmmkgcxe.supabase.co',supabaseAnonKey:'synthetic-public-key',pilotAccess:{approvalRequired:true,fictionalDataOnly:true}});
  const path=new URL(input,w.location.origin).pathname;
  if(path.endsWith('business_memberships'))return reply(200,[{business_id:B,user_id:U,role:'owner'}]);
  if(path.startsWith('/rest/v1/'))return reply(200,ended?[]:[{id:'private-row-sentinel',business_id:foreign?'foreign':B}]);
  return reply(ended&&!replayAllowed?401:200,ended&&!replayAllowed?{error:'Authentication is required'}:[{id:'private-row-sentinel',business_id:foreign?'foreign':B}]);
 };
 w.eval(source);return {w,dom,calls,token};
}
test('session replay test is explicit, locally scoped, and preserves the exact issued bearer privately',async()=>{
 const f=fixture();assert.equal(f.calls.length,0);f.w.document.querySelector('button').click();await tick();
 assert.match(f.w.document.body.textContent,/PASS retained-token API/);assert.match(f.w.document.body.textContent,/PASS retained-token Data API/);
 const logouts=f.calls.filter(c=>c.logout);assert.equal(logouts.length,1);assert.equal(logouts[0].logout.scope,'local');
 const index=f.calls.findIndex(c=>c.logout);assert.ok(index>1);
 for(const c of f.calls.filter(c=>c.input&&c.input!=='/api/public-config'))assert.equal(c.options.headers.Authorization,'Bearer '+f.token);
 assert.doesNotMatch(f.w.document.body.textContent,/synthetic\.|private-row-sentinel|synthetic-public-key/);
 assert.equal(f.w.localStorage.length,0);f.dom.window.close();
});
test('successful access with retained logout token is a failed security test',async()=>{
 const f=fixture({replayAllowed:true});f.w.document.querySelector('button').click();await tick();
 assert.match(f.w.document.body.textContent,/FAIL retained-token API.*HTTP 200/);assert.doesNotMatch(f.w.document.body.textContent,/all.*passed/i);f.dom.window.close();
});
test('unverified assurance, foreign baseline and near-expired JWT stop before any logout',async()=>{
 for(const options of [{aal:'aal1'},{foreign:true},{expiry:Date.now()/1000+30}]){
  const f=fixture(options);f.w.document.querySelector('button').click();await tick();assert.equal(f.calls.filter(c=>c.logout).length,0);assert.match(f.w.document.body.textContent,/inconclusive/i);f.dom.window.close();
 }
});
test('failed logout is inconclusive and never probes replay or displays raw errors',async()=>{
 const f=fixture({logoutError:true});f.w.document.querySelector('button').click();await tick();
 const at=f.calls.findIndex(c=>c.logout);assert.equal(f.calls.length,at+1);assert.match(f.w.document.body.textContent,/inconclusive/i);assert.doesNotMatch(f.w.document.body.textContent,/private-error-sentinel/);f.dom.window.close();
});
test('normal page has no logout test controls or requests',()=>{const f=fixture({enabled:false});assert.equal(f.w.document.querySelector('button'),null);assert.equal(f.calls.length,0);f.dom.window.close();});
