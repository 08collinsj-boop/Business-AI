import { requireBusinessMember, sendAuthError } from './auth.js';
import { addonStorage } from './addons.js';
import { recordAuditEvent } from './audit.js';
import { logOperationalEvent } from './operational-log.js';
import { isColzoRecordVersionEnabled } from './public-config-handler.js';

const CATEGORIES = new Set(['bug','confusing','ai_accuracy','missing_feature','suggestion','other']);
const AREAS = new Set(['home','leads','actions','bookings','receptionist','knowledge','marketing','settings','billing','other','unknown']);
const FEEDBACK_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_FEEDBACK_FIELDS = ['id','category','title','page','message','app_version','status','created_at','updated_at'];
const publicFeedback = row => Object.fromEntries(PUBLIC_FEEDBACK_FIELDS
  .filter(field => Object.hasOwn(row, field)).map(field => [field, row[field]]));

const parse = value => { try { const body = typeof value === 'string' ? JSON.parse(value) : value; return body && typeof body === 'object' && !Array.isArray(body) ? body : null; } catch { return null; } };

function cleanText(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }

export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  if (!['GET','POST','PATCH'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  let auth;
  try { auth = await requireBusinessMember(req, req.method === 'GET' || req.method === 'PATCH' ? ['owner','admin'] : null); }
  catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: 'Authenticated business access is required' });
  const strict = isColzoRecordVersionEnabled();
  try {
    if (req.method === 'GET') {
      const columns = strict
        ? 'id,business_id,category,title,page,message,app_version,status,created_at,updated_at'
        : 'id,category,title,page,message,app_version,status,created_at,updated_at';
      const rows = await addonStorage(`pilot_feedback?business_id=eq.${encodeURIComponent(auth.businessId)}&select=${columns}&order=created_at.desc&limit=100`);
      // Service-role results are not themselves proof of tenant isolation.
      // Keep the older application's response shape and behavior unchanged.
      if (strict && (!Array.isArray(rows) || rows.some(row => !row
        || typeof row !== 'object' || Array.isArray(row)
        || row.business_id !== auth.businessId || !FEEDBACK_ID.test(String(row.id || ''))))) {
        throw new Error('Unverified feedback tenant read');
      }
      return res.status(200).json({ feedback: strict ? rows.map(publicFeedback) : (Array.isArray(rows) ? rows : []) });
    }
    const body = parse(req.body);
    if (!body) return res.status(400).json({ error: 'Invalid feedback request' });
    if (req.method === 'POST') {
      if (Object.keys(body).some(key => !['category','title','page','message','app_version'].includes(key))) return res.status(400).json({ error: 'Invalid feedback request' });
      const category = cleanText(body.category, 40);
      if (typeof body.title === 'string' && body.title.trim().length > 120) return res.status(400).json({ error: 'Please keep the title under 120 characters' });
      const title = cleanText(body.title, 120);
      const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';
      if (rawMessage.length > 3000) return res.status(400).json({ error: 'Please keep feedback under 3,000 characters' });
      const page = cleanText(body.page, 80) || 'unknown', message = rawMessage.slice(0, 3000), appVersion = cleanText(body.app_version, 120);
      if (!CATEGORIES.has(category) || !AREAS.has(page) || message.length < 3) return res.status(400).json({ error: 'Add a feedback category and a short description' });
      const submitted = { business_id: auth.businessId, actor_user_id: auth.userId, category, title, page, message, app_version: appVersion };
      const rows = await addonStorage('pilot_feedback', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(submitted) });
      const item = rows?.[0];
      // A write might have committed even if its response cannot be verified:
      // do not retry or create a success audit on inconsistent representation.
      if (strict && (!Array.isArray(rows) || rows.length !== 1 || !item
        || !FEEDBACK_ID.test(String(item.id || ''))
        || Object.entries(submitted).some(([field, value]) => item[field] !== value))) {
        throw new Error('Unverified feedback create response');
      }
      if (!item?.id) throw new Error('Feedback could not be saved');
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'pilot.feedback_submitted', resourceType: 'pilot_feedback', resourceId: item.id, metadata: { category, page } });
      return res.status(201).json({ id: item.id, submitted: true });
    }
    if (Object.keys(body).some(key => !['feedback_id','status'].includes(key)) || !['reviewed','resolved'].includes(body.status)) return res.status(400).json({ error: 'Invalid feedback update' });
    const id = String(body.feedback_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Invalid feedback update' });
    const rows = await addonStorage(`pilot_feedback?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: body.status, updated_at: new Date().toISOString() }) });
    if (Array.isArray(rows) && rows.length === 0) return res.status(404).json({ error: 'Feedback not found' });
    if (strict && (!Array.isArray(rows) || rows.length !== 1 || !rows[0]
      || String(rows[0].id || '').toLowerCase() !== id.toLowerCase()
      || rows[0].business_id !== auth.businessId || rows[0].status !== body.status)) {
      throw new Error('Unverified feedback update response');
    }
    if (!rows?.[0]) return res.status(404).json({ error: 'Feedback not found' });
    return res.status(200).json({ updated: true });
  } catch (error) {
    logOperationalEvent('feedback.storage_error', {
      method: req.method,
      error_name: error?.name || 'Error'
    });
    return res.status(503).json({ error: 'Feedback is temporarily unavailable' });
  }
}
