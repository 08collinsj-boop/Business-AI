import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync('assets/colzo-live-security-panel.js','utf8');
const alias='business-ai-git-feature-colzo-preview-self-daffcb-buisness-ai1.vercel.app';
const tick=()=>new Promise(r=>setTimeout(r,20));
function fixture({session=true,aal='aal1',host=alias,leak=false}={}){
 const dom=new JSDOM('<body></body>',{url:'https://'+host+'/?qaSecurity=1',runScripts:'outside-only'}),w=dom.window;const calls=[];
 w.supabaseClient={auth:{getSession:async()=>({data:{session:session?{access_token:'synthetic-private-token',user:{id:'qa'}}:null}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:aal}})}}};
 w.fetch=async(url,options={})=>{calls.push({url,options});if(url==='/api/public-config')return {ok:true,json:async()=>({supabaseUrl:'https://mvwseobgkexzpmmkgcxe.supabase.co',supabaseAnonKey:'synthetic-public-key',pilotAccess:{approvalRequired:true,fictionalDataOnly:true}})};
 if(String(url).includes('/rest/v1/'))return {status:200,json:async()=>leak?[{id:'do-not-display'}]:[]};
 return {status:options.headers.Authorization?403:401,json:async()=>({code:options.headers.Authorization?'MFA_REQUIRED':'UNAUTHORIZED'})};};
 w.eval(source);return {w,dom,calls};
}
test('AAL1 panel makes only bounded GET probes and displays no tokens or record contents',async()=>{
 const f=fixture();f.w.document.querySelector('button').click();await tick();
 assert.match(f.w.document.body.textContent,/9\/9/);assert.doesNotMatch(f.w.document.body.textContent,/synthetic-private-token|synthetic-public-key/);
 assert.equal(f.calls.length,10);assert.ok(f.calls.every(c=>!c.options.method||c.options.method==='GET'));f.dom.window.close();
});
test('no session, AAL2, or an unapproved origin cannot produce an AAL1 acceptance pass',async()=>{
 for(const options of [{session:false},{aal:'aal2'},{host:'example.com'}]){const f=fixture(options);f.w.document.querySelector('button')?.click();await tick();assert.doesNotMatch(f.w.document.body.textContent,/9\/9/);assert.ok(f.calls.every(c=>c.url==='/api/public-config'));f.dom.window.close();}
});
test('a leaked Data API row fails the probe without displaying record IDs',async()=>{const f=fixture({leak:true});f.w.document.querySelector('button').click();await tick();assert.match(f.w.document.body.textContent,/6\/9/);assert.doesNotMatch(f.w.document.body.textContent,/do-not-display/);f.dom.window.close();});
function aal2Fixture({foreignLeak=false,memberLeak=false,nestedError=false}={}){
 const A='6da33602-1b8f-474d-84a6-e003d1c713fd',B='433f135d-720f-4687-8114-3dffe7361675',U='10000000-0000-4000-8000-000000000001';
 const dom=new JSDOM('<body></body>',{url:'https://'+alias+'/?qaSecurity=1',runScripts:'outside-only'}),w=dom.window,calls=[];
 w.supabaseClient={auth:{getSession:async()=>({data:{session:{access_token:'synthetic-private-token',user:{id:U}}}}),getUser:async()=>({data:{user:{id:U}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})}}};
 const reply=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>body});
 w.fetch=async(input,options={})=>{
  const url=new URL(input,w.location.origin);calls.push({url,options});
  if(url.pathname==='/api/public-config')return reply(200,{supabaseUrl:'https://mvwseobgkexzpmmkgcxe.supabase.co',supabaseAnonKey:'synthetic-public-key',pilotAccess:{approvalRequired:true,fictionalDataOnly:true}});
  if(url.pathname.endsWith('/business_memberships'))return reply(200,[{business_id:memberLeak?'foreign-business':A,user_id:U,role:'owner'}]);
  if(url.pathname.startsWith('/rest/v1/'))return reply(200,foreignLeak?[{id:'private-row-sentinel',business_id:B}]:[]);
  if(!options.headers.Authorization)return reply(401,{error:'Authentication is required'});
  if(url.pathname==='/api/incident-controls')return nestedError?reply(401,{error:{code:'INVALID_AUTHENTICATION_TOKEN',message:'private-debug-sentinel'}}):reply(200,{controls:{},effective:{},platform:{}});
  if(url.pathname==='/api/audit-log')return reply(200,[]);
  if(url.searchParams.has('id'))return reply(404,{error:'Record not found'});
  return reply(200,[{id:'own-private-row',business_id:A,name:'private-customer-sentinel'}]);
 };
 w.eval(source);return {w,dom,calls};
}
test('issued AAL2 probes verify own positive reads and foreign IDs without exposing records or credentials',async()=>{
 const f=aal2Fixture();f.w.document.querySelector('button').click();await tick();
 assert.match(f.w.document.body.textContent,/13\/13/);
 assert.match(f.w.document.body.textContent,/one.direction/i);
 assert.doesNotMatch(f.w.document.body.textContent,/synthetic-private-token|synthetic-public-key|own-private-row|private-customer-sentinel/);
 assert.ok(f.calls.every(c=>!c.options.method||c.options.method==='GET'));f.dom.window.close();
});
test('foreign AAL2 rows fail denial checks and unexpected membership prevents probes',async()=>{
 const f=aal2Fixture({foreignLeak:true});f.w.document.querySelector('button').click();await tick();
 assert.doesNotMatch(f.w.document.body.textContent,/13\/13|private-row-sentinel/);assert.match(f.w.document.body.textContent,/FAIL/);f.dom.window.close();
 const g=aal2Fixture({memberLeak:true});g.w.document.querySelector('button').click();await tick();
 assert.ok(g.calls.every(c=>c.url.pathname==='/api/public-config'||c.url.pathname.endsWith('/business_memberships')));assert.doesNotMatch(g.w.document.body.textContent,/13\/13/);g.dom.window.close();
});
test('gateway errors display only bounded status and code',async()=>{
 const f=aal2Fixture({nestedError:true});f.w.document.querySelector('button').click();await tick();
 assert.match(f.w.document.body.textContent,/HTTP 401 INVALID_AUTHENTICATION_TOKEN/);
 assert.doesNotMatch(f.w.document.body.textContent,/private-debug-sentinel|\[object Object\]/);f.dom.window.close();
});
