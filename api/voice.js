import voiceCallsHandler from "../lib/voice-calls-handler.js";
import voiceWebhookHandler from "../lib/voice-webhook-handler.js";
import voiceStatusHandler from "../lib/voice-status-handler.js";
import stripeWebhookHandler from "../lib/stripe-webhook-handler.js";

// Both voice and Stripe webhooks arrive via this shared route. This must be a
// literal route-level export: Stripe signs the exact byte sequence it sends,
// and Vercel must not JSON-parse/re-serialize it before the handler reads it.
// Voice stays disabled unless its separate server-side feature gate is enabled.
// Rewrites preserve the original paths while keeping the Hobby deployment
// below Vercel's Serverless Function limit.
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const operation = typeof req.query?.operation === "string" ? req.query.operation : "";
  if (operation === "calls") return voiceCallsHandler(req, res);
  if (operation === "status") return voiceStatusHandler(req, res);
  if (operation === "webhook") return voiceWebhookHandler(req, res);
  if (operation === "stripe-webhook") return stripeWebhookHandler(req, res);
  return res.status(404).json({ error: "Not found" });
}
