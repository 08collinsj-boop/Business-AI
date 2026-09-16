import {
  requireBusinessMember,
  sendAuthError
} from "./_auth.js";
import { recordAuditEvent } from "./_audit.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ACTION_TYPES = new Set([
  "call_customer", "send_quote", "follow_up", "confirm_appointment", "review_enquiry", "custom"
]);
const ACTION_STATUSES = new Set(["pending", "completed", "cancelled"]);
const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const TEXT_LIMITS = { title: 200, description: 5000 };

function supabaseUrl(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Server configuration unavailable");
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
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error("Database request failed");
  return data;
}

function parseBody(body) {
  try {
    const parsed = typeof body === "string" ? JSON.parse(body) : body || {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

function positiveId(value) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^(?:[1-9]\d*)$/.test(value)) return Number(value);
  return null;
}

function dateTime(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 64 || Number.isNaN(new Date(value).getTime())) throw new Error("Invalid due date");
  return new Date(value).toISOString();
}

function validateAction(body, creating) {
  const allowed = new Set(["lead_id", "booking_id", "title", "description", "action_type", "due_at", "priority", "status"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new Error("Unsupported action fields");
  const updates = {};
  for (const field of ["title", "description"]) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== "string" || body[field].length > TEXT_LIMITS[field] || (field === "title" && !body[field].trim())) throw new Error(`Invalid ${field}`);
    updates[field] = body[field].trim();
  }
  if (creating && updates.title === undefined) throw new Error("Invalid title");
  for (const field of ["lead_id", "booking_id"]) {
    if (body[field] === undefined) continue;
    if (body[field] === null || body[field] === "") updates[field] = null;
    else {
      const id = positiveId(body[field]);
      if (!id) throw new Error(`Invalid ${field === "lead_id" ? "lead" : "booking"} ID`);
      updates[field] = id;
    }
  }
  const dueAt = dateTime(body.due_at);
  if (dueAt !== undefined) updates.due_at = dueAt;
  if (body.action_type !== undefined) {
    if (typeof body.action_type !== "string" || !ACTION_TYPES.has(body.action_type)) throw new Error("Invalid action type");
    updates.action_type = body.action_type;
  }
  if (body.priority !== undefined) {
    if (typeof body.priority !== "string" || !PRIORITIES.has(body.priority)) throw new Error("Invalid priority");
    updates.priority = body.priority;
  }
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !ACTION_STATUSES.has(body.status)) throw new Error("Invalid action status");
    updates.status = body.status;
  }
  if (!creating && Object.keys(updates).length === 0) throw new Error("No changes supplied");
  return updates;
}

async function existsForBusiness(table, id, businessId) {
  if (!id) return true;
  const rows = await supabaseRequest(
    `${table}?id=eq.${encodeURIComponent(String(id))}&business_id=eq.${encodeURIComponent(String(businessId))}&select=id&limit=1`
  );
  return Array.isArray(rows) && rows.length === 1;
}

async function recordLeadHistory(leadId, businessId, action, oldValue = "", newValue = "") {
  if (!leadId) return;
  try {
    await supabaseRequest("lead_history", {
      method: "POST",
      body: JSON.stringify({ lead_id: leadId, business_id: businessId, action, old_value: oldValue, new_value: newValue })
    });
  } catch {
    // Activity history is best-effort and must not break an otherwise valid action update.
  }
}

