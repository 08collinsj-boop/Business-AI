import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createSyntheticWhatsAppProcessor} from '../lib/whatsapp-synthetic-processor.js';

const businessA='12345678-1234-4234-8234-123456789012';
const businessB='22345678-1234-4234-8234-123456789012';
const account='AC'+'a'.repeat(32),sender='whatsapp:+447700900001';
const sid='SM'+'b'.repeat(32),url='https://qa.local/api/whatsapp-inbound',token='synthetic-only-token';
const make=(body='What are your opening hours?',messageSid=sid)=>new URLSearchParams({
 AccountSid:account, MessageSid:messageSid,From:'whatsapp:+447700900002',
 To:sender,Body:body,NumMedia:'0',BusinessId:businessB
}).toString();
const sign=raw=>{const p=Object.fromEntries(new URLSearchParams(raw));return createHmac('sha1',token).update(url+Object.keys(p).sort().map(k=>k+p[k]).join('')).digest('base64');};
const init=opts=>createSyntheticWhatsAppProcessor({
 businessId:businessA,authToken:token,webhookUrl:url,
 senderBindings:[{businessId:businessA,accountSid:account,whatsappAddress:sender,status:'verified',connectedByOwner:true}],
 loadPolicy:async()=>({channelEnabled:true,mode:'balanced',approvedKnowledge:true}),
 assessIntent:async()=>({safe:true,kind:'faq'}),
 draftWithApprovedKnowledge:async()=>({text:'We are open Monday to Friday.',grounded:true}),
 ...opts
});

test('one verified signed message yields a review-only tenant-bound receipt',async()=>{
 const store=init();const raw=make();const r=await store.receive({rawBody:raw,signature:sign(raw)});
 assert.equal(r.code,'draft_for_review');
 assert.equal(r.canSendReply,false);
 assert.equal(r.canCreateLead,false);
 assert.equal(r.businessId,businessA);
 const receipts=store.snapshot({businessId:businessA});
 assert.equal(receipts.length,1);assert.equal(receipts[0].businessId,businessA);
 assert.equal(receipts[0].messageSid,sid);
 assert.equal(receipts[0].state,'draft_for_review');
 assert.equal(receipts[0].preview,'We are open Monday to Friday.');
 assert.equal('body' in receipts[0],false);assert.equal('customerPhone' in receipts[0],false);
 assert.equal('BusinessId' in receipts[0],false);
 assert.throws(()=>store.snapshot({businessId:businessB}),/tenant/i);
});

test('identical concurrent webhook deliveries create exactly one draft',async()=>{
 let drafts=0;
 const store=init({draftWithApprovedKnowledge:async()=>{drafts++;return {text:'We are open.',grounded:true}}});
 const raw=make();
 const results=await Promise.all(Array.from({length:15},()=>store.receive({rawBody:raw,signature:sign(raw)})));
 assert.equal(results.filter(r=>r.code==='draft_for_review').length,1);
 assert.equal(results.filter(r=>r.code==='duplicate').length,14);
 assert.equal(drafts,1);assert.equal(store.snapshot({businessId:businessA}).length,1);
});

test('bad signature and forged customer tenant or unverified sender are denied',async()=>{
 const store=init();const raw=make();
 assert.equal((await store.receive({rawBody:raw,signature:'bad'})).code,'unauthorised');
 assert.equal(store.snapshot({businessId:businessA}).length,0);
 assert.equal((await init({senderBindings:[]}).receive({rawBody:raw,signature:sign(raw)})).code,'sender_not_connected');
 assert.equal((await init({senderBindings:[{businessId:businessB,accountSid:account,whatsappAddress:sender,status:'verified',connectedByOwner:true}]}).receive({rawBody:raw,signature:sign(raw)})).code,'sender_not_connected');
});

test('synthetic handover never sends, changes only scoped fixture state',async()=>{
 const store=init();const raw=make();
 await store.receive({rawBody:raw,signature:sign(raw)});
 assert.throws(()=>store.handover({businessId:businessB,messageSid:sid}),/tenant/i);
 assert.equal(store.handover({businessId:businessA,messageSid:sid}).state,'needs_human');
 assert.equal(store.snapshot({businessId:businessA})[0].state,'needs_human');
 assert.equal(store.snapshot({businessId:businessA})[0].preview,undefined);
 assert.equal(store.handover({businessId:businessA,messageSid:'SM'+'f'.repeat(32)}),null);
});

test('STOP and human-first policy cannot draft or send',async()=>{
 for(const [body,policy] of [
  ['STOP',{channelEnabled:true,mode:'balanced',approvedKnowledge:true}],
  ['What are your opening hours?',{channelEnabled:true,mode:'human-first',approvedKnowledge:true}],
  ['human',{channelEnabled:true,mode:'ai-first',approvedKnowledge:true}]
 ]){
  let drafts=0;const store=init({loadPolicy:async()=>policy,draftWithApprovedKnowledge:async()=>{drafts++;return {text:'ignored',grounded:true}}});
  const raw=make(body);const r=await store.receive({rawBody:raw,signature:sign(raw)});
  assert.equal(r.code,'needs_human');assert.equal(drafts,0);assert.equal(r.canSendReply,false);
 }
});

test('no live network, DB or localStorage operations exist in processor source',async()=>{
 const {readFileSync}=await import('node:fs');
 const s=readFileSync(new URL('../lib/whatsapp-synthetic-processor.js',import.meta.url),'utf8');
 assert.doesNotMatch(s,/\bfetch\s*\(|\.messages\.create\s*\(|localStorage|supabase\.|from\s+['"]twilio['"]/);
});
