import { requireAuthenticatedUser, requireBusinessMember, sendAuthError } from './auth.js';
import { recordAuditEvent } from './audit.js';
import { LEGAL_VERSIONS } from './legal.js';
export { LEGAL_VERSIONS } from './legal.js';

const USER_DOCUMENTS = Object.freeze(['terms','privacy','acceptable_use']);

function legalError(status, message) {
  return Object.assign(new Error(message), { status });
}

function parseBody(value) {
  try {
    const body = typeof value === 'string' ? JSON.parse(value) : value;
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

async function legalStorage(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw legalError(503, 'Legal acceptance is temporarily unavailable');
  const response = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(15000)
  });
  const raw = await response.text();
  if (!response.ok) throw legalError(503, 'Legal acceptance is temporarily unavailable');
  return raw ? JSON.parse(raw) : null;
}

async function userAcceptanceState(userId) {
  const rows = await legalStorage(
    `user_legal_acceptances?user_id=eq.${encodeURIComponent(userId)}&select=document_key,document_version,accepted_at&order=accepted_at.desc`
  );
  const current = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!current[row.document_key]) current[row.document_key] = row;
  }
  const needs = USER_DOCUMENTS.some(key => current[key]?.document_version !== LEGAL_VERSIONS[key]);
  const acceptedTimes = USER_DOCUMENTS.map(key => current[key]?.document_version === LEGAL_VERSIONS[key] ? current[key]?.accepted_at : null).filter(Boolean);
  return { needs, acceptedAt: acceptedTimes.length === USER_DOCUMENTS.length ? acceptedTimes.sort().at(-1) : null };
}

async function membershipState(userId) {
  const rows = await legalStorage(
    `business_memberships?user_id=eq.${encodeURIComponent(userId)}&select=business_id,role&limit=2`
  );
  if (!Array.isArray(rows) || rows.length !== 1) return { businessId: null, role: null };
  return { businessId: rows[0]?.business_id || null, role: rows[0]?.role || null };
}

async function dpaState(businessId) {
  if (!businessId) return { accepted: false, acceptedAt: null };
  const rows = await legalStorage(
    `business_legal_acceptances?business_id=eq.${encodeURIComponent(businessId)}&document_key=eq.dpa&document_version=eq.${encodeURIComponent(LEGAL_VERSIONS.dpa)}&select=accepted_at&order=accepted_at.desc&limit=1`
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  return { accepted: Boolean(row?.accepted_at), acceptedAt: row?.accepted_at || null };
}

function documentMap() {
  return {
    terms: { version: LEGAL_VERSIONS.terms, url: '/legal/terms.html' },
    privacy: { version: LEGAL_VERSIONS.privacy, url: '/legal/privacy.html' },
    acceptable_use: { version: LEGAL_VERSIONS.acceptable_use, url: '/legal/acceptable-use.html' },
    dpa: { version: LEGAL_VERSIONS.dpa, url: '/legal/dpa.html' },
    storage: { version: LEGAL_VERSIONS.storage, url: '/legal/storage.html' },
    subprocessors: { version: LEGAL_VERSIONS.subprocessors, url: '/legal/subprocessors.html' }
  };
}

async function stateFor(userId) {
  const [userState, membership] = await Promise.all([userAcceptanceState(userId), membershipState(userId)]);
  const dpaRequired = membership.role === 'owner' && Boolean(membership.businessId);
  const dpa = dpaRequired ? await dpaState(membership.businessId) : { accepted: false, acceptedAt: null };
  return {
    documents: documentMap(),
    needs_user_acceptance: userState.needs,
    user_accepted_at: userState.acceptedAt,
    dpa_required: dpaRequired,
    dpa_accepted: dpaRequired ? dpa.accepted : false,
    dpa_accepted_at: dpa.acceptedAt,
    business_role: membership.role
  };
}

async function acceptUserDocuments(userId) {
  const existing = await legalStorage(
    `user_legal_acceptances?user_id=eq.${encodeURIComponent(userId)}&select=document_key,document_version`
  );
  const have = new Set((Array.isArray(existing) ? existing : []).map(row => `${row.document_key}:${row.document_version}`));
  const rows = USER_DOCUMENTS
    .filter(key => !have.has(`${key}:${LEGAL_VERSIONS[key]}`))
    .map(key => ({ user_id: userId, document_key: key, document_version: LEGAL_VERSIONS[key], source: 'web' }));
  if (rows.length) {
    await legalStorage('user_legal_acceptances', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(rows)
    });
  }
}

export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try { user = await requireAuthenticatedUser(req); }
  catch (error) { return sendAuthError(res, error); }
  if (!user.enforced) return res.status(503).json({ error: 'Authenticated access is required' });

  try {
    if (req.method === 'GET') return res.status(200).json(await stateFor(user.userId));

    const body = parseBody(req.body);
    if (!body || Object.keys(body).some(key => key !== 'action')) return res.status(400).json({ error: 'Invalid legal acceptance request' });

    if (body.action === 'accept_user') {
      await acceptUserDocuments(user.userId);
      return res.status(200).json(await stateFor(user.userId));
    }

    if (body.action === 'accept_dpa') {
      let owner;
      try { owner = await requireBusinessMember(req, ['owner']); }
      catch (error) { return sendAuthError(res, error); }
      if (!owner.enforced || !owner.businessId) return res.status(403).json({ error: 'Business owner access is required' });
      const current = await dpaState(owner.businessId);
      if (!current.accepted) {
        await legalStorage('business_legal_acceptances', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            business_id: owner.businessId,
            actor_user_id: owner.userId,
            document_key: 'dpa',
            document_version: LEGAL_VERSIONS.dpa,
            source: 'web'
          })
        });
        await recordAuditEvent({
          businessId: owner.businessId,
          actorUserId: owner.userId,
          action: 'legal.dpa_accepted',
          resourceType: 'legal_document',
          resourceId: `dpa:${LEGAL_VERSIONS.dpa}`,
          metadata: { document_key: 'dpa', document_version: LEGAL_VERSIONS.dpa }
        });
      }
      return res.status(200).json(await stateFor(user.userId));
    }

    return res.status(400).json({ error: 'Invalid legal acceptance request' });
  } catch (error) {
    const status = [400,403,503].includes(error?.status) ? error.status : 503;
    return res.status(status).json({ error: status === 503 ? 'Legal acceptance is temporarily unavailable' : error.message });
  }
}
