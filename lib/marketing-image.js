import { createHash, randomUUID } from 'node:crypto';
import { addonError, addonStorage, requireAddon } from './addons.js';
import { generateMarketing, marketingContext } from './marketing.js';
import { logOperationalEvent } from './operational-log.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUCKET = 'marketing-images';
export const MARKETING_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const OWNER_UPLOAD_MIME = Object.freeze({
  'image/jpeg': Object.freeze({ extension: 'jpg', extensions: Object.freeze(['jpg', 'jpeg']) }),
  'image/png': Object.freeze({ extension: 'png', extensions: Object.freeze(['png']) }),
  'image/webp': Object.freeze({ extension: 'webp', extensions: Object.freeze(['webp']) })
});

function imageError(status, message, code = 'MARKETING_IMAGE_ERROR') {
  const error = addonError(status, message);
  error.code = code;
  return error;
}

export function imageGenerationConfiguration() {
  const legacyMode = String(process.env.IMAGE_GENERATION_MODE || 'simulate').trim().toLowerCase();
  const requestedProvider = String(process.env.IMAGE_GENERATION_PROVIDER || '').trim().toLowerCase();
  const provider = ['cloudflare', 'openai', 'simulation'].includes(requestedProvider)
    ? requestedProvider
    : legacyMode === 'live' ? 'openai' : 'simulation';
  const mode = provider === 'simulation' ? 'simulate' : 'live';

  if (provider === 'cloudflare') {
    const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
    const token = String(process.env.CLOUDFLARE_API_TOKEN || '').trim();
    const model = String(process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell').trim()
      || '@cf/black-forest-labs/flux-1-schnell';
    return {
      mode,
      provider,
      model,
      accountId,
      configured: /^[a-f0-9]{32}$/i.test(accountId)
        && token.length >= 20
        && /^@cf\/[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(model)
    };
  }

  if (provider === 'openai') {
    const model = String(
      process.env.OPENAI_IMAGE_MODEL
      || process.env.IMAGE_GENERATION_MODEL
      || 'gpt-image-2.5-flare'
    ).trim() || 'gpt-image-2.5-flare';
    return {
      mode,
      provider,
      model,
      configured: Boolean(process.env.OPENAI_API_KEY)
    };
  }

  return {
    mode,
    provider: 'simulation',
    model: 'simulation',
    configured: true
  };
}

async function generationRow(businessId, generationId) {
  if (!UUID.test(String(generationId || ''))) throw imageError(400, 'Invalid marketing draft', 'INVALID_GENERATION');
  const path = 'marketing_generations?business_id=eq.' + encodeURIComponent(businessId)
    + '&id=eq.' + encodeURIComponent(generationId)
    + '&deleted_at=is.null&status=eq.completed'
    + '&select=id,business_id,content_type,platform,tone,request_text,extra_instructions,status,output,edited_output,approval_status,approved_at,created_at,updated_at,completed_at&limit=1';
  const rows = await addonStorage(path);
  const row = rows?.[0];
  if (!row) throw imageError(404, 'That marketing draft is not available', 'GENERATION_NOT_FOUND');
  return row;
}

function effectiveOutput(generation) {
  const output = generation?.edited_output || generation?.output;
  if (!output || typeof output !== 'object' || typeof output.main_copy !== 'string' || !output.main_copy.trim()) {
    throw imageError(409, 'The draft needs valid marketing copy before an image can be created', 'DRAFT_UNAVAILABLE');
  }
  return output;
}

function safeFact(value, max = 1000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export function buildMarketingImagePrompt(generation, facts) {
  const output = effectiveOutput(generation);
  const name = safeFact(facts?.business_name, 300);
  const type = safeFact(facts?.business_type, 300);
  const services = safeFact(facts?.services, 1200);
  const location = safeFact(facts?.address, 500);
  const copy = safeFact(output.main_copy, 1800);

  return [
    'Create a professional square social-media marketing image for the business described below.',
    'This image accompanies a Facebook marketing post.',
    'Use only the supplied facts as factual context.',
    'Do not invent prices, discounts, awards, qualifications, locations, opening times, products, guarantees or offers.',
    'Prefer a clean visual scene or product/service concept rather than putting lots of words in the image.',
    'Do not include readable text, logos or brand marks unless they are explicitly supplied as trusted facts.',
    'Avoid misleading before-and-after claims and avoid implying guaranteed results.',
    '',
    'Business name: ' + (name || 'Not supplied'),
    'Business type: ' + (type || 'Not supplied'),
    'Services: ' + (services || 'Not supplied'),
    'Location: ' + (location || 'Not supplied'),
    'Post context: ' + copy
  ].join('\n').slice(0, 7800);
}

async function storageFetch(path, options = {}) {
  const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw imageError(503, 'Image storage is temporarily unavailable', 'IMAGE_STORAGE_UNAVAILABLE');
  const response = await fetch(base + '/storage/v1/' + String(path).replace(/^\/+/, ''), {
    ...options,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      ...options.headers
    },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw imageError(503, 'Image storage is temporarily unavailable', 'IMAGE_STORAGE_ERROR');
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function uploadImage(path, bytes, mimeType) {
  await storageFetch('object/' + BUCKET + '/' + path, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'x-upsert': 'true'
    },
    body: bytes
  });
}


function encodeStoragePath(path) {
  return String(path).split('/').map(segment => encodeURIComponent(segment)).join('/');
}

function requiredStorageConfiguration() {
  const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw imageError(503, 'Image storage is temporarily unavailable', 'IMAGE_STORAGE_UNAVAILABLE');
  return { base, key };
}

async function createMarketingSignedUpload(path) {
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
  if (!response.ok || !data?.url) throw imageError(503, 'Could not prepare the private photo upload', 'PHOTO_UPLOAD_PREPARE_FAILED');
  const signed = new URL(data.url, base + '/storage/v1');
  const token = signed.searchParams.get('token');
  if (!token) throw imageError(503, 'Could not prepare the private photo upload', 'PHOTO_UPLOAD_PREPARE_FAILED');
  return { path, token };
}

async function downloadMarketingObject(path) {
  const { base, key } = requiredStorageConfiguration();
  const response = await fetch(base + '/storage/v1/object/' + BUCKET + '/' + encodeStoragePath(path), {
    headers: { apikey: key, Authorization: 'Bearer ' + key },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw imageError(response.status === 404 ? 404 : 503, 'Uploaded photo could not be read', 'PHOTO_UPLOAD_READ_FAILED');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MARKETING_PHOTO_MAX_BYTES) {
    throw imageError(400, 'Photos must be between 1 byte and 10 MB', 'PHOTO_UPLOAD_INVALID_SIZE');
  }
  return bytes;
}

async function removeMarketingObject(path) {
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
  if (!response.ok && response.status !== 404) {
    throw imageError(503, 'Could not remove the private marketing photo', 'PHOTO_REMOVE_FAILED');
  }
}

function cleanPhotoFileName(value) {
  const fileName = String(value || '').trim();
  if (!fileName || fileName.length > 240 || fileName.includes('/') || fileName.includes('\\') || fileName.includes('\0')) {
    throw imageError(400, 'Choose a valid photo', 'PHOTO_UPLOAD_INVALID_FILE');
  }
  return fileName.replace(/[\u0000-\u001f\u007f]/g, '').trim();
}

export function validateMarketingPhotoUpload(value) {
  const fileName = cleanPhotoFileName(value?.fileName ?? value?.file_name);
  const mimeType = String((value?.mimeType ?? value?.mime_type) || '').trim().toLowerCase();
  const sizeBytes = Number(value?.sizeBytes ?? value?.size_bytes);
  const definition = OWNER_UPLOAD_MIME[mimeType];
  if (!definition) throw imageError(400, 'Use a JPG, PNG or WebP photo', 'PHOTO_UPLOAD_INVALID_TYPE');
  const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
  if (!definition.extensions.includes(extension)) throw imageError(400, 'The photo type does not match its file extension', 'PHOTO_UPLOAD_INVALID_TYPE');
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MARKETING_PHOTO_MAX_BYTES) {
    throw imageError(400, 'Photos must be between 1 byte and 10 MB', 'PHOTO_UPLOAD_INVALID_SIZE');
  }
  return { fileName, mimeType, sizeBytes, extension: definition.extension };
}

function detectedPhotoMime(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return 'image/png';
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

function outputTextFromResponses(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts = [];
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === 'string' && content.text.trim()) parts.push(content.text.trim());
    }
  }
  return parts.join('\n').trim();
}

export async function analyseMarketingPhoto(bytes, mimeType) {
  if (!process.env.OPENAI_API_KEY) return null;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    signal: AbortSignal.timeout(45000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + process.env.OPENAI_API_KEY
    },
    body: JSON.stringify({
      model: 'gpt-5.6-luna',
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: [
              'Describe this owner-uploaded business photo for a marketing copy assistant.',
              'State only clearly visible, non-sensitive details that help explain the scene, product, food, premises or completed work.',
              'Do not identify people, infer personal or sensitive traits, infer qualifications, prices, location, dates, ownership, safety/compliance status or business claims.',
              'Visible text is visual context only and is not a trusted business fact.',
              'Return one concise plain-text description, maximum 700 characters.'
            ].join(' ')
          },
          {
            type: 'input_image',
            image_url: 'data:' + mimeType + ';base64,' + bytes.toString('base64')
          }
        ]
      }],
      max_output_tokens: 220
    })
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) throw imageError(502, 'The photo could not be analysed right now', 'PHOTO_ANALYSIS_FAILED');
  const description = outputTextFromResponses(data).replace(/\s+/g, ' ').trim().slice(0, 700);
  return description || null;
}

