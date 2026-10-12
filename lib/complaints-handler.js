import { requireBusinessAdmin, sendAuthError } from './auth.js';
import { addonStorage } from './addons.js';
import { recordAuditEvent } from './audit.js';

export const COMPLAINT_TRANSITIONS = Object.freeze({
  received: ['in_review','responded'],
  in_review: ['responded','resolved'],
  responded: ['resolved','reopened'],
  resolved: ['reopened'],
  reopened: ['in_review','responded']
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const parse = value => { try { const data = typeof value === 'string' ? JSON.parse(value) : value; return data && typeof data === 'object' && !Array.isArray(data) ? data : null; } catch { return null; } };
export function validateComplaintUpdate(body, current) {
  if (!body || Object.keys(body).some(key => !['id','status','response_note'].includes(key))) return null;
  if (!UUID.test(String(body.id || '')) || typeof body.status !== 'string') return null;
  if (!Object.hasOwn(COMPLAINT_TRANSITIONS, current) || !COMPLAINT_TRANSITIONS[current].includes(body.status)) return null;
  if (body.response_note !== undefined && (typeof body.response_note !== 'string' || body.response_note.trim().length > 3000)) return null;
  const response = { status: body.status, updated_at: new Date().toISOString() };
  if (body.response_note !== undefined) response.response_note = body.response_note.trim();
  if (body.status === 'responded') response.responded_at = response.updated_at;
  if (body.status === 'resolved') response.resolved_at = response.updated_at;
  if (body.status === 'reopened') response.resolved_at = null;
  return response;
}

export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  if (!['GET','PATCH'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  let auth;
  try { auth = await requireBusinessAdmin(req); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: 'Authenticated business access required' });
  const scope = `business_id=eq.${encodeURIComponent(auth.businessId)}`;
  try {
    if (req.method === 'GET') {
      const rows = await addonStorage(`customer_complaints?${scope}&select=id,lead_id,subject,description,status,response_note,responded_at,resolved_at,created_at,updated_at&order=created_at.desc&limit=100`);
      return res.status(200).json({ complaints: Array.isArray(rows) ? rows : [] });
    }
    const body = parse(req.body);
    if (!body || !UUID.test(String(body.id || ''))) return res.status(400).json({ error: 'Invalid complaint update' });
    const id = encodeURIComponent(body.id);
    const old = await addonStorage(`customer_complaints?${scope}&id=eq.${id}&select=id,status,response_note&limit=1`);
    const current = Array.isArray(old) ? old[0] : null;
    if (!current) return res.status(404).json({ error: 'Complaint not found' });
    const change = validateComplaintUpdate(body, current.status);
    if (!change) return res.status(400).json({ error: 'Invalid complaint status transition or note' });
    const note = change.response_note ?? current.response_note;
    if (['responded','resolved'].includes(change.status) && !String(note || '').trim()) {
      return res.status(400).json({ error: 'Enter a human-approved response note first' });
    }
    // Expected prior status prevents overwriting another team member's update.
    const rows = await addonStorage(`customer_complaints?${scope}&id=eq.${id}&status=eq.${encodeURIComponent(current.status)}`, {
      method:'PATCH', headers:{Prefer:'return=representation'}, body:JSON.stringify(change)
    });
    const saved = Array.isArray(rows) ? rows[0] : null;
    if (!saved) return res.status(409).json({ error: 'Complaint changed. Refresh and try again.' });
    await recordAuditEvent({ businessId:auth.businessId, actorUserId:auth.userId, action:'complaint.status_changed', resourceType:'customer_complaints', resourceId:String(saved.id), metadata:{ previous_status:current.status, new_status:saved.status } });
    return res.status(200).json({ complaint:{id:saved.id, status:saved.status, updated_at:saved.updated_at} });
  } catch {
    return res.status(503).json({ error: 'Complaints are temporarily unavailable' });
  }
}
