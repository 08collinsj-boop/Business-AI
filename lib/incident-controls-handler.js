import { requireAal2, requireBusinessAdmin, sendAuthError } from './auth.js';
import { recordAuditEvent } from './audit.js';
import { getIncidentControls, INCIDENT_FEATURES, updateBusinessIncidentControls } from './incident-controls.js';

const CONTROL_KEYS = Object.freeze(Object.values(INCIDENT_FEATURES));
const ALLOWED = new Set([...CONTROL_KEYS, 'reason']);

function parse(value) {
  try {
    const body = typeof value === 'string' ? JSON.parse(value) : value;
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  if (!['GET', 'PATCH'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  let auth;
  try { auth = await requireBusinessAdmin(req); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced || !auth.businessId) return res.status(503).json({ error: 'Authenticated business access is required' });

  try {
    if (req.method === 'GET') {
      const state = await getIncidentControls(auth.businessId);
      return res.status(200).json({ controls: state.business, effective: state.effective, platform: state.platform });
    }

    const body = parse(req.body);
    if (!body || Object.keys(body).some(key => !ALLOWED.has(key))) return res.status(400).json({ error: 'Invalid incident control request' });
    const suppliedKeys = CONTROL_KEYS.filter(key => Object.hasOwn(body, key));
    if (!suppliedKeys.length || suppliedKeys.some(key => typeof body[key] !== 'boolean')) return res.status(400).json({ error: 'Choose at least one valid safety control' });
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (reason.length < 3 || reason.length > 500) return res.status(400).json({ error: 'Give a short reason for the safety change' });

    const before = await getIncidentControls(auth.businessId);
    const attemptsResume = suppliedKeys.some(key => before.business[key] === true && body[key] === false);
    if (attemptsResume && auth.role !== 'owner') {
      return res.status(403).json({ error: 'Only the business owner can resume a paused safety control' });
    }
    if (attemptsResume) {
      try { await requireAal2(req); } catch (error) { return sendAuthError(res, error); }
    }

    const values = Object.fromEntries(suppliedKeys.map(key => [key, body[key]]));
    const state = await updateBusinessIncidentControls({ businessId: auth.businessId, actorUserId: auth.userId, values, reason });
    await recordAuditEvent({
      businessId: auth.businessId,
      actorUserId: auth.userId,
      action: 'incident.controls_updated',
      resourceType: 'incident_control',
      resourceId: auth.businessId,
      metadata: {
        ai_receptionist_paused: state.business.ai_receptionist_paused,
        marketing_generation_paused: state.business.marketing_generation_paused,
        marketing_publishing_paused: state.business.marketing_publishing_paused,
        automatic_followups_paused: state.business.automatic_followups_paused,
        customer_submissions_paused: state.business.customer_submissions_paused,
        changed_controls: suppliedKeys.length,
        resumed_control: attemptsResume
      }
    });
    return res.status(200).json({ controls: state.business, effective: state.effective, platform: state.platform });
  } catch (error) {
    return res.status(error?.status === 503 ? 503 : 500).json({ error: error?.status === 503 ? 'Incident controls are temporarily unavailable' : 'Incident controls could not be updated', code: error?.code });
  }
}
