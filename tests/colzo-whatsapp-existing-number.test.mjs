import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {assessExistingWhatsAppNumber,parseTwilioWhatsAppForm,verifyTwilioWhatsAppSignature,inspectSignedTwilioWhatsAppMessage} from '../lib/whatsapp-existing-number.js';
import handler from '../api/whatsapp-inbound.js';

const A='AC'+'a'.repeat(32),M='SM'+'b'.repeat(32),URL='https://preview.example/api/whatsapp-inbound',TOKEN='fake-only-token';
const uuid='12345678-1234-4234-8234-123456789012';
const form=(changes={})=>new URLSearchParams({AccountSid:A,MessageSid:M,From:'whatsapp:+447700900002',To:'whatsapp:+447700900001',Body:'Are you open tomorrow?',NumMedia:'0',...changes}).toString();
const sign=(raw)=>{const p=Object.fromEntries(new URLSearchParams(raw));return createHmac('sha1',TOKEN).update(URL+Object.keys(p).sort().map(k=>k+p[k]).join('')).digest('base64')};

test('existing WhatsApp app numbers cannot be silently migrated',()=>{
 const r=assessExistingWhatsAppNumber({currentUse:'business_app',isAuthorisedOwner:true,canReceiveVerification:true});
 assert.equal(r.code,'migration_review_required');assert.equal(r.canAutomateConnection,false);
 assert.match(r.explanation,/WhatsApp Business app/i);
});
test('different existing number situations are distinguished',()=>{
 assert.equal(assessExistingWhatsAppNumber({currentUse:'business_platform_other_provider',isAuthorisedOwner:true}).code,'provider_migration_review');
 assert.equal(assessExistingWhatsAppNumber({currentUse:'unregistered',isAuthorisedOwner:true,canReceiveVerification:false}).code,'number_verification_unavailable');
 assert.equal(assessExistingWhatsAppNumber({currentUse:'unregistered',isAuthorisedOwner:true,canReceiveVerification:true,isTechProviderReady:false}).code,'tech_provider_required');
 assert.equal(assessExistingWhatsAppNumber({currentUse:'unregistered',isAuthorisedOwner:true,canReceiveVerification:true,isTechProviderReady:true}).code,'eligible_for_manual_registration');
 assert.equal(assessExistingWhatsAppNumber({currentUse:'twilio_sender',isAuthorisedOwner:true,isSenderVerified:true}).code,'sender_already_verified');
 assert.equal(assessExistingWhatsAppNumber({currentUse:'unregistered',isAuthorisedOwner:false}).code,'owner_permission_required');
});
test('parse genuine WhatsApp form but reject media, duplicates, invalid routing and oversized payload',()=>{
 assert.equal(parseTwilioWhatsAppForm(form()).messageSid,M);
 assert.throws(()=>parseTwilioWhatsAppForm(form()+'&To=whatsapp%3A%2B447700900099'),/duplicate/i);
 assert.throws(()=>parseTwilioWhatsAppForm(form({From:'sms:+447700900002'})),/WhatsApp/i);
 assert.throws(()=>parseTwilioWhatsAppForm(form({NumMedia:'1'})),/media/i);
 assert.throws(()=>parseTwilioWhatsAppForm(form({Body:'a'.repeat(3000)})),/length|limit|long/i);
 assert.throws(()=>parseTwilioWhatsAppForm('x'.repeat(17000)),/size|large/i);
});
test('signature validates original Twilio URL plus alphabetical form fields',()=>{
 const raw=form(),sig=sign(raw);
 assert.equal(verifyTwilioWhatsAppSignature({rawBody:raw,authToken:TOKEN,webhookUrl:URL,signature:sig}),true);
 assert.equal(verifyTwilioWhatsAppSignature({rawBody:raw,authToken:TOKEN,webhookUrl:URL+'?test=1',signature:sig}),false);
 assert.equal(verifyTwilioWhatsAppSignature({rawBody:form({Body:'changed'}),authToken:TOKEN,webhookUrl:URL,signature:sig}),false);
 assert.equal(verifyTwilioWhatsAppSignature({rawBody:raw,authToken:'wrong',webhookUrl:URL,signature:sig}),false);
 assert.equal(verifyTwilioWhatsAppSignature({rawBody:raw,authToken:TOKEN,webhookUrl:'http://preview.example/api/whatsapp-inbound',signature:sig}),false);
});
test('verified account plus receiving number solely determines tenant, never a customer field',async()=>{
 const raw=form({BusinessId:'competitor',Slug:'other-business'});
 const decision=await inspectSignedTwilioWhatsAppMessage({
  rawBody:raw,signature:sign(raw),authToken:TOKEN,webhookUrl:URL,
  lookupVerifiedSender:async({accountSid,to})=>{
   assert.equal(accountSid,A);assert.equal(to,'whatsapp:+447700900001');
   return {businessId:uuid,accountSid:A,whatsappAddress:to,status:'verified',connectedByOwner:true};
  }
 });
 assert.equal(decision.code,'verified_shadow_only');assert.equal(decision.businessId,uuid);
 assert.equal(decision.canSendReply,false);assert.equal(decision.messageSid,M);
 assert.equal('BusinessId' in decision,false);
});
test('reject invalid HMAC before any tenant lookup, and wrong account binding',async()=>{
 let calls=0;const raw=form();
 const rejected=await inspectSignedTwilioWhatsAppMessage({rawBody:raw,signature:'bogus',authToken:TOKEN,webhookUrl:URL,lookupVerifiedSender:async()=>{calls++;return null}});
 assert.equal(rejected.code,'unauthorised');assert.equal(calls,0);
 for(const binding of [null,{businessId:uuid,status:'pending',accountSid:A,whatsappAddress:'whatsapp:+447700900001',connectedByOwner:true},{businessId:uuid,status:'verified',accountSid:'AC'+'f'.repeat(32),whatsappAddress:'whatsapp:+447700900001',connectedByOwner:true},{businessId:uuid,status:'verified',accountSid:A,whatsappAddress:'whatsapp:+447700900001',connectedByOwner:false}]){
  const d=await inspectSignedTwilioWhatsAppMessage({rawBody:raw,signature:sign(raw),authToken:TOKEN,webhookUrl:URL,lookupVerifiedSender:async()=>binding});
  assert.equal(d.code,'sender_not_connected');assert.equal(d.canSendReply,false);
 }
});
test('HTTP endpoint is not enabled and cannot send messages, even if accidentally switched on',async()=>{
 const before=process.env.COLZO_WHATSAPP_WEBHOOK_ENABLED;
 const res=()=>({statusCode:0,body:null,setHeader(){return this},status(code){this.statusCode=code;return this},json(data){this.body=data;return this}});
 try{
  delete process.env.COLZO_WHATSAPP_WEBHOOK_ENABLED;
  const a=res();await handler({method:'POST',body:form(),headers:{}},a);
  assert.equal(a.statusCode,404);
  process.env.COLZO_WHATSAPP_WEBHOOK_ENABLED='true';
  const b=res();await handler({method:'POST',body:form(),headers:{}},b);
  assert.equal(b.statusCode,503);
 }finally{if(before===undefined)delete process.env.COLZO_WHATSAPP_WEBHOOK_ENABLED;else process.env.COLZO_WHATSAPP_WEBHOOK_ENABLED=before;}
});
