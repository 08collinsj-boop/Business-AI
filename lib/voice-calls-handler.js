import { requireBusinessMember, sendAuthError } from "./auth.js";
import { isVoiceReceptionistEnabled } from "./voice.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function supabaseUrl(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Server configuration unavailable");
  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
}

async function supabaseRequest(path) {
  const response = await fetch(supabaseUrl(path), {
    headers: { "Content-Type": "application/json", apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) throw new Error("Voice database request failed");
  return data;
}

function positiveId(value) {
  return /^(?:[1-9]\d*)$/.test(String(value || "")) ? String(value) : null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!isVoiceReceptionistEnabled()) return res.status(503).json({ error: "Voice receptionist is not enabled" });
  let auth;
  try { auth = await requireBusinessMember(req); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: "Voice receptionist is not enabled" });
  const callId = req.query?.id === undefined ? null : positiveId(req.query.id);
  if (req.query?.id !== undefined && !callId) return res.status(400).json({ error: "Invalid call ID" });
  try {
    const filter = `business_id=eq.${encodeURIComponent(String(auth.businessId))}`;
    if (!callId) {
      const rows = await supabaseRequest(`voice_calls?${filter}&select=*&order=started_at.desc.nullslast,created_at.desc`);
      return res.status(200).json(Array.isArray(rows) ? rows : []);
    }
    const calls = await supabaseRequest(`voice_calls?id=eq.${encodeURIComponent(callId)}&${filter}&select=*&limit=1`);
    const call = Array.isArray(calls) ? calls[0] || null : null;
    if (!call) return res.status(404).json({ error: "Call not found" });
    const events = await supabaseRequest(`voice_call_events?call_id=eq.${encodeURIComponent(callId)}&${filter}&select=*&order=occurred_at.asc`);
    return res.status(200).json({ ...call, events: Array.isArray(events) ? events : [] });
  } catch {
    console.error("Voice calls API error");
    return res.status(500).json({ error: "Could not load voice calls" });
  }
}
