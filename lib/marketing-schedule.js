import { addonError, addonStorage, requireAddon } from './addons.js';
import { claimPublication, createPublication, processPublication } from './marketing-publication.js';
import { deleteMetaScheduledPost, metaConfiguration, metaScheduledPostStatus, scheduleMetaText, selectedMetaAccount } from './meta.js';
import { assertFacebookDailyPostLimit } from './marketing-limits.js';

export const SCHEDULE_PLATFORMS = Object.freeze(['facebook', 'instagram', 'linkedin', 'general']);
export const SCHEDULE_STATUSES = Object.freeze(['scheduled', 'processing', 'cancelled', 'posted', 'failed']);
export const SCHEDULE_MAX_FUTURE_MS = 366 * 24 * 60 * 60 * 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function scheduleError(status, message) {
  return addonError(status, message);
}

function scheduleId(value) {
  const id = String(value || '');
  if (!UUID.test(id)) throw scheduleError(400, 'Invalid scheduled item');
  return id;
}

export function parseScheduledFor(value) {
  const date = value instanceof Date ? value : new Date(String(value || ''));
  if (!Number.isFinite(date.getTime())) throw scheduleError(400, 'Choose a valid date and time');
  if (date.getTime() <= Date.now()) throw scheduleError(400, 'Choose a future date and time');
  if (date.getTime() > Date.now() + SCHEDULE_MAX_FUTURE_MS) {
    throw scheduleError(400, 'Scheduled time is too far in the future');
  }
  return date.toISOString();
}

export function validateScheduleRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw scheduleError(400, 'Invalid schedule request');
  }
  const allowed = new Set(['action', 'generation_id', 'schedule_id', 'platform', 'scheduled_for']);
  if (Object.keys(body).some(key => !allowed.has(key))) throw scheduleError(400, 'Invalid schedule request');
  if (!['create', 'reschedule', 'cancel'].includes(body.action)) throw scheduleError(400, 'Invalid schedule request');
  if (body.action === 'create') {
    if (!UUID.test(String(body.generation_id || ''))) throw scheduleError(400, 'Choose a saved draft to schedule');
    if (!SCHEDULE_PLATFORMS.includes(body.platform)) throw scheduleError(400, 'Choose a valid platform');
    return { action: 'create', generationId: String(body.generation_id), platform: body.platform, scheduledFor: parseScheduledFor(body.scheduled_for) };
  }
  return {
    action: body.action,
    scheduleId: scheduleId(body.schedule_id),
    scheduledFor: body.action === 'reschedule' ? parseScheduledFor(body.scheduled_for) : null
  };
}

async function savedGeneration(businessId, generationId) {
  const rows = await addonStorage(
    `marketing_generations?business_id=eq.${encodeURIComponent(businessId)}` +
    `&id=eq.${encodeURIComponent(generationId)}&deleted_at=is.null&status=eq.completed` +
    `&select=id,content_type,platform,tone,request_text,output,edited_output,approval_status,created_at&limit=1`
  );
  const row = rows?.[0];
  if (!row) throw scheduleError(404, 'That draft is no longer available');
  if (row.approval_status !== 'approved') throw scheduleError(409, 'Approve this draft before scheduling it');
  return row;
}

function scheduledGenerationText(generation) {
  const output = generation?.edited_output || generation?.output || null;
  if (!output || typeof output !== 'object') throw scheduleError(409, 'Approved content is unavailable');
  const text = [
    output.main_copy,
    output.call_to_action,
    Array.isArray(output.hashtags) ? output.hashtags.join(' ') : ''
  ].filter(value => typeof value === 'string' && value.trim()).join('\n\n').trim();
  if (!text || text.length > 10000) throw scheduleError(409, 'Approved content cannot be scheduled');
  return text;
}

function publicSchedule(row, generation = null) {
  const output = generation?.edited_output || generation?.output || null;
  return {
    id: row.id,
    platform: row.platform,
    scheduled_for: row.scheduled_for,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    publication_id: row.publication_id || null,
    attempts: Number(row.attempts || 0),
    failure_code: row.failure_code || null,
    failure_message: row.failure_message || null,
    native_scheduled: row.native_scheduled === true,
    generation: generation
      ? {
          id: generation.id,
          content_type: generation.content_type,
          platform: generation.platform,
          tone: generation.tone,
          request_text: generation.request_text,
          main_copy: typeof output?.main_copy === 'string' ? output.main_copy : '',
          approval_status: generation.approval_status,
          created_at: generation.created_at
        }
      : null
  };
}

