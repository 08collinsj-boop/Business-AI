import { randomUUID } from 'node:crypto';
import { addonError, addonStorage, requireAddon } from './addons.js';
import {
  analyseMarketingPhoto,
  MARKETING_PHOTO_MAX_BYTES,
  signedMarketingImageUrl,
  validateMarketingPhotoUpload
} from './marketing-image.js';

const BUCKET = 'marketing-images';
const ROLES = new Set(['post', 'inspiration']);
const MAX_PER_ROLE = 12;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mediaError(status, message, code = 'MARKETING_AUTOMATION_MEDIA_ERROR') {
  const error = addonError(status, message);
  error.code = code;
  return error;
}

export function validateAutomationMediaRole(value) {
  const role = String(value || '').trim().toLowerCase();
  if (!ROLES.has(role)) throw mediaError(400, 'Choose a valid automation photo type', 'INVALID_AUTOMATION_MEDIA_ROLE');
  return role;
}

function encodeStoragePath(path) {
  return String(path).split('/').map(segment => encodeURIComponent(segment)).join('/');
}

function requiredStorageConfiguration() {
  const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw mediaError(503, 'Automation photo storage is temporarily unavailable', 'AUTOMATION_MEDIA_STORAGE_UNAVAILABLE');
  return { base, key };
}

async function createSignedUpload(path) {
  const { base, key } = requiredStorageConfiguration();
  const response = await fetch(base + '/storage/v1/object/upload/sign/' + BUCKET + '/' + encodeStoragePath(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: 'Bearer ' + key,
      'x-upsert': 'false'
    },
    body: '{}',
    signal: AbortSignal.timeout(15000)
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok || !data?.url) throw mediaError(503, 'Could not prepare the private automation photo upload', 'AUTOMATION_MEDIA_UPLOAD_PREPARE_FAILED');
  const signed = new URL(data.url, base + '/storage/v1');
  const token = signed.searchParams.get('token');
  if (!token) throw mediaError(503, 'Could not prepare the private automation photo upload', 'AUTOMATION_MEDIA_UPLOAD_PREPARE_FAILED');
  return { bucket: BUCKET, path, token };
}