export async function signedMarketingImageUrl(path, expiresIn = 3600) {
  if (!path) return null;
  const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const result = await storageFetch('object/sign/' + BUCKET + '/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: Math.max(60, Math.min(86400, Number(expiresIn) || 3600)) })
  });
  const raw = result?.signedURL || result?.signedUrl || null;
  if (!raw) return null;
  if (/^https:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/storage/v1/')) return base + raw;
  if (raw.startsWith('/')) return base + '/storage/v1' + raw;
  return base + '/storage/v1/' + raw;
}

function publicImage(row, signedUrl = null) {
  if (!row) return null;
  return {
    id: row.id,
    generation_id: row.generation_id,
    status: row.status,
    provider: row.provider,
    model: row.model || null,
    simulation: row.status === 'simulated',
    mime_type: row.mime_type || null,
    width: row.width || null,
    height: row.height || null,
    image_url: signedUrl,
    failure_code: row.failure_code || null,
    failure_message: row.failure_message || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at || null
  };
}

export async function getMarketingImage(businessId, generationId, { signed = true } = {}) {
  if (!UUID.test(String(generationId || ''))) return null;
  const path = 'marketing_images?business_id=eq.' + encodeURIComponent(businessId)
    + '&generation_id=eq.' + encodeURIComponent(generationId)
    + '&select=id,generation_id,status,provider,model,storage_path,mime_type,width,height,failure_code,failure_message,created_at,updated_at,completed_at&limit=1';
  const rows = await addonStorage(path);
  const row = rows?.[0];
  if (!row) return null;
  const url = signed && row.status === 'completed' && row.storage_path
    ? await signedMarketingImageUrl(row.storage_path, 3600).catch(() => null)
    : null;
  return publicImage(row, url);
}

