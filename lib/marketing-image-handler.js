import { requireBusinessMember, sendAuthError } from './auth.js';
import { finalizeMarketingPhotoUpload, generateMarketingImage, getMarketingImage, imageGenerationConfiguration, prepareMarketingPhotoUpload, removeMarketingImage } from './marketing-image.js';
import { recordAuditEvent } from './audit.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parse(value) {
  try {
    const body = typeof value === 'string' ? JSON.parse(value) : value;
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  let auth;
  try {
    auth = await requireBusinessMember(req, req.method === 'POST' ? ['owner', 'admin'] : null);
  } catch (error) {
    return sendAuthError(res, error);
  }
  if (!auth.enforced) return res.status(503).json({ error: 'Authenticated business access is required' });

  try {
    if (req.method === 'GET') {
      const id = String(req.query?.generation_id || '');
      if (!UUID.test(id)) return res.status(400).json({ error: 'Invalid marketing draft' });
      return res.status(200).json({
        image: await getMarketingImage(auth.businessId, id),
        configuration: { mode: imageGenerationConfiguration().mode }
      });
    }

    const body = parse(req.body);
    if (!body || !UUID.test(String(body.generation_id || ''))) {
      return res.status(400).json({ error: 'Invalid marketing image request' });
    }

    const allowedKeys = {
      generate: ['action', 'generation_id'],
      create_upload: ['action', 'generation_id', 'file_name', 'mime_type', 'size_bytes'],
      finalize_upload: ['action', 'generation_id', 'path', 'file_name', 'mime_type', 'size_bytes'],
      remove: ['action', 'generation_id']
    };
    const keys = allowedKeys[body.action];
    if (!keys || Object.keys(body).some(key => !keys.includes(key))) {
      return res.status(400).json({ error: 'Invalid marketing image request' });
    }

    if (body.action === 'create_upload') {
      const upload = await prepareMarketingPhotoUpload({
        businessId: auth.businessId,
        generationId: body.generation_id,
        fileName: body.file_name,
        mimeType: body.mime_type,
        sizeBytes: body.size_bytes
      });
      await recordAuditEvent({
        businessId: auth.businessId,
        actorUserId: auth.userId,
        action: 'marketing.photo_upload_prepared',
        resourceType: 'marketing_generation',
        resourceId: body.generation_id,
        metadata: { mime_type: upload.mime_type, size_bytes: upload.size_bytes }
      });
      return res.status(201).json({ upload });
    }

    if (body.action === 'finalize_upload') {
      const result = await finalizeMarketingPhotoUpload({
        businessId: auth.businessId,
        actorUserId: auth.userId,
        generationId: body.generation_id,
        path: body.path,
        fileName: body.file_name,
        mimeType: body.mime_type,
        sizeBytes: body.size_bytes
      });
      await recordAuditEvent({
        businessId: auth.businessId,
        actorUserId: auth.userId,
        action: 'marketing.photo_uploaded',
        resourceType: 'marketing_generation',
        resourceId: body.generation_id,
        metadata: { provider: 'upload', analysed: result.analysed, copy_refreshed: result.copy_refreshed }
      });
      return res.status(200).json({
        ...result,
        configuration: { mode: imageGenerationConfiguration().mode }
      });
    }

    if (body.action === 'remove') {
      const result = await removeMarketingImage({
        businessId: auth.businessId,
        generationId: body.generation_id
      });
      await recordAuditEvent({
        businessId: auth.businessId,
        actorUserId: auth.userId,
        action: 'marketing.image_removed',
        resourceType: 'marketing_generation',
        resourceId: body.generation_id,
        metadata: { previous_provider: result.provider || null }
      });
      return res.status(200).json(result);
    }

    const image = await generateMarketingImage({
      businessId: auth.businessId,
      actorUserId: auth.userId,
      generationId: body.generation_id
    });

    await recordAuditEvent({
      businessId: auth.businessId,
      actorUserId: auth.userId,
      action: image.simulation ? 'marketing.image_simulated' : 'marketing.image_generated',
      resourceType: 'marketing_generation',
      resourceId: body.generation_id,
      metadata: { provider: image.provider, model: image.model || 'unknown' }
    });

    return res.status(200).json({
      image,
      configuration: { mode: imageGenerationConfiguration().mode }
    });
  } catch (error) {
    const status = [400, 403, 404, 409, 422, 429, 502, 503].includes(error?.status) ? error.status : 503;
    return res.status(status).json({
      error: status === 503 ? 'Image generation is temporarily unavailable' : error.message,
      code: error?.code || 'MARKETING_IMAGE_ERROR'
    });
  }
}
