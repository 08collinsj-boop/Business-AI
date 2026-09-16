import { requireAuthenticatedUser, sendAuthError } from "./_auth.js";
import { normalisePublicBusinessSlug } from "./_public-tenant.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function endpoint(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Server unavailable");
  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
}
async function request(path, options = {}) {
  const response = await fetch(endpoint(path), { ...options, headers: { "Content-Type": "application/json", apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, ...(options.headers || {}) } });
  const raw = await response.text(); let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) { const error = new Error("Database request failed"); error.status = response.status; throw error; }
  return data;
}
function parseBody(value) { try { const body = typeof value === "string" ? JSON.parse(value) : value || {}; return body && typeof body === "object" && !Array.isArray(body) ? body : null; } catch { return null; } }
function validate(body) {
  const allowed = new Set(["business_name", "business_type", "public_slug"]);
  if (!body || Object.keys(body).some((key) => !allowed.has(key))) throw new Error("Invalid business details");
  const businessName = typeof body.business_name === "string" ? body.business_name.trim() : "";
  const businessType = typeof body.business_type === "string" ? body.business_type.trim() : "";
  const publicSlug = normalisePublicBusinessSlug(body.public_slug);
  if (businessName.length < 2 || businessName.length > 120 || businessType.length > 120 || !publicSlug) throw new Error("Invalid business details");
  return { businessName, businessType, publicSlug };
}
async function memberships(userId) {
  const rows = await request(`business_memberships?user_id=eq.${encodeURIComponent(userId)}&select=business_id&limit=2`);
  return Array.isArray(rows) ? rows : [];
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  let auth;
  try { auth = await requireAuthenticatedUser(req); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: "Business onboarding is not enabled" });
  try {
    const existing = await memberships(auth.userId);
    if (req.method === "GET") return res.status(200).json({ needs_business: existing.length === 0 });
    if (existing.length) return res.status(409).json({ error: "This account already belongs to a business" });
    const body = parseBody(req.body);
    if (!body) return res.status(400).json({ error: "Invalid business details" });
    const { businessName, businessType, publicSlug } = validate(body);
    const result = await request("rpc/create_business_for_owner", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ p_owner_user_id: auth.userId, p_business_name: businessName, p_business_type: businessType, p_public_slug: publicSlug })
    });
    const created = Array.isArray(result) ? result[0] : result;
    if (!created?.business_id || created.public_slug !== publicSlug) throw new Error("Database request failed");
    return res.status(201).json({ public_slug: publicSlug, public_path: `/?business=${encodeURIComponent(publicSlug)}` });
  } catch (error) {
    if (/^Invalid business details/.test(error?.message || "")) return res.status(400).json({ error: "Invalid business details" });
    if (error?.status === 409 || error?.status === 400) return res.status(409).json({ error: "That business name or public link is unavailable" });
    console.error("Business onboarding API error");
    return res.status(500).json({ error: "Could not create the business" });
  }
}
