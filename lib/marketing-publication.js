import crypto from 'node:crypto';
import { addonError, addonStorage, requireAddon } from './addons.js';
import { publishMetaText, selectedMetaAccount } from './meta.js';
import { recordAuditEvent } from './audit.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const PUBLICATION_PLATFORMS = new Set(['facebook', 'instagram']);

function publicationError(status, message, code = 'PUBLICATION_ERROR') {
  const error = addonError(status, message); error.code = code; return error;
}

function composeOutput(output) {
  if (!output || typeof output !== 'object') throw publicationError(409, 'Approved content is unavailable', 'DRAFT_UNAVAILABLE');
  const text = [output.main_copy, output.call_to_action, Array.isArray(output.hashtags) ? output.hashtags.join(' ') : ''].filter(value => typeof value === 'string' && value.trim()).join('\n\n').trim();
  if (!text || text.length > 10000) throw publicationError(409, 'Approved content cannot be published', 'DRAFT_INVALID');
  return text;
}

export async function approvedGeneration(businessId, id) {
  if (!UUID.test(String(id || ''))) throw publicationError(400, 'Invalid marketing draft', 'INVALID_GENERATION');
  const rows = await addonStorage(`marketing_generations?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(id)}&deleted_at=is.null&status=eq.completed&approval_status=eq.approved&select=id,business_id,platform,output,edited_output,approval_status,approved_at&limit=1`);
  if (!rows?.[0]) throw publicationError(409, 'The business owner must approve this draft before publishing', 'APPROVAL_REQUIRED');
  return rows[0];
}

export function validatePublicationRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['action', 'generation_id', 'platform', 'scheduled_for', 'publication_id', 'request_id'].includes(key))) throw publicationError(400, 'Invalid publication request');
  if (body.action === 'schedule' && !UUID.test(String(body.request_id || ''))) throw publicationError(400, 'A valid publication request ID is required', 'INVALID_REQUEST_ID');
  return body;
}

export async function claimPublication(businessId, publicationId) {
  if (!businessId || !UUID.test(String(publicationId || ''))) throw publicationError(400, 'Invalid publication');
  const claimed = await addonStorage('rpc/claim_marketing_publication', {
    method: 'POST',
    body: JSON.stringify({ p_business_id: businessId, p_publication_id: publicationId })
  });
  if (!claimed?.id) throw publicationError(409, 'This publication is already being processed or cannot be retried', 'PUBLICATION_NOT_CLAIMABLE');
  return claimed;
}

export async function createPublication({ businessId, actorUserId, generationId, platform, scheduledFor = null, requestId }) {
  await requireAddon(businessId, 'ai_marketing');
  if (!PUBLICATION_PLATFORMS.has(platform)) throw publicationError(400, 'Unsupported publishing platform', 'PLATFORM_UNSUPPORTED');
  const generation = await approvedGeneration(businessId, generationId);
  const account = await selectedMetaAccount(businessId, platform);
  if (platform === 'instagram') throw publicationError(409, 'Instagram publishing is connected for future media posts, but text-only publishing is not supported yet', 'INSTAGRAM_MEDIA_REQUIRED');
  const date = scheduledFor ? new Date(scheduledFor) : new Date();
  if (!Number.isFinite(date.getTime())) throw publicationError(400, 'Invalid publication time');
  if (date.getTime() < Date.now() - 60000 || date.getTime() > Date.now() + 366 * 24 * 60 * 60 * 1000) throw publicationError(400, 'Publication time is outside the supported range');
  if (!UUID.test(String(requestId || ''))) throw publicationError(400, 'A valid publication request ID is required', 'INVALID_REQUEST_ID');
  const idempotencyKey = crypto.createHash('sha256').update(`${businessId}:${requestId}`).digest('hex');
  let rows = await addonStorage('marketing_publications?on_conflict=business_id,idempotency_key', {
    method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ business_id: businessId, generation_id: generation.id, social_account_id: account.id, platform, idempotency_key: idempotencyKey, status: 'scheduled', scheduled_for: date.toISOString(), created_by: actorUserId })
  });
  if (rows?.[0]) return rows[0];
  rows = await addonStorage(`marketing_publications?business_id=eq.${encodeURIComponent(businessId)}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*&limit=1`);
  return rows?.[0] || null;
}

export async function processPublication(publication, actorUserId = null) {
  const businessId = publication?.business_id;
  if (!businessId || !UUID.test(String(publication?.id || ''))) throw publicationError(400, 'Invalid publication');
  try {
    await requireAddon(businessId, 'ai_marketing');
    const generation = await approvedGeneration(businessId, publication.generation_id);
    const accounts = await addonStorage(`marketing_social_accounts?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(publication.social_account_id)}&selected=eq.true&status=eq.selected&select=id,platform,provider_account_id,display_name,token_ciphertext,token_iv,token_tag&limit=1`);
    const account = accounts?.[0];
    if (!account || account.platform !== publication.platform) throw publicationError(409, 'The selected social account is no longer available', 'ACCOUNT_UNAVAILABLE');
    const result = await publishMetaText({ platform: publication.platform, account, text: composeOutput(generation.edited_output || generation.output) });
    const now = new Date().toISOString();
    await addonStorage(`marketing_publications?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(publication.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'published', published_at: now, provider_post_id: result.providerPostId, failure_code: null, failure_message: null, updated_at: now }) });
    await recordAuditEvent({ businessId, actorUserId, action: 'marketing.published', resourceType: 'marketing_publication', resourceId: publication.id, metadata: { platform: publication.platform } });
    return { ...publication, status: 'published', published_at: now, provider_post_id: result.providerPostId };
  } catch (error) {
    if (error?.code === 'META_190' || error?.code === 'META_REAUTH_REQUIRED') {
      try { await addonStorage(`marketing_meta_connections?business_id=eq.${encodeURIComponent(businessId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'needs_reauth', updated_at: new Date().toISOString() }) }); } catch {}
    }
    const ambiguous = !error?.code || error.code === 'META_AMBIGUOUS_RESULT';
    const code = String(error?.code || (ambiguous ? 'META_AMBIGUOUS_RESULT' : 'PUBLISH_FAILED')).slice(0, 120);
    const message = ambiguous ? 'The provider result could not be confirmed. Check the connected Page before retrying to avoid a duplicate post.' : String(error?.message || 'Publication failed').slice(0, 500);
    const now = new Date().toISOString();
    try { await addonStorage(`marketing_publications?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(publication.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', failure_code: code, failure_message: message, updated_at: now }) }); } catch {}
    return { ...publication, status: 'failed', failure_code: code, failure_message: message };
  }
}

export async function listPublications(businessId) {
  const rows = await addonStorage(`marketing_publications?business_id=eq.${encodeURIComponent(businessId)}&select=id,generation_id,platform,status,scheduled_for,published_at,provider_post_id,failure_code,failure_message,attempts,created_at,updated_at&order=created_at.desc&limit=100`);
  return Array.isArray(rows) ? rows : [];
}
