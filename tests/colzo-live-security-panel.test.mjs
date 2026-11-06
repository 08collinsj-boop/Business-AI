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