async function downloadObject(path) {
  const { base, key } = requiredStorageConfiguration();
  const response = await fetch(base + '/storage/v1/object/' + BUCKET + '/' + encodeStoragePath(path), {
    headers: { apikey: key, Authorization: 'Bearer ' + key },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw mediaError(response.status === 404 ? 404 : 503, 'Automation photo could not be read', 'AUTOMATION_MEDIA_READ_FAILED');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MARKETING_PHOTO_MAX_BYTES) throw mediaError(400, 'Photos must be between 1 byte and 10 MB', 'AUTOMATION_MEDIA_INVALID_SIZE');
  return bytes;
}

async function uploadObject(path, bytes, mimeType) {
  const { base, key } = requiredStorageConfiguration();
  const response = await fetch(base + '/storage/v1/object/' + BUCKET + '/' + encodeStoragePath(path), {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': mimeType,
      'x-upsert': 'false'
    },
    body: bytes,
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw mediaError(503, 'Automation photo could not be copied', 'AUTOMATION_MEDIA_COPY_FAILED');
}

async function removeObject(path) {
  if (!path) return;
  const { base, key } = requiredStorageConfiguration();
  const response = await fetch(base + '/storage/v1/object/' + BUCKET, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: 'Bearer ' + key
    },
    body: JSON.stringify({ prefixes: [path] }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok && response.status !== 404) throw mediaError(503, 'Automation photo could not be removed', 'AUTOMATION_MEDIA_REMOVE_FAILED');
}

function detectedMime(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return 'image/png';
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

function publicMedia(row, imageUrl = null) {
  if (!row) return null;
  return {
    id: row.id,
    role: row.role,
    file_name: row.file_name,
    mime_type: row.mime_type,
    image_url: imageUrl,
    analysed: Boolean(row.visual_context),
    created_at: row.created_at,
    last_used_at: row.last_used_at || null
  };
}

export async function listAutomationMedia(businessId) {
  await requireAddon(businessId, 'ai_marketing');
  const rows = await addonStorage(
    'marketing_automation_media?business_id=eq.' + encodeURIComponent(businessId)
    + '&select=id,business_id,role,file_name,storage_path,mime_type,visual_context,last_used_at,created_at'
    + '&order=created_at.desc&limit=24'
  );
  return Promise.all((Array.isArray(rows) ? rows : []).map(async row => {
    const url = row.storage_path ? await signedMarketingImageUrl(row.storage_path, 3600).catch(() => null) : null;
    return publicMedia(row, url);
  }));
}

export async function prepareAutomationMediaUpload({ businessId, role, fileName, mimeType, sizeBytes }) {
  await requireAddon(businessId, 'ai_marketing');
  const safeRole = validateAutomationMediaRole(role);
  const input = validateMarketingPhotoUpload({ fileName, mimeType, sizeBytes });
  const existing = await addonStorage(
    'marketing_automation_media?business_id=eq.' + encodeURIComponent(businessId)
    + '&role=eq.' + encodeURIComponent(safeRole)
    + '&select=id&limit=' + (MAX_PER_ROLE + 1)
  );
  if ((Array.isArray(existing) ? existing.length : 0) >= MAX_PER_ROLE) {
    throw mediaError(409, 'Remove an existing ' + (safeRole === 'post' ? 'post photo' : 'inspiration photo') + ' before adding another', 'AUTOMATION_MEDIA_LIMIT_REACHED');
  }
  const path = businessId + '/automation-library/' + safeRole + '/' + randomUUID() + '.' + input.extension;
  const signed = await createSignedUpload(path);
  return { ...signed, role: safeRole, file_name: input.fileName, mime_type: input.mimeType, size_bytes: input.sizeBytes };
}

export async function finalizeAutomationMediaUpload({ businessId, actorUserId, role, path, fileName, mimeType, sizeBytes }) {
  await requireAddon(businessId, 'ai_marketing');
  const safeRole = validateAutomationMediaRole(role);
  const input = validateMarketingPhotoUpload({ fileName, mimeType, sizeBytes });
  const prefix = businessId + '/automation-library/' + safeRole + '/';
  if (typeof path !== 'string' || !path.startsWith(prefix) || path.length > 1000) {
    throw mediaError(400, 'Invalid automation photo upload', 'AUTOMATION_MEDIA_INVALID_PATH');
  }
  const bytes = await downloadObject(path);
  const actualMime = detectedMime(bytes);
  if (!actualMime || actualMime !== input.mimeType) {
    await removeObject(path).catch(() => null);
    throw mediaError(400, 'The uploaded photo type could not be verified', 'AUTOMATION_MEDIA_INVALID_TYPE');
  }

  let visualContext = null;
  try { visualContext = await analyseMarketingPhoto(bytes, actualMime); } catch {}

  let rows;
  try {
    rows = await addonStorage('marketing_automation_media', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        business_id: businessId,
        role: safeRole,
        file_name: input.fileName,
        storage_bucket: BUCKET,
        storage_path: path,
        mime_type: actualMime,
        visual_context: visualContext,
        created_by: actorUserId || null
      })
    });
  } catch (error) {
    await removeObject(path).catch(() => null);
    throw error;
  }
  const row = rows?.[0];
  if (!row?.id) {
    await removeObject(path).catch(() => null);
    throw mediaError(503, 'Automation photo could not be saved', 'AUTOMATION_MEDIA_STORAGE_ERROR');
  }
  const url = await signedMarketingImageUrl(path, 3600).catch(() => null);
  return publicMedia(row, url);
}

export async function deleteAutomationMedia({ businessId, mediaId }) {
  await requireAddon(businessId, 'ai_marketing');
  if (!UUID.test(String(mediaId || ''))) throw mediaError(400, 'Invalid automation photo', 'INVALID_AUTOMATION_MEDIA');
  const rows = await addonStorage(
    'marketing_automation_media?business_id=eq.' + encodeURIComponent(businessId)
    + '&id=eq.' + encodeURIComponent(mediaId)
    + '&select=id,storage_path,role&limit=1'
  );
  const row = rows?.[0];
  if (!row) throw mediaError(404, 'Automation photo not found', 'AUTOMATION_MEDIA_NOT_FOUND');
  await removeObject(row.storage_path);
  await addonStorage(
    'marketing_automation_media?business_id=eq.' + encodeURIComponent(businessId)
    + '&id=eq.' + encodeURIComponent(mediaId),
    { method: 'DELETE', headers: { Prefer: 'return=minimal' } }
  );
  return { deleted: true, role: row.role };
}

