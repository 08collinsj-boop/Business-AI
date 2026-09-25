import { requireBusinessMember, sendAuthError } from './auth.js';
import { recordAuditEvent } from './audit.js';
import {
  cancelSchedule,
  createSchedule,
  listSchedules,
  rescheduleSchedule,
  validateScheduleRequest
} from './marketing-schedule.js';

function parseBody(value) {
  try {
    const body = typeof value === 'string' ? JSON.parse(value) : value;
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  let auth;
  try {
    auth = await requireBusinessMember(req, req.method === 'GET' ? null : ['owner', 'admin']);
  } catch (error) {
    return sendAuthError(res, error);
  }
  if (!auth.enforced) return res.status(503).json({ error: 'Authenticated business access is required' });
  if (Object.keys(req.query || {}).some(key => key !== 'operation')) {
    return res.status(400).json({ error: 'Invalid schedule query' });
  }
  try {
    if (req.method === 'GET') {
      return res.status(200).json({ schedules: await listSchedules(auth.businessId) });
    }
    const input = validateScheduleRequest(parseBody(req.body));
    if (req.method === 'POST' && input.action === 'create') {
      const schedule = await createSchedule({
        businessId: auth.businessId,
        actorUserId: auth.userId,
        generationId: input.generationId,
        platform: input.platform,
        scheduledFor: input.scheduledFor
      });
      await recordAuditEvent({
        businessId: auth.businessId,
        actorUserId: auth.userId,
        action: 'marketing.scheduled',
        resourceType: 'marketing_schedule',
        resourceId: schedule.id,
        metadata: { platform: schedule.platform }
      });
      return res.status(201).json({ schedule });
    }
    if (req.method === 'PATCH' && input.action === 'reschedule') {
      const schedule = await rescheduleSchedule({
        businessId: auth.businessId,
        scheduleId: input.scheduleId,
        scheduledFor: input.scheduledFor
      });
      await recordAuditEvent({
        businessId: auth.businessId,
        actorUserId: auth.userId,
        action: 'marketing.schedule_updated',
        resourceType: 'marketing_schedule',
        resourceId: schedule.id,
        metadata: { platform: schedule.platform }
      });
      return res.status(200).json({ schedule });
    }
    if (req.method === 'PATCH' && input.action === 'cancel') {
      const result = await cancelSchedule({ businessId: auth.businessId, scheduleId: input.scheduleId });
      await recordAuditEvent({
        businessId: auth.businessId,
        actorUserId: auth.userId,
        action: 'marketing.schedule_cancelled',
        resourceType: 'marketing_schedule',
        resourceId: result.id,
        metadata: {}
      });
      return res.status(200).json(result);
    }
    return res.status(400).json({ error: 'Invalid schedule request' });
  } catch (error) {
    const status = [400, 403, 404, 409, 422, 502, 503].includes(error?.status) ? error.status : 503;
    return res.status(status).json({ error: status === 503 ? 'Scheduling is temporarily unavailable' : error.message });
  }
}
