import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../api/enquiry.js',import.meta.url),'utf8');
const jobStart=source.indexOf('function findJobDetails(');
const jobEnd=source.indexOf('// A signed, tenant-bound continuation',jobStart);
const consentStart=source.indexOf('function normaliseCustomerConsentText(');
const consentEnd=source.indexOf('// Answer simple questions directly',consentStart);
const context={};
vm.runInNewContext(source.slice(jobStart,jobEnd)+source.slice(consentStart,consentEnd)+'globalThis.check={findJobDetails,hasPositiveBookingRequest};',context);
const {findJobDetails,hasPositiveBookingRequest}=context.check;

test('appointment request imperatives require current, unquoted positive consent',()=>{
 for(const message of ['Please request an appointment next Tuesday afternoon.','Request a booking.','Hello, please request a visit.']) {
  assert.equal(hasPositiveBookingRequest(message),true,message);
 }
 for(const message of [
  'Do not request an appointment.', 'Please don’t request an appointment.',
  'I am not ready to request an appointment.', 'Cancel my appointment request.',
  'How do I request an appointment?', 'If I request an appointment, what happens?',
  'Before I request an appointment, what is the price?',
  'You said "please request an appointment" as an example.',
  "The sample says 'request a booking'.", 'Please request a quote.',
  'Please request information about an appointment.'
 ]) assert.equal(hasPositiveBookingRequest(message),false,message);
});

test('refusals supply no work type and cannot contaminate a later quote',()=>{
 for(const message of ['Do not book anything. I only want information. Do not arrange a callback.','Please don’t book a visit.','Cancel my booking.']) {
  assert.equal(findJobDetails('user: '+message),null,message);
 }
 const history=[
  'user: Do not book anything. I only want information. Do not arrange a callback.',
  'assistant: I want a callback.',
  'user: Please quote for replacing two indoor lights. My email is sam.qa@example.invalid.',
  'user: Please request an appointment next Tuesday afternoon.'
 ].join('\n');
 assert.equal(findJobDetails(history),'replacing two indoor lights');
});

test('work extraction keeps turns separate and preserves ordinary work descriptions',()=>{
 assert.equal(findJobDetails('user: I need\nuser: My name is QA Example.'),null);
 assert.equal(findJobDetails('user: I need a socket replacement.\nuser: Please book me in.'),'a socket replacement');
 assert.equal(findJobDetails('user: Please quote for a repair.\nassistant: I need payment.'),'a repair');
});
