/* Synthetic-only WhatsApp message processor for Colzo QA.
 * No network, DB, real user data, environment credentials or outbound sends.
 * Uses existing signed tenant admission + shadow AI policy foundation.
 */
import {simulateInboundWhatsApp} from './whatsapp-shadow-flow.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const copy=item=>({...item});

export function createSyntheticWhatsAppProcessor({
 businessId,authToken,webhookUrl,senderBindings=[],
 loadPolicy,assessIntent,draftWithApprovedKnowledge
}={}){
 if(!UUID.test(String(businessId||'')))throw Error('Valid synthetic business tenant required');
 if(!Array.isArray(senderBindings))throw Error('Synthetic sender bindings must be explicit');
 const receipts=new Map();
 const allowed=senderBindings.filter(x=>x?.businessId===businessId&&
   x.connectedByOwner===true&&x.status==='verified').map(copy);
 const requireTenant=tenant=>{
  if(tenant!==businessId)throw Error('Synthetic inbox tenant mismatch');
 };
 const lookupVerifiedSender=async({accountSid,to})=>
  allowed.find(b=>b.accountSid===accountSid&&b.whatsappAddress===to)||null;
 const recordOnce=async receipt=>{
  if(receipt.businessId!==businessId)return {inserted:false,businessId:null};
  const key=receipt.accountSid+':'+receipt.messageSid;
  if(receipts.has(key))return {inserted:false,businessId};
  // Insert before any await: single JS event loop creates at most one fixture.
  receipts.set(key,{
   businessId,accountSid:receipt.accountSid,messageSid:receipt.messageSid,
   receivingNumber:receipt.receivingNumber,state:'received'
  });
  return {inserted:true,businessId};
 };
 return Object.freeze({
  async receive({rawBody,signature}={}){
   const result=await simulateInboundWhatsApp({
    rawBody,signature,authToken,webhookUrl,
    lookupVerifiedSender,recordOnce,loadPolicy,assessIntent,draftWithApprovedKnowledge
   });
   if(result.businessId===businessId && result.messageSid){
    const keyPrefix=Array.from(receipts.keys()).find(k=>k.endsWith(':'+result.messageSid));
    const item=keyPrefix&&receipts.get(keyPrefix);
    if(item && result.code!=='duplicate'){
     item.state=result.code;
     if(result.code==='draft_for_review')item.preview=result.preview;
    }
   }
   return {...result};
  },
  snapshot({businessId:tenant}={}){
   requireTenant(tenant);
   return Array.from(receipts.values(),copy);
  },
  handover({businessId:tenant,messageSid}={}){
   requireTenant(tenant);
   const key=Array.from(receipts.keys()).find(x=>x.endsWith(':'+messageSid));
   if(!key)return null;
   const value=receipts.get(key);value.state='needs_human';delete value.preview;
   return copy(value);
  }
 });
}
