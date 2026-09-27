import { requireBusinessMember, sendAuthError } from './auth.js';
import { generateMarketingImage, getMarketingImage, imageGenerationConfiguration } from './marketing-image.js';
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
    if (!body || Object.keys(body).some(key => !['action', 'generation_id'].includes(key)) || body.action !== 'generate') {
      return res.status(400).json({ error: 'Invalid image generation request' });
    }
    if (!UUID.test(String(body.generation_id || ''))) return res.status(400).json({ error: 'Invalid marketing draft' });

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
