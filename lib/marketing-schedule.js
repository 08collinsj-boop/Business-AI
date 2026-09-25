import { addonError, addonStorage, requireAddon } from './addons.js';

export const SCHEDULE_PLATFORMS = Object.freeze(['facebook', 'instagram', 'linkedin', 'general']);
export const SCHEDULE_STATUSES = Object.freeze(['scheduled', 'cancelled', 'posted', 'failed']);
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
  return row;
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
      `&select=id,platform,scheduled_for,status,marketing_generation_id,created_at,updated_at` +
      `&order=scheduled_for.asc&limit=100`
    ),
    addonStorage(
      `marketing_generations?business_id=eq.${encodeURIComponent(businessId)}` +
      `&deleted_at=is.null&status=eq.completed` +
      `&select=id,content_type,platform,tone,request_text,output,edited_output,approval_status,created_at&limit=100`
    )
  ]);
  const byId = new Map((Array.isArray(generations) ? generations : []).map(row => [row.id, row]));
  return (Array.isArray(schedules) ? schedules : []).map(row => publicSchedule(row, byId.get(row.marketing_generation_id) || null));
}

export async function createSchedule({ businessId, actorUserId, generationId, platform, scheduledFor }) {
  await requireAddon(businessId, 'ai_marketing');
  const generation = await savedGeneration(businessId, generationId);
  const now = new Date().toISOString();
  const rows = await addonStorage('marketing_schedules', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      business_id: businessId,
      marketing_generation_id: generation.id,
      platform,
      scheduled_for: scheduledFor,
      status: 'scheduled',
      created_by: actorUserId,
      created_at: now,
      updated_at: now
    })
  });
  if (!rows?.[0]) throw scheduleError(503, 'Scheduling is temporarily unavailable');
  return publicSchedule(rows[0], generation);
}

async function ownedSchedule(businessId, id) {
  const rows = await addonStorage(
    `marketing_schedules?business_id=eq.${encodeURIComponent(businessId)}` +
    `&id=eq.${encodeURIComponent(id)}&select=id,platform,scheduled_for,status,marketing_generation_id,created_at,updated_at&limit=1`
  );
  const row = rows?.[0];
  if (!row) throw scheduleError(404, 'Scheduled item not found');
  return row;
}

export async function rescheduleSchedule({ businessId, scheduleId, scheduledFor }) {
  await requireAddon(businessId, 'ai_marketing');
  const row = await ownedSchedule(businessId, scheduleId);
  if (row.status !== 'scheduled') throw scheduleError(409, 'Only upcoming scheduled items can be changed');
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
