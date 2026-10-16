import test from 'node:test';
import assert from 'node:assert/strict';
import {assessWhatsAppOutboundReview} from '../lib/whatsapp-outbound-policy.js';
const now='2026-10-16T12:00:00.000Z';
const base={now,lastCustomerMessageAt:'2026-10-16T11:55:00.000Z',
 channelEnabled:true,ownerApproved:true,optedOut:false};

test('Within 24-hour customer service window may prepare manual review, never send',()=>{
 const x=assessWhatsAppOutboundReview(base);
 assert.equal(x.code,'review_freeform');
 assert.equal(x.canSend,false);
});
test('Outside window blocks freeform messages even from AI-first mode',()=>{
 const x=assessWhatsAppOutboundReview({...base,lastCustomerMessageAt:'2026-10-15T11:59:00.000Z'});
 assert.equal(x.code,'approved_template_required');assert.equal(x.canSend,false);
});
test('Outside window still requires review even with approved template and opt-in',()=>{
 const x=assessWhatsAppOutboundReview({...base,lastCustomerMessageAt:'2026-10-12T10:00:00.000Z',templateApproved:true,customerOptedIn:true});
 assert.equal(x.code,'review_template');assert.equal(x.canSend,false);
});
test('STOP and owner pause always block outgoing messages',()=>{
 for(const override of [{optedOut:true},{channelEnabled:false},{ownerApproved:false},{customerOptedIn:false,lastCustomerMessageAt:'2026-10-12T10:00:00.000Z',templateApproved:true}]){
  const x=assessWhatsAppOutboundReview({...base,...override});
  assert.equal(x.canSend,false);
  assert.equal(x.code,'blocked');
 }
});
test('Missing, invalid or future inbound time blocks freeform responses',()=>{
 for(const incoming of [undefined,'bad date','2026-10-16T12:01:00.000Z']){
  const x=assessWhatsAppOutboundReview({...base,lastCustomerMessageAt:incoming});
  assert.equal(x.code,'blocked');assert.equal(x.canSend,false);
 }
});
