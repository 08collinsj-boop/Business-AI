import { randomUUID } from 'node:crypto';
import { requireBusinessMember, requireBusinessAdmin, sendAuthError } from './auth.js';
import { recordAuditEvent } from './audit.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'business-profile-media';
const MAX_BYTES = 8 * 1024 * 1024;
const MIME = Object.freeze({
  'image/jpeg': { extension: 'jpg', extensions: ['jpg', 'jpeg'] },
  'image/png': { extension: 'png', extensions: ['png'] },
  'image/webp': { extension: 'webp', extensions: ['webp'] }
});
const SLOTS = Object.freeze({ avatar: 'profile_image_path', banner: 'profile_banner_path' });

function profileError(status, message, code = 'BUSINESS_PROFILE_ERROR') {
  const error = new Error(message); error.status = status; error.code = code; return error;
}
function baseUrl() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw profileError(503, 'Business profile storage is temporarily unavailable', 'PROFILE_STORAGE_UNAVAILABLE');
  return String(SUPABASE_URL).replace(/\/+$/, '');
}
function encodeStoragePath(path) { return String(path).split('/').map(encodeURIComponent).join('/'); }
function publicMediaUrl(path) {
  if (!path) return '';
  return baseUrl() + '/storage/v1/object/public/' + BUCKET + '/' + encodeStoragePath(path);
}
async function rest(path, options = {}) {
  const response = await fetch(baseUrl() + '/rest/v1/' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(20000)
  });
  const raw = await response.text(); let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) throw profileError(503, 'Business profile is temporarily unavailable', 'PROFILE_DATABASE_ERROR');
  return data;
}
async function storage(path, options = {}) {
  const response = await fetch(baseUrl() + '/storage/v1/' + String(path).replace(/^\/+/, ''), {
    ...options,
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY, ...(options.headers || {}) },
    signal: AbortSignal.timeout(30000)
  });
  return response;
}
function cleanText(value, max, label) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > max) throw profileError(400, 'Invalid ' + label, 'PROFILE_INVALID_FIELD');
  return value.trim();
}
function cleanWebsite(value) {
  if (value === undefined) return undefined;
  const text = cleanText(value, 500, 'website');
  if (!text) return '';
  try { const url = new URL(text); if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(); return url.toString().slice(0, 500); }
  catch { throw profileError(400, 'Enter a valid website using HTTP or HTTPS', 'PROFILE_INVALID_WEBSITE'); }
}
function cleanUpload(value) {
  const fileName = String(value?.file_name ?? value?.fileName ?? '').trim();
  const mimeType = String(value?.mime_type ?? value?.mimeType ?? '').trim().toLowerCase();
  const sizeBytes = Number(value?.size_bytes ?? value?.sizeBytes);
  const definition = MIME[mimeType];
  if (!fileName || fileName.length > 240 || fileName.includes('/') || fileName.includes('\\') || fileName.includes('\0')) throw profileError(400, 'Choose a valid image', 'PROFILE_INVALID_IMAGE');
  if (!definition) throw profileError(400, 'Use a JPG, PNG or WebP image', 'PROFILE_INVALID_IMAGE_TYPE');
  const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
  if (!definition.extensions.includes(extension)) throw profileError(400, 'The image type does not match its file extension', 'PROFILE_INVALID_IMAGE_TYPE');
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_BYTES) throw profileError(400, 'Images must be between 1 byte and 8 MB', 'PROFILE_INVALID_IMAGE_SIZE');
  return { fileName, mimeType, sizeBytes, extension: definition.extension };
}
function detectedMime(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return 'image/png';
  if (bytes.length >= 12 && bytes.subarray(0,4).toString('ascii') === 'RIFF' && bytes.subarray(8,12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}
async function readProfile(businessId) {
  const id = encodeURIComponent(String(businessId));
  const [settingsRows, configurationRows, routeRows] = await Promise.all([
    rest(`business_settings?business_id=eq.${id}&select=id,business_name,business_type,phone,email,opening_hours,services,profile_image_path,profile_banner_path&limit=1`),
    rest(`business_configurations?business_id=eq.${id}&select=business_id,description,website,service_areas&limit=1`),
    rest(`business_public_routes?business_id=eq.${id}&route_type=eq.slug&active=eq.true&select=route_value&limit=1`)
  ]);
  const settings = settingsRows?.[0];
  if (!settings) throw profileError(404, 'Business profile not found', 'PROFILE_NOT_FOUND');
  const configuration = configurationRows?.[0] || {};
  const slug = typeof routeRows?.[0]?.route_value === 'string' ? routeRows[0].route_value : '';
  return {
    business_name: String(settings.business_name || ''),
    business_type: String(settings.business_type || ''),
    phone: String(settings.phone || ''),
    email: String(settings.email || ''),
    opening_hours: String(settings.opening_hours || ''),
    services: String(settings.services || ''),
    description: String(configuration.description || ''),
    website: String(configuration.website || ''),
    service_areas: String(configuration.service_areas || ''),
    profile_image_path: String(settings.profile_image_path || ''),
    profile_banner_path: String(settings.profile_banner_path || ''),
    profile_image_url: publicMediaUrl(settings.profile_image_path),
    profile_banner_url: publicMediaUrl(settings.profile_banner_path),
    public_slug: slug,
    preview_path: slug ? '/customer?business=' + encodeURIComponent(slug) + '&view=profile' : ''
  };
}
async function createSignedUpload(path) {
  const response = await storage('object/upload/sign/' + BUCKET + '/' + encodeStoragePath(path), {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-upsert': 'false' }, body: '{}'
  });
  const raw = await response.text(); let data = null; try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok || !data?.url) throw profileError(503, 'Could not prepare the profile image upload', 'PROFILE_UPLOAD_PREPARE_FAILED');
  const signed = new URL(data.url, baseUrl() + '/storage/v1');
  const token = signed.searchParams.get('token');
  if (!token) throw profileError(503, 'Could not prepare the profile image upload', 'PROFILE_UPLOAD_PREPARE_FAILED');
  return token;
}
async function downloadObject(path) {
  const response = await storage('object/' + BUCKET + '/' + encodeStoragePath(path));
  if (!response.ok) throw profileError(response.status === 404 ? 404 : 503, 'Uploaded image could not be read', 'PROFILE_UPLOAD_READ_FAILED');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) throw profileError(400, 'Images must be between 1 byte and 8 MB', 'PROFILE_INVALID_IMAGE_SIZE');
  return bytes;
}
async function removeObject(path) {
  if (!path) return;
  const response = await storage('object/' + BUCKET, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [path] }) });
  if (!response.ok && response.status !== 404) throw profileError(503, 'Could not remove the old profile image', 'PROFILE_REMOVE_FAILED');
}
async function updateSettings(businessId, updates) {
  if (!Object.keys(updates).length) return;
  updates.updated_at = new Date().toISOString();
  await rest(`business_settings?business_id=eq.${encodeURIComponent(String(businessId))}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(updates) });
}
async function updateConfiguration(businessId, updates) {
  if (!Object.keys(updates).length) return;
  updates.updated_at = new Date().toISOString();
  const id = encodeURIComponent(String(businessId));
  const rows = await rest(`business_configurations?business_id=eq.${id}&select=business_id&limit=1`);
  if (rows?.[0]) await rest(`business_configurations?business_id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(updates) });
  else await rest('business_configurations', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ business_id: businessId, ...updates }) });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      let auth; try { auth = await requireBusinessMember(req); } catch (error) { return sendAuthError(res, error); }
      const profile = await readProfile(auth.businessId);
      return res.status(200).json({ profile, can_edit: auth.role === 'owner' || auth.role === 'admin' });
    }
    if (req.method === 'PATCH') {
      let auth; try { auth = await requireBusinessAdmin(req); } catch (error) { return sendAuthError(res, error); }
      let body; try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch { throw profileError(400, 'Invalid request body', 'PROFILE_INVALID_REQUEST'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw profileError(400, 'Invalid request body', 'PROFILE_INVALID_REQUEST');
      const allowed = new Set(['business_name','business_type','phone','email','opening_hours','services','description','website','service_areas']);
      if (Object.keys(body).some(key => !allowed.has(key))) throw profileError(400, 'Unsupported profile fields', 'PROFILE_INVALID_FIELD');
      const settingsUpdates = {};
      const configurationUpdates = {};
      const limits = { business_name:120, business_type:120, phone:80, email:160, opening_hours:500, services:4000 };
      for (const [field, limit] of Object.entries(limits)) if (body[field] !== undefined) settingsUpdates[field] = cleanText(body[field], limit, field);
      if (body.description !== undefined) configurationUpdates.description = cleanText(body.description, 2000, 'description');
      if (body.service_areas !== undefined) configurationUpdates.service_areas = cleanText(body.service_areas, 500, 'service area');
      if (body.website !== undefined) configurationUpdates.website = cleanWebsite(body.website);
      if (!Object.keys(settingsUpdates).length && !Object.keys(configurationUpdates).length) throw profileError(400, 'No changes supplied', 'PROFILE_NO_CHANGES');
      await Promise.all([updateSettings(auth.businessId, settingsUpdates), updateConfiguration(auth.businessId, configurationUpdates)]);
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'business_profile.updated', resourceType: 'business_profile', resourceId: String(auth.businessId), metadata: { fields: [...Object.keys(settingsUpdates), ...Object.keys(configurationUpdates)].filter(x => x !== 'updated_at').sort().join(',') } });
      return res.status(200).json({ profile: await readProfile(auth.businessId), can_edit: true });
    }
    if (req.method === 'POST') {
      let auth; try { auth = await requireBusinessAdmin(req); } catch (error) { return sendAuthError(res, error); }
      let body; try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch { throw profileError(400, 'Invalid request body', 'PROFILE_INVALID_REQUEST'); }
      const action = String(body?.action || '');
      const slot = String(body?.slot || '');
      const column = SLOTS[slot];
      if (!column) throw profileError(400, 'Invalid profile image slot', 'PROFILE_INVALID_SLOT');
      if (action === 'prepare_upload') {
        const input = cleanUpload(body);
        const path = auth.businessId + '/' + slot + '/' + randomUUID() + '.' + input.extension;
        const token = await createSignedUpload(path);
        return res.status(200).json({ bucket: BUCKET, path, token, slot, file_name: input.fileName, mime_type: input.mimeType, size_bytes: input.sizeBytes });
      }
      if (action === 'finalize_upload') {
        const input = cleanUpload(body);
        const path = String(body?.path || '');
        const expectedPrefix = auth.businessId + '/' + slot + '/';
        const suffix = path.startsWith(expectedPrefix) ? path.slice(expectedPrefix.length) : '';
        if (!path.startsWith(expectedPrefix) || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(suffix)) throw profileError(400, 'Invalid profile image upload', 'PROFILE_INVALID_PATH');
        let bytes;
        try {
          bytes = await downloadObject(path);
          if (bytes.length !== input.sizeBytes) throw profileError(400, 'Uploaded image size does not match the prepared upload', 'PROFILE_UPLOAD_SIZE_MISMATCH');
          if (detectedMime(bytes) !== input.mimeType) throw profileError(400, 'The uploaded file is not a valid supported image', 'PROFILE_INVALID_IMAGE_CONTENT');
        } catch (error) { await removeObject(path).catch(() => null); throw error; }
        const before = await readProfile(auth.businessId);
        const previous = slot === 'avatar' ? before.profile_image_path : before.profile_banner_path;
        await updateSettings(auth.businessId, { [column]: path });
        if (previous && previous !== path) await removeObject(previous).catch(() => null);
        await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'business_profile.media_updated', resourceType: 'business_profile', resourceId: String(auth.businessId), metadata: { slot } });
        return res.status(200).json({ profile: await readProfile(auth.businessId), can_edit: true });
      }
      if (action === 'remove_media') {
        const before = await readProfile(auth.businessId);
        const previous = slot === 'avatar' ? before.profile_image_path : before.profile_banner_path;
        await updateSettings(auth.businessId, { [column]: '' });
        if (previous) await removeObject(previous).catch(() => null);
        await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'business_profile.media_removed', resourceType: 'business_profile', resourceId: String(auth.businessId), metadata: { slot } });
        return res.status(200).json({ profile: await readProfile(auth.businessId), can_edit: true });
      }
      throw profileError(400, 'Unsupported profile action', 'PROFILE_INVALID_ACTION');
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) console.error('Business profile API error');
    return res.status(status).json({ error: status >= 500 ? 'Could not process business profile' : error.message, code: error?.code || undefined });
  }
}
