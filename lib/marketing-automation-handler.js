import { requireBusinessMember, sendAuthError } from './auth.js';
import {
  getMarketingAutomationSettings,
  runMarketingAutomation,
  saveMarketingAutomationSettings,
  validateMarketingAutomationUpdate
} from './marketing-automation.js';
import { imageGenerationConfiguration } from './marketing-image.js';

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
      return res.status(200).json({
        settings: await getMarketingAutomationSettings(auth.businessId),
        image_generation_mode: imageGenerationConfiguration().mode
      });
    }

    const body = parse(req.body);
    if (!body) return res.status(400).json({ error: 'Invalid automation request' });

    if (req.method === 'PATCH') {
      if (Object.keys(body).some(key => key === 'action')) {
        return res.status(400).json({ error: 'Invalid automation settings' });
      }
      const input = validateMarketingAutomationUpdate(body);
      return res.status(200).json({
        settings: await saveMarketingAutomationSettings({
          businessId: auth.businessId,
          actorUserId: auth.userId,
          input
        }),
        image_generation_mode: imageGenerationConfiguration().mode
      });
    }

    if (Object.keys(body).some(key => !['action'].includes(key)) || body.action !== 'run_now') {
      return res.status(400).json({ error: 'Invalid automation request' });
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