export default async function handler(req, res) {
  if (!["GET", "POST", "PATCH"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  let auth;
  try { auth = await requireBusinessMember(req); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: "Actions are not enabled" });
  const businessId = auth.businessId;

  try {
    if (req.method === "GET") {
      const filters = [`business_id=eq.${encodeURIComponent(String(businessId))}`];
      if (req.query?.lead_id !== undefined) {
        const leadId = positiveId(req.query.lead_id);
        if (!leadId) return res.status(400).json({ error: "Invalid lead ID" });
        if (!await existsForBusiness("leads", leadId, businessId)) return res.status(404).json({ error: "Lead not found" });
        filters.push(`lead_id=eq.${encodeURIComponent(String(leadId))}`);
      }
      if (req.query?.booking_id !== undefined) {
        const bookingId = positiveId(req.query.booking_id);
        if (!bookingId) return res.status(400).json({ error: "Invalid booking ID" });
        if (!await existsForBusiness("bookings", bookingId, businessId)) return res.status(404).json({ error: "Booking not found" });
        filters.push(`booking_id=eq.${encodeURIComponent(String(bookingId))}`);
      }
      const rows = await supabaseRequest(`actions?${filters.join("&")}&select=*&order=due_at.asc.nullslast,created_at.desc`);
      return res.status(200).json(Array.isArray(rows) ? rows : []);
    }

    const body = parseBody(req.body);
    if (!body) return res.status(400).json({ error: "Invalid request body" });
    if (req.method === "POST") {
      const updates = validateAction(body, true);
      if (updates.lead_id && !await existsForBusiness("leads", updates.lead_id, businessId)) return res.status(404).json({ error: "Lead not found" });
      if (updates.booking_id && !await existsForBusiness("bookings", updates.booking_id, businessId)) return res.status(404).json({ error: "Booking not found" });
      if (updates.status === "completed") updates.completed_at = new Date().toISOString();
      const created = await supabaseRequest("actions", {
        method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ business_id: businessId, ...updates })
      });
      const result = Array.isArray(created) ? created[0] : created;
      await recordLeadHistory(result?.lead_id, businessId, "Action created", "", result?.title || "");
      if (result) await recordAuditEvent({ businessId, actorUserId: auth.userId, action: "action.created", resourceType: "action", resourceId: String(result.id), metadata: { status: result.status, action_type: result.action_type, priority: result.priority } });
      return res.status(201).json(result || null);
    }

    const actionId = positiveId(body.id);
    if (!actionId) return res.status(400).json({ error: "Invalid action ID" });
    const updates = validateAction(Object.fromEntries(Object.entries(body).filter(([key]) => key !== "id")), false);
    const currentRows = await supabaseRequest(
      `actions?id=eq.${encodeURIComponent(String(actionId))}&business_id=eq.${encodeURIComponent(String(businessId))}&select=*&limit=1`
    );
    const current = Array.isArray(currentRows) ? currentRows[0] : null;
    if (!current) return res.status(404).json({ error: "Action not found" });
    const leadId = updates.lead_id === undefined ? current.lead_id : updates.lead_id;
    const bookingId = updates.booking_id === undefined ? current.booking_id : updates.booking_id;
    if (leadId && !await existsForBusiness("leads", leadId, businessId)) return res.status(404).json({ error: "Lead not found" });
    if (bookingId && !await existsForBusiness("bookings", bookingId, businessId)) return res.status(404).json({ error: "Booking not found" });
    if (updates.status === "completed") updates.completed_at = new Date().toISOString();
    else if (updates.status && updates.status !== "completed") updates.completed_at = null;
    updates.updated_at = new Date().toISOString();
    const updated = await supabaseRequest(
      `actions?id=eq.${encodeURIComponent(String(actionId))}&business_id=eq.${encodeURIComponent(String(businessId))}`,
      { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(updates) }
    );
    const result = Array.isArray(updated) ? updated[0] : updated;
    const event = updates.status === "completed" ? "Action completed" : updates.status === "cancelled" ? "Action cancelled" : "Action updated";
    await recordLeadHistory(leadId, businessId, event, current.status || "", result?.status || "");
    if (result) await recordAuditEvent({ businessId, actorUserId: auth.userId, action: updates.status === "completed" ? "action.completed" : updates.status === "cancelled" ? "action.cancelled" : "action.updated", resourceType: "action", resourceId: String(actionId), metadata: { fields: Object.keys(updates).filter((key) => key !== "updated_at" && key !== "completed_at").sort().join(",") } });
    return res.status(200).json(result || null);
  } catch (error) {
    if (/^(Invalid|Unsupported|No changes)/.test(error?.message || "")) return res.status(400).json({ error: error.message });
    console.error("Actions API error");
    return res.status(500).json({ error: "Could not process actions" });
  }
}
