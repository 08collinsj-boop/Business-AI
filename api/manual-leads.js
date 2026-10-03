import { requireBusinessMember, sendAuthError } from "../lib/auth.js";
import { recordAuditEvent } from "../lib/audit.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function endpoint(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Server unavailable");
  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
}

async function storage(path, options = {}) {
  const response = await fetch(endpoint(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(options.headers || {})
    }
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) throw new Error("Could not save lead");
  return data;
}

const text = (value, maximum) => typeof value === "string" ? value.trim().slice(0, maximum) : "";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let auth;
  try { auth = await requireBusinessMember(req); }
  catch (error) { return sendAuthError(res, error); }
  if (!auth?.enforced || !auth.businessId) return res.status(403).json({ error: "Authentication is required" });

  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); }
  catch { return res.status(400).json({ error: "Invalid request body" }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ error: "Invalid request body" });

  const name = text(body.name, 200);
  const phone = text(body.phone, 80);
  const email = text(body.email, 320);
  if (!name && !phone && !email) return res.status(400).json({ error: "Add a name, phone number or email" });

  const priority = body.priority === "High" ? "High" : "Normal";
  const estimatedValue = Number(body.estimated_value || 0);
  if (!Number.isFinite(estimatedValue) || estimatedValue < 0) return res.status(400).json({ error: "Invalid estimated value" });

  const lead = {
    business_id: auth.businessId,
    name: name || null,
    phone: phone || null,
    email: email || null,
    location: text(body.location, 300) || null,
    job_type: text(body.job_type, 200) || null,
    description: text(body.description, 5000) || null,
    urgency: "Normal",
    qualified: false,
    status: "New",
    estimated_value: estimatedValue,
    notes: "",
    priority,
    follow_up_date: null
  };

  try {
    const rows = await storage("leads", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(lead)
    });
    const created = Array.isArray(rows) ? rows[0] : rows;
    await recordAuditEvent({
      businessId: auth.businessId,
      actorUserId: auth.userId,
      action: "lead.manual_created",
      resourceType: "lead",
      resourceId: created?.id ? String(created.id) : null,
      metadata: { source: "owner_dashboard" }
    });
    return res.status(201).json(created || lead);
  } catch (error) {
    console.error("Manual lead creation failed");
    return res.status(500).json({ error: "Could not save lead" });
  }
}
