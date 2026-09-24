import crypto from 'node:crypto';
import { addonStorage } from './addons.js';
import { processPublication } from './marketing-publication.js';

function authorised(req) {
  const expected = String(process.env.MARKETING_SCHEDULER_SECRET || '');
  const supplied = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  if (expected.length < 32 || supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!authorised(req)) return res.status(401).json({ error: 'Authentication is required' });
  try {
    const claimed = await addonStorage('rpc/claim_due_marketing_publications', { method: 'POST', body: JSON.stringify({ p_limit: 10 }) });
    const results = [];
    for (const publication of Array.isArray(claimed) ? claimed : []) results.push(await processPublication(publication));
    return res.status(200).json({ processed: results.length, published: results.filter(item => item.status === 'published').length, failed: results.filter(item => item.status === 'failed').length });
  } catch {
    return res.status(503).json({ error: 'Marketing scheduler is temporarily unavailable' });
  }
}
