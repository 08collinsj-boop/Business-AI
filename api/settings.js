import {
  requireBusinessMember,
  requireBusinessAdmin,
  sendAuthError
} from "../lib/auth.js";
import { recordAuditEvent } from "../lib/audit.js";
import { normaliseReviewPlatform, normaliseReviewUrl, reviewDestination } from "../lib/review-requests.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function supabaseUrl(path) {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL is not configured");
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured"
    );
  }

  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(supabaseUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization:
        `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      typeof data === "string"
        ? data
        : data?.message ||
          data?.error ||
          `Supabase error ${response.status}`
    );
  }

  return data;
}

async function getSettings(businessId = null) {
  const tenantFilter = businessId
    ? `&business_id=eq.${encodeURIComponent(String(businessId))}`
    : "";
  const settings = await supabaseRequest(
    `business_settings?select=*&order=id.asc&limit=1${tenantFilter}`
  );

  if (Array.isArray(settings) && settings.length > 0) {
    return settings[0];
  }

  // A tenant's settings must be provisioned server-side, never from an unauthorised request.
  if (businessId) return null;

  const created = await supabaseRequest(
    "business_settings",
    {
      method: "POST",
      headers: {
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        business_name: "My Business"
      })
    }
  );

  return Array.isArray(created)
    ? created[0]
    : created;
}

export default async function handler(req, res) {
  try {

    // GET SETTINGS
    if (req.method === "GET") {
      let auth;
      try {
        auth = await requireBusinessMember(req);
      } catch (error) {
        return sendAuthError(res, error);
      }
      const settings = await getSettings(auth.enforced ? auth.businessId : null);

      if (!settings && auth.enforced) {
        return res.status(404).json({ error: "Business settings not found" });
      }

      return res.status(200).json(settings);
    }


    // UPDATE SETTINGS
    if (req.method === "PATCH") {

      let auth;
      try {
        auth = await requireBusinessAdmin(req);
      } catch (error) {
        return sendAuthError(res, error);
      }

      let body;
      try {
        body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      } catch {
        return res.status(400).json({ error: "Invalid request body" });
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({ error: "Invalid request body" });
      }

      const current = await getSettings(auth.enforced ? auth.businessId : null);

      if (!current && auth.enforced) {
        return res.status(404).json({ error: "Business settings not found" });
      }

      const updates = {};

      const textFields = [
        "business_name",
        "business_type",
        "phone",
        "email",
        "address",
        "opening_hours",
        "services",
        "ai_instructions"
      ];
      const allowedFields = new Set([...textFields, "urgent_jobs_enabled", "directory_search_enabled", "automatic_follow_up_enabled", "automatic_follow_up_hours", "review_requests_enabled", "review_google_url", "review_facebook_url", "review_preferred_platform"]);
      if (Object.keys(body).some((field) => !allowedFields.has(field))) {
        return res.status(400).json({ error: "Unsupported settings fields" });
      }

      for (const field of textFields) {

        if (body[field] !== undefined) {

          if (typeof body[field] !== "string" || body[field].length > 10000) {
            return res.status(400).json({ error: `Invalid ${field}` });
          }

          updates[field] =
            body[field].trim();
        }
      }


      // URGENT JOBS
      if (body.urgent_jobs_enabled !== undefined) {

        if (typeof body.urgent_jobs_enabled !== "boolean") {
          return res.status(400).json({ error: "Invalid urgent jobs setting" });
        }

        updates.urgent_jobs_enabled = body.urgent_jobs_enabled;
      }

      // AUTOMATIC FOLLOW-UP REMINDERS
      if (body.automatic_follow_up_enabled !== undefined) {
        if (typeof body.automatic_follow_up_enabled !== "boolean") {
          return res.status(400).json({ error: "Invalid automatic follow-up setting" });
        }
        updates.automatic_follow_up_enabled = body.automatic_follow_up_enabled;
      }

      if (body.automatic_follow_up_hours !== undefined) {
        const hours = Number(body.automatic_follow_up_hours);
        if (!Number.isInteger(hours) || ![24, 48, 72].includes(hours)) {
          return res.status(400).json({ error: "Invalid automatic follow-up delay" });
        }
        updates.automatic_follow_up_hours = hours;
      }

      // REVIEW REQUESTS — owner/admin controlled; customer messaging remains manual.
      if (body.review_requests_enabled !== undefined) {
        if (typeof body.review_requests_enabled !== "boolean") {
          return res.status(400).json({ error: "Invalid review request setting" });
        }
        updates.review_requests_enabled = body.review_requests_enabled;
      }

      for (const [field, platform] of [["review_google_url", "google"], ["review_facebook_url", "facebook"]]) {
        if (body[field] === undefined) continue;
        if (typeof body[field] !== "string") return res.status(400).json({ error: "Invalid review link" });
        const cleaned = normaliseReviewUrl(platform, body[field]);
        if (cleaned === null) return res.status(400).json({ error: `Enter a valid ${platform === "google" ? "Google" : "Facebook"} review link using HTTPS` });
        updates[field] = cleaned;
      }

      if (body.review_preferred_platform !== undefined) {
        const platform = normaliseReviewPlatform(body.review_preferred_platform);
        if (!platform) return res.status(400).json({ error: "Invalid preferred review platform" });
        updates.review_preferred_platform = platform;
      }

      const nextReviewSettings = { ...current, ...updates };
      if (nextReviewSettings.review_requests_enabled && !reviewDestination(nextReviewSettings)) {
        return res.status(400).json({ error: "Add a valid Google or Facebook review link before enabling review requests" });
      }

      // PUBLIC DIRECTORY DISCOVERABILITY — owner only.
      // Turning this off never disables the business's direct public link.
      if (body.directory_search_enabled !== undefined) {
        if (typeof body.directory_search_enabled !== "boolean") {
          return res.status(400).json({ error: "Invalid directory search setting" });
        }
        if (auth.enforced && auth.role !== "owner") {
          return res.status(403).json({ error: "Only the business owner can change directory visibility" });
        }
        updates.directory_search_enabled = body.directory_search_enabled;
      }


      if (Object.keys(updates).length === 0) {

        return res.status(400).json({
          error: "No changes supplied"
        });

      }


      updates.updated_at =
        new Date().toISOString();


      const updated =
        await supabaseRequest(
          `business_settings?id=eq.${encodeURIComponent(
            String(current.id)
          )}${auth.enforced ? `&business_id=eq.${encodeURIComponent(String(auth.businessId))}` : ""}`,
          {
            method: "PATCH",

            headers: {
              Prefer: "return=representation"
            },

            body: JSON.stringify(updates)
          }
        );


      const result = Array.isArray(updated) ? updated[0] || null : updated;
      if (auth.enforced && result) await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: "settings.updated", resourceType: "business_settings", resourceId: String(current.id), metadata: { fields: Object.keys(updates).filter((key) => key !== "updated_at").sort().join(",") } });
      return res.status(200).json(result);
    }


    return res.status(405).json({
      error: "Method not allowed"
    });


  } catch (error) {

    console.error("Settings API error");

    return res.status(500).json({
      error: "Could not process settings"
    });
  }
}
