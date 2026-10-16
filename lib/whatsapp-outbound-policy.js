/* Future WhatsApp outbound eligibility - review-only. No Twilio client,
 * no send permission, no webhook activation and no fee-incurring operation.
 */
const blocked=()=>Object.freeze({code:'blocked',canSend:false});
export function assessWhatsAppOutboundReview({
 now,lastCustomerMessageAt,channelEnabled=false,
 ownerApproved=false,optedOut=false,
 templateApproved=false,customerOptedIn=false
}={}){
 if(!channelEnabled||!ownerApproved||optedOut)return blocked();
 const current=Date.parse(now),inbound=Date.parse(lastCustomerMessageAt);
 if(!Number.isFinite(current)||!Number.isFinite(inbound)||
    inbound>current)return blocked();
 // Conservative boundary: 24 hours exactly is treated as closed.
 const within=current-inbound < 24*60*60*1000;
 if(within)return Object.freeze({code:'review_freeform',canSend:false});
 if(templateApproved&&customerOptedIn)
  return Object.freeze({code:'review_template',canSend:false});
 if(templateApproved&&!customerOptedIn)return blocked();
 return Object.freeze({code:'approved_template_required',canSend:false});
}
