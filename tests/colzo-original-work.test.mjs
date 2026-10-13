import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readOriginalWork} from '../lib/colzo-original-readonly.js';
const bearer='Bearer eyA.eyB.signature';
const resp=(data,code=200)=>({status:code,ok:code>=200&&code<300,json:async()=>data});
test('bookings and actions use only fixed, GET-only URLs and the authenticated owner bearer token',async()=>{
 for(const kind of ['bookings','actions']){
  let calls=0;
  const result=await readOriginalWork(kind,bearer,async(url,options)=>{
    calls++;assert.equal(url,`https://app.getbusiness-ai.com/api/${kind}`);
    assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,bearer);
    assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
    assert.equal('Cookie' in options.headers,false);
    return resp([]);
  });
  assert.equal(calls,1);assert.equal(result.status,200);assert.deepEqual(result.body.items,[]);
 }
});
test('invalid auth, invalid route and remote denials fail closed',async()=>{
 let calls=0;
 const fake=async()=>{calls++;throw Error('should not fetch');};
 for(const invalid of [null,undefined,'Bearer injected','Bearer a.b.c\nFake: yes'])assert.equal((await readOriginalWork('bookings',invalid,fake)).status,401);
 assert.equal((await readOriginalWork('../api/leads',bearer,fake)).status,404);
 assert.equal(calls,0);
 for(const kind of ['bookings','actions'])for(const status of [401,403,500]){
   const result=await readOriginalWork(kind,bearer,async()=>resp({sensitive:'internal'},status));
   assert.equal(result.status,status===500?503:status);
   assert.doesNotMatch(JSON.stringify(result),/sensitive|internal/);
 }
});
test('booking metadata is minimised: no phone, email, notes, other tenant ID or secrets',async()=>{
 const sample={id:31,lead_id:9,title:'Electrical visit',customer_name:'Customer A',starts_at:'2026-10-14T10:00:00Z',ends_at:'2026-10-14T11:00:00Z',status:'confirmed',customer_phone:'secret phone',customer_email:'secret@example.com',notes:'secret notes',business_id:'tenant secret'};
 const result=await readOriginalWork('bookings',bearer,async()=>resp([sample]));
 assert.deepEqual(result.body.items,[{id:'31',lead_id:'9',title:'Electrical visit',customer_name:'Customer A',status:'confirmed',starts_at:'2026-10-14T10:00:00Z',ends_at:'2026-10-14T11:00:00Z'}]);
 assert.doesNotMatch(JSON.stringify(result),/secret|business_id/);
});
test('actions are minimised and mapped with due dates, no private descriptions',async()=>{
 const sample={id:29,lead_id:9,title:'Call customer',priority:'high',status:'pending',due_at:'2026-10-14T10:00:00Z',action_type:'follow_up',description:'private account info',customer_email:'private@sample.com'};
 const result=await readOriginalWork('actions',bearer,async()=>resp([sample]));
 assert.deepEqual(result.body.items,[{id:'29',lead_id:'9',title:'Call customer',status:'pending',priority:'high',due_at:'2026-10-14T10:00:00Z',action_type:'follow_up'}]);
 assert.doesNotMatch(JSON.stringify(result),/private/);
});
test('malformed upstream responses never become empty fake success',async()=>{
 for(const bad of [null,{items:[]},'unexpected']){
  const result=await readOriginalWork('bookings',bearer,async()=>resp(bad));
  assert.equal(result.status,503);
 }
});
test('work lists limit responses, sanitize fields and never provide a direct Supabase service role key',async()=>{
 const records=Array.from({length:120},(_,i)=>({id:i+1,lead_id:i+1,title:'x'.repeat(300),status:'pending',priority:'normal',description:'private'}));
 const result=await readOriginalWork('actions',bearer,async()=>resp(records));
 assert.equal(result.body.items.length,100);assert.equal(result.body.truncated,true);
 assert.equal(result.body.items[0].title.length,160);
 assert.doesNotMatch(JSON.stringify(result),/private/);
 const handler=await readFile(new URL('../lib/colzo-original-readonly.js',import.meta.url),'utf8');
 assert.match(handler,/\['config','enquiries','bookings','actions'\]/);
 assert.doesNotMatch(handler,/SUPABASE_SERVICE_ROLE_KEY|method: 'POST'|method: 'PATCH'|method: 'DELETE'/);
});
test('frontend loads work only with the current verified bearer session, and never writes to original server',async()=>{
 const [html,js]=await Promise.all(['colzo-readonly.html','assets/colzo-readonly.js'].map(x=>readFile(new URL('../'+x,import.meta.url),'utf8')));
 for(const id of ['colzoHomeWorkList','colzoWorkRecords','colzoWorkStatus','colzoHomeOpenWork'])assert.ok(html.includes(`id="${id}"`));
 for(const kind of ['bookings','actions'])assert.match(js,new RegExp(`load\\('${kind}'\\)`));
 assert.match(js,/if\(!token\|\|token!==sessionToken\)return/);
 assert.match(js,/workLoadState\[kind\]='error'/);
 assert.match(js,/renderUpcomingWork\(\)/);
 assert.match(js,/function renderWork\(\)/);
 assert.match(js,/function renderUpcomingWork\(\)/);
 assert.match(js,/kind==='clients'/);
 assert.match(js,/const names=new Set\(\)/);
 assert.doesNotMatch(js,/method:'POST'|method:'PATCH'|method:'DELETE'|localStorage|sessionStorage/);
});
