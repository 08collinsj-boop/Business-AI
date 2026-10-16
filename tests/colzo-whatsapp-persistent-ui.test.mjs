import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const src=readFileSync(new URL('../assets/colzo-whatsapp-inbox-demo.js',import.meta.url),'utf8');
const native=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
function controller(){const ctx={window:{}};runInNewContext(src,ctx,{timeout:1000});return ctx.window.ColzoWhatsAppDemo;}
const items=[
 {fixture_key:'demo-a',customer_label:'Sample customer A',tag:'Booking request',messages:['Test message'],draft:'Review only',state:'review',updated_at:'2026-10-16T12:00:00.000Z',received_at:'2026-10-16T12:00:00.000Z'},
 {fixture_key:'demo-b',customer_label:'Sample customer B',tag:'Handover',messages:['Please call back'],draft:null,state:'human',updated_at:'2026-10-16T12:00:00.000Z',received_at:'2026-10-16T12:00:00.000Z'}
];
test('saved inbox does not call server until deliberate user action',()=>{
 const c=controller();
 assert.match(c.render(),/Demo only/);
 assert.match(c.render(),/Save fictional chats/);
 assert.equal(c.isPersisted(),false);
});
test('seed action only issues zero-user-content POST then tenant authorised GET',async()=>{
 const c=controller(),calls=[];
 const api=async(path,opt)=>{calls.push([path,opt]);return opt?.method==='POST'?{inserted:3}:{mode:'synthetic_persistent',items};};
 assert.equal(await c.act('persist:seed',api),true);
 assert.equal(c.isPersisted(),true);
 assert.equal(calls.length,2);
 assert.equal(calls[0][0],'/api/colzo-whatsapp-inbox');
 assert.equal(calls[0][1].method,'POST');
 assert.equal(calls[0][1].body,'{}');
 assert.equal(calls[1][0],'/api/colzo-whatsapp-inbox');
 assert.match(c.render(),/Saved fictional conversations/);
 assert.match(c.render(),/Test message/);
 assert.doesNotMatch(c.render(),/Save fictional chats/);
});
test('human handover uses exact saved version, never local mutation on failed PATCH',async()=>{
 const c=controller(),calls=[];
 const api=async(path,opt)=>{
  calls.push([path,opt]);
  if(opt?.method==='PATCH')throw Object.assign(Error('Conflict'),{status:409});
  return {mode:'synthetic_persistent',items};
 };
 await c.act('persist:load',api);
 await c.act('handover:demo-a',api);
 assert.equal(calls[1][1].method,'PATCH');
 const patch=JSON.parse(calls[1][1].body);
 assert.deepEqual(Object.keys(patch).sort(),['expected_updated_at','fixture_key','state']);
 assert.equal(patch.expected_updated_at,items[0].updated_at);
 assert.equal(patch.state,'human');
 assert.match(c.render(),/Conflict|refresh|could not/i);
});
test('saved UI never exposes a send control and rejects malformed records',async()=>{
 const c=controller();
 const api=async()=>({mode:'synthetic_persistent',items:[{fixture_key:'bad',messages:['<script>alert(1)</script>'],state:'review'}]});
 await c.act('persist:load',api);
 assert.equal(c.isPersisted(),false);
 assert.doesNotMatch(c.render(),/data-wa-action="send/);
});
test('native owner routes async persisted actions through existing authenticated api',()=>{
 assert.match(native,/ColzoWhatsAppDemo\.act/);
 assert.match(native,/typeof api/);
});


test('logout/reset cannot repopulate saved chats when an earlier authorised read finishes late', async()=>{
 const c=controller();
 let finish;
 const api=()=>new Promise(resolve=>{finish=resolve;});
 const pending=c.act('persist:load',api);
 c.reset(); // Called by Colzo owner auth-state teardown
 finish({mode:'synthetic_persistent',items});
 assert.equal(await pending,false);
 assert.equal(c.isPersisted(),false);
 assert.doesNotMatch(c.render(),/Test message|Saved fictional conversations/);
 assert.match(c.render(),/Demo only - fictional messages/);
});

test('reset cancels stale failure and allows a new authorised load without old response overwriting it',async()=>{
 const c=controller();
 let finishFirst,failFirst;
 const oldRequest=new Promise((resolve,reject)=>{finishFirst=resolve;failFirst=reject;});
 const first=c.act('persist:load',()=>oldRequest);
 c.reset();
 const newer=[{...items[0],messages:['Second session example'],customer_label:'Another sample'}];
 const second=await c.act('persist:load',async()=>({mode:'synthetic_persistent',items:newer}));
 assert.equal(second,true);
 assert.equal(c.isPersisted(),true);
 failFirst(new Error('Old account error'));
 assert.equal(await first,false);
 assert.match(c.render(),/Second session example/);
 assert.doesNotMatch(c.render(),/Old account error|Test message/);
});

test('reset during slow handover must not restore previous tenant record in the UI',async()=>{
 const c=controller();
 await c.act('persist:load',async()=>({mode:'synthetic_persistent',items}));
 let releaseHandover;
 const held=new Promise(resolve=>{releaseHandover=resolve;});
 const inFlight=c.act('handover:demo-a',async(path,options)=>{
  if(options?.method==='PATCH')return held;
  return {mode:'synthetic_persistent',items};
 });
 c.reset();
 releaseHandover({mode:'synthetic_persistent',items});
 assert.equal(await inFlight,false);
 assert.equal(c.isPersisted(),false);
 assert.doesNotMatch(c.render(),/Test message|Saved fictional conversations/);
});
