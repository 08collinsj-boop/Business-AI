import stripeWebhookFetchHandler from "../lib/stripe-webhook-fetch-handler.js";

// Plain Vercel Functions preserve a webhook's original bytes through the Web
// Standard Request API. This physical route must not be rewritten elsewhere.
export default { fetch: stripeWebhookFetchHandler };
