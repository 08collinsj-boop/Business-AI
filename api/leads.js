const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function supabaseUrl(path) {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL is not configured");
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(supabaseUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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

export default async function handler(req, res) {
  try {

    // GET ALL LEADS
    if (req.method === "GET") {

      const leads = await supabaseRequest(
        "leads?select=*&order=created_at.desc"
      );

      return res.status(200).json(
        Array.isArray(leads) ? leads : []
      );
    }


    // UPDATE LEAD
    if (req.method === "PATCH") {

      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body)
          : req.body || {};

      const id = body.id;

      if (!id) {
        return res.status(400).json({
          error: "Lead ID is required"
        });
      }

      const updates = {};


      // STATUS
      if (body.status !== undefined) {

        const status =
          String(body.status).trim();

        const allowedStatuses = [
          "New",
          "Contacted",
          "Converted"
        ];

        if (!allowedStatuses.includes(status)) {
          return res.status(400).json({
            error: "Invalid status"
          });
        }

        updates.status = status;
      }


      // ESTIMATED VALUE
      if (body.estimated_value !== undefined) {

        const value =
          Number(body.estimated_value);

        if (Number.isNaN(value) || value < 0) {
          return res.status(400).json({
            error: "Invalid estimated value"
          });
        }

        updates.estimated_value = value;
      }


      // NOTES
      if (body.notes !== undefined) {

        updates.notes =
          String(body.notes || "");
      }


      // PRIORITY
      if (body.priority !== undefined) {

        const priority =
          String(body.priority).trim();

        const allowedPriorities = [
          "Normal",
          "High"
        ];

        if (!allowedPriorities.includes(priority)) {
          return res.status(400).json({
            error: "Invalid priority"
          });
        }

        updates.priority = priority;
      }


      // FOLLOW-UP DATE
      if (body.follow_up_date !== undefined) {

        updates.follow_up_date =
          body.follow_up_date || null;
      }


      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: "No changes supplied"
        });
      }


      const query =
        `leads?id=eq.${encodeURIComponent(String(id))}`;


      const updated =
        await supabaseRequest(query, {

          method: "PATCH",

          headers: {
            Prefer: "return=representation"
          },

          body: JSON.stringify(updates)

        });


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
      "Leads API error:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Could not process lead"
    });
  }
}
