import { createHash, randomUUID } from 'node:crypto';
import { addonError, addonStorage, requireAddon } from './addons.js';
import { marketingBrandVoiceContext, marketingContext, marketingStyleContext, generateMarketing, validateMarketingBrandVoice, validateMarketingInput } from './marketing.js';
import { generateMarketingImage, imageGenerationConfiguration } from './marketing-image.js';
import { claimPublication, createPublication, processPublication } from './marketing-publication.js';
import { metaConfiguration, selectedMetaAccount } from './meta.js';
import { recordAuditEvent } from './audit.js';
import { attachAutomationPostPhoto, automationMediaContext } from './marketing-automation-media.js';
import { assertIncidentFeatureAvailable } from './incident-controls.js';
import { isMarketingAutopublishPermitted } from './marketing-safety.js';

const MODES = new Set(['approval_required', 'fully_automated']);
const TONES = new Set(['professional', 'friendly', 'casual', 'promotional']);
const MARKETING_GOALS = new Set(['more_enquiries', 'promote_service', 'show_work', 'build_trust', 'helpful_advice', 'share_offer']);
const MARKETING_PILLARS = Object.freeze(['services', 'completed_work', 'advice', 'trust', 'offers']);
const AUTOMATION_ANGLES = Object.freeze([
  {
    key: 'services',
    brief: 'Focus on one approved service or product and explain it clearly without inventing benefits, pricing or availability.'
  },
  {
    key: 'completed_work',
    brief: 'Focus on approved evidence of recent or completed work when it exists. If no completed-work fact is approved, use a specific approved service fact instead.'
  },
  {
    key: 'advice',
    brief: 'Share one useful customer-helpful tip that is directly supported by approved Business Knowledge. Do not add general industry advice that is not in the trusted facts.'
  },
  {
    key: 'trust',
    brief: 'Highlight one approved trust-building business fact such as a service area, opening detail, qualification or process. Do not invent reputation claims, ratings or experience.'
  },
  {
    key: 'offers',
    brief: 'Use an approved current offer only if one is present in trusted facts. If no approved offer exists, promote an approved service without implying a discount or limited-time deal.'
  },
  {
    key: 'business_knowledge',
    brief: 'Choose a specific useful fact from approved Business Knowledge that has not been the recent focus and turn it into a clear Facebook post.'
  }
]);

export function marketingAutomationIntervalMs(postsPerDay = 1) {
  const value = Number(postsPerDay);
  const safe = Number.isInteger(value) && value >= 1 && value <= 3 ? value : 1;
  return Math.round((24 * 60 * 60 * 1000) / safe);
}

export function nextMarketingAutomationAngle(lastAngle = null) {
  const index = AUTOMATION_ANGLES.findIndex(item => item.key === lastAngle);
  return AUTOMATION_ANGLES[(index + 1) % AUTOMATION_ANGLES.length];
}

export function isMarketingAutomationDue(settings, nowMs = Date.now()) {
  if (!settings?.enabled) return false;
  if (!settings.last_run_at) return true;
  const lastRun = Date.parse(settings.last_run_at);
  if (!Number.isFinite(lastRun)) return true;
  return lastRun <= nowMs - marketingAutomationIntervalMs(settings.posts_per_day);
}

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
  posts_per_day: 1,
  last_run_at: null,
  last_status: null,
  last_error_code: null,
  last_generation_id: null,
  last_content_angle: null,
  strategy: null,
  weekly_plan: []
});

function publicSettings(row) {
  const postsPerDay = Number(row?.posts_per_day);
  const lastContentAngle = AUTOMATION_ANGLES.some(item => item.key === row?.last_content_angle)
    ? row.last_content_angle
    : null;
  return {
    ...defaultSettings,
    ...(row || {}),
    enabled: row?.enabled === true,
    image_enabled: row?.image_enabled === true,
    posts_per_day: Number.isInteger(postsPerDay) && postsPerDay >= 1 && postsPerDay <= 3 ? postsPerDay : 1,
    last_content_angle: lastContentAngle
  };
}

export async function getMarketingAutomationSettings(businessId) {
  await requireAddon(businessId, 'ai_marketing');
  const rows = await addonStorage(
    'marketing_automation_settings?business_id=eq.' + encodeURIComponent(businessId)
    + '&select=business_id,enabled,mode,platform,tone,image_enabled,cadence,posts_per_day,last_run_at,last_status,last_error_code,last_generation_id,last_content_angle,strategy,weekly_plan,created_at,updated_at&limit=1'
  );
  return publicSettings(rows?.[0]);
}