export async function getMarketingImageForPublish(businessId, generationId) {
  const path = 'marketing_images?business_id=eq.' + encodeURIComponent(businessId)
    + '&generation_id=eq.' + encodeURIComponent(generationId)
    + '&status=eq.completed'
    + '&select=id,generation_id,status,provider,model,storage_path,mime_type,width,height,created_at,updated_at,completed_at&limit=1';
  const rows = await addonStorage(path);
  const row = rows?.[0];
  if (!row?.storage_path) return null;
  const imageUrl = await signedMarketingImageUrl(row.storage_path, 1800);
  if (!imageUrl) return null;
  return { ...publicImage(row, imageUrl), image_url: imageUrl };
}

async function upsertImageRecord({ businessId, generationId, actorUserId, status, provider, model, prompt, extra = {} }) {
  const rows = await addonStorage('marketing_images?on_conflict=business_id,generation_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      business_id: businessId,
      generation_id: generationId,
      status,
      provider,
      model,
      prompt,
      created_by: actorUserId || null,
      updated_at: new Date().toISOString(),
      ...extra
    })
  });
  if (!rows?.[0]) throw imageError(503, 'Image generation state could not be saved', 'IMAGE_STATE_ERROR');
  return rows[0];
}

function imageBytes(encoded) {
  if (typeof encoded !== 'string' || encoded.length < 100) {
    throw imageError(502, 'The image provider returned an invalid image', 'IMAGE_INVALID_RESPONSE');
  }
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) {
    throw imageError(502, 'The image provider returned an invalid image', 'IMAGE_INVALID_SIZE');
  }
  return bytes;
}

