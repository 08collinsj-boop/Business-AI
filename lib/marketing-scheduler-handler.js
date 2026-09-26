import crypto from 'node:crypto';
import { addonStorage } from './addons.js';
import { processPublication } from './marketing-publication.js';
import { runDueMarketingAutomations } from './marketing-automation.js';

function safeEqual(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (left.length < 32 || left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function authorised(req) {
  const supplied = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  return [process.env.CRON_SECRET, process.env.MARKETING_SCHEDULER_SECRET]
    .filter(Boolean)
    .some(secret => safeEqual(secret, supplied));
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (!authorised(req)) return res.status(401).json({ error: 'Authentication is required' });

  try {
    const automationResults = await runDueMarketingAutomations(10);
    const claimed = await addonStorage('rpc/claim_due_marketing_publications', {
      method: 'POST',
      body: JSON.stringify({ p_limit: 10 })
    });
    const publicationResults = [];
    for (const publication of Array.isArray(claimed) ? claimed : []) {
      publicationResults.push(await processPublication(publication));
    }
    const publicationsPublished = publicationResults.filter(item => item.status === 'published').length;
    const publicationsFailed = publicationResults.filter(item => item.status === 'failed').length;
    return res.status(200).json({
      // Backwards-compatible publication counters.
      processed: publicationResults.length,
      published: publicationsPublished,
      failed: publicationsFailed,
      automation_processed: automationResults.length,
      automation_published: automationResults.filter(item => item.status === 'published').length,
      automation_drafts: automationResults.filter(item => item.status === 'draft_created').length,
      automation_failed: automationResults.filter(item => item.status === 'failed').length,
      publications_processed: publicationResults.length,
      publications_published: publicationsPublished,
      publications_failed: publicationsFailed
    });
  } catch {
    return res.status(503).json({ error: 'Marketing scheduler is temporarily unavailable' });
  }
}
