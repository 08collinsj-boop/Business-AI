import { normalisePublicBusinessSlug, resolvePublicBusinessRoute } from "./public-tenant.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) throw new Error("Database request failed");
  return data;
}

function publicText(value, maximum = 500) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

async function resolvePublicBusiness(rawSlug) {
  return resolvePublicBusinessRoute({
    findActivePublicSlug: async (slug) => {
      const rows = await request(
        `business_public_routes?route_type=eq.slug&route_value=eq.${encodeURIComponent(slug)}&active=eq.true&select=business_id,route_type,route_value,active&limit=1`
      );
      return rows?.[0] || null;
    }
  }, rawSlug);
}

// This is intentionally a small, public business card—not a configuration
// endpoint. The server resolves the public slug before selecting its fields,
// and never returns the tenant's internal ID, AI instructions or customer data.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const slug = normalisePublicBusinessSlug(req.query?.business ?? req.query?.slug);
  if (!slug) return res.status(404).json({ error: "Business not available" });
  try {
    const tenant = await resolvePublicBusiness(slug);
    if (!tenant) return res.status(404).json({ error: "Business not available" });
    const [settingsRows, configurationRows] = await Promise.all([
      request(`business_settings?business_id=eq.${encodeURIComponent(tenant.businessId)}&select=business_name,business_type,phone,opening_hours,services&limit=1`),
      request(`business_configurations?business_id=eq.${encodeURIComponent(tenant.businessId)}&select=description,service_areas&limit=1`)
    ]);
    const settings = settingsRows?.[0];
    if (!settings) return res.status(404).json({ error: "Business not available" });
    const configuration = configurationRows?.[0] || {};
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      business: {
        name: publicText(settings.business_name, 120) || "Business enquiry",
        type: publicText(settings.business_type, 120),
        description: publicText(configuration.description, 500),
        services: publicText(settings.services, 500),
        service_areas: publicText(configuration.service_areas, 300),
        opening_hours: publicText(settings.opening_hours, 300),
        phone: publicText(settings.phone, 80)
      }
    });
  } catch {
    return res.status(503).json({ error: "Business is temporarily unavailable" });
  }
}
