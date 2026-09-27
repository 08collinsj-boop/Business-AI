import { randomUUID } from 'node:crypto';
import { addonError, addonStorage, requireAddon } from './addons.js';
import { marketingContext } from './marketing.js';
import { logOperationalEvent } from './operational-log.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUCKET = 'marketing-images';

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
    + '&select=id,business_id,content_type,platform,tone,request_text,output,edited_output,approval_status&limit=1';
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
