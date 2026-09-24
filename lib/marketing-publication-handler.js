import { requireBusinessMember, sendAuthError } from './auth.js';
import { addonStorage } from './addons.js';
import { claimPublication, createPublication, listPublications, processPublication, validatePublicationRequest } from './marketing-publication.js';
import { recordAuditEvent } from './audit.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const parse = value => { try { const body = typeof value === 'string' ? JSON.parse(value) : value; return body && typeof body === 'object' && !Array.isArray(body) ? body : null; } catch { return null; } };

export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  let auth;
  try { auth = await requireBusinessMember(req, req.method === 'GET' ? null : ['owner', 'admin']); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: 'Authenticated business access is required' });
  try {
    if (req.method === 'GET') return res.status(200).json({ publications: await listPublications(auth.businessId) });
    const body = validatePublicationRequest(parse(req.body));
    if (req.method === 'POST' && body.action === 'schedule') {
      const publication = await createPublication({ businessId: auth.businessId, actorUserId: auth.userId, generationId: body.generation_id, platform: body.platform, scheduledFor: body.scheduled_for || null, requestId: body.request_id });
      if (!publication) throw new Error('Publication could not be created');
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'marketing.publication_scheduled', resourceType: 'marketing_publication', resourceId: publication.id, metadata: { platform: publication.platform } });
      const dueNow = !body.scheduled_for || new Date(body.scheduled_for).getTime() <= Date.now() + 5000;
      if (!dueNow || publication.status !== 'scheduled') return res.status(publication.status === 'scheduled' ? 201 : 200).json({ publication });
      try {
        const claimed = await claimPublication(auth.businessId, publication.id);
        return res.status(200).json({ publication: await processPublication(claimed, auth.userId) });
      } catch (error) {
        if (error?.code !== 'PUBLICATION_NOT_CLAIMABLE') throw error;
        const rows = await addonStorage(`marketing_publications?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(publication.id)}&select=id,generation_id,platform,status,scheduled_for,published_at,provider_post_id,failure_code,failure_message,attempts,created_at,updated_at&limit=1`);
        if (!rows?.[0]) throw error;
        return res.status(200).json({ publication: rows[0] });
      }
    }
    if (req.method === 'PATCH' && ['cancel', 'retry'].includes(body.action)) {
      if (!UUID.test(String(body.publication_id || ''))) return res.status(400).json({ error: 'Invalid publication' });
      const rows = await addonStorage(`marketing_publications?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(body.publication_id)}&select=*&limit=1`);
      const row = rows?.[0];
      if (!row) return res.status(404).json({ error: 'Publication not found' });
      if (body.action === 'cancel') {
        if (row.status !== 'scheduled') return res.status(409).json({ error: 'Only scheduled publications can be cancelled' });
        await addonStorage(`marketing_publications?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'cancelled', updated_at: new Date().toISOString() }) });
        return res.status(200).json({ cancelled: true });
      }
      if (row.status !== 'failed') return res.status(409).json({ error: 'Only failed publications can be retried' });
      if (row.failure_code === 'META_AMBIGUOUS_RESULT') return res.status(409).json({ error: 'Check the connected Page before retrying because the previous provider result could not be confirmed' });
      await addonStorage(`marketing_publications?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'scheduled', scheduled_for: new Date().toISOString(), failure_code: null, failure_message: null, updated_at: new Date().toISOString() }) });
      const claimed = await claimPublication(auth.businessId, row.id);
      return res.status(200).json({ publication: await processPublication(claimed, auth.userId) });
    }
    return res.status(400).json({ error: 'Invalid publication request' });
  } catch (error) {
    const status = [400, 403, 404, 409, 422, 502, 503].includes(error?.status) ? error.status : 503;
    return res.status(status).json({ error: status === 503 ? 'Marketing publishing is temporarily unavailable' : error.message, code: error?.code });
  }
}
