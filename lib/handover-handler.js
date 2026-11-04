import { requireBusinessMember, sendAuthError } from "./auth.js";
import { recordAuditEvent } from "./audit.js";
import { isColzoRecordVersionEnabled } from "./public-config-handler.js";
const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const strictHandoverRows = (rows, businessId) => Array.isArray(rows) && rows.every(row =>
  row && typeof row === "object" && !Array.isArray(row)
  && uuid(row.id) && row.business_id === businessId);
const uuid = (value) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
function parse(value) { try { const body = typeof value === "string" ? JSON.parse(value) : value || {}; return body && typeof body === "object" && !Array.isArray(body) ? body : null; } catch { return null; } }
async function request(path, options = {}) { if (!url || !key) throw new Error("Server unavailable"); const response = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${path}`, { ...options, headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}`, ...(options.headers || {}) } }); const raw = await response.text(); let data = null; try { data = raw ? JSON.parse(raw) : null; } catch {} if (!response.ok) throw new Error("Database request failed"); return data; }
export default async function handler(req, res) { if (!["GET", "PATCH"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" }); let auth; try { auth = await requireBusinessMember(req); } catch (error) { return sendAuthError(res, error); } if (!auth.enforced) return res.status(503).json({ error: "Handovers are not enabled" }); const strict = isColzoRecordVersionEnabled(); try { if (req.method === "GET") { const rows = await request(`lead_handovers?business_id=eq.${encodeURIComponent(auth.businessId)}&select=*&order=created_at.desc`); if (strict && !strictHandoverRows(rows, auth.businessId)) throw new Error("Unverified handover read"); return res.status(200).json(Array.isArray(rows) ? rows : []); } const body = parse(req.body); if (!body || Object.keys(body).some((field) => !["id", "status"].includes(field)) || !uuid(body.id) || !["acknowledged", "resolved"].includes(body.status)) return res.status(400).json({ error: "Invalid handover update" }); const now = new Date().toISOString(); const updates = body.status === "acknowledged" ? { status: body.status, acknowledged_by: auth.userId, acknowledged_at: now, updated_at: now } : { status: body.status, resolved_by: auth.userId, resolved_at: now, updated_at: now }; const rows = await request(`lead_handovers?id=eq.${encodeURIComponent(body.id)}&business_id=eq.${encodeURIComponent(auth.businessId)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(updates) }); if (Array.isArray(rows) && rows.length === 0) return res.status(404).json({ error: "Handover not found" });
  const handover = Array.isArray(rows) ? rows[0] : rows;
  if (strict && (!strictHandoverRows(rows, auth.businessId) || rows.length !== 1
      || handover.id.toLowerCase() !== body.id.toLowerCase()
      || handover.status !== body.status
      || handover[body.status === "acknowledged" ? "acknowledged_by" : "resolved_by"] !== auth.userId)) {
    throw new Error("Unverified handover update");
  }
  if (!handover) return res.status(404).json({ error: "Handover not found" }); await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: `handover.${body.status}`, resourceType: "lead_handover", resourceId: body.id, metadata: { status: body.status } }); return res.status(200).json(handover); } catch { return res.status(500).json({ error: "Could not process handover" }); } }
