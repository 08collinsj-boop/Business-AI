import { createHash } from 'node:crypto';
import { requireBusinessMember, sendAuthError } from './auth.js';
import { addonStorage, requireAddon } from './addons.js';
import { validateMarketingInput, marketingContext, generateMarketing, validateMarketingOutput } from './marketing.js';
import { recordAuditEvent } from './audit.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const parse = value => { try { const body = typeof value === 'string' ? JSON.parse(value) : value; return body && typeof body === 'object' && !Array.isArray(body) ? body : null; } catch { return null; } };

function publicGeneration(row) {
  const effective = row?.edited_output || row?.output || null;
  return {
    id: row.id,
    content_type: row.content_type,
    platform: row.platform,
    tone: row.tone,
    request_text: row.request_text,
    extra_instructions: row.extra_instructions || '',
    status: row.status,
    approval_status: row.approval_status || 'draft',
    output: effective,
    created_at: row.created_at,
    updated_at: row.updated_at || row.completed_at || row.created_at,
    approved_at: row.approved_at || null
  };
}

async function generationRow(businessId, id) {
  if (!UUID.test(String(id || ''))) return null;
  const rows = await addonStorage(`marketing_generations?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(id)}&deleted_at=is.null&select=id,business_id,content_type,platform,tone,request_text,extra_instructions,status,output,edited_output,approval_status,approved_at,created_at,updated_at,completed_at&limit=1`);
  return rows?.[0] || null;
}

async function generate(req, res, auth) {
  let reservation, completed = false;
  try {
    const input = validateMarketingInput(req.body);
    await requireAddon(auth.businessId, 'ai_marketing');
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'Marketing generation is temporarily unavailable' });
    const facts = await marketingContext(auth.businessId, input.prompt);
    reservation = await addonStorage('rpc/reserve_marketing_generation', { method: 'POST', body: JSON.stringify({ p_business_id: auth.businessId, p_actor_user_id: auth.userId, p_request: input, p_request_hash: createHash('sha256').update(JSON.stringify(input)).digest('hex') }) });
    if (!reservation?.allowed) {
      if (reservation?.reason === 'allowance') return res.status(429).json({ error: 'Your AI Marketing generation allowance for this billing period has been reached.' });
      const denied = reservation?.reason === 'entitlement' || reservation?.reason === 'membership';
      if (!denied) res.setHeader?.('Retry-After', '60');
      return res.status(denied ? 403 : 429).json({ error: denied ? 'AI Marketing access is unavailable' : 'Please wait before generating again. Limit: 10 drafts per hour and 50 per day per business.' });
    }
    const generated = await generateMarketing(input, facts);
    const now = new Date().toISOString();
    await addonStorage(`marketing_generations?id=eq.${encodeURIComponent(reservation.id)}&business_id=eq.${encodeURIComponent(auth.businessId)}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed', output: generated.output, edited_output: null, approval_status: 'draft', approved_at: null, approved_by: null, model: generated.model, provider_response_id: generated.provider_response_id, usage: generated.usage, completed_at: now, updated_at: now }) });
    completed = true;
    await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'marketing.generated', resourceType: 'marketing_generation', resourceId: reservation.id, metadata: { platform: input.platform, model: generated.model } });
    return res.status(200).json({ id: reservation.id, output: generated.output, draft: true, approval_status: 'draft' });
  } catch (error) {
    if (reservation?.id && !completed) try { await addonStorage(`marketing_generations?id=eq.${encodeURIComponent(reservation.id)}&business_id=eq.${encodeURIComponent(auth.businessId)}`, { method: 'PATCH', body: JSON.stringify({ status: 'failed', updated_at: new Date().toISOString(), completed_at: new Date().toISOString() }) }); } catch {}
    const status = [400, 403, 422, 502, 503].includes(error.status) ? error.status : 503;
    return res.status(status).json({ error: status === 503 ? 'Marketing generation is temporarily unavailable' : error.message });
  }
}

export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  let auth;
  try { auth = await requireBusinessMember(req); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: 'Authenticated business access is required' });
  try {
    const queryKeys = Object.keys(req.query || {}).filter(key => key !== 'operation');
    if (queryKeys.some(key => !['generation_id', 'limit'].includes(key))) return res.status(400).json({ error: 'Invalid marketing query' });
    await requireAddon(auth.businessId, 'ai_marketing');
    if (req.method === 'POST') return generate(req, res, auth);

    if (req.method === 'GET') {
      if (req.query?.generation_id) {
        const row = await generationRow(auth.businessId, req.query.generation_id);
        return row ? res.status(200).json({ generation: publicGeneration(row) }) : res.status(404).json({ error: 'Marketing draft not found' });
      }
      const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 30));
      const rows = await addonStorage(`marketing_generations?business_id=eq.${encodeURIComponent(auth.businessId)}&deleted_at=is.null&status=eq.completed&select=id,content_type,platform,tone,request_text,extra_instructions,status,output,edited_output,approval_status,approved_at,created_at,updated_at,completed_at&order=created_at.desc&limit=${limit}`);
      return res.status(200).json({ generations: (Array.isArray(rows) ? rows : []).map(publicGeneration) });
    }

    const body = parse(req.body);
    if (!body || Object.keys(body).some(key => !['action', 'generation_id', 'output'].includes(key))) return res.status(400).json({ error: 'Invalid marketing draft request' });
    const row = await generationRow(auth.businessId, body.generation_id);
    if (!row) return res.status(404).json({ error: 'Marketing draft not found' });

    if (req.method === 'PATCH' && body.action === 'edit') {
      const output = validateMarketingOutput(body.output);
      const now = new Date().toISOString();
      await addonStorage(`marketing_generations?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ edited_output: output, approval_status: 'draft', approved_at: null, approved_by: null, updated_at: now }) });
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'marketing.draft_edited', resourceType: 'marketing_generation', resourceId: row.id, metadata: { platform: row.platform } });
      return res.status(200).json({ generation: publicGeneration({ ...row, edited_output: output, approval_status: 'draft', approved_at: null, updated_at: now }) });
    }

    if (req.method === 'PATCH' && body.action === 'approve') {
      if (auth.role !== 'owner') return res.status(403).json({ error: 'Only the business owner can approve content for publishing' });
      if (row.status !== 'completed' || !(row.edited_output || row.output)) return res.status(409).json({ error: 'This draft is not ready for approval' });
      const now = new Date().toISOString();
      await addonStorage(`marketing_generations?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ approval_status: 'approved', approved_at: now, approved_by: auth.userId, updated_at: now }) });
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'marketing.draft_approved', resourceType: 'marketing_generation', resourceId: row.id, metadata: { platform: row.platform } });
      return res.status(200).json({ generation: publicGeneration({ ...row, approval_status: 'approved', approved_at: now, updated_at: now }) });
    }

    if (req.method === 'DELETE' && body.action === 'delete') {
      if (!['owner', 'admin'].includes(auth.role)) return res.status(403).json({ error: 'You are not authorised for this action' });
      const now = new Date().toISOString();
      await addonStorage(`marketing_generations?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ deleted_at: now, updated_at: now }) });
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'marketing.draft_deleted', resourceType: 'marketing_generation', resourceId: row.id, metadata: {} });
      return res.status(200).json({ deleted: true });
    }

    return res.status(400).json({ error: 'Invalid marketing draft request' });
  } catch (error) {
    const status = [400, 403, 404, 409, 422, 502, 503].includes(error?.status) ? error.status : 503;
    return res.status(status).json({ error: status === 503 ? 'Marketing is temporarily unavailable' : error.message });
  }
}
