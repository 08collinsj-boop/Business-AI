import { stripeWebhookConfigured, verifyStripeSignature } from "./stripe.js";
import { processVerifiedStripeEvent } from "./stripe-webhook-handler.js";

const json = (body, status) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Plain Vercel Node Functions use the Web Standard Request API for raw
// webhook verification. request.text() reads the exact unparsed bytes Stripe
// signed; no body parser or JSON reconstruction is involved.
export default async function stripeWebhookFetchHandler(request) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!stripeWebhookConfigured()) return json({ error: "Webhook unavailable" }, 503);
  let raw;
  try { raw = await request.text(); }
  catch { return json({ error: "Invalid webhook payload" }, 400); }
  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeSignature(raw, signature)) return json({ error: "Invalid webhook signature" }, 400);
  let event;
  try { event = JSON.parse(raw); }
  catch { return json({ error: "Invalid webhook payload" }, 400); }
  if (!event?.id || !event?.type || !event?.data?.object) return json({ error: "Invalid webhook payload" }, 400);
  const result = await processVerifiedStripeEvent(event);
  return json(result.body, result.status);
}
