import { requireBusinessMember, sendAuthError } from "./auth.js";
import { isVoiceReceptionistEnabled } from "./voice.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  let auth; try { auth = await requireBusinessMember(req); } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: "Voice status is not enabled" });
  return res.status(200).json({ enabled: false, provider_connected: false, live_calls_enabled: false, environment_gate_enabled: isVoiceReceptionistEnabled(), message: "Voice is not connected. No phone number, provider, or live calling is active." });
}
