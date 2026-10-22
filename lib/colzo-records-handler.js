import { requireBusinessAdmin, requireBusinessMember, sendAuthError } from "./auth.js";
import { recordAuditEvent } from "./audit.js";
import { isDeepStrictEqual } from "node:util";

const TABLES = Object.freeze({ clients: "colzo_clients", projects: "colzo_projects", quotes: "colzo_quotes" });
const FIELDS = Object.freeze({
  clients: ["full_name", "email", "phone", "notes"],
  projects: ["lead_id", "title", "client_name", "status", "progress", "notes"],
  quotes: ["lead_id", "title", "amount_gbp", "notes", "status"]
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID = UUID;
const LEAD_ID = /^[1-9][0-9]{0,17}$/;
const MAX = { full_name: 160, email: 320, phone: 80, notes: 4000, title: 160, client_name: 160 };
const STATUSES = { projects: ["planned", "active", "paused", "completed"], quotes: ["draft", "sent", "accepted", "declined"] };
const QUOTE_TERMS = new Set(["lead_id", "title", "amount_gbp", "notes"]);
const QUOTE_TRANSITIONS = Object.freeze({ draft: ["sent"], sent: ["accepted", "declined"], declined: ["draft"], accepted: [] });

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server configuration unavailable");
  return { url: url.replace(/\/+$/, ""), key };
}
async function db(path, options = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}`, ...(options.headers || {}) }
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) {
    const error = new Error("Database operation failed");
    error.status = response.status === 409 ? 409 : [400, 422].includes(response.status) ? 400 : 500;
    throw error;
  }
  return data;
}
// A quote/project may only refer to an enquiry belonging to the same
// authenticated business. Numeric enquiry IDs alone are not tenant-bound.
async function tenantOwnsLead(businessId, leadId) {
  const rows = await db('leads?select=id,business_id&business_id=eq.' + encodeURIComponent(businessId) + '&id=eq.' + encodeURIComponent(leadId) + '&limit=1');
  return Array.isArray(rows) && rows.length === 1 &&
    String(rows[0].id) === String(leadId) && rows[0].business_id === businessId;
}
function bodyOf(value) {
  try {
    const body = typeof value === "string" ? JSON.parse(value) : value || {};
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch { return null; }
}
function validate(resource, input, partial = false) {
  if (!input || Object.keys(input).some(key => !FIELDS[resource].includes(key))) return { error: "Unsupported fields in request" };
  if (!partial && FIELDS[resource].some(key => !Object.hasOwn(input, key) && !["email", "phone", "notes", "client_name", "progress", "status"].includes(key))) return { error: "Required fields are missing" };
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "lead_id") {
      if (value === null && resource === "projects") { out.lead_id = null; continue; }
      if (!LEAD_ID.test(String(value))) return { error: "Invalid enquiry reference" };
      if (!Number.isSafeInteger(Number(value))) return { error: "Invalid enquiry reference" };
      out.lead_id = Number(value); continue;
    }
    if (key === "progress") {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 100) return { error: "Progress must be between 0 and 100" };
      out.progress = n; continue;
    }
    if (key === "amount_gbp") {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 999999999.99 || !/^\d{1,9}(?:\.\d{1,2})?$/.test(String(value))) return { error: "Enter a valid GBP amount" };
      out.amount_gbp = n; continue;
    }
    if (key === "status") {
      const allowed = STATUSES[resource];
      if (allowed && !allowed.includes(value)) return { error: "Invalid status" };
      if (resource === "projects" && !STATUSES.projects.includes(value)) return { error: "Invalid status" };
      if (resource === "quotes" && !STATUSES.quotes.includes(value)) return { error: "Invalid status" };
      if (!partial && resource === "quotes" && value !== "draft") return { error: "New quotes must start as draft" };
      out.status = value; continue;
    }
    if (typeof value !== "string") return { error: `${key} must be text` };
    const clean = value.trim();
    const max = MAX[key] ?? 4000;
    if (clean.length > max) return { error: `${key} is too long` };
    if (key === "full_name" && clean.length < 2) return { error: "Customer name must be at least 2 characters" };
    if (key === "title" && clean.length < 3) return { error: "Title must be at least 3 characters" };
    if (key === "email" && clean && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 320)) return { error: "Enter a valid email address" };
    out[key] = clean;
  }
  if (!partial) {
    if (resource === "quotes" && (!Object.hasOwn(out, "lead_id") || !Object.hasOwn(out, "title") || !Object.hasOwn(out, "amount_gbp"))) return { error: "An enquiry, title and amount are required" };
    if (resource === "projects" && (!Object.hasOwn(out, "title") || !Object.hasOwn(out, "client_name"))) return { error: "A project title and customer name are required" };
    if (resource === "clients" && !Object.hasOwn(out, "full_name")) return { error: "Customer name is required" };
  }
  return { value: out };
}
function validateQuoteUpdate(current, changes) {
  const status = current.status || "draft";
  const nextStatus = Object.hasOwn(changes, "status") ? changes.status : status;
  const statusChanged = nextStatus !== status;
  const hasTerms = Object.keys(changes).some(key => QUOTE_TERMS.has(key));
  if (status === "accepted") return { error: "Accepted quotes are final and cannot be edited" };
  if (status === "sent" && hasTerms) return { error: "Sent quote terms are locked" };
  if (statusChanged) {
    if (!QUOTE_TRANSITIONS[status]?.includes(nextStatus)) return { error: "Invalid quote status transition" };
    if (hasTerms) return { error: "Change quote terms separately from a status transition" };
  }
  return { value: changes };
}
// Fail closed if service-role PostgREST returns a row outside the requested
// tenant/record or does not reflect submitted fields. Never audit or return
// another business's data as a successful mutation.
function confirmedRow(rows, businessId, changes = {}, expectedId = null) {
  if (!Array.isArray(rows) || rows.length !== 1) return null;
  const row = rows[0];
  if (!row || typeof row !== "object" || Array.isArray(row)
      || !UUID.test(String(row.id || "")) || row.business_id !== businessId
      || (expectedId !== null && row.id !== expectedId)) return null;
  for (const [field,value] of Object.entries(changes)) {
    if (!Object.hasOwn(row,field) || !isDeepStrictEqual(row[field],value)) return null;
  }
  return row;
}
function tenantRows(rows,businessId) {
  return Array.isArray(rows) && rows.every(row => row && typeof row === "object"
    && !Array.isArray(row) && UUID.test(String(row.id || ""))
    && row.business_id === businessId);
}
function laterTimestamp(expectedMs) {
  return new Date(Math.max(Date.now(), expectedMs + 1)).toISOString();
}
export default async function handler(req, res) {
  if (!["GET", "POST", "PATCH"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  const resource = String(req.query?.resource || "");
  if (!Object.hasOwn(TABLES, resource)) return res.status(400).json({ error: "Unknown Colzo resource" });
  const id = req.query?.id == null ? "" : String(req.query.id);
  if (id && !ID.test(id)) return res.status(400).json({ error: "Invalid record id" });

  let input = null;
  let expectedUpdatedAt = null;
  let expectedMs = null;
  if (req.method === "PATCH") {
    if (!id) return res.status(400).json({ error: "Record id is required" });
    input = bodyOf(req.body);
    if (!input || typeof input.expected_updated_at !== "string" || !input.expected_updated_at.trim()) return res.status(400).json({ error: "expected_updated_at is required" });
    expectedUpdatedAt = input.expected_updated_at;
    expectedMs = Date.parse(expectedUpdatedAt);
    if (!Number.isFinite(expectedMs)) return res.status(400).json({ error: "expected_updated_at must be a valid timestamp" });
    delete input.expected_updated_at;
  }

  let auth;
  try { auth = req.method === "GET" ? await requireBusinessMember(req) : await requireBusinessAdmin(req); }
  catch (error) { return sendAuthError(res, error); }
  if (!auth?.enforced || !UUID.test(String(auth.businessId || ""))) return res.status(403).json({ error: "Authenticated business access is required" });
  const table = TABLES[resource];
  const tenant = `business_id=eq.${encodeURIComponent(auth.businessId)}`;
  try {
    if (req.method === "GET") {
      const path = id ? `${table}?select=*&${tenant}&id=eq.${encodeURIComponent(id)}&limit=1` : `${table}?select=*&${tenant}&order=created_at.desc&limit=200`;
      const rows = await db(path);
      if (id && Array.isArray(rows) && rows.length === 0) return res.status(404).json({ error: "Record not found" });
      if (!tenantRows(rows,auth.businessId)
          || (id && (rows.length !== 1 || rows[0].id !== id))) {
        return res.status(500).json({ error: "Record response could not be verified" });
      }
      return res.status(200).json(id ? rows[0] : rows);
    }
    if (req.method === "POST") {
      const checked = validate(resource, bodyOf(req.body), false);
      if (checked.error) return res.status(400).json({ error: checked.error });
      if (checked.value.lead_id != null && !(await tenantOwnsLead(auth.businessId, checked.value.lead_id))) {
        return res.status(400).json({ error: "Enquiry is not available for this business" });
      }
      const rows = await db(`${table}?select=*`, {
        method: "POST", headers: { Prefer: "return=representation" },
        body: JSON.stringify({ ...checked.value, business_id: auth.businessId, updated_at: new Date().toISOString() })
      });
      const record = confirmedRow(rows,auth.businessId,checked.value);
      if (!record) return res.status(500).json({ error: "Record could not be confirmed" });
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: `colzo.${resource}.created`, resourceType: `colzo_${resource}`, resourceId: String(record.id), metadata: { fields: Object.keys(checked.value).sort().join(",") } });
      return res.status(201).json(record);
    }

    const checked = validate(resource, input, true);
    if (checked.error || !Object.keys(checked.value || {}).length) return res.status(400).json({ error: checked.error || "No fields to update" });
    // Load tenant-owned state for lifecycle checks; atomic compare-and-swap below
    // remains the concurrency guard and cannot be replaced by this read.
    const currentRows = await db(`${table}?select=*&${tenant}&id=eq.${encodeURIComponent(id)}&limit=1`);
    const current = Array.isArray(currentRows) ? currentRows[0] : null;
    if (!current?.id) return res.status(404).json({ error: "Record not found" });
    if (!confirmedRow(currentRows,auth.businessId,{},id)) return res.status(500).json({ error: "Record response could not be verified" });
    if (current.updated_at !== expectedUpdatedAt) return res.status(409).json({ error: "This record has changed. Reload it before saving." });
    if (resource === "quotes") {
      const quoteCheck = validateQuoteUpdate(current, checked.value);
      if (quoteCheck.error) return res.status(400).json({ error: quoteCheck.error });
    }
    if (checked.value.lead_id != null && !(await tenantOwnsLead(auth.businessId, checked.value.lead_id))) {
      return res.status(400).json({ error: "Enquiry is not available for this business" });
    }
    const path = `${table}?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(id)}&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}&select=*`;
    const rows = await db(path, {
      method: "PATCH", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...checked.value, updated_at: laterTimestamp(expectedMs) })
    });
    if (Array.isArray(rows) && rows.length === 0) return res.status(409).json({ error: "This record has changed. Reload it before saving." });
    const record = confirmedRow(rows,auth.businessId,checked.value,id);
    if (!record || !Number.isFinite(Date.parse(record.updated_at))
        || Date.parse(record.updated_at) <= expectedMs) {
      return res.status(500).json({ error: "Record could not be confirmed" });
    }
    await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: `colzo.${resource}.updated`, resourceType: `colzo_${resource}`, resourceId: String(record.id), metadata: { fields: Object.keys(checked.value).sort().join(",") } });
    return res.status(200).json(record);
  } catch (error) {
    if (error?.status === 404) return res.status(404).json({ error: "Record not found" });
    if (error?.status === 400) return res.status(400).json({ error: "Record violates Colzo data rules" });
    if (error?.status === 409) return res.status(409).json({ error: "This record conflicts with an existing record" });
    console.error("Colzo records API failed");
    return res.status(500).json({ error: "Colzo records are temporarily unavailable" });
  }
}
