import knowledgeHandler from './knowledge-handler.js';
import { requireBusinessMember } from './auth.js';
import { recordAuditEvent } from './audit.js';

export const KNOWLEDGE_ACCURACY_CONFIRMATION_VERSION = 'knowledge_accuracy_v1';

const CONFIRMATION_ERROR = 'Confirm that you have reviewed the knowledge and that it is accurate and authorised for Business AI to use.';

function parseBody(value) {
  try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return null; }
}

export default async function verifiedKnowledgeHandler(req, res) {
  if (req.method !== 'PATCH') return knowledgeHandler(req, res);

  const body = parseBody(req.body);
  if (body?.action !== 'approve') return knowledgeHandler(req, res);

  if (body.confirmation !== true || body.confirmation_version !== KNOWLEDGE_ACCURACY_CONFIRMATION_VERSION) {
    return res.status(400).json({ error: CONFIRMATION_ERROR });
  }

  // The delegated handler remains authoritative for auth, tenancy and review
  // validation. This lookup only gives the versioned accuracy event an actor.
  let auth = null;
  try { auth = await requireBusinessMember(req, ['owner', 'admin']); } catch { /* delegated handler returns the canonical auth error */ }

  const delegatedBody = { ...body };
  delete delegatedBody.confirmation;
  delete delegatedBody.confirmation_version;

  const result = await knowledgeHandler({ ...req, body: delegatedBody }, res);

  if (res.statusCode >= 200 && res.statusCode < 300 && auth?.enforced) {
    await recordAuditEvent({
      businessId: auth.businessId,
      actorUserId: auth.userId,
      action: 'knowledge.accuracy_confirmed',
      resourceType: 'knowledge_source',
      resourceId: String(body.source_id || ''),
      metadata: {
        confirmation_version: KNOWLEDGE_ACCURACY_CONFIRMATION_VERSION,
        confirmed_accurate: true
      }
    });
  }

  return result;
}
