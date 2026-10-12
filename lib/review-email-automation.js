import { timingSafeEqual } from 'node:crypto';
import { addonStorage } from './addons.js';
import { reviewDestination, buildReviewRequestMessage } from './review-requests.js';
import { recordAuditEvent } from './audit.js';

const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function eligibleReviewEmail({ booking, settings } = {}) {
  if (!settings?.review_requests_enabled || !settings.review_email_auto_enabled) return null;
  if (booking?.status !== 'completed' || booking?.review_email_allowed !== true) return null;
  const email = String(booking.customer_email || '').trim().toLowerCase();
  if (!email || email.length > 320 || !VALID_EMAIL.test(email)) return null;
  const destination = reviewDestination(settings);
  if (!destination) return null;
  const hours = Number(settings.review_email_delay_hours);
  if (![0,24,48,72].includes(hours)) return null;
  return {email,destination,hours};
}
export async function queueReviewEmail({booking,settings,businessId,actorUserId}) {
  const eligible = eligibleReviewEmail({booking,settings});
  if (!eligible) return false;
  const sendAfter = new Date(Date.now() + eligible.hours*3600000).toISOString();
  const rows = await addonStorage('review_email_outbox?on_conflict=business_id,booking_id', {
    method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({
      business_id:businessId,booking_id:booking.id,customer_email:eligible.email,
      business_name:String(settings.business_name||'Our business').slice(0,120),
      review_url:eligible.destination.url,review_platform:eligible.destination.platform,send_after:sendAfter,status:'pending'
    })
  });
  if (Array.isArray(rows) && rows.length) await recordAuditEvent({businessId,actorUserId,action:'review_email.queued',resourceType:'review_email_outbox',resourceId:String(rows[0].id),metadata:{platform:eligible.destination.platform}});
  return true; // Existing row also means an invitation was already queued; never create a manual duplicate.
}
function matchesSecret(presented,expected){
  if (!presented || !expected) return false;
  const a=Buffer.from(presented),b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}
function isTrustedSender(value){
  return typeof value==='string' && value.length<=200 && /^[^\r\n<>]+<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/.test(value);
}
async function changeOutbox(row,status,sentAt=null){
  await addonStorage(`review_email_outbox?id=eq.${encodeURIComponent(row.id)}&business_id=eq.${encodeURIComponent(row.business_id)}&status=eq.processing`, {
    method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status,sent_at:sentAt,updated_at:new Date().toISOString()})
  });
}
export default async function reviewEmailScheduler(req,res){
  res.setHeader?.('Cache-Control','no-store');
  if (req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  if (!matchesSecret(String(req.headers?.authorization||'').replace(/^Bearer\s+/i,''),process.env.REVIEW_EMAIL_SCHEDULER_SECRET)) return res.status(401).json({error:'Not authorised'});
  if (process.env.REVIEW_EMAIL_DELIVERY_ENABLED!=='true') return res.status(503).json({error:'Review email delivery disabled'});
  if (!process.env.RESEND_API_KEY || !isTrustedSender(process.env.REVIEW_EMAIL_FROM)) return res.status(503).json({error:'Review email sender not configured'});
  let claimed;
  try { claimed=await addonStorage('rpc/claim_due_review_emails',{method:'POST',body:JSON.stringify({p_limit:10})}); }
  catch { return res.status(503).json({error:'Review email queue is unavailable'}); }
  let sent=0,skipped=0,unknown=0;
  for (const row of Array.isArray(claimed)?claimed:[]) {
    try {
      const [bookingRows,settingsRows] = await Promise.all([
        addonStorage(`bookings?id=eq.${encodeURIComponent(row.booking_id)}&business_id=eq.${encodeURIComponent(row.business_id)}&select=status,review_email_allowed,customer_email,lead_id&limit=1`),
        addonStorage(`business_settings?business_id=eq.${encodeURIComponent(row.business_id)}&select=business_name,review_requests_enabled,review_email_auto_enabled,review_email_delay_hours,review_google_url,review_facebook_url,review_trustpilot_url,review_preferred_platform&limit=1`)
      ]);
      const booking=bookingRows?.[0],settings=settingsRows?.[0];
      // Never send a public review request while this enquiry has a recorded complaint.
      if (booking?.lead_id) {
        const complaints=await addonStorage(`customer_complaints?business_id=eq.${encodeURIComponent(row.business_id)}&lead_id=eq.${encodeURIComponent(booking.lead_id)}&select=id&limit=1`);
        if (complaints?.length) {await changeOutbox(row,'cancelled');skipped++;continue;}
      }
      const eligible=eligibleReviewEmail({booking,settings});
      if (!eligible || eligible.email!==row.customer_email || eligible.destination.url!==row.review_url) {await changeOutbox(row,'cancelled');skipped++;continue;}
      const message=buildReviewRequestMessage({businessName:row.business_name,destination:eligible.destination});
      const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':row.id},body:JSON.stringify({from:process.env.REVIEW_EMAIL_FROM,to:[row.customer_email],subject:'How was your experience?',text:message}),signal:AbortSignal.timeout(20000)});
      // Conservative: any non-2xx result may have had an ambiguous delivery outcome.
      if (!result.ok) {await changeOutbox(row,'unknown');unknown++;continue;}
      await changeOutbox(row,'sent',new Date().toISOString());sent++;
      await recordAuditEvent({businessId:row.business_id,action:'review_email.sent',resourceType:'review_email_outbox',resourceId:row.id,metadata:{platform:row.review_platform}});
    } catch {
      try {await changeOutbox(row,'unknown');}catch{}
      unknown++;
    }
  }
  return res.status(200).json({processed:sent+skipped+unknown,sent,skipped,needs_reconciliation:unknown});
}
