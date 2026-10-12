import { requireAuthenticatedUser, sendAuthError } from './auth.js';
import { addonStorage } from './addons.js';
import { recordAuditEvent } from './audit.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const parse = value => { try { const data = typeof value === 'string' ? JSON.parse(value) : value; return data && typeof data === 'object' && !Array.isArray(data) ? data : null; } catch { return null; } };
export function validateCustomerComplaint(body) {
  if (!body || Object.keys(body).some(key => !['enquiry_id','subject','description'].includes(key))) return null;
  if (!UUID.test(String(body.enquiry_id || '')) || typeof body.subject !== 'string' || typeof body.description !== 'string') return null;
  const subject = body.subject.trim(), description = body.description.trim();
  return subject.length >= 5 && subject.length <= 160 && description.length >= 10 && description.length <= 4000
    ? { enquiryId:body.enquiry_id, subject, description } : null;
}
export default async function handler(req, res) {
  res.setHeader?.('Cache-Control','no-store');
  if (req.method !== 'POST') return res.status(405).json({ error:'Method not allowed' });
  let user;
  try { user = await requireAuthenticatedUser(req); } catch (error) { return sendAuthError(res,error); }
  if (!user.enforced || !user.userId) return res.status(503).json({ error:'Customer accounts are unavailable' });
  const body = validateCustomerComplaint(parse(req.body));
  if (!body) return res.status(400).json({ error:'Enter a valid subject and description' });
  try {
    const link = await addonStorage(`customer_enquiry_access?id=eq.${encodeURIComponent(body.enquiryId)}&customer_user_id=eq.${encodeURIComponent(user.userId)}&select=business_id,lead_id&limit=1`);
    const row = Array.isArray(link) ? link[0] : null;
    if (!row?.business_id || !Number.isSafeInteger(Number(row.lead_id))) return res.status(404).json({ error:'Enquiry not found' });
    const existing = await addonStorage(`customer_complaints?customer_user_id=eq.${encodeURIComponent(user.userId)}&business_id=eq.${encodeURIComponent(row.business_id)}&lead_id=eq.${encodeURIComponent(row.lead_id)}&select=id&limit=1`);
    if (Array.isArray(existing) && existing.length) return res.status(409).json({ error:'A complaint already exists for this enquiry' });
    const created = await addonStorage('customer_complaints', { method:'POST', headers:{ Prefer:'return=representation' }, body:JSON.stringify({
      business_id:row.business_id, lead_id:row.lead_id, customer_user_id:user.userId, subject:body.subject, description:body.description, status:'received'
    }) });
    const complaint = Array.isArray(created) ? created[0] : null;
    if (!complaint?.id) throw new Error('Complaint storage failed');
    await recordAuditEvent({ businessId:row.business_id, actorUserId:user.userId, action:'complaint.received', resourceType:'customer_complaints', resourceId:String(complaint.id), metadata:{ channel:'customer_portal' } });
    return res.status(201).json({ id:complaint.id, status:'received', message:'Complaint received. The business will review it.' });
  } catch {
    // A database unique constraint also protects against racing duplicate submits.
    return res.status(503).json({ error:'Complaint could not be saved. Please check your enquiries before retrying.' });
  }
}
