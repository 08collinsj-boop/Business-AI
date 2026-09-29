import QRCode from "qrcode";
import { normalisePublicBusinessSlug, resolvePublicBusinessRoute } from "./public-tenant.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function endpoint(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Server unavailable");
  return SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/" + path;
}

async function request(path) {
  const response = await fetch(endpoint(path), {
    headers: {
      Accept: "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY
    }
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) throw new Error("Database request failed");
  return data;
}

async function resolveBusiness(slug) {
  return resolvePublicBusinessRoute({
    findActivePublicSlug: async (value) => {
      const rows = await request(
        "business_public_routes?route_type=eq.slug&route_value=eq." + encodeURIComponent(value) + "&active=eq.true&select=business_id,route_type,route_value,active&limit=1"
      );
      return rows?.[0] || null;
    }
  }, slug);
}

function publicOrigin(req) {
  const configured = String(process.env.PUBLIC_APP_URL || "").trim();
  if (/^https:\/\//i.test(configured)) {
    try { return new URL(configured).origin; } catch {}
  }
  const host = String(req.headers?.host || "").trim();
  return host ? "https://" + host.replace(/[^A-Za-z0-9.:-]/g, "") : "https://business-ai-pilot.vercel.app";
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const slug = normalisePublicBusinessSlug(req.query?.business);
  if (!slug) return res.status(404).json({ error: "Business not available" });

  try {
    const business = await resolveBusiness(slug);
    if (!business) return res.status(404).json({ error: "Business not available" });
    const url = new URL("/customer", publicOrigin(req));
    url.searchParams.set("business", slug);
    url.searchParams.set("source", "qr");
    const format = req.query?.format === "png" ? "png" : "svg";
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    if (format === "png") {
      const png = await QRCode.toBuffer(url.toString(), { type: "png", width: 1024, margin: 3, errorCorrectionLevel: "M" });
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", 'attachment; filename="' + slug + '-business-ai-qr.png"');
      return res.status(200).send(png);
    }
    const svg = await QRCode.toString(url.toString(), { type: "svg", width: 512, margin: 3, errorCorrectionLevel: "M", color: { dark: "#071522", light: "#ffffff" } });
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    return res.status(200).send(svg);
  } catch {
    return res.status(503).json({ error: "QR code is temporarily unavailable" });
  }
}
