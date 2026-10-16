/* Colzo WhatsApp BYON research foundation.
 * Pure, no outbound messages, no phone registration, no database modifications.
 */
import {createHmac,timingSafeEqual,createHash} from 'node:crypto';

const ADDRESS=/^whatsapp:\+[1-9]\d{6,14}$/;
const ACCOUNT=/^AC[0-9a-fA-F]{32}$/;
const MESSAGE=/^(?:SM|MM)[0-9a-fA-F]{32}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const result=(code,explanation)=>({code,explanation,canAutomateConnection:false});

export function assessExistingWhatsAppNumber({
  currentUse='unknown',isAuthorisedOwner=false,canReceiveVerification=false,
  isTechProviderReady=false,isSenderVerified=false
}={}){
 if(!isAuthorisedOwner)return result('owner_permission_required','Only an authorised business owner can choose to connect their number.');
 if(['business_app','consumer_app'].includes(currentUse))
  return result('migration_review_required','This number uses the WhatsApp Business app or personal WhatsApp. Twilio currently requires an account migration that means the business cannot continue using the WhatsApp app on that number; the owner must review data loss and downtime first. Colzo will never automate or start this.');
 if(currentUse==='business_platform_other_provider')
  return result('provider_migration_review','An existing Business Platform sender needs owner-approved migration via Meta and the current solution provider. Never automatically change providers, WABA settings or two-factor authentication.');
 if(currentUse==='twilio_sender')
  return isSenderVerified
   ?result('sender_already_verified','Check authorised sender and tenant binding with Twilio before enabling a channel.')
   :result('twilio_sender_unverified','Verify the sender and owner account in Twilio before connecting it.');
 if(currentUse!=='unregistered')
  return result('number_status_unknown','Confirm the current WhatsApp product and sender registration before proposing changes.');
 if(!canReceiveVerification)
  return result('number_verification_unavailable','Twilio requires the existing number to receive a supported SMS or voice ownership check.');
 if(!isTechProviderReady)
  return result('tech_provider_required','Colzo serving other businesses must complete the applicable Meta Tech Provider / Embedded Signup requirements.');
 return result('eligible_for_manual_registration','The owner can consider manual Twilio onboarding after legal, compatibility and cost approval.');
}

export function parseTwilioWhatsAppForm(rawBody){
 if(typeof rawBody!=='string'||Buffer.byteLength(rawBody,'utf8')>16384)
  throw new Error('Twilio form size limit exceeded');
 if(!rawBody.length)throw new Error('Empty Twilio form');
 const entries=new URLSearchParams(rawBody);
 const params=Object.create(null);
 for(const [key,value] of entries){
  if(Object.hasOwn(params,key))throw new Error('Duplicate Twilio form field');
  if(key.length>100)throw new Error('Twilio form field too long');
  params[key]=value;
 }
 if(!ACCOUNT.test(params.AccountSid||'')||!MESSAGE.test(params.MessageSid||''))
  throw new Error('Invalid Twilio account or message SID');
 const from=params.From,to=params.To;
 if(!ADDRESS.test(from||'')||!ADDRESS.test(to||'')||from===to)
  throw new Error('Invalid WhatsApp From or To');
 if(params.NumMedia!==undefined && (!/^\d+$/.test(params.NumMedia)||Number(params.NumMedia)!==0))
  throw new Error('WhatsApp media is not supported during foundation testing');
 const body=(params.Body||'').trim();
 if(!body || body.length>2000)throw new Error('WhatsApp message body length limit');
 return Object.freeze({
  accountSid:params.AccountSid,messageSid:params.MessageSid,
  from,to,body,bodyFingerprint:createHash('sha256').update(body).digest('hex'),
  duplicateScope:params.AccountSid+':'+params.MessageSid,
  requiresHumanReview:/^(?:stop|stopall|unsubscribe|cancel|end|quit|revoke|optout|help|info|start|unstop|yes|human|agent)$/i.test(body)||params.OptOutType!==undefined
 });
}

export function verifyTwilioWhatsAppSignature({rawBody,authToken,webhookUrl,signature}={}){
 if(typeof authToken!=='string'||!authToken||typeof signature!=='string'||typeof webhookUrl!=='string')
  return false;
 let url;
 try{url=new URL(webhookUrl);}catch{return false;}
 if(url.protocol!=='https:'||url.username||url.password||url.hash||!url.hostname)return false;
 try{
  const params=Object.create(null);
  for(const [key,value] of new URLSearchParams(rawBody)){
   if(Object.hasOwn(params,key))return false;
   params[key]=value;
  }
  const source=webhookUrl+Object.keys(params).sort().map(key=>key+params[key]).join('');
  const expected=createHmac('sha1',authToken).update(source,'utf8').digest();
  const supplied=Buffer.from(signature,'base64');
  return supplied.length===expected.length&&timingSafeEqual(supplied,expected);
 }catch{return false;}
}

export async function inspectSignedTwilioWhatsAppMessage({
 rawBody,signature,webhookUrl,authToken,lookupVerifiedSender
}={}){
 if(!verifyTwilioWhatsAppSignature({rawBody,signature,webhookUrl,authToken}))
  return {code:'unauthorised',canSendReply:false};
 let message;
 try{message=parseTwilioWhatsAppForm(rawBody);}
 catch{return {code:'invalid_payload',canSendReply:false};}
 if(typeof lookupVerifiedSender!=='function')
  return {code:'sender_lookup_unavailable',canSendReply:false};
 const binding=await lookupVerifiedSender({accountSid:message.accountSid,to:message.to});
 if(!binding||binding.status!=='verified'||binding.connectedByOwner!==true||
   !UUID.test(binding.businessId||'')||
   binding.accountSid!==message.accountSid||binding.whatsappAddress!==message.to)
  return {code:'sender_not_connected',canSendReply:false};
 return Object.freeze({
  code:'verified_shadow_only',businessId:binding.businessId,
  accountSid:message.accountSid,messageSid:message.messageSid,
  customerPhone:message.from,receivingNumber:message.to,
  bodyFingerprint:message.bodyFingerprint,duplicateScope:message.duplicateScope,
  requiresHumanReview:message.requiresHumanReview,canSendReply:false
 });
}