async function openAiImage(prompt, config) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    signal: AbortSignal.timeout(90000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + process.env.OPENAI_API_KEY
    },
    body: JSON.stringify({
      model: config.model,
      prompt,
      size: '1024x1024',
      quality: 'low',
      output_format: 'jpeg',
      n: 1
    })
  });

  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) {
    const code = String(data?.error?.code || data?.error?.type || 'IMAGE_PROVIDER_ERROR').slice(0, 120);
    throw imageError(response.status >= 500 ? 502 : 400, 'The image provider could not create this image', code);
  }

  return {
    bytes: imageBytes(data?.data?.[0]?.b64_json),
    mimeType: 'image/jpeg',
    extension: 'jpg',
    providerImageId: typeof data?.data?.[0]?.id === 'string' ? data.data[0].id.slice(0, 300) : null
  };
}

async function cloudflareImage(prompt, config) {
  if (!/^@cf\/[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(config.model)) {
    throw imageError(503, 'Cloudflare image generation is not configured', 'IMAGE_PROVIDER_NOT_CONFIGURED');
  }
  const endpoint = 'https://api.cloudflare.com/client/v4/accounts/'
    + encodeURIComponent(config.accountId)
    + '/ai/run/'
    + config.model;
  const response = await fetch(endpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(90000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN
    },
    body: JSON.stringify({ prompt: prompt.slice(0, 2048), steps: 4 })
  });

  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok || data?.success === false) {
    const providerError = Array.isArray(data?.errors) ? data.errors[0] : null;
    const code = String(providerError?.code || 'CLOUDFLARE_IMAGE_PROVIDER_ERROR').slice(0, 120);
    throw imageError(response.status >= 500 ? 502 : 400, 'The image provider could not create this image', code);
  }

  const encoded = data?.result?.image
    || data?.image
    || (typeof data?.result === 'string' ? data.result : null);

  return {
    bytes: imageBytes(encoded),
    mimeType: 'image/jpeg',
    extension: 'jpg',
    providerImageId: null
  };
}

async function generateProviderImage(prompt, config) {
  if (config.provider === 'cloudflare') return cloudflareImage(prompt, config);
  if (config.provider === 'openai') return openAiImage(prompt, config);
  throw imageError(503, 'Live image generation is not configured', 'IMAGE_PROVIDER_NOT_CONFIGURED');
}

function generationMarketingInput(generation) {
  return {
    content_type: generation.content_type,
    platform: generation.platform,
    tone: generation.tone,
    prompt: generation.request_text,
    extra_instructions: generation.extra_instructions || ''
  };
}

