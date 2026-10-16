import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {simulateInboundWhatsApp} from '../lib/whatsapp-shadow-flow.js';

const ACCOUNT='AC'+'a'.repeat(32), SID='SM'+'c'.repeat(32);
const URL='https://preview.example/api/whatsapp-inbound',TOKEN='synthetic-test-token';
const TENANT='12345678-1234-4234-8234-123456789012';
const OTHER='22345678-1234-4234-8234-123456789012';
function form(changes={}) {
 return new URLSearchParams({AccountSid:ACCOUNT,MessageSid:SID,
  From:'whatsapp:+447700900002',To:'whatsapp:+447700900001',
  Body:'What time do you open tomorrow?',NumMedia:'0',...changes}).toString();
}
function sign(raw) {
 const params=Object.fromEntries(new URLSearchParams(raw));
 const data=URL+Object.keys(params).sort().map(k=>k+params[k]).join('');
 return createHmac('sha1',TOKEN).update(data).digest('base64');
}
const lookup=async({accountSid,to})=>({businessId:TENANT,accountSid,whatsappAddress:to,status:'verified',connectedByOwner:true});
function deps(changes={}) {
 const received=new Set(),calls={receipt:0,policy:0,assess:0,draft:0};
 const dependencies={
  lookupVerifiedSender:lookup,
  recordOnce:async receipt=>{calls.receipt++;assert.equal(receipt.businessId,TENANT);assert.equal(receipt.accountSid,ACCOUNT);assert.equal(receipt.messageSid,SID);assert.equal(Object.hasOwn(receipt,'body'),false);assert.equal(Object.hasOwn(receipt,'customerPhone'),false);const id=receipt.accountSid+':'+receipt.messageSid;if(received.has(id))return {inserted:false};received.add(id);return {inserted:true,businessId:TENANT}},
  loadPolicy:async({businessId})=>{calls.policy++;assert.equal(businessId,TENANT);return {channelEnabled:true,mode:'balanced',approvedKnowledge:true}},
  assessIntent:async({businessId,customerQuestion})=>{calls.assess++;assert.equal(businessId,TENANT);assert.match(customerQuestion,/open tomorrow/);return {kind:'faq',safe:true}},
  draftWithApprovedKnowledge:async({businessId,question,mode})=>{calls.draft++;assert.equal(businessId,TENANT);assert.equal(mode,'balanced');assert.match(question,/open tomorrow/);return {text:'Please check our opening hours page.',grounded:true}}
 };
 return {calls,dependencies:{...dependencies,...changes}};
}
const inbound=(raw=form())=>({rawBody:raw,signature:sign(raw),authToken:TOKEN,webhookUrl:URL});

test('signed WhatsApp FAQ creates only a tenant-bound shadow draft, never an outbound reply',async()=>{
 const ctx=deps(),raw=form({BusinessId:OTHER,Slug:'competitor'});
 const r=await simulateInboundWhatsApp({...inbound(raw),...ctx.dependencies});
 assert.equal(r.code,'draft_for_review');assert.equal(r.businessId,TENANT);assert.equal(r.messageSid,SID);
 assert.equal(r.preview,'Please check our opening hours page.');
 assert.equal(r.canSendReply,false);assert.equal(r.canCreateLead,false);
 assert.deepEqual(ctx.calls,{receipt:1,policy:1,assess:1,draft:1});
 assert.equal('customerPhone' in r,false);
});

test('Twilio webhook retry does not process policy or generate a second draft',async()=>{
 const ctx=deps(),request={...inbound(),...ctx.dependencies};
 assert.equal((await simulateInboundWhatsApp(request)).code,'draft_for_review');
 assert.equal((await simulateInboundWhatsApp(request)).code,'duplicate');
 assert.deepEqual(ctx.calls,{receipt:2,policy:1,assess:1,draft:1});
});

test('Invalid signature or tenant binding cannot create receipts or AI drafts',async()=>{
 const ctx=deps();
 const denied=await simulateInboundWhatsApp({...inbound(),signature:'bad',...ctx.dependencies});
 assert.equal(denied.code,'unauthorised');
 assert.deepEqual(ctx.calls,{receipt:0,policy:0,assess:0,draft:0});
 const notBound=await simulateInboundWhatsApp({...inbound(),...ctx.dependencies,
  lookupVerifiedSender:async()=>({businessId:OTHER,accountSid:ACCOUNT,whatsappAddress:'whatsapp:+447700900099',status:'verified',connectedByOwner:true})});
 assert.equal(notBound.code,'sender_not_connected');
 assert.equal(ctx.calls.receipt,0);
});

test('Human-first and STOP/human requests never invoke draft generator',async()=>{
 for(const change of [
  {policy:{channelEnabled:true,mode:'human-first',approvedKnowledge:true},raw:form()},
  {policy:{channelEnabled:true,mode:'ai-first',approvedKnowledge:true},raw:form({Body:'human'})},
  {policy:{channelEnabled:true,mode:'balanced',approvedKnowledge:true},raw:form({Body:'STOP'})}
 ]){
  const ctx=deps({loadPolicy:async()=>change.policy});
  const r=await simulateInboundWhatsApp({...inbound(change.raw),...ctx.dependencies});
  assert.equal(r.code,'needs_human');
  assert.equal(r.canSendReply,false);
  assert.equal(ctx.calls.draft,0);
 }
});

test('Unapproved knowledge, disabled channel, unsafe request and ungrounded draft fail closed',async()=>{
 for(const overrides of [
  {loadPolicy:async()=>({channelEnabled:false,mode:'balanced',approvedKnowledge:true})},
  {loadPolicy:async()=>({channelEnabled:true,mode:'balanced',approvedKnowledge:false})},
  {loadPolicy:async()=>({channelEnabled:true,mode:'not-real',approvedKnowledge:true})},
  {assessIntent:async()=>({kind:'emergency',safe:false})},
  {draftWithApprovedKnowledge:async()=>({text:'We can definitely do tomorrow.',grounded:false})}
 ]){
  const ctx=deps(overrides);
  const r=await simulateInboundWhatsApp({...inbound(),...ctx.dependencies});
  assert.equal(r.code,'needs_human');
  assert.equal(r.canSendReply,false);
 }
});

test('Missing database atomic receipt callback or returned mismatched tenant cannot draft',async()=>{
 const ctx=deps();
 const noStore=await simulateInboundWhatsApp({...inbound(),...ctx.dependencies,recordOnce:null});
 assert.equal(noStore.code,'not_configured');
 assert.equal(ctx.calls.draft,0);
 const badStore=await simulateInboundWhatsApp({...inbound(),...ctx.dependencies,recordOnce:async()=>({inserted:true,businessId:OTHER})});
 assert.equal(badStore.code,'receipt_tenant_mismatch');assert.equal(ctx.calls.draft,0);
});

test('Concurrency simulation: ten simultaneous retries draft exactly once',async()=>{
 const ctx=deps();
 const batch=await Promise.all(Array.from({length:10},()=>simulateInboundWhatsApp({...inbound(),...ctx.dependencies})));
 assert.equal(batch.filter(x=>x.code==='draft_for_review').length,1);
 assert.equal(batch.filter(x=>x.code==='duplicate').length,9);
 assert.equal(ctx.calls.draft,1);
});
