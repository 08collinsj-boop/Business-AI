import { requireAuthenticatedUser, sendAuthError } from './auth.js';
import { reviewDestination } from './review-requests.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function endpoint(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Server unavailable');
  return SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + path;
}

async function storage(path, options = {}) {
  const response = await fetch(endpoint(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
      ...(options.headers || {})
    }
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) throw new Error('Customer portal storage unavailable');
  return data;
}

function safeText(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function customerStatus(leadStatus, awaitingHuman) {
  if (leadStatus === 'Converted') return { key: 'completed', label: 'Completed' };
  if (leadStatus === 'Contacted') return { key: 'in_progress', label: 'Being reviewed' };
  if (awaitingHuman) return { key: 'awaiting_business', label: 'Awaiting business response' };
  return { key: 'received', label: 'Received' };
}

// Only transcript turns explicitly marked as customer/user submissions are
// included in the expandable customer message history. Do not expose prompts,
// assistant drafts or owner notes as messages.
function customerSubmittedMessages(value) {
  const lines = safeText(value, 6000).split(/\r?\n/);
  const messages = [];
  let current = null;
  const flush = () => {
    if (current !== null) {
      const message = safeText(current.replace(/\s+/g, ' '), 500);
      if (message) messages.push(message);
    }
    current = null;
  };
  for (const line of lines) {
    const user = /^\s*user:\s*(.*)$/i.exec(line);
    if (user) { flush(); current = user[1]; continue; }
    if (/^\s*(?:assistant|system|developer|tool):/i.test(line)) { flush(); continue; }
    if (current !== null && line.trim()) current += ' ' + line.trim();
  }
  flush();
  return messages.slice(-20);
}

function customerEnquirySummary(description, title, customerMessages) {
  const raw = safeText(description, 6000);
  const first = customerMessages[0] || (
    /(?:^|\n)\s*(?:user|assistant|system|developer|tool):/i.test(raw)
      ? '' : safeText(raw.replace(/\s+/g, ' '), 240)
  );
  const candidate = safeText(first, 240);
  if (!candidate || candidate.toLowerCase() === String(title || '').trim().toLowerCase()) return '';
  return candidate;
}

async function ensureProfile(userId) {
  const path = 'customer_profiles?user_id=eq.' + encodeURIComponent(userId)
    + '&select=user_id,display_name,created_at,updated_at&limit=1';
  const rows = await storage(path);
  if (rows && rows[0]) return rows[0];
  // Two first-time GETs can both find no profile. Ignore duplicate inserts
  // rather than overwriting the other request's (possibly updated) name.
  const created = await storage('customer_profiles?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ user_id: userId, display_name: '' })
  });
  if (created && created[0]) return created[0];
  // The other request won the race. Fetch the authoritative profile.
  const current = await storage(path);
  return (current && current[0]) || { user_id: userId, display_name: '' };
}

