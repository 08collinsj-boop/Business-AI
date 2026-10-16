/* Colzo WhatsApp shadow receptionist (NON-PRODUCTION).
 * No network, Twilio sends, database connection, live AI calls or customer
 * records. All injectable callbacks are synthetic test scaffolding only.
 * A real provider must not call this until a separate reviewed adapter
 * enforces DB RLS, atomic receipt uniqueness and actual provider signatures.
 */
import {inspectSignedTwilioWhatsAppMessage,parseTwilioWhatsAppForm} from './whatsapp-existing-number.js';

const hold=(code,details={})=>Object.freeze({code,canSendReply:false,canCreateLead:false,...details});
const MODES=new Set(['human-first','balanced','ai-first']);

export async function simulateInboundWhatsApp({
 rawBody,signature,authToken,webhookUrl,lookupVerifiedSender,
 recordOnce,loadPolicy,assessIntent,draftWithApprovedKnowledge
}={}){
 let admission;
 try{
  admission=await inspectSignedTwilioWhatsAppMessage({
   rawBody,signature,authToken,webhookUrl,lookupVerifiedSender
  });
 }catch{
  return hold('sender_lookup_unavailable');
 }
 if(admission.code!=='verified_shadow_only')return hold(admission.code);
 if(typeof recordOnce!=='function'||typeof loadPolicy!=='function'||
    typeof assessIntent!=='function'||typeof draftWithApprovedKnowledge!=='function')
  return hold('not_configured');

 const {businessId,accountSid,messageSid}=admission;
 // The future persisted implementation MUST use one atomic INSERT with
 // UNIQUE(account_sid,message_sid), never SELECT followed by INSERT.
 // We deliberately avoid storing the body and phone in this receipt.
 let receipt;
 try{
  receipt=await recordOnce({
   businessId,accountSid,messageSid,
   receivingNumber:admission.receivingNumber
  });
 }catch{
  return hold('receipt_unavailable');
 }
 if(receipt?.inserted===false)return hold('duplicate');
 if(receipt?.inserted!==true)return hold('receipt_unavailable');
 if(receipt.businessId!==businessId)return hold('receipt_tenant_mismatch');

 const meta={businessId,messageSid};
 if(admission.requiresHumanReview)return hold('needs_human',meta);
 let policy;
 try{policy=await loadPolicy({businessId});}
 catch{return hold('needs_human',meta);}
 if(policy?.channelEnabled!==true||!MODES.has(policy?.mode)||
    policy.mode==='human-first'||policy.approvedKnowledge!==true)
  return hold('needs_human',meta);
 const parsed=parseTwilioWhatsAppForm(rawBody);
 let intent;
 try{intent=await assessIntent({businessId,customerQuestion:parsed.body});}
 catch{return hold('needs_human',meta);}
 if(intent?.safe!==true||intent.kind!=='faq')return hold('needs_human',meta);

 let draft;
 try{
  draft=await draftWithApprovedKnowledge({
   businessId,question:parsed.body,mode:policy.mode
  });
 }catch{return hold('needs_human',meta);}
 if(draft?.grounded!==true||typeof draft.text!=='string'||
    !draft.text.trim()||draft.text.length>900)return hold('needs_human',meta);

 // Preview is only a synthetic review artifact. Never send or persist a
 // generated answer on the strength of this function's result.
 return hold('draft_for_review',{...meta,preview:draft.text.trim()});
}