async function refreshDraftCopyFromPhoto({ businessId, actorUserId, generation, visualContext }) {
  if (!visualContext) return null;
  const input = generationMarketingInput(generation);
  const facts = await marketingContext(businessId, input.prompt + ' ' + visualContext);
  const requestHash = createHash('sha256')
    .update(JSON.stringify({ input, visual_context: visualContext, source_generation_id: generation.id }))
    .digest('hex');
  const reservation = await addonStorage('rpc/reserve_marketing_generation', {
    method: 'POST',
    body: JSON.stringify({
      p_business_id: businessId,
      p_actor_user_id: actorUserId,
      p_request: input,
      p_request_hash: requestHash
    })
  });
  if (!reservation?.allowed) {
    const code = reservation?.reason === 'allowance' ? 'MARKETING_ALLOWANCE_REACHED' : 'MARKETING_PHOTO_COPY_LIMITED';
    const status = reservation?.reason === 'entitlement' || reservation?.reason === 'membership' ? 403 : 429;
    throw imageError(status, 'Photo uploaded, but the caption could not be refreshed right now', code);
  }

  let completed = false;
  try {
    const generated = await generateMarketing(input, facts, { visualContext });
    const now = new Date().toISOString();
    await addonStorage(
      'marketing_generations?id=eq.' + encodeURIComponent(reservation.id) + '&business_id=eq.' + encodeURIComponent(businessId),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          status: 'completed',
          output: generated.output,
          edited_output: null,
          approval_status: 'draft',
          approved_at: null,
          approved_by: null,
          model: generated.model,
          provider_response_id: generated.provider_response_id,
          usage: generated.usage,
          completed_at: now,
          updated_at: now,
          deleted_at: now
        })
      }
    );
    completed = true;
    await addonStorage(
      'marketing_generations?business_id=eq.' + encodeURIComponent(businessId) + '&id=eq.' + encodeURIComponent(generation.id),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          output: generated.output,
          edited_output: null,
          approval_status: 'draft',
          approved_at: null,
          approved_by: null,
          model: generated.model,
          provider_response_id: generated.provider_response_id,
          usage: generated.usage,
          updated_at: now
        })
      }
    );
    return {
      id: generation.id,
      content_type: generation.content_type,
      platform: generation.platform,
      tone: generation.tone,
      request_text: generation.request_text,
      extra_instructions: generation.extra_instructions || '',
      status: 'completed',
      approval_status: 'draft',
      output: generated.output,
      created_at: generation.created_at,
      updated_at: now,
      approved_at: null
    };
  } catch (error) {
    if (reservation?.id && !completed) {
      try {
        const now = new Date().toISOString();
        await addonStorage(
          'marketing_generations?id=eq.' + encodeURIComponent(reservation.id) + '&business_id=eq.' + encodeURIComponent(businessId),
          {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ status: 'failed', completed_at: now, updated_at: now, deleted_at: now })
          }
        );
      } catch {}
    }
    throw error;
  }
}

export async function prepareMarketingPhotoUpload({ businessId, generationId, fileName, mimeType, sizeBytes }) {
  await requireAddon(businessId, 'ai_marketing');
  await generationRow(businessId, generationId);
  const input = validateMarketingPhotoUpload({ fileName, mimeType, sizeBytes });
  const path = businessId + '/' + generationId + '/uploads/' + randomUUID() + '.' + input.extension;
  const signed = await createMarketingSignedUpload(path);
  return {
    bucket: BUCKET,
    path: signed.path,
    token: signed.token,
    file_name: input.fileName,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes
  };
}