export function validateMarketingAutomationUpdate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw automationError(400, 'Invalid automation settings');
  }
  const allowed = new Set(['enabled', 'mode', 'tone', 'image_enabled', 'posts_per_day']);
  if (Object.keys(value).some(key => !allowed.has(key))) {
    throw automationError(400, 'Invalid automation settings');
  }
  if (typeof value.enabled !== 'boolean' || typeof value.image_enabled !== 'boolean') {
    throw automationError(400, 'Invalid automation settings');
  }
  if (!MODES.has(value.mode) || !TONES.has(value.tone)) {
    throw automationError(400, 'Invalid automation settings');
  }
  const postsPerDay = Number(value.posts_per_day);
  if (!Number.isInteger(postsPerDay) || postsPerDay < 1 || postsPerDay > 3) {
    throw automationError(400, 'Choose between 1 and 3 automated posts per day');
  }
  return {
    enabled: value.enabled,
    mode: value.mode,
    tone: value.tone,
    image_enabled: value.image_enabled,
    posts_per_day: postsPerDay
  };
}


export function validateMarketingStrategy(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw automationError(400, 'Invalid Marketing strategy');
  }
  const allowed = new Set(['primary_goal', 'posts_per_week', 'preferred_time', 'pillars', 'brand_voice']);
  if (Object.keys(value).some(key => !allowed.has(key))) {
    throw automationError(400, 'Invalid Marketing strategy');
  }
  const goal = String(value.primary_goal || 'more_enquiries');
  if (!MARKETING_GOALS.has(goal)) throw automationError(400, 'Choose a valid Marketing goal');
  const postsPerWeek = Number(value.posts_per_week);
  if (!Number.isInteger(postsPerWeek) || postsPerWeek < 2 || postsPerWeek > 7) {
    throw automationError(400, 'Choose between 2 and 7 posts per week');
  }
  const preferredTime = String(value.preferred_time || '18:30');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime)) throw automationError(400, 'Choose a valid posting time');
  if (!value.pillars || typeof value.pillars !== 'object' || Array.isArray(value.pillars)) {
    throw automationError(400, 'Choose a valid content mix');
  }
  if (Object.keys(value.pillars).some(key => !MARKETING_PILLARS.includes(key))) {
    throw automationError(400, 'Choose a valid content mix');
  }
  const pillars = {};
  let total = 0;
  for (const key of MARKETING_PILLARS) {
    const amount = Number(value.pillars[key]);
    if (!Number.isInteger(amount) || amount < 0 || amount > 100) throw automationError(400, 'Content pillar percentages must be whole numbers from 0 to 100');
    pillars[key] = amount;
    total += amount;
  }
  if (total !== 100) throw automationError(400, 'Content pillar percentages must total 100%');
  const brandVoice = validateMarketingBrandVoice(value.brand_voice || null);
  return { primary_goal: goal, posts_per_week: postsPerWeek, preferred_time: preferredTime, pillars, brand_voice: brandVoice };
}

export function validateMarketingWeeklyPlan(value) {
  if (!Array.isArray(value) || value.length > 7) throw automationError(400, 'Invalid weekly Marketing plan');
  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw automationError(400, 'Invalid weekly Marketing plan');
    const allowed = new Set(['date', 'time', 'pillar', 'goal', 'title', 'prompt']);
    if (Object.keys(item).some(key => !allowed.has(key))) throw automationError(400, 'Invalid weekly Marketing plan');
    const date = String(item.date || '');
    const time = String(item.time || '');
    const pillar = String(item.pillar || '');
    const goal = String(item.goal || '');
    const title = String(item.title || '').trim();
    const prompt = String(item.prompt || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw automationError(400, 'Weekly plan contains an invalid date or time');
    if (!MARKETING_PILLARS.includes(pillar) || !MARKETING_GOALS.has(goal)) throw automationError(400, 'Weekly plan contains an invalid content type');
    if (!title || title.length > 120 || !prompt || prompt.length > 1200) throw automationError(400, 'Weekly plan contains invalid content');
    return { date, time, pillar, goal, title, prompt, order: index + 1 };
  }).map(({ order, ...item }) => item);
}

export async function saveMarketingPlanning({ businessId, actorUserId, strategy, weeklyPlan }) {
  await requireAddon(businessId, 'ai_marketing');
  const cleanStrategy = validateMarketingStrategy(strategy);
  const cleanPlan = validateMarketingWeeklyPlan(weeklyPlan);
  const now = new Date().toISOString();
  const existing = await addonStorage('marketing_automation_settings?business_id=eq.' + encodeURIComponent(businessId) + '&select=business_id&limit=1');
  let rows;
  if (existing?.[0]) {
    rows = await addonStorage('marketing_automation_settings?business_id=eq.' + encodeURIComponent(businessId), {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ strategy: cleanStrategy, weekly_plan: cleanPlan, updated_by: actorUserId, updated_at: now })
    });
  } else {
    rows = await addonStorage('marketing_automation_settings', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ business_id: businessId, strategy: cleanStrategy, weekly_plan: cleanPlan, created_by: actorUserId, updated_by: actorUserId, updated_at: now })
    });
  }
  if (!rows?.[0]) throw automationError(503, 'Marketing strategy could not be saved', 'MARKETING_STRATEGY_STORAGE_ERROR');
  await recordAuditEvent({
    businessId, actorUserId, action: 'marketing.strategy_updated', resourceType: 'marketing_automation', resourceId: businessId,
    metadata: { primary_goal: cleanStrategy.primary_goal, posts_per_week: cleanStrategy.posts_per_week, planned_posts: cleanPlan.length }
  });
  return publicSettings(rows[0]);
}

