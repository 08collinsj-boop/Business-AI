import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  assessCallSafety,
  buildVoiceReceptionistContext,
  createBookingRequestFromVoice,
  createFollowUpActionFromVoice,
  createVoiceProviderRegistry,
  normaliseE164,
  resolveInboundTenant,
  validateInboundCallEvent
} from "../lib/voice.js";
import { createVoiceWebhookHandler } from "../lib/voice-webhook-handler.js";
import { simulateInboundVoiceCall } from "../lib/voice-simulation.js";

const callsSource = await readFile(new URL("../lib/voice-calls-handler.js", import.meta.url), "utf8");
const authSource = await readFile(new URL("../lib/auth.js", import.meta.url), "utf8");
const authUrl = `data:text/javascript;base64,${Buffer.from(authSource).toString("base64")}`;
const voiceUrl = `data:text/javascript;base64,${Buffer.from('export function isVoiceReceptionistEnabled(){ return process.env.VOICE_RECEPTIONIST_ENABLED === "true"; }').toString("base64")}`;
const savedEnv = { ...process.env };
const savedFetch = globalThis.fetch;

const reply = (body, ok = true) => ({ ok, text: async () => JSON.stringify(body), json: async () => body });
const result = () => ({
  statusCode: 0, body: null, headers: {},
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  send(body) { this.body = body; return this; },
  setHeader(name, value) { this.headers[name] = value; }
});

