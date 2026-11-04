import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../assets/security-center.js',import.meta.url),'utf8');
const start=source.indexOf('  async function authorisedFetch(');
const end=source.indexOf('\n  function injectUi()',start);
assert.ok(start>=0&&end>start);
function fixture({preview=true,session={access_token:'synthetic-session'},status=200,body={ok:true}}={}){
 const calls=[];
 const window={location:{origin:'https://preview.example.invalid'},colzoPreviewAuthTransportEnabled:preview,
  colzoBackendFetch:async(path,options)=>{calls.push({path,options});return {ok:status>=200&&status<300,status,json:async()=>body};}};
 const request=runInNewContext(source.slice(start,end)+'\nauthorisedFetch;',{
  client:()=>({auth:{getSession:async()=>({data:{session}})}}),Headers,URL,window,Error
 });
 return {calls,request};
}
test('security requests use the approved Preview transport and preserve method/body',async()=>{
 const f=fixture();
 await f.request('/api/incident-controls',{method:'PATCH',body:'{}',headers:{'Content-Type':'application/json',Authorization:'obsolete'}});
 const call=f.calls[0];
 assert.equal(call.options.headers.get('X-Colzo-Supabase-Authorization'),'Bearer synthetic-session');
 assert.equal(call.options.headers.has('Authorization'),false);
 assert.equal(call.options.headers.get('Content-Type'),'application/json');
 assert.equal(call.options.method,'PATCH');assert.equal(call.options.body,'{}');
});
test('ordinary deployments keep the existing standard bearer transport',async()=>{
 const f=fixture({preview:false});await f.request('/api/audit-log');
 assert.equal(f.calls[0].options.headers.get('Authorization'),'Bearer synthetic-session');
 assert.equal(f.calls[0].options.headers.has('X-Colzo-Supabase-Authorization'),false);
});
test('security bearer values are never sent to another origin',async()=>{
 const f=fixture();
 await assert.rejects(()=>f.request('https://other.example.invalid/api/audit-log'),/Invalid security request/);
 assert.equal(f.calls.length,0);
});
test('missing sessions fail before issuing a security request',async()=>{
 const f=fixture({session:null});await assert.rejects(()=>f.request('/api/audit-log'),/session has expired/);
 assert.equal(f.calls.length,0);
});
test('server MFA denials retain their status and code with Preview transport',async()=>{
 const f=fixture({status:403,body:{error:'Multi-factor authentication is required',code:'MFA_REQUIRED'}});
 await assert.rejects(()=>f.request('/api/incident-controls'),e=>e.status===403&&e.code==='MFA_REQUIRED');
});