export async function finalizeMarketingPhotoUpload({ businessId, actorUserId, generationId, path, fileName, mimeType, sizeBytes }) {
  await requireAddon(businessId, 'ai_marketing');
  const generation = await generationRow(businessId, generationId);
  const input = validateMarketingPhotoUpload({ fileName, mimeType, sizeBytes });
  const expectedPrefix = businessId + '/' + generationId + '/uploads/';
  if (typeof path !== 'string' || !path.startsWith(expectedPrefix) || !/\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path)) {
    throw imageError(400, 'Invalid private photo upload', 'PHOTO_UPLOAD_INVALID_PATH');
  }

  let bytes;
  try {
    bytes = await downloadMarketingObject(path);
    if (bytes.length !== input.sizeBytes) throw imageError(400, 'Uploaded photo size does not match the prepared upload', 'PHOTO_UPLOAD_SIZE_MISMATCH');
    if (detectedPhotoMime(bytes) !== input.mimeType) throw imageError(400, 'The uploaded file is not a valid supported photo', 'PHOTO_UPLOAD_INVALID_CONTENT');
  } catch (error) {
    await removeMarketingObject(path).catch(() => null);
    throw error;
  }

  let visualContext = null;
  try {
    visualContext = await analyseMarketingPhoto(bytes, input.mimeType);
  } catch (error) {
    logOperationalEvent('marketing.photo_analysis_failed', { generation_id: generationId, code: String(error?.code || 'PHOTO_ANALYSIS_FAILED').slice(0, 120) });
  }

  const previousRows = await addonStorage(
    'marketing_images?business_id=eq.' + encodeURIComponent(businessId)
    + '&generation_id=eq.' + encodeURIComponent(generationId)
    + '&select=id,storage_path,provider&limit=1'
  );
  const previousPath = previousRows?.[0]?.storage_path || null;
  let row;
  try {
    row = await upsertImageRecord({
      businessId,
      generationId,
      actorUserId,
      status: 'completed',
      provider: 'upload',
      model: visualContext ? 'gpt-5.6-luna' : 'owner-upload',
      prompt: visualContext
        ? ('Owner-uploaded marketing photo. AI visual context: ' + visualContext).slice(0, 8000)
        : 'Owner-uploaded marketing photo.',
      extra: {
        storage_path: path,
        mime_type: input.mimeType,
        width: null,
        height: null,
        provider_image_id: null,
        completed_at: new Date().toISOString(),
        failure_code: null,
        failure_message: null
      }
    });
  } catch (error) {
    await removeMarketingObject(path).catch(() => null);
    throw error;
  }

  const now = new Date().toISOString();
  await addonStorage(
    'marketing_generations?business_id=eq.' + encodeURIComponent(businessId) + '&id=eq.' + encodeURIComponent(generationId),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ approval_status: 'draft', approved_at: null, approved_by: null, updated_at: now })
    }
  );

  if (previousPath && previousPath !== path) await removeMarketingObject(previousPath).catch(() => null);

  let refreshedGeneration = null;
  let copyRefreshError = null;
  if (visualContext) {
    try {
      refreshedGeneration = await refreshDraftCopyFromPhoto({
        businessId,
        actorUserId,
        generation,
        visualContext
      });
    } catch (error) {
      copyRefreshError = String(error?.message || 'The photo was attached, but the caption could not be refreshed.').slice(0, 240);
      logOperationalEvent('marketing.photo_copy_refresh_failed', { generation_id: generationId, code: String(error?.code || 'PHOTO_COPY_REFRESH_FAILED').slice(0, 120) });
    }
  }

  const signedUrl = row?.storage_path ? await signedMarketingImageUrl(row.storage_path, 3600).catch(() => null) : null;
  logOperationalEvent('marketing.photo_uploaded', { generation_id: generationId, analysed: Boolean(visualContext), copy_refreshed: Boolean(refreshedGeneration) });
  return {
    image: publicImage(row, signedUrl),
    generation: refreshedGeneration,
    analysed: Boolean(visualContext),
    copy_refreshed: Boolean(refreshedGeneration),
    copy_refresh_error: copyRefreshError
  };
}

export async function removeMarketingImage({ businessId, generationId }) {
  await requireAddon(businessId, 'ai_marketing');
  await generationRow(businessId, generationId);
  const rows = await addonStorage(
    'marketing_images?business_id=eq.' + encodeURIComponent(businessId)
    + '&generation_id=eq.' + encodeURIComponent(generationId)
    + '&select=id,storage_path,provider&limit=1'
  );
  const row = rows?.[0];
  if (!row) return { removed: false };
  if (row.storage_path) await removeMarketingObject(row.storage_path);
  await addonStorage(
    'marketing_images?business_id=eq.' + encodeURIComponent(businessId) + '&generation_id=eq.' + encodeURIComponent(generationId),
    { method: 'DELETE' }
  );
  await addonStorage(
    'marketing_generations?business_id=eq.' + encodeURIComponent(businessId) + '&id=eq.' + encodeURIComponent(generationId),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ approval_status: 'draft', approved_at: null, approved_by: null, updated_at: new Date().toISOString() })
    }
  );
  return { removed: true, provider: row.provider };
}

