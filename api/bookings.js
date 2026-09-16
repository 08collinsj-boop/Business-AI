import {
  requireBusinessMember,
  sendAuthError
} from "./_auth.js";
import { recordAuditEvent } from "./_audit.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BOOKING_STATUSES = new Set([
  "requested", "confirmed", "completed", "cancelled"
]);
const BOOKING_SOURCES = new Set(["manual", "ai_request", "import"]);
const TEXT_LIMITS = {
  title: 200,
  customer_name: 160,
  customer_phone: 64,
  customer_email: 320,
  location: 500,
  notes: 5000
};

function supabaseUrl(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Server configuration unavailable");
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
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error("Database request failed");
  return data;
}

function parseBody(body) {
  try {
    const parsed = typeof body === "string" ? JSON.parse(body) : body || {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function positiveId(value) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^(?:[1-9]\d*)$/.test(value)) return Number(value);
  return null;
}

function text(value, field, { required = false } = {}) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > TEXT_LIMITS[field]) throw new Error(`Invalid ${field}`);
  const cleaned = value.trim();
  if (required && !cleaned) throw new Error(`Invalid ${field}`);
  return cleaned;
}

function dateTime(value, field) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 64) throw new Error(`Invalid ${field}`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid ${field}`);
  return parsed.toISOString();
}

function validateBooking(body, creating) {
  const allowed = new Set([
    "lead_id", "title", "customer_name", "customer_phone", "customer_email",
    "starts_at", "ends_at", "location", "status", "notes"
  ]);
  if (creating) allowed.add("source");
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new Error("Unsupported booking fields");
  const updates = {};
  for (const field of Object.keys(TEXT_LIMITS)) {
    const value = text(body[field], field, { required: creating && field === "title" });
    if (value !== undefined) updates[field] = value;
  }
  if (body.lead_id !== undefined) {
    if (body.lead_id === null || body.lead_id === "") updates.lead_id = null;
    else {
      const id = positiveId(body.lead_id);
      if (!id) throw new Error("Invalid lead ID");
      updates.lead_id = id;
    }
  }
  for (const field of ["starts_at", "ends_at"]) {
    const value = dateTime(body[field], field);
    if (value !== undefined) updates[field] = value;
  }
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !BOOKING_STATUSES.has(body.status)) throw new Error("Invalid booking status");
    updates.status = body.status;
  }
  if (body.source !== undefined) {
    if (typeof body.source !== "string" || !BOOKING_SOURCES.has(body.source)) throw new Error("Invalid booking source");
    updates.source = body.source;
  }
  if (creating && updates.title === undefined) throw new Error("Invalid title");
  if (!creating && Object.keys(updates).length === 0) throw new Error("No changes supplied");
  const starts = updates.starts_at;
  const ends = updates.ends_at;
  if (starts && ends && new Date(ends) <= new Date(starts)) throw new Error("End time must be after start time");
  return updates;
}

async function findLead(leadId, businessId) {
  if (!leadId) return null;
  const rows = await supabaseRequest(
    `leads?id=eq.${encodeURIComponent(String(leadId))}&business_id=eq.${encodeURIComponent(String(businessId))}&select=id,name,phone,email,location,job_type,description&limit=1`
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function recordLeadHistory(leadId, businessId, action, oldValue = "", newValue = "") {
  if (!leadId) return;
  try {
    await supabaseRequest("lead_history", {
      method: "POST",
      body: JSON.stringify({ lead_id: leadId, business_id: businessId, action, old_value: oldValue, new_value: newValue })
    });
  } catch {
    // A history write must not make a valid booking operation fail.
  }
}

function noBookings(res) {
  return res.status(503).json({ error: "Bookings are not enabled" });
}

export default async function handler(req, res) {
  if (!["GET", "POST", "PATCH"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  let auth;
  try { auth = await requireBusinessMember(req); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return noBookings(res);
  const businessId = auth.businessId;

  try {
    if (req.method === "GET") {
      const requestedLeadId = req.query?.lead_id;
      let leadFilter = "";
      if (requestedLeadId !== undefined) {
        const leadId = positiveId(requestedLeadId);
        if (!leadId) return res.status(400).json({ error: "Invalid lead ID" });
        if (!await findLead(leadId, businessId)) return res.status(404).json({ error: "Lead not found" });
        leadFilter = `&lead_id=eq.${encodeURIComponent(String(leadId))}`;
      }
      const rows = await supabaseRequest(
        `bookings?business_id=eq.${encodeURIComponent(String(businessId))}${leadFilter}&select=*&order=starts_at.asc.nullslast,created_at.desc`
      );
      return res.status(200).json(Array.isArray(rows) ? rows : []);
    }

    const body = parseBody(req.body);
    if (!body) return res.status(400).json({ error: "Invalid request body" });

    if (req.method === "POST") {
      const updates = validateBooking(body, true);
      const lead = updates.lead_id ? await findLead(updates.lead_id, businessId) : null;
      if (updates.lead_id && !lead) return res.status(404).json({ error: "Lead not found" });
      const booking = {
        business_id: businessId,
        ...updates,
        customer_name: updates.customer_name ?? lead?.name ?? "",
        customer_phone: updates.customer_phone ?? lead?.phone ?? "",
        customer_email: updates.customer_email ?? lead?.email ?? "",
        location: updates.location ?? lead?.location ?? "",
        source: updates.source || "manual"
      };
      const created = await supabaseRequest("bookings", {
        method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(booking)
      });
      const result = Array.isArray(created) ? created[0] : created;
      await recordLeadHistory(result?.lead_id, businessId, "Booking created", "", result?.title || "");
      if (result) await recordAuditEvent({ businessId, actorUserId: auth.userId, action: "booking.created", resourceType: "booking", resourceId: String(result.id), metadata: { status: result.status, source: result.source } });
      return res.status(201).json(result || null);
    }

    const bookingId = positiveId(body.id);
    if (!bookingId) return res.status(400).json({ error: "Invalid booking ID" });
    const updates = validateBooking(Object.fromEntries(Object.entries(body).filter(([key]) => key !== "id")), false);
    const currentRows = await supabaseRequest(
      `bookings?id=eq.${encodeURIComponent(String(bookingId))}&business_id=eq.${encodeURIComponent(String(businessId))}&select=*&limit=1`
    );
    const current = Array.isArray(currentRows) ? currentRows[0] : null;
    if (!current) return res.status(404).json({ error: "Booking not found" });
    const leadId = updates.lead_id === undefined ? current.lead_id : updates.lead_id;
    if (leadId && !await findLead(leadId, businessId)) return res.status(404).json({ error: "Lead not found" });
    const starts = updates.starts_at === undefined ? current.starts_at : updates.starts_at;
    const ends = updates.ends_at === undefined ? current.ends_at : updates.ends_at;
    if (starts && ends && new Date(ends) <= new Date(starts)) return res.status(400).json({ error: "End time must be after start time" });
    updates.updated_at = new Date().toISOString();
    const updated = await supabaseRequest(
      `bookings?id=eq.${encodeURIComponent(String(bookingId))}&business_id=eq.${encodeURIComponent(String(businessId))}`,
      { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(updates) }
    );
    const result = Array.isArray(updated) ? updated[0] : updated;
    await recordLeadHistory(leadId, businessId, updates.status === "cancelled" ? "Booking cancelled" : "Booking updated", current.status || "", result?.status || "");
    if (result) await recordAuditEvent({ businessId, actorUserId: auth.userId, action: updates.status === "cancelled" ? "booking.cancelled" : "booking.updated", resourceType: "booking", resourceId: String(bookingId), metadata: { fields: Object.keys(updates).filter((key) => key !== "updated_at").sort().join(",") } });
    return res.status(200).json(result || null);
  } catch (error) {
    if (/^(Invalid|Unsupported|No changes|End time)/.test(error?.message || "")) return res.status(400).json({ error: error.message });
    console.error("Bookings API error");
    return res.status(500).json({ error: "Could not process bookings" });
  }
}
