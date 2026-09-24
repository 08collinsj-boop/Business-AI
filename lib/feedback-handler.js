import { requireBusinessMember, sendAuthError } from './auth.js';
import { addonStorage } from './addons.js';
import { recordAuditEvent } from './audit.js';

const CATEGORIES = new Set(['bug','confusing','ai_accuracy','missing_feature','suggestion']);
const parse = value => { try { const body = typeof value === 'string' ? JSON.parse(value) : value; return body && typeof body === 'object' && !Array.isArray(body) ? body : null; } catch { return null; } };

function cleanText(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }

export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  if (!['GET','POST','PATCH'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  let auth;
  try { auth = await requireBusinessMember(req, req.method === 'GET' || req.method === 'PATCH' ? ['owner','admin'] : null); }
  catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: 'Authenticated business access is required' });
  try {
    if (req.method === 'GET') {
      const rows = await addonStorage(`pilot_feedback?business_id=eq.${encodeURIComponent(auth.businessId)}&select=id,category,page,message,app_version,status,created_at,updated_at&order=created_at.desc&limit=100`);
      return res.status(200).json({ feedback: Array.isArray(rows) ? rows : [] });
    }
    const body = parse(req.body);
    if (!body) return res.status(400).json({ error: 'Invalid feedback request' });
    if (req.method === 'POST') {
      if (Object.keys(body).some(key => !['category','page','message','app_version'].includes(key))) return res.status(400).json({ error: 'Invalid feedback request' });
      const category = cleanText(body.category, 40), page = cleanText(body.page, 80) || 'unknown', message = cleanText(body.message, 3000), appVersion = cleanText(body.app_version, 120);
      if (!CATEGORIES.has(category) || message.length < 3) return res.status(400).json({ error: 'Add a feedback category and a short description' });
      const rows = await addonStorage('pilot_feedback', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ business_id: auth.businessId, actor_user_id: auth.userId, category, page, message, app_version: appVersion }) });
      const item = rows?.[0];
      if (!item?.id) throw new Error('Feedback could not be saved');
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'pilot.feedback_submitted', resourceType: 'pilot_feedback', resourceId: item.id, metadata: { category, page } });
      return res.status(201).json({ id: item.id, submitted: true });
    }
    if (Object.keys(body).some(key => !['feedback_id','status'].includes(key)) || !['reviewed','resolved'].includes(body.status)) return res.status(400).json({ error: 'Invalid feedback update' });
    const id = String(body.feedback_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Invalid feedback update' });
    const rows = await addonStorage(`pilot_feedback?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: body.status, updated_at: new Date().toISOString() }) });
    if (!rows?.[0]) return res.status(404).json({ error: 'Feedback not found' });
    return res.status(200).json({ updated: true });
  } catch {
    return res.status(503).json({ error: 'Feedback is temporarily unavailable' });
  }
}
