import { requireBusinessAdmin, requireBusinessMember, sendAuthError } from "./auth.js";
import { recordAuditEvent } from "./audit.js";

const TABLES = Object.freeze({ clients: "colzo_clients", projects: "colzo_projects", quotes: "colzo_quotes" });
const FIELDS = Object.freeze({
  clients: ["full_name", "email", "phone", "notes"],
  projects: ["lead_id", "title", "client_name", "status", "progress", "notes"],
  quotes: ["lead_id", "title", "amount_gbp", "notes", "status"]
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEAD_ID = /^[1-9][0-9]{0,17}$/;
const MAX = { full_name: 160, email: 320, phone: 80, notes: 4000, title: 160, client_name: 160 };
const STATUSES = { projects: ["planned", "active", "paused", "completed"], quotes: ["draft", "sent", "accepted", "declined"] };

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
function bodyOf(value) {
  try { const body = typeof value === "string" ? JSON.parse(value) : value || {}; return body && typeof body === "object" && !Array.isArray(body) ? body : null; }
  catch { return null; }
}
function validate(resource, input, partial = false) {
  if (!input || Object.keys(input).some(key => !FIELDS[resource].includes(key))) return { error: "Unsupported fields in request" };
  if (!partial && FIELDS[resource].some(key => !Object.hasOwn(input, key) && !["email", "phone", "notes", "client_name", "progress", "status"].includes(key))) return { error: "Required fields are missing" };
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "lead_id") {
      if (value === null && resource === "projects") { out.lead_id = null; continue; }
      if (!LEAD_ID.test(String(value))) return { error: "Invalid enquiry reference" };
      out.lead_id = Number(value); continue;
    }
    if (key === "progress") {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 100) return { error: "Progress must be between 0 and 100" };
      out.progress = n; continue;
    }
    if (key === "amount_gbp") {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 999999999.99 || !/^\\d{1,9}(?:\\.\\d{1,2})?$/.test(String(value))) return { error: "Enter a valid GBP amount" };
      out.amount_gbp = n; continue;
    }
    if (key === "status") {
      const allowed = STATUSES[resource];
      if (allowed && !allowed.includes(value)) return { error: "Invalid status" };
      if (resource === "projects" && !STATUSES.projects.includes(value)) return { error: "Invalid status" };
      if (resource === "quotes" && !STATUSES.quotes.includes(value)) return { error: "Invalid status" };
      out.status = value; continue;
    }
    if (typeof value !== "string") return { error: `${key} must be text` };
    const clean = value.trim();
    const max = MAX[key] ?? 4000;
    if (clean.length > max) return { error: `${key} is too long` };
    if (key === "full_name" && clean.length < 2) return { error: "Customer name must be at least 2 characters" };
    if (key === "title" && clean.length < 3) return { error: "Title must be at least 3 characters" };
    if (key === "email" && clean && (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(clean) || clean.length > 320)) return { error: "Enter a valid email address" };
    out[key] = clean;
  }
  if (!partial) {
    if (resource === "quotes" && (!Object.hasOwn(out, "lead_id") || !Object.hasOwn(out, "title") || !Object.hasOwn(out, "amount_gbp"))) return { error: "An enquiry, title and amount are required" };
    if (resource === "projects" && (!Object.hasOwn(out, "title") || !Object.hasOwn(out, "client_name"))) return { error: "A project title and customer name are required" };
    if (resource === "clients" && !Object.hasOwn(out, "full_name")) return { error: "Customer name is required" };
  }
  return { value: out };
}
export default async function handler(req, res) {
  if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  const resource = String(req.query?.resource || "");
  if (!Object.hasOwn(TABLES, resource)) return res.status(400).json({ error: "Unknown Colzo resource" });
  const id = req.query?.id == null ? "" : String(req.query.id);
  if (id && !ID.test(id)) return res.status(400).json({ error: "Invalid record id" });
  let auth;
  try { auth = req.method === "GET" ? await requireBusinessMember(req) : await requireBusinessAdmin(req); }
  catch (error) { return sendAuthError(res, error); }
  if (!auth?.enforced || !UUID.test(String(auth.businessId || ""))) return res.status(403).json({ error: "Authenticated business access is required" });
  const table = TABLES[resource];
  const tenant = `business_id=eq.${encodeURIComponent(auth.businessId)}`;
  try {
    if (req.method === "GET") {
      const path = id
        ? `${table}?select=*&${tenant}&id=eq.${encodeURIComponent(id)}&limit=1`
        : `${table}?select=*&${tenant}&order=created_at.desc&limit=200`;
      const rows = await db(path);
      if (id && (!Array.isArray(rows) || !rows.length)) return res.status(404).json({ error: "Record not found" });
      return res.status(200).json(id ? rows[0] : (Array.isArray(rows) ? rows : []));
    }
    if (req.method === "POST") {
      const input = bodyOf(req.body);
      const checked = validate(resource, input, false);
      if (checked.error) return res.status(400).json({ error: checked.error });
      const now = new Date().toISOString();
      const rows = await db(`${table}?select=*`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...checked.value, business_id: auth.businessId, ...(resource === "clients" ? {} : {}), updated_at: now }) });
      const record = Array.isArray(rows) ? rows[0] : rows;
      if (!record?.id) return res.status(500).json({ error: "Record could not be confirmed" });
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: `colzo.${resource}.created`, resourceType: `colzo_${resource}`, resourceId: String(record.id), metadata: { fields: Object.keys(checked.value).sort().join(",") } });
      return res.status(201).json(record);
    }
    if (!id) return res.status(400).json({ error: "Record id is required" });
    if (req.method === "PATCH") {
      const input = bodyOf(req.body);
      const checked = validate(resource, input, true);
      if (checked.error || !Object.keys(checked.value || {}).length) return res.status(400).json({ error: checked.error || "No fields to update" });
      const rows = await db(`${table}?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(id)}&select=*`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...checked.value, updated_at: new Date().toISOString() }) });
      const record = Array.isArray(rows) ? rows[0] : rows;
      if (!record?.id) return res.status(404).json({ error: "Record not found" });
      await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: `colzo.${resource}.updated`, resourceType: `colzo_${resource}`, resourceId: String(record.id), metadata: { fields: Object.keys(checked.value).sort().join(",") } });
      return res.status(200).json(record);
    }
    const rows = await db(`${table}?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(id)}&select=id`, { method: "DELETE", headers: { Prefer: "return=representation" } });
    const record = Array.isArray(rows) ? rows[0] : rows;
    if (!record?.id) return res.status(404).json({ error: "Record not found" });
    await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: `colzo.${resource}.deleted`, resourceType: `colzo_${resource}`, resourceId: String(record.id), metadata: {} });
    return res.status(200).json({ deleted: true, id: record.id });
  } catch (error) {
    if (error?.status === 404) return res.status(404).json({ error: "Record not found" });
    if (error?.status === 400) return res.status(400).json({ error: "Record violates Colzo data rules" });
    console.error("Colzo records API failed");
    return res.status(500).json({ error: "Colzo records are temporarily unavailable" });
  }
}
