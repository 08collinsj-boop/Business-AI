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

function text(value, maximum = 500) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function publicMediaUrl(path) {
  const value = text(path, 700);
  if (!value || !SUPABASE_URL) return "";
  const encoded = value.split("/").map(segment => encodeURIComponent(segment)).join("/");
  return `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/business-profile-media/${encoded}`;
}

function queryText(value) {
  if (value == null) return "";
  if (typeof value !== "string") return null;
  const result = value.trim().replace(/\s+/g, " ");
  if (result.length > 80) return null;
  return result.toLowerCase();
}

function relevance(item, query) {
  if (!query) return 50;
  const name = item.name.toLowerCase();
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  const fields = [item.type, item.services, item.service_areas, item.description]
    .join(" ")
    .toLowerCase();
  return fields.includes(query) ? 3 : 99;
}

// Public directory results deliberately expose only business-facing fields
// already intended for customer discovery. Internal tenant IDs never leave
// this handler.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const query = queryText(req.query?.q);
  if (query === null) return res.status(400).json({ error: "Search is too long" });

  try {
    const routes = await request(
      "business_public_routes?route_type=eq.slug&active=eq.true&select=business_id,route_value&limit=200"
    );
    const safeRoutes = (Array.isArray(routes) ? routes : []).filter(route =>
      typeof route?.business_id === "string"
      && typeof route?.route_value === "string"
      && route.route_value.length >= 3
    );
    if (!safeRoutes.length) {
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      return res.status(200).json({ businesses: [] });
    }

    const ids = [...new Set(safeRoutes.map(route => route.business_id))];
    const inFilter = ids.map(value => encodeURIComponent(value)).join(",");
    const [settingsRows, configurationRows] = await Promise.all([
      request(
        `business_settings?business_id=in.(${inFilter})&directory_search_enabled=eq.true&select=business_id,business_name,business_type,services,directory_search_enabled,profile_image_path&limit=200`
      ),
      request(
        `business_configurations?business_id=in.(${inFilter})&select=business_id,description,service_areas&limit=200`
      )
    ]);

    const settings = new Map((Array.isArray(settingsRows) ? settingsRows : []).map(row => [row.business_id, row]));
    const configurations = new Map((Array.isArray(configurationRows) ? configurationRows : []).map(row => [row.business_id, row]));

    const businesses = safeRoutes
      .map(route => {
        const setting = settings.get(route.business_id);
        if (!setting) return null;
        const configuration = configurations.get(route.business_id) || {};
        const item = {
          slug: text(route.route_value, 63),
          name: text(setting.business_name, 120) || "Business",
          type: text(setting.business_type, 120),
          description: text(configuration.description, 280),
          services: text(setting.services, 280),
          service_areas: text(configuration.service_areas, 180),
          profile_image_url: publicMediaUrl(setting.profile_image_path)
        };
        return { ...item, score: relevance(item, query) };
      })
      .filter(Boolean)
      .filter(item => !query || item.score < 99)
      .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, "en-GB"))
      .slice(0, 20)
      .map(({ score, ...item }) => ({
        ...item,
        message_path: `/customer?business=${encodeURIComponent(item.slug)}`,
        profile_path: `/customer?business=${encodeURIComponent(item.slug)}&view=profile`
      }));

    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    return res.status(200).json({ businesses });
  } catch {
    return res.status(503).json({ error: "Business search is temporarily unavailable" });
  }
}
