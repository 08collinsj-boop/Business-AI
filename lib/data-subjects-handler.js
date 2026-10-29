import { requireBusinessMember, sendAuthError } from "./auth.js";
import { recordAuditEvent } from "./audit.js";

const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const id = (value) => /^(?:[1-9]\d*)$/.test(String(value || "")) ? String(value) : null;
async function request(path, options = {}) {
  if (!url || !key) throw new Error("Server unavailable");
  const response = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${path}`, { ...options, headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}`, ...(options.headers || {}) } });
  const raw = await response.text(); let data = null; try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) throw new Error("Database request failed"); return data;
}
function parse(value) { try { return typeof value === "string" ? JSON.parse(value) : value || {}; } catch { return null; } }
async function leadForBusiness(leadId, businessId) {
  const rows = await request(`leads?id=eq.${leadId}&business_id=eq.${encodeURIComponent(businessId)}&select=*&limit=1`);
  // Requests use the server role; confirm the actual returned tenant and ID.
  if (!Array.isArray(rows) || rows.length > 1 ||
      (rows.length === 1 && (!rows[0] || rows[0].business_id !== businessId ||
                            String(rows[0].id) !== leadId))) {
    throw new Error("Lead response could not be verified");
  }
  return rows[0] || null;
}
function verifiedRelatedRows(rows, businessId, leadId) {
  return Array.isArray(rows) && rows.every(row => row && typeof row === "object" &&
    !Array.isArray(row) && row.business_id === businessId && String(row.lead_id) === leadId);
}

export default async function handler(req, res) {
  if (!["GET", "DELETE"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  let auth; try { auth = await requireBusinessMember(req, ["owner"]); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: "Data subject controls are not enabled" });
  const leadId = id(req.method === "GET" ? req.query?.lead_id : parse(req.body)?.lead_id);
  if (!leadId) return res.status(400).json({ error: "Invalid lead ID" });
  try {
    const lead = await leadForBusiness(leadId, auth.businessId);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (req.method === "GET") {
      const [history, bookings, actions] = await Promise.all([
        request(`lead_history?lead_id=eq.${leadId}&business_id=eq.${encodeURIComponent(auth.businessId)}&select=*&order=created_at.asc`),
        request(`bookings?lead_id=eq.${leadId}&business_id=eq.${encodeURIComponent(auth.businessId)}&select=*&order=created_at.asc`),
        request(`actions?lead_id=eq.${leadId}&business_id=eq.${encodeURIComponent(auth.businessId)}&select=*&order=created_at.asc`)
      ]);
      if (![history, bookings, actions].every(rows => verifiedRelatedRows(rows, auth.businessId, leadId))) {
        throw new Error("Export rows could not be verified");
      }
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: "data_subject.exported", resourceType: "lead", resourceId: leadId, metadata: { format: "json" } });
      return res.status(200).json({ generated_at: new Date().toISOString(), lead, history, bookings, actions });
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
