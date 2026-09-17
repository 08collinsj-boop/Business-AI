import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { readFile } from "node:fs/promises";

const billingSource = await readFile(new URL("../lib/billing.js", import.meta.url), "utf8");
const handlerSource = await readFile(new URL("../lib/billing-handler.js", import.meta.url), "utf8");
const webhookSource = await readFile(new URL("../lib/stripe-webhook-handler.js", import.meta.url), "utf8");
const webhookRouteSource = await readFile(new URL("../api/stripe-webhook.js", import.meta.url), "utf8");
const fetchWebhookSource = await readFile(new URL("../lib/stripe-webhook-fetch-handler.js", import.meta.url), "utf8");
const saved = { ...process.env }; const originalFetch = globalThis.fetch;
const reply = (body, ok = true, status = ok ? 200 : 500) => ({ ok, status, text: async () => typeof body === "string" ? body : JSON.stringify(body), json: async () => body });
const res = () => ({ statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const account = { business_id: "11111111-1111-4111-8111-111111111111", plan: "starter", status: "active", current_period_started_at: "2026-09-01T00:00:00.000Z", current_period_ends_at: "2026-10-01T00:00:00.000Z", trial_purchased: false, cancel_at_period_end: false };

test("central plan entitlements enforce trial expiry, allowance, and staff limits", async () => {
  process.env.BILLING_ENABLED = "true";
  const billing = await import(new URL(`../lib/billing.js?plans=${Math.random()}`, import.meta.url));
  const activeTrial = billing.entitlementFromAccount({ plan: "trial", status: "active", trial_purchased: true, trial_started_at: "2026-09-01T00:00:00.000Z", trial_expires_at: "2026-09-08T00:00:00.000Z" }, 99, new Date("2026-09-07T12:00:00Z"));
  assert.equal(activeTrial.active, true); assert.equal(activeTrial.enquiryAllowance, 100); assert.equal(activeTrial.enquiriesRemaining, 1); assert.equal(activeTrial.staffAllowance, 1);
  const expiredTrial = billing.entitlementFromAccount({ ...account, plan: "trial", status: "active", trial_purchased: true, trial_started_at: "2026-09-01T00:00:00.000Z", trial_expires_at: "2026-09-08T00:00:00.000Z" }, 100, new Date("2026-09-08T00:00:00Z"));
  assert.equal(expiredTrial.active, false); assert.equal(expiredTrial.enquiriesRemaining, 0);
  for (const [plan, allowance, seats] of [["starter", 250, 2], ["pro", 1000, 5], ["business", 3000, 15]]) {
    const entitlement = billing.entitlementFromAccount({ ...account, plan }, 0, new Date("2026-09-15T00:00:00Z"));
    assert.equal(entitlement.enquiryAllowance, allowance); assert.equal(entitlement.staffAllowance, seats); assert.equal(entitlement.active, true);
  }
  assert.equal(billing.entitlementFromAccount({ ...account, status: "past_due" }, 0, new Date("2026-09-15T00:00:00Z")).active, false);
});

test("allowance reservation is server-side, atomic-RPC backed, and fails closed", async () => {
  process.env.BILLING_ENABLED = "true"; process.env.SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "server-key";
  const calls = []; globalThis.fetch = async (url, options = {}) => { calls.push({ url, options }); if (url.includes("business_billing_accounts")) return reply([account]); if (url.includes("business_billing_usage")) return reply([{ quantity: 249 }]); if (url.includes("consume_billing_ai_enquiry_allowance")) return reply(true); return reply({}, false); };
  const billing = await import(new URL(`../lib/billing.js?reserve=${Math.random()}`, import.meta.url)); const reserved = await billing.reserveAiEnquiryAllowance(account.business_id, new Date("2026-09-15T00:00:00Z"));
  assert.equal(reserved.allowed, true); assert.ok(calls.some((call) => call.url.includes("rpc/consume_billing_ai_enquiry_allowance")));
  globalThis.fetch = async (url) => url.includes("business_billing_accounts") ? reply([account]) : url.includes("business_billing_usage") ? reply([{ quantity: 250 }]) : reply({}, false);
  const exhausted = await billing.reserveAiEnquiryAllowance(account.business_id, new Date("2026-09-15T00:00:00Z")); assert.equal(exhausted.allowed, false); assert.equal(exhausted.code, "AI_ENQUIRY_ALLOWANCE_REACHED");
});

test("billing private API is owner-only and ignores browser tenant input", async () => {
  process.env.BILLING_ENABLED = "true"; process.env.TENANCY_AUTH_ENABLED = "true"; process.env.SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "server-key";
  const calls = []; globalThis.fetch = async (url) => { calls.push(url); if (url.endsWith("/auth/v1/user")) return reply({ id: "user-a", email: "owner@example.test" }); if (url.includes("business_memberships")) return reply([{ business_id: account.business_id, role: "owner" }]); if (url.includes("business_billing_accounts")) return reply([account]); if (url.includes("business_billing_usage")) return reply([{ quantity: 2 }]); return reply({}, false); };
  const handler = (await import(new URL(`../lib/billing-handler.js?owner=${Math.random()}`, import.meta.url))).default; const response = res(); await handler({ method: "GET", headers: { authorization: "Bearer valid" }, query: { business_id: "other-business" } }, response);
  assert.equal(response.statusCode, 200); assert.equal(response.body.entitlements.plan, "starter"); assert.ok(calls.some((url) => url.includes(encodeURIComponent(account.business_id)))); assert.ok(calls.every((url) => !url.includes("other-business")));
  globalThis.fetch = async (url) => url.endsWith("/auth/v1/user") ? reply({ id: "user-a" }) : url.includes("business_memberships") ? reply([{ business_id: account.business_id, role: "member" }]) : reply({}, false);
  const denied = res(); await handler({ method: "GET", headers: { authorization: "Bearer valid" }, query: {} }, denied); assert.equal(denied.statusCode, 403);
});

test("a previously used trial cannot start another Checkout and expiry does not delete business data", async () => {
  process.env.BILLING_ENABLED = "true"; process.env.TENANCY_AUTH_ENABLED = "true"; process.env.SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "server-key"; process.env.STRIPE_SECRET_KEY = "sk_test_placeholder"; process.env.BILLING_APP_URL = "https://pilot.example.test";
  const usedTrial = { ...account, plan: "trial", trial_purchased: true, trial_started_at: "2026-09-01T00:00:00.000Z", trial_expires_at: "2026-09-08T00:00:00.000Z" };
  globalThis.fetch = async (url) => { if (url.endsWith("/auth/v1/user")) return reply({ id: "user-a", email: "owner@example.test" }); if (url.includes("business_memberships")) return reply([{ business_id: account.business_id, role: "owner" }]); if (url.includes("business_billing_accounts")) return reply([usedTrial]); return reply({}, false); };
  const handler = (await import(new URL(`../lib/billing-handler.js?trial=${Math.random()}`, import.meta.url))).default; const response = res(); await handler({ method: "POST", headers: { authorization: "Bearer valid" }, body: { action: "checkout", plan: "trial" } }, response);
  assert.equal(response.statusCode, 409); assert.match(response.body.error, /already used/i);
  const billing = await import(new URL(`../lib/billing.js?expiry=${Math.random()}`, import.meta.url)); const expired = billing.entitlementFromAccount(usedTrial, 3, new Date("2026-09-10T00:00:00Z")); assert.equal(expired.active, false);
  assert.doesNotMatch(billingSource, /delete from public\.leads|delete from public\.businesses/i, "subscription expiry only restricts access; it never deletes existing data");
});

test("Stripe webhook verifies signatures, activates one paid trial, and treats duplicate delivery safely", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_placeholder"; process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"; process.env.SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "server-key";
  const event = { id: "evt_test_trial", type: "checkout.session.completed", created: 1780000000, data: { object: { id: "cs_test", object: "checkout.session", payment_status: "paid", customer: "cus_test", client_reference_id: account.business_id, metadata: { plan: "trial", business_id: account.business_id } } } }; const raw = JSON.stringify(event); const timestamp = Math.floor(Date.now() / 1000); const signature = crypto.createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest("hex");
  const calls = []; globalThis.fetch = async (url, options = {}) => { calls.push({ url, options }); if (url.includes("stripe_webhook_events") && options.method === "POST") return reply({}, true, 201); if (url.includes("activate_paid_business_trial")) return reply(true, true, 200); if (url.includes("business_audit_events")) return reply({}, true, 201); if (url.includes("stripe_webhook_events") && options.method === "PATCH") return reply({}, true, 204); return reply({}, false); };
  const handler = (await import(new URL(`../lib/stripe-webhook-handler.js?valid=${Math.random()}`, import.meta.url))).default; const response = res(); await handler({ method: "POST", headers: { "stripe-signature": `t=${timestamp},v1=${signature}` }, body: raw }, response); assert.equal(response.statusCode, 200); assert.ok(calls.some((call) => call.url.includes("rpc/activate_paid_business_trial") && call.options.body.includes('"p_business_id"')));
  assert.ok(calls.every((call) => !call.url.includes("business_configurations") && !call.url.includes("business_settings")), "billing activation must never reset or change onboarding configuration");
  const invalid = res(); await handler({ method: "POST", headers: { "stripe-signature": "t=1,v1=bad" }, body: raw }, invalid); assert.equal(invalid.statusCode, 400);
  const parsed = res(); await handler({ method: "POST", headers: { "stripe-signature": `t=${timestamp},v1=${signature}` }, body: JSON.parse(raw) }, parsed); assert.equal(parsed.statusCode, 400, "a parsed body must never be re-serialized for signature verification");
  globalThis.fetch = async (url, options = {}) => url.includes("stripe_webhook_events") && options.method === "POST" ? reply({}, false, 409) : reply({}, false); const duplicate = res(); await handler({ method: "POST", headers: { "stripe-signature": `t=${timestamp},v1=${signature}` }, body: raw }, duplicate); assert.equal(duplicate.statusCode, 200); assert.equal(duplicate.body.duplicate, true);
});

test("Web Standard webhook route verifies the original request text before processing", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_placeholder"; process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"; process.env.SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "server-key";
  const event = { id: "evt_test_fetch", type: "checkout.session.completed", created: 1780000000, data: { object: { id: "cs_fetch", payment_status: "paid", customer: "cus_fetch", client_reference_id: account.business_id, metadata: { plan: "trial", business_id: account.business_id } } } }; const raw = JSON.stringify(event); const timestamp = Math.floor(Date.now() / 1000); const signature = crypto.createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest("hex");
  globalThis.fetch = async (url, options = {}) => { if (url.includes("stripe_webhook_events") && options.method === "POST") return reply({}, true, 201); if (url.includes("activate_paid_business_trial")) return reply(true, true, 200); if (url.includes("business_audit_events")) return reply({}, true, 201); if (url.includes("stripe_webhook_events") && options.method === "PATCH") return reply({}, true, 204); return reply({}, false); };
  const handler = (await import(new URL(`../lib/stripe-webhook-fetch-handler.js?fetch=${Math.random()}`, import.meta.url))).default; const response = await handler(new Request("https://pilot.example.test/api/stripe-webhook", { method: "POST", headers: { "stripe-signature": `t=${timestamp},v1=${signature}` }, body: raw })); assert.equal(response.status, 200); assert.deepEqual(await response.json(), { received: true });
});

test("billing source keeps Stripe secret/server checks and no browser pricing trust", () => {
  assert.match(billingSource, /BILLING_ENABLED === "true"/); assert.match(billingSource, /consume_billing_ai_enquiry_allowance/);
  assert.match(handlerSource, /requireBusinessMember\(req, \["owner"\]\)/); assert.match(handlerSource, /trial_purchased/);
  assert.match(webhookSource, /verifyStripeSignature/); assert.match(webhookSource, /markWebhookEvent/); assert.doesNotMatch(webhookSource, /console\.log/);
  assert.doesNotMatch(webhookSource, /JSON\.stringify\(req\.body\)/, "Stripe verification must use original bytes, never a reconstructed JSON body");
  assert.match(webhookRouteSource, /fetch: stripeWebhookFetchHandler/, "the physical deployed webhook route must use the Web Standard raw Request API");
  assert.match(fetchWebhookSource, /await request\.text\(\)/, "Stripe verification must read original request text");
  assert.doesNotMatch(fetchWebhookSource, /JSON\.stringify\(request\.body\)/, "Stripe verification must never reconstruct a request body");
});

test.after(() => { for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]; Object.assign(process.env, saved); globalThis.fetch = originalFetch; });
