import { createHash, randomUUID } from 'node:crypto';
import { addonError, addonStorage, requireAddon } from './addons.js';
import { marketingContext, generateMarketing, validateMarketingInput } from './marketing.js';
import { generateMarketingImage, imageGenerationConfiguration } from './marketing-image.js';
import { claimPublication, createPublication, processPublication } from './marketing-publication.js';
import { metaConfiguration, selectedMetaAccount } from './meta.js';
import { recordAuditEvent } from './audit.js';

const MODES = new Set(['approval_required', 'fully_automated']);
const TONES = new Set(['professional', 'friendly', 'casual', 'promotional']);

function automationError(status, message, code = 'MARKETING_AUTOMATION_ERROR') {
  const error = addonError(status, message);
  error.code = code;
  return error;
}

const defaultSettings = Object.freeze({
  enabled: false,
  mode: 'approval_required',
  platform: 'facebook',
  tone: 'friendly',
  image_enabled: false,
  cadence: 'daily',
  last_run_at: null,
  last_status: null,
  last_error_code: null,
  last_generation_id: null
});

function publicSettings(row) {
  return {
    ...defaultSettings,
    ...(row || {}),
    enabled: row?.enabled === true,
    image_enabled: row?.image_enabled === true
  };
}

export async function getMarketingAutomationSettings(businessId) {
  await requireAddon(businessId, 'ai_marketing');
  const rows = await addonStorage(
    'marketing_automation_settings?business_id=eq.' + encodeURIComponent(businessId)
    + '&select=business_id,enabled,mode,platform,tone,image_enabled,cadence,last_run_at,last_status,last_error_code,last_generation_id,created_at,updated_at&limit=1'
  );
  return publicSettings(rows?.[0]);
}

export function validateMarketingAutomationUpdate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw automationError(400, 'Invalid automation settings');
  }
  const allowed = new Set(['enabled', 'mode', 'tone', 'image_enabled']);
  if (Object.keys(value).some(key => !allowed.has(key))) {
    throw automationError(400, 'Invalid automation settings');
  }
  if (typeof value.enabled !== 'boolean' || typeof value.image_enabled !== 'boolean') {
    throw automationError(400, 'Invalid automation settings');
  }
  if (!MODES.has(value.mode) || !TONES.has(value.tone)) {
    throw automationError(400, 'Invalid automation settings');
  }
  return {
    enabled: value.enabled,
    mode: value.mode,
    tone: value.tone,
    image_enabled: value.image_enabled
  };
}

export async function saveMarketingAutomationSettings({ businessId, actorUserId, input }) {
  await requireAddon(businessId, 'ai_marketing');
  const settings = validateMarketingAutomationUpdate(input);

  if (settings.enabled && settings.mode === 'fully_automated') {
    const config = metaConfiguration();
    if (!config.configured || !config.publishEnabled) {
      throw automationError(
        409,
        'Facebook publishing must be configured before fully automated mode can be enabled',
        'META_NOT_READY'
      );
    }
    await selectedMetaAccount(businessId, 'facebook');
  }

  const now = new Date().toISOString();
  const rows = await addonStorage('marketing_automation_settings?on_conflict=business_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      business_id: businessId,
      enabled: settings.enabled,
      mode: settings.mode,
      platform: 'facebook',
      tone: settings.tone,
      image_enabled: settings.image_enabled,
      cadence: 'daily',
      created_by: actorUserId,
      updated_by: actorUserId,
      updated_at: now
    })
  });
  if (!rows?.[0]) throw automationError(503, 'Automation settings could not be saved', 'AUTOMATION_STORAGE_ERROR');

  await recordAuditEvent({
    businessId,
    actorUserId,
    action: 'marketing.automation_settings_updated',
    resourceType: 'marketing_automation',
    resourceId: businessId,
    metadata: {
      enabled: settings.enabled,
      mode: settings.mode,
      image_enabled: settings.image_enabled,
      tone: settings.tone
    }
  });

  return publicSettings(rows[0]);
}

async function ownerUserId(businessId) {
  const rows = await addonStorage(
    'business_memberships?business_id=eq.' + encodeURIComponent(businessId)
    + '&role=eq.owner&select=user_id&limit=1'
  );
  const id = rows?.[0]?.user_id;
  if (!id) throw automationError(409, 'A business owner is required for Marketing automation', 'OWNER_REQUIRED');
  return id;
}

async function createAutomationGeneration({ businessId, actorUserId, tone }) {
  const input = validateMarketingInput({
    content_type: 'social_post',
    platform: 'facebook',
    tone,
    prompt: 'Create today\'s Facebook post using only trusted business information. Choose one useful real service, business update or customer-helpful angle. Do not invent a discount, price, event, availability, testimonial or limited-time offer.',
    extra_instructions: 'Keep the post fresh and useful. If there is not enough information for a specific promotion, write a general factual business post instead.'
  });

  const facts = await marketingContext(businessId, input.prompt);
  const requestHash = createHash('sha256')
    .update(JSON.stringify({ ...input, automation_day: new Date().toISOString().slice(0, 10) }))
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
    const status = reservation?.reason === 'rate_limit' || reservation?.reason === 'allowance' ? 429 : 403;
    throw automationError(
      status,
      reservation?.reason === 'allowance'
        ? 'AI Marketing allowance has been reached'
        : reservation?.reason === 'rate_limit'
          ? 'Marketing automation is temporarily rate limited'
          : 'AI Marketing access is unavailable',
      'AUTOMATION_RESERVATION_DENIED'
    );
  }

  let completed = false;
  try {
    const generated = await generateMarketing(input, facts);
    const now = new Date().toISOString();
    await addonStorage(
      'marketing_generations?id=eq.' + encodeURIComponent(reservation.id)
      + '&business_id=eq.' + encodeURIComponent(businessId),
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
          updated_at: now
        })
      }
    );
    completed = true;
    await recordAuditEvent({
      businessId,
      actorUserId,
      action: 'marketing.automation_generated',
      resourceType: 'marketing_generation',
      resourceId: reservation.id,
      metadata: { platform: 'facebook', model: generated.model }
    });
    return { id: reservation.id, input, output: generated.output };
  } catch (error) {
    if (!completed && reservation?.id) {
      try {
        await addonStorage(
          'marketing_generations?id=eq.' + encodeURIComponent(reservation.id)
          + '&business_id=eq.' + encodeURIComponent(businessId),
          {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({
              status: 'failed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          }
        );
      } catch {}
    }
    throw error;
  }
}

async function updateRunState(businessId, values) {
  await addonStorage(
    'marketing_automation_settings?business_id=eq.' + encodeURIComponent(businessId),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...values, updated_at: new Date().toISOString() })
    }
  );
}