export async function listSchedules(businessId) {
  await requireAddon(businessId, 'ai_marketing');
  const [schedules, generations] = await Promise.all([
    addonStorage(
      `marketing_schedules?business_id=eq.${encodeURIComponent(businessId)}` +
      `&select=id,platform,scheduled_for,status,marketing_generation_id,publication_id,provider_post_id,native_scheduled,attempts,failure_code,failure_message,created_at,updated_at` +
      `&order=scheduled_for.asc&limit=100`
    ),
    addonStorage(
      `marketing_generations?business_id=eq.${encodeURIComponent(businessId)}` +
      `&deleted_at=is.null&status=eq.completed` +
      `&select=id,content_type,platform,tone,request_text,output,edited_output,approval_status,created_at&limit=100`
    )
  ]);
  const scheduleRows = Array.isArray(schedules) ? schedules : [];
  const dueNative = scheduleRows.filter(row =>
    row.native_scheduled === true
    && row.status === 'scheduled'
    && row.provider_post_id
    && Date.parse(row.scheduled_for) <= Date.now()
  );
  if (dueNative.length) {
    const account = await selectedMetaAccount(businessId, 'facebook').catch(() => null);
    if (account) {
      for (const row of dueNative.slice(0, 20)) {
        try {
          const state = await metaScheduledPostStatus({
            platform: 'facebook',
            account,
            providerPostId: row.provider_post_id
          });
          if (state.isPublished) {
            const now = new Date().toISOString();
            await addonStorage(
              `marketing_schedules?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(row.id)}`,
              {
                method: 'PATCH',
                headers: { Prefer: 'return=minimal' },
                body: JSON.stringify({ status: 'posted', processed_at: now, updated_at: now })
              }
            );
            row.status = 'posted';
            row.updated_at = now;
          }
        } catch {}
      }
    }
  }
  const byId = new Map((Array.isArray(generations) ? generations : []).map(row => [row.id, row]));
  return scheduleRows.map(row => publicSchedule(row, byId.get(row.marketing_generation_id) || null));
}

export async function createSchedule({ businessId, actorUserId, generationId, platform, scheduledFor }) {
  await requireAddon(businessId, 'ai_marketing');
  const generation = await savedGeneration(businessId, generationId);
  if (platform !== 'facebook') throw scheduleError(409, 'Only Facebook scheduled publishing is available right now');
  await assertFacebookDailyPostLimit(businessId, scheduledFor);

  const native = metaConfiguration().publishEnabled === true;
  const now = new Date().toISOString();
  const rows = await addonStorage('marketing_schedules', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      business_id: businessId,
      marketing_generation_id: generation.id,
      platform,
      scheduled_for: scheduledFor,
      status: native ? 'processing' : 'scheduled',
      native_scheduled: native,
      created_by: actorUserId,
      created_at: now,
      updated_at: now
    })
  });
  const row = rows?.[0];
  if (!row) throw scheduleError(503, 'Scheduling is temporarily unavailable');
  if (!native) return publicSchedule(row, generation);

  try {
    const account = await selectedMetaAccount(businessId, 'facebook');
    const provider = await scheduleMetaText({
      platform: 'facebook',
      account,
      text: scheduledGenerationText(generation),
      scheduledFor
    });
    const updated = new Date().toISOString();
    await addonStorage(
      `marketing_schedules?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(row.id)}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          status: 'scheduled',
          provider_post_id: provider.providerPostId,
          failure_code: null,
          failure_message: null,
          updated_at: updated
        })
      }
    );
    return publicSchedule({
      ...row,
      status: 'scheduled',
      provider_post_id: provider.providerPostId,
      native_scheduled: true,
      updated_at: updated
    }, generation);
  } catch (error) {
    const failure = scheduleFailure(error);
    try {
      await addonStorage(
        `marketing_schedules?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(row.id)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'failed', ...failure, updated_at: new Date().toISOString() })
        }
      );
    } catch {}
    throw error;
  }
}

async function ownedSchedule(businessId, id) {
  const rows = await addonStorage(
    `marketing_schedules?business_id=eq.${encodeURIComponent(businessId)}` +
    `&id=eq.${encodeURIComponent(id)}&select=id,platform,scheduled_for,status,marketing_generation_id,publication_id,provider_post_id,native_scheduled,attempts,failure_code,failure_message,created_at,updated_at&limit=1`
  );
  const row = rows?.[0];
  if (!row) throw scheduleError(404, 'Scheduled item not found');
  return row;
}

