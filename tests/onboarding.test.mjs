import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  applyIndustryTemplate,
  getIndustryTemplates,
  sanitizeReceptionistConfiguration,
  validateBusinessConfiguration
} from "../lib/business-configuration.js";

const apiSource = await readFile(new URL("../api/business-configuration.js", import.meta.url), "utf8");
const authSource = await readFile(new URL("../lib/auth.js", import.meta.url), "utf8");
const configSource = await readFile(new URL("../lib/business-configuration.js", import.meta.url), "utf8");
const auditSource = await readFile(new URL("../lib/audit.js", import.meta.url), "utf8");
const authUrl = `data:text/javascript;base64,${Buffer.from(authSource).toString("base64")}`;
const configUrl = `data:text/javascript;base64,${Buffer.from(configSource).toString("base64")}`;
const auditUrl = `data:text/javascript;base64,${Buffer.from(auditSource).toString("base64")}`;
const savedEnv = { ...process.env }; const savedFetch = globalThis.fetch;
const reply = (body, ok = true) => ({ ok, text: async () => JSON.stringify(body), json: async () => body });
const response = () => ({ statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

async function load(role = "owner", enabled = "true", database = async () => reply([]), rejectAuth = false) {
  process.env.TENANCY_AUTH_ENABLED = enabled;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only";
  globalThis.fetch = async (url, options = {}) => {
    if (url.endsWith("/auth/v1/user")) return reply(rejectAuth ? {} : { id: "user-a" }, !rejectAuth);
    if (url.includes("business_memberships")) return reply([{ business_id: "business-a", role }]);
    return database(url, options);
  };
  const source = apiSource
    .replace('from "../lib/auth.js"', `from "${authUrl}#${Math.random()}"`)
    .replace('from "../lib/business-configuration.js"', `from "${configUrl}#${Math.random()}"`)
    .replace('from "../lib/audit.js"', `from "${auditUrl}#${Math.random()}"`);
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${Math.random()}`)).default;
}

test("industry templates are data-only defaults and configuration rejects unsafe input", () => {
  assert.ok(getIndustryTemplates().some((template) => template.id === "trades"));
  assert.equal(applyIndustryTemplate("automotive", { description: "Independent garage" }).industry_template_id, "automotive");
  assert.equal(applyIndustryTemplate("unknown").industry_template_id, "general");
  const valid = validateBusinessConfiguration({
    industry_template_id: "trades", description: "A local repair business", website: "https://example.test",
    faqs: [{ question: "Do you travel?", answer: "Within our service area." }],
    booking_preferences: { booking_mode: "request", confirmation_required: true, minimum_notice_hours: 2 },
    enabled_modules: { enquiries: true, voice: true }
  });
  assert.equal(valid.enabled_modules.voice, false, "voice cannot be activated from browser configuration");
  assert.throws(() => validateBusinessConfiguration({ business_id: "business-b" }), /Unsupported/);
  assert.throws(() => validateBusinessConfiguration({ industry_template_id: "<script>" }), /Invalid industry/);
  assert.throws(() => validateBusinessConfiguration({ faqs: [{ question: "x", answer: "" }] }), /Invalid FAQs/);
  assert.throws(() => validateBusinessConfiguration({ booking_preferences: { booking_mode: "confirmed" } }), /Invalid booking/);
  assert.throws(() => validateBusinessConfiguration({ onboarding_step: "database_admin" }), /Invalid onboarding step/);
  assert.throws(() => validateBusinessConfiguration({ service_delivery_mode: "everywhere" }), /Invalid service delivery mode/);
  assert.throws(() => validateBusinessConfiguration({ trial_purchased: true }), /Unsupported/);
});

test("receptionist configuration remains bounded untrusted reference data", () => {
  const config = sanitizeReceptionistConfiguration({ industry_template_id: "trades", description: "x".repeat(5000), faqs: [{ question: "Q", answer: "A" }], booking_preferences: ["bad"], enabled_modules: { voice: true } });
  assert.equal(config.industryTemplateId, "trades");
  assert.equal(config.description.length, 4000);
  assert.deepEqual(config.faqs, [{ question: "Q", answer: "A" }]);
  assert.deepEqual(config.bookingPreferences, {});
});

test("receptionist configuration is loaded with the trusted tenant filter", { concurrency: false }, async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only";
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    if (url.includes("business_settings")) return reply([{ business_name: "Garage A", services: "MOT" }]);
    if (url.includes("business_configurations")) return reply([{ business_id: "business-a", industry_template_id: "automotive", description: "Independent garage", faqs: [{ question: "Do you do MOTs?", answer: "Yes." }] }]);
    return reply([]);
  };
  const enquiry = await import(new URL(`../api/enquiry.js?configuration=${Math.random()}`, import.meta.url));
  const loaded = await enquiry.getBusinessReceptionistConfiguration("business-a");
  assert.equal(loaded.settings.business_name, "Garage A");
  assert.equal(loaded.configuration.industryTemplateId, "automotive");
  assert.equal(loaded.configuration.faqs[0].answer, "Yes.");
  assert.ok(urls.every((url) => url.includes("business_id=eq.business-a")));
});

test("business configuration API uses membership-derived tenant and owner/admin writes", { concurrency: false }, async () => {
  const calls = [];
  let handler = await load("member", "true", async (url) => { calls.push(url); return reply([{ business_id: "business-a", industry_template_id: "general" }]); });
  let res = response(); await handler({ method: "GET", headers: { authorization: "Bearer good" }, query: { business_id: "business-b" } }, res);
  assert.equal(res.statusCode, 200); assert.match(calls[0], /business_id=eq.business-a/); assert.doesNotMatch(calls[0], /business-b/);
  res = response(); await handler({ method: "PATCH", headers: { authorization: "Bearer good" }, body: { description: "No role escalation" } }, res); assert.equal(res.statusCode, 403);

  calls.length = 0;
  handler = await load("owner", "true", async (url, options) => { calls.push({ url, options }); return reply([{ business_id: "business-a", description: "Updated" }]); });
  res = response(); await handler({ method: "PATCH", headers: { authorization: "Bearer good", "x-role": "owner" }, body: { description: "Updated", onboarding_step: "services", service_delivery_mode: "travel", enabled_modules: { voice: true } } }, res);
  assert.equal(res.statusCode, 200); const patch = calls.find((call) => call.options.method === "PATCH"); const persisted = JSON.parse(patch.options.body); assert.match(patch.url, /business_id=eq.business-a/); assert.equal(persisted.enabled_modules.voice, false); assert.equal(persisted.onboarding_step, "services"); assert.equal(persisted.service_delivery_mode, "travel");
});

test("configuration API fails closed or safely when authentication/configuration is unavailable", { concurrency: false }, async () => {
  let handler = await load("owner", "false"); let res = response(); await handler({ method: "GET", headers: {} }, res); assert.equal(res.statusCode, 503);
  handler = await load("owner", "true", async () => reply([], true), true); res = response(); await handler({ method: "GET", headers: { authorization: "Bearer bad" } }, res); assert.equal(res.statusCode, 401);
  handler = await load("owner", "true", async () => reply({ hidden: "internal" }, false)); res = response(); await handler({ method: "GET", headers: { authorization: "Bearer good" } }, res); assert.equal(res.statusCode, 500); assert.deepEqual(res.body, { error: "Could not process business configuration" });
  res = response(); await handler({ method: "POST", headers: {} }, res); assert.equal(res.statusCode, 405);
});

test.after(() => { for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); globalThis.fetch = savedFetch; });
