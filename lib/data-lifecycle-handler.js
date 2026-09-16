import { requireBusinessAdmin, requireBusinessMember, sendAuthError } from "./auth.js";
import { recordAuditEvent } from "./audit.js";

const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function request(path, options = {}) {
  if (!url || !key) throw new Error("Server unavailable");
  const response = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${path}`, { ...options, headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}`, ...(options.headers || {}) } });
  const raw = await response.text(); let data = null; try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) throw new Error("Database request failed"); return data;
}
function parse(value) { try { const body = typeof value === "string" ? JSON.parse(value) : value || {}; return body && typeof body === "object" && !Array.isArray(body) ? body : null; } catch { return null; } }

export default async function handler(req, res) {
  if (!["GET", "PATCH"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  let auth; try { auth = req.method === "PATCH" ? await requireBusinessMember(req, ["owner"]) : await requireBusinessAdmin(req); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: "Data lifecycle controls are not enabled" });
  try {
    if (req.method === "GET") {
      const rows = await request(`business_data_lifecycle_policies?business_id=eq.${encodeURIComponent(auth.businessId)}&select=*&limit=1`);
      return res.status(200).json(Array.isArray(rows) ? rows[0] || null : rows);
    }
    const body = parse(req.body);
    if (!body || Object.keys(body).some((field) => !["lead_retention_days", "audit_retention_days"].includes(field))) return res.status(400).json({ error: "Invalid lifecycle policy" });
    const updates = {};
    if (body.lead_retention_days !== undefined) { if (!Number.isSafeInteger(body.lead_retention_days) || body.lead_retention_days < 30 || body.lead_retention_days > 3650) return res.status(400).json({ error: "Invalid lifecycle policy" }); updates.lead_retention_days = body.lead_retention_days; }
    if (body.audit_retention_days !== undefined) { if (!Number.isSafeInteger(body.audit_retention_days) || body.audit_retention_days < 365 || body.audit_retention_days > 3650) return res.status(400).json({ error: "Invalid lifecycle policy" }); updates.audit_retention_days = body.audit_retention_days; }
    if (!Object.keys(updates).length) return res.status(400).json({ error: "Invalid lifecycle policy" });
    updates.updated_at = new Date().toISOString();
    const rows = await request(`business_data_lifecycle_policies?business_id=eq.${encodeURIComponent(auth.businessId)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(updates) });
    const policy = Array.isArray(rows) ? rows[0] || null : rows;
    if (policy) await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: "lifecycle_policy.updated", resourceType: "data_lifecycle_policy", resourceId: auth.businessId, metadata: { fields: Object.keys(updates).filter((field) => field !== "updated_at").sort().join(",") } });
    return res.status(200).json(policy);
  } catch { return res.status(500).json({ error: "Could not process data lifecycle policy" }); }
}
