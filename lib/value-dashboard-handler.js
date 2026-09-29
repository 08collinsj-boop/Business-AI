import { requireBusinessMember, sendAuthError } from "./auth.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SOURCE_KEYS = ["website_widget", "qr", "share", "directory", "direct"];

function endpoint(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Server unavailable");
  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
}

async function request(path) {
  const response = await fetch(endpoint(path), {
    headers: {
      Accept: "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) throw new Error("Database request failed");
  return Array.isArray(data) ? data : [];
}

const ts = value => {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

const money = value => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  let auth;
  try { auth = await requireBusinessMember(req); }
  catch (error) { return sendAuthError(res, error); }

  if (!auth.enforced) return res.status(503).json({ error: "Value dashboard is not enabled" });

  try {
    const businessId = encodeURIComponent(String(auth.businessId));
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 86400000);
    const sinceIso = since.toISOString();
    const [leads, bookings, actions, events] = await Promise.all([
      request(`leads?business_id=eq.${businessId}&select=id,status,estimated_value,created_at`),
      request(`bookings?business_id=eq.${businessId}&select=id,status,source,created_at`),
      request(`actions?business_id=eq.${businessId}&select=id,title,action_type,status,completed_at,created_at`),
      request(`business_audit_events?business_id=eq.${businessId}&action=eq.enquiry.source_captured&created_at=gte.${encodeURIComponent(sinceIso)}&select=resource_id,metadata,created_at&order=created_at.desc&limit=1000`)
    ]);

    const sinceTime = since.getTime();
    const recentLeads = leads.filter(lead => ts(lead.created_at) >= sinceTime);
    const recentIds = new Set(recentLeads.map(lead => String(lead.id)));
    const counts = Object.fromEntries(SOURCE_KEYS.map(key => [key, 0]));
    const seen = new Set();

    for (const event of events) {
      const leadId = String(event?.resource_id || "");
      const source = String(event?.metadata?.source || "");
      if (!leadId || seen.has(leadId) || !recentIds.has(leadId) || !SOURCE_KEYS.includes(source)) continue;
      seen.add(leadId);
      counts[source] += 1;
    }

    const recentValues = recentLeads.map(lead => money(lead.estimated_value));
    const openLeads = leads.filter(lead => String(lead.status || "New") !== "Converted");
    const convertedLeads = leads.filter(lead => String(lead.status || "") === "Converted");

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      period: { days: 30, label: "Last 30 days", from: sinceIso, to: now.toISOString() },
      activity: {
        enquiries: recentLeads.length,
        ai_booking_requests: bookings.filter(item => item.source === "ai_request" && ts(item.created_at) >= sinceTime).length,
        actions_completed: actions.filter(item => item.status === "completed" && ts(item.completed_at) >= sinceTime).length,
        automatic_follow_ups_created: actions.filter(item => item.title === "Automatic follow-up" && ts(item.created_at) >= sinceTime).length,
        automatic_follow_ups_completed: actions.filter(item => item.title === "Automatic follow-up" && item.status === "completed" && ts(item.completed_at) >= sinceTime).length,
        review_requests_prepared: actions.filter(item => item.action_type === "request_review" && ts(item.created_at) >= sinceTime).length,
        review_requests_marked_sent: actions.filter(item => item.action_type === "request_review" && item.status === "completed" && ts(item.completed_at) >= sinceTime).length
      },
      values: {
        period_opportunity_value: recentValues.reduce((sum, value) => sum + value, 0),
        valued_leads: recentValues.filter(value => value > 0).length,
        open_pipeline_value: openLeads.reduce((sum, lead) => sum + money(lead.estimated_value), 0),
        converted_opportunity_value: convertedLeads.reduce((sum, lead) => sum + money(lead.estimated_value), 0)
      },
      sources: { ...counts, untracked: Math.max(0, recentLeads.length - seen.size), total: recentLeads.length }
    });
  } catch {
    return res.status(500).json({ error: "Could not load value dashboard" });
  }
}
