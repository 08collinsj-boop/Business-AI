import {
  requireBusinessMember,
  sendAuthError
} from "./_auth.js";
import { recordAuditEvent } from "./_audit.js";

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
  businessId,
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
        business_id: businessId,
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

function validLeadId(value) {
  return /^(?:[1-9]\d*)$/.test(String(value));
}

function validFollowUpDate(value) {
  if (value === null || value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}


export default async function handler(req, res) {
  try {

    let auth;
    if (req.method === "GET" || req.method === "PATCH") {
      try {
        auth = await requireBusinessMember(req);
      } catch (error) {
        return sendAuthError(res, error);
      }
    }

    // GET ALL LEADS
    if (req.method === "GET") {

      const tenantFilter = auth.enforced
        ? `&business_id=eq.${encodeURIComponent(String(auth.businessId))}`
        : "";

      const leads = await supabaseRequest(
        `leads?select=*&order=created_at.desc${tenantFilter}`
      );

      return res.status(200).json(
        Array.isArray(leads)
          ? leads
          : []
      );
    }


    // UPDATE LEAD
    if (req.method === "PATCH") {

      let body;
      try {
        body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      } catch {
        return res.status(400).json({ error: "Invalid request body" });
      }

      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({ error: "Invalid request body" });
      }

      const allowedFields = new Set(["id", "status", "estimated_value", "notes", "priority", "follow_up_date"]);
      if (Object.keys(body).some((key) => !allowedFields.has(key))) {
        return res.status(400).json({ error: "Unsupported lead fields" });
      }

      const id = body.id;

      if (!validLeadId(id)) {
        return res.status(400).json({
          error: "Invalid lead ID"
        });
      }

      const tenantFilter = auth.enforced
        ? `&business_id=eq.${encodeURIComponent(String(auth.businessId))}`
        : "";


      // Get the current lead first
      const currentResults =
        await supabaseRequest(
          `leads?id=eq.${encodeURIComponent(
            String(id)
          )}${tenantFilter}&select=*`
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
          !Number.isFinite(value) ||
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

        if (typeof body.notes !== "string" || body.notes.length > 5000) {
          return res.status(400).json({ error: "Invalid notes" });
        }

        const notes = body.notes;

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

        if (!validFollowUpDate(body.follow_up_date)) {
          return res.status(400).json({ error: "Invalid follow-up date" });
        }

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
        )}${tenantFilter}`;


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
          current.business_id,
          change.action,
          change.oldValue,
          change.newValue
        );
      }

      if (auth.enforced && updatedLead) await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: "lead.updated", resourceType: "lead", resourceId: String(id), metadata: { fields: Object.keys(updates).sort().join(",") } });


      return res.status(200).json(
        updatedLead
      );
    }


    return res.status(405).json({
      error: "Method not allowed"
    });


  } catch (error) {

    console.error("Leads API error");

    return res.status(500).json({
      error: "Could not process lead"
    });
  }
}