export async function rescheduleSchedule({ businessId, scheduleId, scheduledFor }) {
  await requireAddon(businessId, 'ai_marketing');
  const row = await ownedSchedule(businessId, scheduleId);
  if (row.status !== 'scheduled') throw scheduleError(409, 'Only upcoming scheduled items can be changed');
  if (Date.parse(row.scheduled_for) <= Date.now()) throw scheduleError(409, 'This scheduled time has already passed; refresh to check its status');
  await assertFacebookDailyPostLimit(businessId, scheduledFor, { excludeScheduleId: row.id });

  if (row.native_scheduled && row.provider_post_id) {
    const generation = await savedGeneration(businessId, row.marketing_generation_id);
    const account = await selectedMetaAccount(businessId, 'facebook');
    const replacement = await scheduleMetaText({
      platform: 'facebook',
      account,
      text: scheduledGenerationText(generation),
      scheduledFor
    });
    try {
      await deleteMetaScheduledPost({
        platform: 'facebook',
        account,
        providerPostId: row.provider_post_id
      });
    } catch (error) {
      try {
        await deleteMetaScheduledPost({
          platform: 'facebook',
          account,
          providerPostId: replacement.providerPostId
        });
      } catch {}
      throw error;
    }
    const updated = new Date().toISOString();
    await addonStorage(
      `marketing_schedules?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(row.id)}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          scheduled_for: scheduledFor,
          provider_post_id: replacement.providerPostId,
          failure_code: null,
          failure_message: null,
          updated_at: updated
        })
      }
    );
    return publicSchedule({
      ...row,
      scheduled_for: scheduledFor,
      provider_post_id: replacement.providerPostId,
      updated_at: updated
    }, generation);
  }

  const updated = new Date().toISOString();
  await addonStorage(
    `marketing_schedules?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(row.id)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ scheduled_for: scheduledFor, updated_at: updated })
    }
  );
  const generation = await savedGeneration(businessId, row.marketing_generation_id).catch(() => null);
  return publicSchedule({ ...row, scheduled_for: scheduledFor, updated_at: updated }, generation);
}

export async function cancelSchedule({ businessId, scheduleId }) {
  await requireAddon(businessId, 'ai_marketing');
  const row = await ownedSchedule(businessId, scheduleId);
  if (row.status !== 'scheduled') throw scheduleError(409, 'Only upcoming scheduled items can be cancelled');
  if (Date.parse(row.scheduled_for) <= Date.now()) throw scheduleError(409, 'This scheduled time has already passed; refresh to check its status');

  if (row.native_scheduled && row.provider_post_id) {
    const account = await selectedMetaAccount(businessId, 'facebook');
    await deleteMetaScheduledPost({
      platform: 'facebook',
      account,
      providerPostId: row.provider_post_id
    });
  }

  const updated = new Date().toISOString();
  await addonStorage(
    `marketing_schedules?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(row.id)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'cancelled', updated_at: updated })
    }
  );
  return { cancelled: true, id: row.id };
}


async function finishSchedule(schedule, values) {
  await addonStorage(
    `marketing_schedules?business_id=eq.${encodeURIComponent(schedule.business_id)}&id=eq.${encodeURIComponent(schedule.id)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        ...values,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }
  );
}

function scheduleFailure(error) {
  return {
    failure_code: String(error?.code || 'SCHEDULE_PROCESSING_FAILED').slice(0, 120),
    failure_message: String(error?.message || 'Scheduled Facebook publishing failed').slice(0, 500)
  };
}

export async function processDueMarketingSchedules(limit = 10) {
  const claimed = await addonStorage('rpc/claim_due_marketing_schedules', {
    method: 'POST',
    body: JSON.stringify({ p_limit: Math.max(1, Math.min(50, Number(limit) || 10)) })
  });

  const results = [];
  for (const schedule of Array.isArray(claimed) ? claimed : []) {
    let publication = null;
    try {
      if (schedule.platform !== 'facebook') {
        const error = scheduleError(409, 'Only Facebook scheduled publishing is available right now');
        error.code = 'SCHEDULE_PLATFORM_UNSUPPORTED';
        throw error;
      }

      publication = await createPublication({
        businessId: schedule.business_id,
        actorUserId: schedule.created_by || null,
        generationId: schedule.marketing_generation_id,
        platform: 'facebook',
        scheduledFor: null,
        requestId: schedule.id,
        skipDailyLimit: true
      });
      if (!publication?.id) {
        const error = scheduleError(503, 'Scheduled publication could not be created');
        error.code = 'PUBLICATION_CREATE_FAILED';
        throw error;
      }

      let published = publication;
      if (publication.status === 'scheduled') {
        const claimedPublication = await claimPublication(schedule.business_id, publication.id);
        published = await processPublication(claimedPublication, schedule.created_by || null);
      }

      if (published?.status !== 'published') {
        const error = scheduleError(502, published?.failure_message || 'Facebook publishing failed');
        error.code = published?.failure_code || 'PUBLISH_FAILED';
        throw error;
      }

      await finishSchedule(schedule, {
        status: 'posted',
        publication_id: publication.id,
        failure_code: null,
        failure_message: null
      });
      results.push({
        id: schedule.id,
        status: 'posted',
        publication_id: publication.id,
        provider_post_id: published.provider_post_id || null
      });
    } catch (error) {
      const failure = scheduleFailure(error);
      try {
        await finishSchedule(schedule, {
          status: 'failed',
          publication_id: publication?.id || schedule.publication_id || null,
          ...failure
        });
      } catch {}
      results.push({ id: schedule.id, status: 'failed', ...failure });
    }
  }
  return results;
}
