import { requireAuthenticatedUser, sendAuthError } from "../lib/auth.js";
import { normalisePublicBusinessSlug } from "../lib/public-tenant.js";
import { recordAuditEvent } from "../lib/audit.js";

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
  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : "";
    const invalidReferral = /invalid referral code/i.test(message);
    const publicRouteConflict = /business or public route already exists/i.test(message);
    const error = new Error(invalidReferral ? "Invalid referral code" : publicRouteConflict ? "Public route unavailable" : "Database request failed");
    error.status = response.status;
    if (publicRouteConflict) error.code = "PUBLIC_ROUTE_CONFLICT";
    throw error;
  }
  return data;
}
function parseBody(value) { try { const body = typeof value === "string" ? JSON.parse(value) : value || {}; return body && typeof body === "object" && !Array.isArray(body) ? body : null; } catch { return null; } }
function validate(body) {
  // public_slug remains accepted only so a stale cached signup page cannot break;
  // the server ignores it and always owns public route generation.
  const allowed = new Set(["business_name", "business_type", "public_slug", "referral_code"]);
  if (!body || Object.keys(body).some((key) => !allowed.has(key))) throw new Error("Invalid business details");
  const businessName = typeof body.business_name === "string" ? body.business_name.trim() : "";
  const businessType = typeof body.business_type === "string" ? body.business_type.trim() : "";
  const rawReferralCode = typeof body.referral_code === "string" ? body.referral_code.trim().toUpperCase() : "";
  const referralCode = rawReferralCode || null;
  if (businessName.length < 2 || businessName.length > 120 || businessType.length > 120) throw new Error("Invalid business details");
  if (referralCode && !/^BAI-[A-Z0-9]{10}$/.test(referralCode)) throw new Error("Invalid referral code");
  return { businessName, businessType, referralCode };
}
function slugBaseFromBusinessName(businessName) {
  let slug = String(businessName || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 63)
    .replace(/-+$/g, "");
  if (!slug) slug = "business";
  if (slug.length === 2) slug = `${slug}-co`;
  return normalisePublicBusinessSlug(slug) || "business";
}
function slugCandidate(base, attempt) {
  if (attempt === 1) return base;
  const suffix = `-${attempt}`;
  const stem = base.slice(0, 63 - suffix.length).replace(/-+$/g, "") || "business";
  return normalisePublicBusinessSlug(`${stem}${suffix}`) || `business-${attempt}`;
}
async function memberships(userId) {
  const rows = await request(`business_memberships?user_id=eq.${encodeURIComponent(userId)}&select=business_id,role&limit=2`);
  return Array.isArray(rows) ? rows : [];
}
async function activePublicSlug(businessId) {
  const rows = await request(
    `business_public_routes?business_id=eq.${encodeURIComponent(businessId)}&route_type=eq.slug&active=eq.true&select=route_value&limit=2`
  );
  const slug = Array.isArray(rows) && rows.length === 1 ? rows[0]?.route_value : null;
  return normalisePublicBusinessSlug(slug);
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  let auth;
  try { auth = await requireAuthenticatedUser(req); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: "Business onboarding is not enabled" });
  try {
    const existing = await memberships(auth.userId);
    if (req.method === "GET") {
      if (existing.length === 0) return res.status(200).json({ needs_business: true });
      const publicSlug = await activePublicSlug(existing[0].business_id);
      if (!publicSlug) return res.status(503).json({ error: "Business public route is unavailable" });
      return res.status(200).json({ needs_business: false, public_slug: publicSlug, role: existing[0].role });
    }
    if (existing.length) return res.status(409).json({ error: "This account already belongs to a business" });
    const body = parseBody(req.body);
    if (!body) return res.status(400).json({ error: "Invalid business details" });
    const { businessName, businessType, referralCode } = validate(body);
    const baseSlug = slugBaseFromBusinessName(businessName);
    let created = null;
    let publicSlug = null;
    for (let attempt = 1; attempt <= 50; attempt += 1) {
      const candidate = slugCandidate(baseSlug, attempt);
      try {
        const result = await request("rpc/create_business_for_owner_with_referral", {
          method: "POST", headers: { Prefer: "return=representation" },
          body: JSON.stringify({ p_owner_user_id: auth.userId, p_business_name: businessName, p_business_type: businessType, p_public_slug: candidate, p_referral_code: referralCode })
        });
        created = Array.isArray(result) ? result[0] : result;
        if (!created?.business_id || created.public_slug !== candidate) throw new Error("Database request failed");
        publicSlug = candidate;
        break;
      } catch (error) {
        if (error?.code === "PUBLIC_ROUTE_CONFLICT" && attempt < 50) continue;
        throw error;
      }
    }
    if (!created?.business_id || !publicSlug) throw new Error("Database request failed");
    await recordAuditEvent({ businessId: created.business_id, actorUserId: auth.userId, action: "business.created", resourceType: "business", resourceId: created.business_id, metadata: { public_slug: publicSlug } });
    return res.status(201).json({ public_slug: publicSlug, public_path: `/customer?business=${encodeURIComponent(publicSlug)}` });
  } catch (error) {
    if (/^Invalid referral code/.test(error?.message || "")) return res.status(400).json({ error: "Referral code is not valid" });
    if (/^Invalid business details/.test(error?.message || "")) return res.status(400).json({ error: "Invalid business details" });
    if (error?.code === "PUBLIC_ROUTE_CONFLICT") return res.status(409).json({ error: "Could not create a unique customer link. Please try again." });
    if (error?.status === 409 || error?.status === 400) return res.status(409).json({ error: "That business name is unavailable" });
    console.error("Business onboarding API error");
    return res.status(500).json({ error: "Could not create the business" });
  }
}
