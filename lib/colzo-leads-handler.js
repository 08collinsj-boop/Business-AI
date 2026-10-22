import {
  requireBusinessMember,
  sendAuthError
} from "./auth.js";
import { recordAuditEvent } from "./audit.js";

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

async function completeAutomaticFollowUps(leadId, businessId) {
  const now = new Date().toISOString();
  try {
    const updated = await supabaseRequest(
      `actions?business_id=eq.${encodeURIComponent(String(businessId))}&lead_id=eq.${encodeURIComponent(String(leadId))}&action_type=eq.follow_up&status=eq.pending&title=eq.${encodeURIComponent("Automatic follow-up")}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ status: "completed", completed_at: now, updated_at: now })
      }
    );
    return Array.isArray(updated) ? updated : [];
  } catch {
    return [];
  }
}

function safeLeadId(value) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validLeadId(value) {
  return safeLeadId(value) !== null;
}

function validLeadVersion(value) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}

// Colzo Preview-only write confirmations, preserving the immutable legacy API.
// A database write may have committed even if confirmation is incomplete;
// never retry it automatically and never report success without the saved row.
function confirmedSavedLead(rows, businessId, expectedId = null, expectedFields = {}) {
  const records = Array.isArray(rows) ? rows : [rows];
  if (records.length !== 1) return null;
  const saved = records[0];
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return null;
  if (safeLeadId(saved.id) === null || saved.business_id !== businessId) return null;
  if (expectedId !== null && safeLeadId(saved.id) !== safeLeadId(expectedId)) return null;
  for (const [field, expected] of Object.entries(expectedFields)) {
    if (field === "estimated_value") {
      if (!Number.isFinite(Number(saved[field])) || Number(saved[field]) !== Number(expected)) return null;
    } else if (saved[field] !== expected) return null;
  }
  return saved;
}

function validFollowUpDate(value) {
  if (value === null || value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function ownerText(value, maximum) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}



export default async function handler(req, res) {
  try {

    let auth;
    if (req.method === "GET" || req.method === "POST" || req.method === "PATCH") {
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


    // CREATE LEAD FROM OWNER WORKSPACE
    if (req.method === "POST") {
      if (!auth?.enforced || !auth.businessId) {
        return res.status(403).json({ error: "Authentication is required" });
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

      const allowedFields = new Set(["name", "phone", "email", "location", "job_type", "description", "priority", "estimated_value"]);
      if (Object.keys(body).some((key) => !allowedFields.has(key))) {
        return res.status(400).json({ error: "Unsupported lead fields" });
      }

      const name = ownerText(body.name, 200);
      const phone = ownerText(body.phone, 80);
      const email = ownerText(body.email, 320);
      if (!name && !phone && !email) {
        return res.status(400).json({ error: "Add a name, phone number or email" });
      }

      const priority = body.priority === "High" ? "High" : "Normal";
      const estimatedValue = Number(body.estimated_value || 0);
      if (!Number.isFinite(estimatedValue) || estimatedValue < 0) {
        return res.status(400).json({ error: "Invalid estimated value" });
      }

      const lead = {
        business_id: auth.businessId,
        name: name || null,
        phone: phone || null,
        email: email || null,
        location: ownerText(body.location, 300) || null,
        job_type: ownerText(body.job_type, 200) || null,
        description: ownerText(body.description, 5000) || null,
        urgency: "Normal",
        qualified: false,
        status: "New",
        estimated_value: estimatedValue,
        notes: "",
        priority,
        follow_up_date: null
      };

      const rows = await supabaseRequest("leads", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(lead)
      });
      if (Array.isArray(rows) && rows.length === 0) {
        return res.status(409).json({ error: "Lead creation could not be confirmed; reload before retrying" });
      }
      const created = confirmedSavedLead(rows, auth.businessId, null, { name: lead.name, status: "New" });
      if (!created) {
        return res.status(503).json({ error: "Lead creation could not be confirmed; reload before retrying" });
      }
      await recordAuditEvent({
        businessId: auth.businessId,
        actorUserId: auth.userId,
        action: "lead.manual_created",
        resourceType: "lead",
        resourceId: created?.id ? String(created.id) : null,
        metadata: { source: "owner_dashboard" }
      });
      return res.status(201).json(created);
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

      const allowedFields = new Set(["id", "status", "estimated_value", "notes", "priority", "follow_up_date", "expected_updated_at"]);
      if (Object.keys(body).some((key) => !allowedFields.has(key))) {
        return res.status(400).json({ error: "Unsupported lead fields" });
      }

      const id = body.id;

      if (!validLeadId(id)) {
        return res.status(400).json({
          error: "Invalid lead ID"
        });
      }

      const expectedUpdatedAt = body.expected_updated_at;
      if (!validLeadVersion(expectedUpdatedAt)) {
        return res.status(400).json({ error: "Reload the enquiry before saving; expected_updated_at is required" });
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

      if (!validLeadVersion(current.updated_at)) {
        return res.status(503).json({ error: "Enquiry version is unavailable; reload before retrying" });
      }
      // Compare the exact returned value: JavaScript dates lose microseconds.
      if (current.updated_at !== expectedUpdatedAt) {
        return res.status(409).json({ error: "This enquiry changed since you opened it. Your draft has not been saved. Reload before retrying." });
      }


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
        )}${tenantFilter}&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}`;


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


      if (Array.isArray(updated) && updated.length === 0) {
        return res.status(409).json({ error: "Lead update could not be confirmed; reload before retrying" });
      }
      const updatedLead = confirmedSavedLead(
        updated, auth.enforced ? auth.businessId : current.business_id, id, updates
      );
      if (!updatedLead || !validLeadVersion(updatedLead.updated_at) || updatedLead.updated_at === expectedUpdatedAt) {
        return res.status(503).json({ error: "Lead update could not be confirmed; reload before retrying" });
      }

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

      if (auth.enforced && updates.status && updates.status !== "New") {
        const completed = await completeAutomaticFollowUps(id, auth.businessId);
        if (completed.length) {
          await recordHistory(id, auth.businessId, "Automatic follow-up completed", "Pending", updates.status);
          await recordAuditEvent({
            businessId: auth.businessId,
            actorUserId: auth.userId,
            action: "follow_up.automatic_completed",
            resourceType: "lead",
            resourceId: String(id),
            metadata: { lead_status: updates.status, actions_completed: completed.length }
          });
        }
      }

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
