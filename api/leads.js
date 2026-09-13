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


// RECORD HISTORY
async function recordHistory(
  leadId,
  action,
  oldValue = "",
  newValue = ""
) {
  try {
    await supabaseRequest("lead_history", {
      method: "POST",

      headers: {
        Prefer: "return=minimal"
      },

      body: JSON.stringify({
        lead_id: leadId,
        action,
        old_value: String(oldValue ?? ""),
        new_value: String(newValue ?? "")
      })
    });
  } catch (error) {
    // History should never stop the main lead update
    console.error(
      "Could not record lead history:",
      error
    );
  }
}


export default async function handler(req, res) {
  try {

    // GET ALL LEADS
    if (req.method === "GET") {

      const leads = await supabaseRequest(
        "leads?select=*&order=created_at.desc"
      );

      return res.status(200).json(
        Array.isArray(leads)
          ? leads
          : []
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


      // Get the current lead first
      const currentResults =
        await supabaseRequest(
          `leads?id=eq.${encodeURIComponent(
            String(id)
          )}&select=*`
        );

      if (
        !Array.isArray(currentResults) ||
        currentResults.length === 0
      ) {
        return res.status(404).json({
          error: "Lead not found"
        });
      }

      const current =
        currentResults[0];


      const updates = {};
      const historyChanges = [];


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

        if (
          String(current.status || "") !==
          status
        ) {
          historyChanges.push({
            action: "Status changed",
            oldValue: current.status || "",
            newValue: status
          });
        }
      }


      // ESTIMATED VALUE
      if (
        body.estimated_value !== undefined
      ) {

        const value =
          Number(body.estimated_value);

        if (
          Number.isNaN(value) ||
          value < 0
        ) {
          return res.status(400).json({
            error: "Invalid estimated value"
          });
        }

        updates.estimated_value = value;

        if (
          Number(current.estimated_value || 0) !==
          value
        ) {
          historyChanges.push({
            action: "Estimated value changed",
            oldValue:
              current.estimated_value || 0,
            newValue: value
          });
        }
      }


      // NOTES
      if (body.notes !== undefined) {

        const notes =
          String(body.notes || "");

        updates.notes = notes;

        if (
          String(current.notes || "") !==
          notes
        ) {
          historyChanges.push({
            action: "Notes updated",
            oldValue: current.notes || "",
            newValue: notes
          });
        }
      }


      // PRIORITY
      if (body.priority !== undefined) {

        const priority =
          String(body.priority).trim();

        const allowedPriorities = [
          "Normal",
          "High"
        ];

        if (
          !allowedPriorities.includes(
            priority
          )
        ) {
          return res.status(400).json({
            error: "Invalid priority"
          });
        }

        updates.priority = priority;

        if (
          String(current.priority || "Normal") !==
          priority
        ) {
          historyChanges.push({
            action: "Priority changed",
            oldValue:
              current.priority || "Normal",
            newValue: priority
          });
        }
      }


      // FOLLOW-UP DATE
      if (
        body.follow_up_date !== undefined
      ) {

        const date =
          body.follow_up_date || null;

        updates.follow_up_date = date;

        if (
          String(
            current.follow_up_date || ""
          ) !== String(date || "")
        ) {
          historyChanges.push({
            action: "Follow-up date changed",
            oldValue:
              current.follow_up_date || "",
            newValue:
              date || ""
          });
        }
      }


      if (
        Object.keys(updates).length === 0
      ) {
        return res.status(400).json({
          error: "No changes supplied"
        });
      }


      const query =
        `leads?id=eq.${encodeURIComponent(
          String(id)
        )}`;


      const updated =
        await supabaseRequest(
          query,
          {
            method: "PATCH",

            headers: {
              Prefer:
                "return=representation"
            },

            body:
              JSON.stringify(updates)
          }
        );


      const updatedLead =
        Array.isArray(updated)
          ? updated[0] || null
          : updated;


      // Record every change
      for (
        const change of historyChanges
      ) {
        await recordHistory(
          id,
          change.action,
          change.oldValue,
          change.newValue
        );
      }


      return res.status(200).json(
        updatedLead
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
