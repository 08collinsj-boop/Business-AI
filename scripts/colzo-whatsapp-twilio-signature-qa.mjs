// Test-only parity: official Twilio SDK, NO API requests or credentials.
import assert from 'node:assert/strict';
import Twilio from 'twilio';
import {verifyTwilioWhatsAppSignature} from '../lib/whatsapp-existing-number.js';
const token='synthetic-not-a-real-twilio-token';
const AC='AC'+'a'.repeat(32),SM='SM'+'b'.repeat(32);
const cases=[
 ['https://preview.example/api/whatsapp-inbound','Are you open tomorrow?'],
 ['https://preview.example/api/whatsapp-inbound?mode=test','Hello + ? & = / 😀'],
 ['https://preview.example/api/whatsapp-inbound','Café booking on Saturday'],
 ['https://preview.example/api/whatsapp-inbound','Please transfer to a human']
];
for(const [i,[url,body]] of cases.entries()){
 const form={AccountSid:AC,MessageSid:SM,From:'whatsapp:+447700900002',
  To:'whatsapp:+447700900001',Body:body,NumMedia:'0'};
 const raw=new URLSearchParams(form).toString();
 const signature=Twilio.getExpectedTwilioSignature(token,url,form);
 assert.ok(Twilio.validateRequest(token,signature,url,form));
 assert.ok(verifyTwilioWhatsAppSignature({rawBody:raw,authToken:token,webhookUrl:url,signature}));
 assert.equal(verifyTwilioWhatsAppSignature({rawBody:raw,authToken:token,webhookUrl:url,signature:'tampered'}),false);
 console.log('PASS Twilio SDK signature parity',i+1);
}
console.log('TWILIO_HMAC_PARITY 4/4, offline only');