async function loadCalls(enabled, api) {
  process.env.TENANCY_AUTH_ENABLED = "true";
  process.env.VOICE_RECEPTIONIST_ENABLED = enabled;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  globalThis.fetch = async (url, options = {}) => {
    if (url.endsWith("/auth/v1/user")) return reply({ id: "user-a" });
    if (url.includes("business_memberships")) return reply([{ business_id: "business-a", role: "owner" }]);
    return api(url, options);
  };
  const source = callsSource
    .replace('from "./auth.js"', `from "${authUrl}#${Math.random()}"`)
    .replace('from "./voice.js"', `from "${voiceUrl}#${Math.random()}"`);
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${Math.random()}`)).default;
}

test("voice domain is provider-neutral, maps only verified called numbers, and applies guardrails", async () => {
  assert.equal(normaliseE164(" +44 7700 900123 "), "+447700900123");
  assert.equal(normaliseE164("07700900123"), null, "routing must not infer a country");
  assert.equal(validateInboundCallEvent({ providerCallId: "call-1", calledNumber: "+447700900123", callerNumber: "+447700900124", status: "ringing" }).status, "ringing");
  assert.equal(validateInboundCallEvent({ providerCallId: "call-1", calledNumber: "not-a-number" }), null);
  assert.throws(() => createVoiceProviderRegistry([{ name: "demo" }]), /Invalid voice provider adapter/);

  const queried = [];
  const tenant = await resolveInboundTenant({
    findActivePhoneNumber: async (provider, number) => {
      queried.push({ provider, number });
      return { id: 8, business_id: "11111111-1111-4111-8111-111111111111", provider_connection_id: "22222222-2222-4222-8222-222222222222", e164_number: number };
    }
  }, { provider: "Twilio", calledNumber: "+44 7700 900123", business_id: "attacker-business" });
  assert.equal(tenant.businessId, "11111111-1111-4111-8111-111111111111");
  assert.deepEqual(queried, [{ provider: "twilio", number: "+447700900123" }]);

  assert.equal(assessCallSafety("There is an electric shock and fire").level, "emergency");
  assert.equal(assessCallSafety("I need to speak to a person").handover, true);
  assert.equal(assessCallSafety("I need a repair").level, "normal");
  const context = buildVoiceReceptionistContext({ business_name: "Example Garage", services: "MOTs", opening_hours: "9-5" });
  assert.equal(context.businessName, "Example Garage");
  assert.match(context.rules.join(" "), /Do not promise availability/);
  assert.deepEqual(createBookingRequestFromVoice({ leadId: 4, title: "Thursday visit" }), { lead_id: 4, title: "Thursday visit", starts_at: null, ends_at: null, location: "", notes: "Requested during phone conversation", status: "requested", source: "ai_request" });
  assert.equal(createFollowUpActionFromVoice({ leadId: 4 }).status, "pending");
});

test("voice webhook authenticates before tenant lookup and persists only a mapped tenant", async () => {
  const writes = [];
  const repository = {
    findActivePhoneNumber: async (provider, number) => {
      assert.equal(provider, "demo"); assert.equal(number, "+447700900123");
      return { id: 2, business_id: "business-a", provider_connection_id: "connection-a", e164_number: number };
    },
    findCall: async () => null,
    createCall: async (record) => { writes.push(record); return { id: 7, ...record }; },
    updateCall: async () => null,
    addEvent: async (record) => writes.push(record)
  };
  const registry = createVoiceProviderRegistry([{
    name: "demo",
    verifyWebhook: async ({ rawBody }) => rawBody.toString() === "signed",
    parseInboundEvent: async () => ({ providerCallId: "provider-call-1", providerEventId: "event-1", calledNumber: "+447700900123", callerNumber: "+447700900124", status: "ringing" })
  }]);
  let handler = createVoiceWebhookHandler({ registry, repository, enabled: () => false });
  let res = result(); await handler({ method: "POST", query: { provider: "demo" }, headers: {}, body: "signed" }, res);
  assert.equal(res.statusCode, 404);

  handler = createVoiceWebhookHandler({ registry, repository, enabled: () => true });
  res = result(); await handler({ method: "POST", query: { provider: "demo", business_id: "business-b" }, headers: {}, body: "unsigned" }, res);
  assert.equal(res.statusCode, 401); assert.equal(writes.length, 0);
  res = result(); await handler({ method: "POST", query: { provider: "demo", business_id: "business-b" }, headers: {}, body: "signed" }, res);
  assert.equal(res.statusCode, 204);
  assert.equal(writes[0].business_id, "business-a");
  assert.equal(writes[0].phone_number_id, 2);
  assert.equal(writes[1].business_id, "business-a");
});

test("voice call history is disabled by default and tenant-scoped when enabled", { concurrency: false }, async () => {
  let handler = await loadCalls("false", async () => reply([]));
  let res = result(); await handler({ method: "GET", headers: {}, query: {} }, res);
  assert.equal(res.statusCode, 503);

  const queried = [];
  handler = await loadCalls("true", async (url) => { queried.push(url); return reply([{ id: 1, business_id: "business-a" }]); });
  res = result(); await handler({ method: "GET", headers: { authorization: "Bearer good" }, query: { business_id: "business-b" } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(queried[0], /business_id=eq.business-a/);
  assert.doesNotMatch(queried[0], /business-b/);

  res = result(); await handler({ method: "GET", headers: { authorization: "Bearer good" }, query: { id: "invalid" } }, res);
  assert.equal(res.statusCode, 400);
  res = result(); await handler({ method: "POST", headers: { authorization: "Bearer good" }, query: {} }, res);
  assert.equal(res.statusCode, 405);
});

test("voice lead bridge reuses the scoped receptionist lead storage path", { concurrency: false }, async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    if (url.includes("/leads?")) return reply([{ id: 12, business_id: "11111111-1111-4111-8111-111111111111", status: "New" }]);
    return reply([{ id: 12, business_id: "11111111-1111-4111-8111-111111111111" }]);
  };
  const enquiry = await import(new URL(`../api/enquiry.js?voice-lead=${Math.random()}`, import.meta.url));
  const saved = await enquiry.saveLead({ phone: "07000000000", job_type: "Service request" }, "11111111-1111-4111-8111-111111111111");
  assert.equal(saved.id, 12);
  assert.match(requests[0].url, /business_id=eq.11111111-1111-4111-8111-111111111111/);
  assert.match(requests[1].url, /id=eq.12&business_id=eq.11111111-1111-4111-8111-111111111111/);
  assert.equal(JSON.parse(requests[1].options.body).business_id, "11111111-1111-4111-8111-111111111111");
});

test("internal voice simulation covers normal, handover, emergency, and incomplete calls without a provider", async () => {
  const events = []; const updates = []; let callId = 0;
  const repository = { createCall: async (record) => ({ ...record, id: ++callId }), addEvent: async (event) => events.push(event), updateCall: async (id, businessId, changes) => { updates.push({ id, businessId, changes }); return { id, business_id: businessId, ...changes }; }, captureLead: async ({ businessId, lead }) => ({ id: 41, business_id: businessId, ...lead }), createFollowUp: async ({ businessId, leadId }) => ({ id: 12, business_id: businessId, lead_id: leadId }) };
  const tenant = { businessId: "11111111-1111-4111-8111-111111111111" };
  const normal = await simulateInboundVoiceCall({ tenant, repository, turns: [{ speaker: "caller", content: "I need an electrical repair" }], lead: { name: "Test" } });
  assert.equal(normal.call.status, "completed"); assert.equal(normal.lead.business_id, tenant.businessId);
  const handover = await simulateInboundVoiceCall({ tenant, repository, turns: [{ speaker: "caller", content: "I need to speak to a person" }], lead: { name: "Test" } });
  assert.equal(handover.call.status, "escalated"); assert.equal(handover.action.lead_id, 41);
  const emergency = await simulateInboundVoiceCall({ tenant, repository, turns: [{ speaker: "caller", content: "There is an electric shock emergency" }] });
  assert.equal(emergency.call.status, "escalated");
  const incomplete = await simulateInboundVoiceCall({ tenant, repository, turns: [] });
  assert.equal(incomplete.call.status, "missed"); assert.ok(events.length > 0); assert.ok(updates.every((item) => item.businessId === tenant.businessId));
});

test.after(() => {
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  globalThis.fetch = savedFetch;
});
