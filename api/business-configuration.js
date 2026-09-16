import { requireBusinessAdmin, requireBusinessMember, sendAuthError } from "./_auth.js";
import { getIndustryTemplates, validateBusinessConfiguration } from "./_business-configuration.js";
import { recordAuditEvent } from "./_audit.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function supabaseUrl(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Server configuration unavailable");
  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
}
async function request(path, options = {}) {
  const response = await fetch(supabaseUrl(path), { ...options, headers: { "Content-Type": "application/json", apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, ...(options.headers || {}) } });
  const raw = await response.text(); let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) throw new Error("Database request failed");
  return data;
}
function parseBody(value) {
  try { const body = typeof value === "string" ? JSON.parse(value) : value || {}; return body && typeof body === "object" && !Array.isArray(body) ? body : null; } catch { return null; }
}
async function getConfiguration(businessId) {
  const rows = await request(`business_configurations?business_id=eq.${encodeURIComponent(businessId)}&select=*&limit=1`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

export default async function handler(req, res) {
  if (!["GET", "PATCH"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  let auth;
  try { auth = req.method === "PATCH" ? await requireBusinessAdmin(req) : await requireBusinessMember(req); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: "Business configuration is not enabled" });
  try {
    if (req.method === "GET") {
      const configuration = await getConfiguration(auth.businessId);
      if (!configuration) return res.status(404).json({ error: "Business configuration not found" });
      return res.status(200).json({ configuration, templates: getIndustryTemplates() });
    }
    const body = parseBody(req.body);
    if (!body) return res.status(400).json({ error: "Invalid request body" });
    const updates = validateBusinessConfiguration(body);
    updates.updated_at = new Date().toISOString();
    const rows = await request(`business_configurations?business_id=eq.${encodeURIComponent(auth.businessId)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(updates) });
    const configuration = Array.isArray(rows) ? rows[0] || null : rows;
    if (!configuration) return res.status(404).json({ error: "Business configuration not found" });
    await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: "configuration.updated", resourceType: "business_configuration", resourceId: auth.businessId, metadata: { fields: Object.keys(updates).filter((key) => key !== "updated_at").sort().join(",") } });
    return res.status(200).json({ configuration, templates: getIndustryTemplates() });
  } catch (error) {
    if (/^(Invalid|Unsupported|No changes)/.test(error?.message || "")) return res.status(400).json({ error: error.message });
    console.error("Business configuration API error");
    return res.status(500).json({ error: "Could not process business configuration" });
  }
}
