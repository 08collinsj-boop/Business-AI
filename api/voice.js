import voiceCallsHandler from "../lib/voice-calls-handler.js";
import voiceWebhookHandler, { config as voiceWebhookConfig } from "../lib/voice-webhook-handler.js";
import voiceStatusHandler from "../lib/voice-status-handler.js";

// Voice stays disabled unless its separate server-side feature gate is enabled.
// Rewrites preserve the existing API surface while keeping the provider-neutral
// Voice foundation independent of Stripe billing.
export const config = voiceWebhookConfig;

export default async function handler(req, res) {
  const operation = typeof req.query?.operation === "string" ? req.query.operation : "";
  if (operation === "calls") return voiceCallsHandler(req, res);
  if (operation === "status") return voiceStatusHandler(req, res);
  if (operation === "webhook") return voiceWebhookHandler(req, res);
  return res.status(404).json({ error: "Not found" });
}
