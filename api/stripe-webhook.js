import stripeWebhookHandler from "../lib/stripe-webhook-handler.js";
import voiceCallsHandler from "../lib/voice-calls-handler.js";
import voiceStatusHandler from "../lib/voice-status-handler.js";
import voiceWebhookHandler from "../lib/voice-webhook-handler.js";

// This must be the physical /api/stripe-webhook route, rather than a rewrite
// to another API file. Stripe signs the exact byte sequence it sends and the
// route-level setting below prevents Vercel from parsing that body first.
// Voice remains disabled; its existing routes share this function only to
// retain the current serverless-function count.
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const operation = typeof req.query?.operation === "string" ? req.query.operation : "";
  if (operation === "calls") return voiceCallsHandler(req, res);
  if (operation === "status") return voiceStatusHandler(req, res);
  if (operation === "webhook") return voiceWebhookHandler(req, res);
  if (operation) return res.status(404).json({ error: "Not found" });
  return stripeWebhookHandler(req, res);
}