export function selectAutomationMediaContext(rows) {
  const all = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const posts = all.filter(row => row.role === 'post').sort((a, b) => {
    const aUsed = a.last_used_at ? Date.parse(a.last_used_at) : 0;
    const bUsed = b.last_used_at ? Date.parse(b.last_used_at) : 0;
    return aUsed - bUsed || Date.parse(a.created_at || 0) - Date.parse(b.created_at || 0);
  });
  const inspirations = all.filter(row => row.role === 'inspiration' && typeof row.visual_context === 'string' && row.visual_context.trim())
    .sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0))
    .slice(0, 3);
  return {
    post: posts[0] || null,
    inspiration_context: inspirations.map((row, index) => 'Reference ' + (index + 1) + ': ' + row.visual_context.trim()).join('\n').slice(0, 2100),
    inspiration_ids: inspirations.map(row => row.id)
  };
}

export async function automationMediaContext(businessId) {
  await requireAddon(businessId, 'ai_marketing');
  const rows = await addonStorage(
    'marketing_automation_media?business_id=eq.' + encodeURIComponent(businessId)
    + '&select=id,business_id,role,file_name,storage_path,mime_type,visual_context,last_used_at,created_at'
    + '&order=created_at.asc&limit=24'
  );
  return selectAutomationMediaContext(rows);
}

export async function attachAutomationPostPhoto({ businessId, actorUserId, generationId, mediaId }) {
  await requireAddon(businessId, 'ai_marketing');
  if (!UUID.test(String(generationId || '')) || !UUID.test(String(mediaId || ''))) {
    throw mediaError(400, 'Invalid automation photo selection', 'INVALID_AUTOMATION_MEDIA');
  }
  const rows = await addonStorage(
    'marketing_automation_media?business_id=eq.' + encodeURIComponent(businessId)
    + '&id=eq.' + encodeURIComponent(mediaId)
    + '&role=eq.post&select=id,storage_path,mime_type,visual_context&limit=1'
  );
  const media = rows?.[0];
  if (!media?.storage_path) throw mediaError(404, 'Automation post photo not found', 'AUTOMATION_MEDIA_NOT_FOUND');
  const bytes = await downloadObject(media.storage_path);
  const actualMime = detectedMime(bytes);
  if (!actualMime || actualMime !== media.mime_type) throw mediaError(409, 'Automation post photo is no longer valid', 'AUTOMATION_MEDIA_INVALID_TYPE');
  const extension = actualMime === 'image/png' ? 'png' : actualMime === 'image/webp' ? 'webp' : 'jpg';
  const destination = businessId + '/' + generationId + '/automation-' + randomUUID() + '.' + extension;
  await uploadObject(destination, bytes, actualMime);
  const now = new Date().toISOString();
  let imageRows;
  try {
    imageRows = await addonStorage('marketing_images?on_conflict=business_id,generation_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        business_id: businessId,
        generation_id: generationId,
        status: 'completed',
        provider: 'upload',
        model: 'automation-library',
        prompt: ('Approved automation post photo. Visible context only: ' + (media.visual_context || 'No AI visual description available.')).slice(0, 8000),
        storage_bucket: BUCKET,
        storage_path: destination,
        mime_type: actualMime,
        width: null,
        height: null,
        provider_image_id: null,
        failure_code: null,
        failure_message: null,
        created_by: actorUserId || null,
        completed_at: now,
        updated_at: now
      })
    });
  } catch (error) {
    await removeObject(destination).catch(() => null);
    throw error;
  }
  const image = imageRows?.[0];
  if (!image?.id) {
    await removeObject(destination).catch(() => null);
    throw mediaError(503, 'Automation post photo could not be attached', 'AUTOMATION_MEDIA_ATTACH_FAILED');
  }
  await addonStorage(
    'marketing_automation_media?business_id=eq.' + encodeURIComponent(businessId)
    + '&id=eq.' + encodeURIComponent(media.id),
    { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ last_used_at: now }) }
  );
  const url = await signedMarketingImageUrl(destination, 3600).catch(() => null);
  return {
    id: image.id,
    generation_id: generationId,
    status: 'completed',
    provider: 'upload',
    model: 'automation-library',
    simulation: false,
    mime_type: actualMime,
    width: null,
    height: null,
    image_url: url,
    failure_code: null,
    failure_message: null,
    created_at: image.created_at || now,
    updated_at: now,
    completed_at: now
  };
}
