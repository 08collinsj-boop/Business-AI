import { requireAal2, requireBusinessMember, sendAuthError } from './auth.js';
import {
  getMarketingAutomationSettings,
  runMarketingAutomation,
  saveMarketingAutomationSettings,
  saveMarketingPlanning,
  validateMarketingAutomationUpdate
} from './marketing-automation.js';
import { imageGenerationConfiguration } from './marketing-image.js';
import { getMarketingUsageSummary } from './marketing-limits.js';
import { deleteAutomationMedia, finalizeAutomationMediaUpload, listAutomationMedia, prepareAutomationMediaUpload } from './marketing-automation-media.js';
import { recordAuditEvent } from './audit.js';

function parse(value) {
  try {
    const body = typeof value === 'string' ? JSON.parse(value) : value;
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  if (!['GET', 'PATCH', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  let auth;
  try {
    auth = await requireBusinessMember(req, req.method === 'GET' ? null : ['owner']);
  } catch (error) {
    return sendAuthError(res, error);
  }
  if (!auth.enforced) return res.status(503).json({ error: 'Authenticated business access is required' });

  try {
    if (req.method === 'GET') {
      const [settings, usage, media] = await Promise.all([
        getMarketingAutomationSettings(auth.businessId),
        getMarketingUsageSummary(auth.businessId).catch(() => null),
        auth.role === 'owner' ? listAutomationMedia(auth.businessId).catch(() => []) : Promise.resolve([])
      ]);
      return res.status(200).json({
        settings,
        usage,
        media,
        image_generation_mode: imageGenerationConfiguration().mode
      });
    }

    const body = parse(req.body);
    if (!body) return res.status(400).json({ error: 'Invalid automation request' });

    if (req.method === 'PATCH') {
      if (Object.keys(body).some(key => key === 'action')) {
        return res.status(400).json({ error: 'Invalid automation settings' });
      }
      const current = await getMarketingAutomationSettings(auth.businessId);
      const input = validateMarketingAutomationUpdate({
        ...body,
        posts_per_day: body.posts_per_day ?? current.posts_per_day
      });
      if (input.enabled && input.mode === 'fully_automated') {
        if (!(current.enabled && current.mode === 'fully_automated')) {
          try { await requireAal2(req); } catch (error) { return sendAuthError(res, error); }
        }
      }
      return res.status(200).json({
        settings: await saveMarketingAutomationSettings({
          businessId: auth.businessId,
          actorUserId: auth.userId,
          input
        }),
        image_generation_mode: imageGenerationConfiguration().mode
      });
    }

    const allowedKeys = {
      run_now: ['action'],
      media_create_upload: ['action', 'role', 'file_name', 'mime_type', 'size_bytes'],
      media_finalize_upload: ['action', 'role', 'path', 'file_name', 'mime_type', 'size_bytes'],
      media_delete: ['action', 'media_id'],
      planning_save: ['action', 'strategy', 'weekly_plan']
    };
    const keys = allowedKeys[body.action];
    if (!keys || Object.keys(body).some(key => !keys.includes(key))) {
      return res.status(400).json({ error: 'Invalid automation request' });
    }

    if (body.action === 'planning_save') {
      const settings = await saveMarketingPlanning({
        businessId: auth.businessId, actorUserId: auth.userId, strategy: body.strategy, weeklyPlan: body.weekly_plan
      });
      return res.status(200).json({ settings });
    }
    if (body.action === 'media_create_upload') {
      const upload = await prepareAutomationMediaUpload({
        businessId: auth.businessId, role: body.role, fileName: body.file_name, mimeType: body.mime_type, sizeBytes: body.size_bytes
      });
      return res.status(201).json({ upload });
    }
    if (body.action === 'media_finalize_upload') {
      const media = await finalizeAutomationMediaUpload({
        businessId: auth.businessId, actorUserId: auth.userId, role: body.role, path: body.path, fileName: body.file_name, mimeType: body.mime_type, sizeBytes: body.size_bytes
      });
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'marketing.automation_media_added', resourceType: 'marketing_automation_media', resourceId: media.id, metadata: { role: media.role, analysed: media.analysed } });
      return res.status(200).json({ media, library: await listAutomationMedia(auth.businessId) });
    }
    if (body.action === 'media_delete') {
      const result = await deleteAutomationMedia({ businessId: auth.businessId, mediaId: body.media_id });
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'marketing.automation_media_removed', resourceType: 'marketing_automation_media', resourceId: body.media_id, metadata: { role: result.role } });
      return res.status(200).json({ ...result, library: await listAutomationMedia(auth.businessId) });
    }

    const settings = await getMarketingAutomationSettings(auth.businessId);
    if (!settings.enabled) return res.status(409).json({ error: 'Enable Marketing automation before running it' });

    const result = await runMarketingAutomation({
      businessId: auth.businessId,
      settings,
      force: true
    });
    return res.status(200).json({ result });
  } catch (error) {
    const status = [400, 403, 404, 409, 422, 429, 502, 503].includes(error?.status) ? error.status : 503;
    return res.status(status).json({
      error: status === 503 ? 'Marketing automation is temporarily unavailable' : error.message,
      code: error?.code || 'MARKETING_AUTOMATION_ERROR'
    });
  }
}
