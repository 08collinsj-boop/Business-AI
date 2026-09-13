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

async function getSettings() {
  const settings = await supabaseRequest(
    "business_settings?select=*&order=id.asc&limit=1"
  );

  if (Array.isArray(settings) && settings.length > 0) {
    return settings[0];
  }

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
      const settings = await getSettings();

      return res.status(200).json(settings);
    }


    // UPDATE SETTINGS
    if (req.method === "PATCH") {

      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body)
          : req.body || {};

      const current = await getSettings();

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

      for (const field of textFields) {

        if (body[field] !== undefined) {

          updates[field] =
            String(body[field] || "").trim();
        }
      }


      // URGENT JOBS
      if (body.urgent_jobs_enabled !== undefined) {

        updates.urgent_jobs_enabled =
          Boolean(body.urgent_jobs_enabled);
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
          )}`,
          {
            method: "PATCH",

            headers: {
              Prefer: "return=representation"
            },

            body: JSON.stringify(updates)
          }
        );


      return res.status(200).json(
        Array.isArray(updated)
          ? updated[0] || null
          : updated
      );
    }


    return res.status(405).json({
      error: "Method not allowed"
    });


  } catch (error) {

    console.error(
      "Settings API error:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Could not process settings"
    });
  }
}