async function reserveImageUsage(businessId, generationId) {
  const reservation = await addonStorage('rpc/reserve_marketing_image_usage', {
    method: 'POST',
    body: JSON.stringify({
      p_business_id: businessId,
      p_generation_id: generationId
    })
  });
  if (reservation?.allowed) return reservation;
  if (reservation?.reason === 'daily_limit') {
    const limit = Math.max(1, Number(reservation?.limit) || 3);
    throw imageError(
      429,
      'Daily AI image limit reached (' + limit + ' per 24 hours)',
      'MARKETING_IMAGE_DAILY_LIMIT_REACHED'
    );
  }
  throw imageError(503, 'Image usage could not be reserved', 'IMAGE_USAGE_RESERVATION_FAILED');
}

export async function generateMarketingImage({ businessId, actorUserId, generationId }) {
  await requireAddon(businessId, 'ai_marketing');
  const generation = await generationRow(businessId, generationId);
  const facts = await marketingContext(businessId, generation.request_text || '');
  const prompt = buildMarketingImagePrompt(generation, facts);
  const config = imageGenerationConfiguration();

  if (config.mode === 'simulate') {
    const row = await upsertImageRecord({
      businessId,
      generationId,
      actorUserId,
      status: 'simulated',
      provider: 'simulation',
      model: config.model,
      prompt,
      extra: {
        storage_path: null,
        mime_type: null,
        width: 1024,
        height: 1024,
        completed_at: new Date().toISOString(),
        failure_code: null,
        failure_message: null
      }
    });
    logOperationalEvent('marketing.image_simulated', { generation_id: generationId });
    return publicImage(row, null);
  }

  if (!config.configured) throw imageError(503, 'Live image generation is not configured', 'IMAGE_PROVIDER_NOT_CONFIGURED');

  await reserveImageUsage(businessId, generationId);

  const pending = await upsertImageRecord({
    businessId,
    generationId,
    actorUserId,
    status: 'pending',
    provider: config.provider,
    model: config.model,
    prompt,
    extra: {
      storage_path: null,
      mime_type: null,
      completed_at: null,
      failure_code: null,
      failure_message: null
    }
  });

  try {
    const generated = await generateProviderImage(prompt, config);
    const path = businessId + '/' + generationId + '/' + (pending.id || randomUUID()) + '.' + generated.extension;
    await uploadImage(path, generated.bytes, generated.mimeType);

    const now = new Date().toISOString();
    const rows = await addonStorage(
      'marketing_images?business_id=eq.' + encodeURIComponent(businessId) + '&generation_id=eq.' + encodeURIComponent(generationId),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'completed',
          storage_path: path,
          mime_type: generated.mimeType,
          width: 1024,
          height: 1024,
          provider_image_id: generated.providerImageId,
          completed_at: now,
          updated_at: now,
          failure_code: null,
          failure_message: null
        })
      }
    );

    const row = rows?.[0];
    await addonStorage(
      'marketing_generations?business_id=eq.' + encodeURIComponent(businessId) + '&id=eq.' + encodeURIComponent(generationId),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          approval_status: 'draft',
          approved_at: null,
          approved_by: null,
          updated_at: now
        })
      }
    );
    const url = row?.storage_path ? await signedMarketingImageUrl(row.storage_path, 3600).catch(() => null) : null;
    logOperationalEvent('marketing.image_completed', { generation_id: generationId, provider: config.provider, model: config.model });
    return publicImage(row, url);
  } catch (error) {
    const code = String(error?.code || 'IMAGE_GENERATION_FAILED').slice(0, 120);
    const message = String(error?.message || 'Image generation failed').slice(0, 500);
    try {
      await addonStorage(
        'marketing_images?business_id=eq.' + encodeURIComponent(businessId) + '&generation_id=eq.' + encodeURIComponent(generationId),
        {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            status: 'failed',
            failure_code: code,
            failure_message: message,
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          })
        }
      );
    } catch {}
    logOperationalEvent('marketing.image_failed', { generation_id: generationId, code });
    throw error;
  }
}