export async function saveMarketingAutomationSettings({ businessId, actorUserId, input }) {
  await requireAddon(businessId, 'ai_marketing');
  const requested = validateMarketingAutomationUpdate(input);
  // Disabling should never retain a latent fully-automated mode that a future
  // single toggle could reactivate without the owner reselecting it.
  const settings = requested.enabled ? requested : { ...requested, mode: 'approval_required' };

  if (settings.enabled && settings.mode === 'fully_automated') {
    if (!isMarketingAutopublishPermitted(settings)) {
      throw automationError(409, 'Fully automated publishing is disabled on this Pilot', 'AUTOPUBLISH_DISABLED');
    }
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
      posts_per_day: settings.posts_per_day,
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
      tone: settings.tone,
      posts_per_day: settings.posts_per_day
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

async function createAutomationGeneration({ businessId, actorUserId, tone, angle, mediaContext = null }) {
  const selectedAngle = angle && AUTOMATION_ANGLES.some(item => item.key === angle.key)
    ? angle
    : nextMarketingAutomationAngle(null);
  const input = validateMarketingInput({
    content_type: 'social_post',
    platform: 'facebook',
    tone,
    prompt: `Create today's Facebook post using only trusted business information and approved Business Knowledge. Content angle: ${selectedAngle.brief} Do not invent a discount, price, event, availability, testimonial or limited-time offer.`,
    extra_instructions: `Keep the post fresh, natural and specific to this business. This automation run is using the ${selectedAngle.key.replaceAll('_', ' ')} content angle. Match the established brand voice when previous published posts are available, but do not copy them or reuse their facts as evidence. Prefer wording, structure and a hook that differ from recent posts. If the selected angle is not supported by trusted facts, use the closest factual approved angle without inventing anything.`
  });

  const [facts, styleContext, brandVoice, resolvedMediaContext] = await Promise.all([
    marketingContext(businessId, input.prompt),
    marketingStyleContext(businessId),
    marketingBrandVoiceContext(businessId),
    mediaContext ? Promise.resolve(mediaContext) : automationMediaContext(businessId).catch(() => ({ post: null, inspiration_context: '', inspiration_ids: [] }))
  ]);
  const requestHash = createHash('sha256')
    .update(JSON.stringify({
      ...input,
      automation_day: new Date().toISOString().slice(0, 10),
      automation_angle: selectedAngle.key,
      post_media_id: resolvedMediaContext?.post?.id || null,
      inspiration_ids: resolvedMediaContext?.inspiration_ids || []
    }))
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
    const status = ['rate_limit', 'daily_limit', 'allowance'].includes(reservation?.reason) ? 429 : 403;
    throw automationError(
      status,
      reservation?.reason === 'allowance'
        ? 'AI Marketing allowance has been reached'
        : reservation?.reason === 'daily_limit'
          ? 'Daily AI Marketing draft limit has been reached'
          : reservation?.reason === 'rate_limit'
            ? 'Marketing automation is temporarily rate limited'
            : 'AI Marketing access is unavailable',
      'AUTOMATION_RESERVATION_DENIED'
    );
  }

  let completed = false;
  try {
    const generated = await generateMarketing(input, facts, {
      automated: true,
      styleContext,
      brandVoice,
      visualContext: resolvedMediaContext?.post?.visual_context || ''
    });
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
      metadata: { platform: 'facebook', model: generated.model, content_angle: selectedAngle.key }
    });
    return { id: reservation.id, input, output: generated.output, media_context: resolvedMediaContext, automation_angle: selectedAngle.key };
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
    if (error?.code === 'MARKETING_GROUNDING_REJECTED') {
      await recordAuditEvent({
        businessId, actorUserId,
        action: 'marketing.automation_grounding_rejected',
        resourceType: 'marketing_generation', resourceId: reservation.id,
        metadata: { error_code: error.code, grounding_categories: (error.groundingCategories || []).join(',').slice(0, 200) }
      });
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
  await assertIncidentFeatureAvailable(businessId, 'marketing_generation');
  // Force bypasses cadence only, never the persisted owner kill switch.
  // A scheduler snapshot can become stale while work is queued.
  const current = await getMarketingAutomationSettings(businessId);
  if (!current.enabled) return { skipped: true, reason: 'disabled' };

  const actorUserId = await ownerUserId(businessId);
  let generation = null;

  try {
    const contentAngle = nextMarketingAutomationAngle(current.last_content_angle);
    generation = await createAutomationGeneration({
      businessId,
      actorUserId,
      tone: current.tone,
      angle: contentAngle
    });

    let image = null;
    if (current.image_enabled) {
      try {
        image = generation.media_context?.post?.id
          ? await attachAutomationPostPhoto({
              businessId,
              actorUserId,
              generationId: generation.id,
              mediaId: generation.media_context.post.id
            })
          : await generateMarketingImage({
              businessId,
              actorUserId,
              generationId: generation.id,
              inspirationContext: generation.media_context?.inspiration_context || ''
            });
      } catch (error) {
        if (current.mode === 'fully_automated' && (generation.media_context?.post?.id || imageGenerationConfiguration().mode === 'live')) {
          throw error;
        }
      }
    }

    // The owner can pause automation while the AI provider is generating.
    // Never auto-approve on the strength of a stale settings snapshot.
    const latest = await getMarketingAutomationSettings(businessId);
    const automaticAllowed = current.mode === 'fully_automated'
      && isMarketingAutopublishPermitted(latest);
    if (!automaticAllowed) {
      if (!latest.enabled || latest.mode !== current.mode) {
        await recordAuditEvent({
          businessId, actorUserId, action: 'marketing.automation_halted',
          resourceType: 'marketing_generation', resourceId: generation.id,
          metadata: { reason: !latest.enabled ? 'paused' : 'mode_changed' }
        });
      }
      const now = new Date().toISOString();
      await updateRunState(businessId, {
        last_run_at: now,
        last_status: 'draft_created',
        last_error_code: null,
        last_generation_id: generation.id,
        last_content_angle: generation.automation_angle
      });
      return {
        status: 'draft_created',
        generation_id: generation.id,
        image,
        approval_required: true,
        halted: !latest.enabled ? 'paused' : (latest.mode !== current.mode ? 'mode_changed' : null),
        content_angle: generation.automation_angle
      };
    }

    const meta = metaConfiguration();
    if (!meta.configured || !meta.publishEnabled) {
      throw automationError(409, 'Facebook publishing is not configured', 'META_NOT_READY');
    }
    await selectedMetaAccount(businessId, 'facebook');
    if (!isMarketingAutopublishPermitted(await getMarketingAutomationSettings(businessId))) {
      throw automationError(409, 'Automatic publishing was paused before approval', 'AUTOPUBLISH_PAUSED');
    }

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
      requestId: randomUUID(),
      isAutomated: true
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
      last_generation_id: generation.id,
      last_content_angle: generation.automation_angle
    });

    return {
      status: 'published',
      generation_id: generation.id,
      publication_id: result.id,
      provider_post_id: result.provider_post_id || null,
      image,
      approval_required: false,
      content_angle: generation.automation_angle
    };
  } catch (error) {
    if (error?.code === 'AUTOPUBLISH_PAUSED' && generation?.id) {
      // A blocked automatic post remains a draft for explicit owner review.
      try {
        await addonStorage(
          'marketing_generations?business_id=eq.' + encodeURIComponent(businessId)
          + '&id=eq.' + encodeURIComponent(generation.id),
          {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({
              approval_status: 'draft', approved_at: null,
              approved_by: null, updated_at: new Date().toISOString()
            })
          }
        );
      } catch {}
    }
    try {
      await updateRunState(businessId, {
        last_run_at: new Date().toISOString(),
        last_status: 'failed',
        last_error_code: String(error?.code || 'AUTOMATION_FAILED').slice(0, 120),
        last_generation_id: generation?.id || current.last_generation_id || null,
        last_content_angle: generation?.automation_angle || current.last_content_angle || null
      });
    } catch {}
    throw error;
  }
}

export async function runDueMarketingAutomations(limit = 10) {
  const rows = await addonStorage(
    'marketing_automation_settings?enabled=eq.true'
    + '&select=business_id,enabled,mode,platform,tone,image_enabled,cadence,posts_per_day,last_run_at,last_status,last_error_code,last_generation_id,last_content_angle'
    + '&order=updated_at.asc&limit=' + Math.max(1, Math.min(25, Number(limit) || 10))
  );
  const nowMs = Date.now();
  const due = (Array.isArray(rows) ? rows : []).filter(row => isMarketingAutomationDue(publicSettings(row), nowMs));
  const results = [];
  for (const row of due) {
    try {
      const result = await runMarketingAutomation({
        businessId: row.business_id,
        settings: publicSettings(row),
        force: false
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