export async function runMarketingAutomation({ businessId, settings = null, force = false }) {
  await requireAddon(businessId, 'ai_marketing');
  const current = settings || await getMarketingAutomationSettings(businessId);
  if (!current.enabled && !force) return { skipped: true, reason: 'disabled' };

  const actorUserId = await ownerUserId(businessId);
  let generation = null;

  try {
    generation = await createAutomationGeneration({
      businessId,
      actorUserId,
      tone: current.tone
    });

    let image = null;
    if (current.image_enabled) {
      try {
        image = await generateMarketingImage({
          businessId,
          actorUserId,
          generationId: generation.id
        });
      } catch (error) {
        if (current.mode === 'fully_automated' && imageGenerationConfiguration().mode === 'live') {
          throw error;
        }
      }
    }

    if (current.mode === 'approval_required') {
      const now = new Date().toISOString();
      await updateRunState(businessId, {
        last_run_at: now,
        last_status: 'draft_created',
        last_error_code: null,
        last_generation_id: generation.id
      });
      return {
        status: 'draft_created',
        generation_id: generation.id,
        image,
        approval_required: true
      };
    }

    const meta = metaConfiguration();
    if (!meta.configured || !meta.publishEnabled) {
      throw automationError(409, 'Facebook publishing is not configured', 'META_NOT_READY');
    }
    await selectedMetaAccount(businessId, 'facebook');

    const approvedAt = new Date().toISOString();
    await addonStorage(
      'marketing_generations?business_id=eq.' + encodeURIComponent(businessId)
      + '&id=eq.' + encodeURIComponent(generation.id),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          approval_status: 'approved',
          approved_at: approvedAt,
          approved_by: actorUserId,
          updated_at: approvedAt
        })
      }
    );

    await recordAuditEvent({
      businessId,
      actorUserId,
      action: 'marketing.automation_approved',
      resourceType: 'marketing_generation',
      resourceId: generation.id,
      metadata: { automatic: true }
    });

    const publication = await createPublication({
      businessId,
      actorUserId,
      generationId: generation.id,
      platform: 'facebook',
      scheduledFor: null,
      requestId: randomUUID()
    });
    if (!publication?.id) throw automationError(503, 'Automatic publication could not be created', 'PUBLICATION_CREATE_FAILED');

    const claimed = await claimPublication(businessId, publication.id);
    const result = await processPublication(claimed, actorUserId);
    if (result?.status !== 'published') {
      throw automationError(
        502,
        result?.failure_message || 'Facebook publishing failed',
        result?.failure_code || 'PUBLISH_FAILED'
      );
    }

    const now = new Date().toISOString();
    await updateRunState(businessId, {
      last_run_at: now,
      last_status: 'published',
      last_error_code: null,
      last_generation_id: generation.id
    });

    return {
      status: 'published',
      generation_id: generation.id,
      publication_id: result.id,
      provider_post_id: result.provider_post_id || null,
      image,
      approval_required: false
    };
  } catch (error) {
    try {
      await updateRunState(businessId, {
        last_run_at: new Date().toISOString(),
        last_status: 'failed',
        last_error_code: String(error?.code || 'AUTOMATION_FAILED').slice(0, 120),
        last_generation_id: generation?.id || current.last_generation_id || null
      });
    } catch {}
    throw error;
  }
}

export async function runDueMarketingAutomations(limit = 10) {
  const rows = await addonStorage(
    'marketing_automation_settings?enabled=eq.true'
    + '&select=business_id,enabled,mode,platform,tone,image_enabled,cadence,last_run_at,last_status,last_error_code,last_generation_id'
    + '&order=updated_at.asc&limit=' + Math.max(1, Math.min(25, Number(limit) || 10))
  );
  const dueBefore = Date.now() - 20 * 60 * 60 * 1000;
  const due = (Array.isArray(rows) ? rows : []).filter(row => !row.last_run_at || Date.parse(row.last_run_at) <= dueBefore);
  const results = [];
  for (const row of due) {
    try {
      const result = await runMarketingAutomation({
        businessId: row.business_id,
        settings: publicSettings(row),
        force: true
      });
      results.push({ business_id: row.business_id, ...result });
    } catch (error) {
      results.push({
        business_id: row.business_id,
        status: 'failed',
        error_code: String(error?.code || 'AUTOMATION_FAILED').slice(0, 120)
      });
    }
  }
  return results;
}