async function listEnquiries(userId) {
  const access = await storage(
    'customer_enquiry_access?customer_user_id=eq.' + encodeURIComponent(userId) + '&select=id,business_id,lead_id,created_at&order=created_at.desc&limit=100'
  );
  if (!Array.isArray(access) || !access.length) return [];

  const leadIds = [...new Set(access.map(row => Number(row.lead_id)).filter(Number.isSafeInteger))];
  const businessIds = [...new Set(access.map(row => row.business_id).filter(Boolean))];
  const leadFilter = leadIds.join(',');
  const businessFilter = businessIds.map(value => encodeURIComponent(value)).join(',');

  const results = await Promise.all([
    storage('leads?id=in.(' + leadFilter + ')&business_id=in.(' + businessFilter + ')&select=id,business_id,job_type,description,status,created_at&limit=100'),
    storage('business_settings?business_id=in.(' + businessFilter + ')&select=business_id,business_name,business_type,review_requests_enabled,review_google_url,review_facebook_url,review_preferred_platform&limit=100'),
    storage('business_public_routes?business_id=in.(' + businessFilter + ')&route_type=eq.slug&active=eq.true&select=business_id,route_value&limit=100'),
    storage('lead_handovers?lead_id=in.(' + leadFilter + ')&business_id=in.(' + businessFilter + ')&select=business_id,lead_id,status,reason&limit=100'),
    storage('actions?lead_id=in.(' + leadFilter + ')&business_id=in.(' + businessFilter + ')&action_type=eq.request_review&status=eq.completed&select=id,business_id,lead_id,booking_id,status,completed_at&order=completed_at.desc&limit=100')
  ]);

  const leadRows = results[0] || [];
  const businessRows = results[1] || [];
  const routeRows = results[2] || [];
  const handoverRows = results[3] || [];
  const reviewRows = results[4] || [];
  const leads = new Map(leadRows.map(row => [Number(row.id), row]));
  const businesses = new Map(businessRows.map(row => [row.business_id, row]));
  const routes = new Map(routeRows.map(row => [row.business_id, row.route_value]));
  const humanLeads = new Set(handoverRows.filter(row => {
    const lead = leads.get(Number(row.lead_id));
    return lead && row.business_id === lead.business_id && row.status !== 'resolved';
  }).map(row => Number(row.lead_id)));
  const reviewActions = new Map();
  for (const row of reviewRows) {
    const leadId = Number(row.lead_id);
    // Completed review actions must belong to the same business as the
    // customer-authorised lead. A numeric ID alone is not an owner check.
    const lead = leads.get(leadId);
    if (!Number.isSafeInteger(leadId) || !lead ||
        row.business_id !== lead.business_id || reviewActions.has(leadId)) continue;
    reviewActions.set(leadId, row);
  }

  return access.map(link => {
    const lead = leads.get(Number(link.lead_id));
    const business = businesses.get(link.business_id);
    // Service-role reads bypass RLS, so never compose a customer-visible
    // record unless the access grant, lead and business share one tenant.
    if (!lead || !business || lead.business_id !== link.business_id ||
        business.business_id !== link.business_id) return null;
    const status = customerStatus(lead.status, humanLeads.has(Number(link.lead_id)));
    const slug = safeText(routes.get(link.business_id), 63);
    const reviewAction = reviewActions.get(Number(link.lead_id));
    const destination = business.review_requests_enabled && reviewAction ? reviewDestination(business) : null;
    const title = safeText(lead.job_type, 180) || 'Customer enquiry';
    const customerMessages = customerSubmittedMessages(lead.description);
    return {
      id: link.id,
      business: {
        name: safeText(business.business_name, 120) || 'Business',
        type: safeText(business.business_type, 120),
        slug
      },
      title,
      summary: customerEnquirySummary(lead.description, title, customerMessages),
      customer_messages: customerMessages,
      status: status.label,
      status_key: status.key,
      submitted_at: link.created_at || lead.created_at || null,
      business_path: slug ? '/customer?business=' + encodeURIComponent(slug) : null,
      review_request: destination ? {
        platform: destination.platform,
        label: destination.label,
        url: destination.url
      } : null
    };
  }).filter(Boolean);
}

export default async function handler(req, res) {
  let user;
  try { user = await requireAuthenticatedUser(req); } catch (error) { return sendAuthError(res, error); }
  if (!user || !user.userId) return res.status(401).json({ error: 'Authentication is required' });

  try {
    if (req.method === 'GET') {
      const values = await Promise.all([ensureProfile(user.userId), listEnquiries(user.userId)]);
      const profile = values[0];
      const enquiries = values[1];
      return res.status(200).json({
        customer: {
          email: user.email || '',
          display_name: safeText(profile && profile.display_name, 120)
        },
        enquiries
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (body.action !== 'profile') return res.status(400).json({ error: 'Unsupported customer action' });
      const displayName = safeText(body.display_name, 120);
      if (!displayName) return res.status(400).json({ error: 'Enter your name' });
      const rows = await storage('customer_profiles?on_conflict=user_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ user_id: user.userId, display_name: displayName, updated_at: new Date().toISOString() })
      });
      return res.status(200).json({
        customer: {
          email: user.email || '',
          display_name: safeText(rows && rows[0] && rows[0].display_name, 120) || displayName
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch {
    return res.status(503).json({ error: 'Customer portal is temporarily unavailable' });
  }
}
