import { requireBusinessMember, sendAuthError } from "./auth.js";
import { recordAuditEvent } from "./audit.js";

const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const id = (value) => {
  const text = String(value ?? "");
  return /^[1-9]\d{0,15}$/.test(text) && Number.isSafeInteger(Number(text)) ? text : null;
};
async function request(path, options = {}) {
  if (!url || !key) throw new Error("Server unavailable");
  const response = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${path}`, { ...options, headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}`, ...(options.headers || {}) } });
  const raw = await response.text(); let data = null; try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) throw new Error("Database request failed"); return data;
}
function parse(value) { try { return typeof value === "string" ? JSON.parse(value) : value || {}; } catch { return null; } }
async function leadForBusiness(leadId, businessId) {
  const rows = await request(`leads?id=eq.${leadId}&business_id=eq.${encodeURIComponent(businessId)}&select=*&limit=1`);
  // Service-role reads bypass RLS: validate the returned tenant and record.
  if (!Array.isArray(rows) || rows.length > 1) throw new Error("Lead response could not be verified");
  if (rows.length === 0) return null;
  const lead = rows[0];
  if (!lead || lead.business_id !== businessId || String(lead.id) !== leadId) {
    throw new Error("Lead response could not be verified");
  }
  return lead;
}
function confirmedRelatedRows(rows, businessId, leadId) {
  if (!Array.isArray(rows) || !rows.every(row => row && typeof row === "object" &&
      row.business_id === businessId && String(row.lead_id) === leadId)) {
    throw new Error("Related data could not be verified");
  }
  return rows;
}

export default async function handler(req, res) {
  if (!["GET", "DELETE"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  let auth; try { auth = await requireBusinessMember(req, ["owner"]); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: "Data subject controls are not enabled" });
  const leadId = id(req.method === "GET" ? req.query?.lead_id : parse(req.body)?.lead_id);
  if (!leadId) return res.status(400).json({ error: "Invalid lead ID" });
  // The legacy erasure performs four independent writes and cannot prove an
  // all-or-nothing deletion. Never run it inside the scoped 14-day pilot.
  if (req.method === "DELETE" && process.env.COLZO_SCOPED_PILOT_ACCESS === "true") {
    return res.status(503).json({ error: "Automated erasure is unavailable during this pilot" });
  }
  try {
    const lead = await leadForBusiness(leadId, auth.businessId);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (req.method === "GET") {
      const [history, bookings, actions] = await Promise.all([
        request(`lead_history?lead_id=eq.${leadId}&business_id=eq.${encodeURIComponent(auth.businessId)}&select=*&order=created_at.asc`),
        request(`bookings?lead_id=eq.${leadId}&business_id=eq.${encodeURIComponent(auth.businessId)}&select=*&order=created_at.asc`),
        request(`actions?lead_id=eq.${leadId}&business_id=eq.${encodeURIComponent(auth.businessId)}&select=*&order=created_at.asc`)
      ]);
      const verifiedHistory = confirmedRelatedRows(history, auth.businessId, leadId);
      const verifiedBookings = confirmedRelatedRows(bookings, auth.businessId, leadId);
      const verifiedActions = confirmedRelatedRows(actions, auth.businessId, leadId);
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: "data_subject.exported", resourceType: "lead", resourceId: leadId, metadata: { format: "json" } });
      return res.status(200).json({ generated_at: new Date().toISOString(), lead, history: verifiedHistory, bookings: verifiedBookings, actions: verifiedActions });
    }
    await Promise.all([
      request(`leads?id=eq.${leadId}&business_id=eq.${encodeURIComponent(auth.businessId)}`, { method: "PATCH", body: JSON.stringify({ name: null, phone: null, email: null, location: null, job_type: "Erased customer data", description: "Personal data erased", notes: "Personal data erased" }) }),
      request(`bookings?lead_id=eq.${leadId}&business_id=eq.${encodeURIComponent(auth.businessId)}`, { method: "PATCH", body: JSON.stringify({ customer_name: "", customer_phone: "", customer_email: "", location: "", notes: "Personal data erased" }) }),
      request(`actions?lead_id=eq.${leadId}&business_id=eq.${encodeURIComponent(auth.businessId)}`, { method: "PATCH", body: JSON.stringify({ description: "Personal data erased" }) }),
      request(`lead_history?lead_id=eq.${leadId}&business_id=eq.${encodeURIComponent(auth.businessId)}`, { method: "PATCH", body: JSON.stringify({ old_value: "", new_value: "" }) })
    ]);
    await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: "data_subject.erased", resourceType: "lead", resourceId: leadId, metadata: { method: "anonymised" } });
    return res.status(200).json({ erased: true, lead_id: Number(leadId) });
  } catch { return res.status(500).json({ error: "Could not process data subject request" }); }
}
