import { requireBusinessAdmin, sendAuthError } from "./_auth.js";
const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  let auth; try { auth = await requireBusinessAdmin(req); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: "Audit log is not enabled" });
  try {
    if (!url || !key) throw new Error("Server unavailable");
    const response = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/business_audit_events?business_id=eq.${encodeURIComponent(auth.businessId)}&select=id,actor_user_id,action,resource_type,resource_id,metadata,created_at&order=created_at.desc&limit=100`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!response.ok) throw new Error("Database request failed");
    const rows = await response.json(); return res.status(200).json(Array.isArray(rows) ? rows : []);
  } catch { return res.status(500).json({ error: "Could not load audit log" }); }
}
