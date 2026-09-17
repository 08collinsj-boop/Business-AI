import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { normalisePublicBusinessSlug, resolvePublicBusinessRoute } from "../lib/public-tenant.js";
import { checkPublicEnquiryRateLimit, resetPublicEnquiryRateLimitsForTest } from "../lib/public-rate-limit.js";

const handlerSource = await readFile(new URL("../api/business-onboarding.js", import.meta.url), "utf8");
const authSource = await readFile(new URL("../lib/auth.js", import.meta.url), "utf8");
const routeSource = await readFile(new URL("../lib/public-tenant.js", import.meta.url), "utf8");
const auditSource = await readFile(new URL("../lib/audit.js", import.meta.url), "utf8");
const authUrl = `data:text/javascript;base64,${Buffer.from(authSource).toString("base64")}`;
const routeUrl = `data:text/javascript;base64,${Buffer.from(routeSource).toString("base64")}`;
const auditUrl = `data:text/javascript;base64,${Buffer.from(auditSource).toString("base64")}`;
const savedEnv = { ...process.env }; const savedFetch = globalThis.fetch;
const reply = (body, ok = true, status = ok ? 200 : 500) => ({ ok, status, text: async () => JSON.stringify(body), json: async () => body });
const response = () => ({ statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

async function load({ memberships = [], rpc = [{ business_id: "business-new", public_slug: "hartlepool-garage" }], invalid = false } = {}) {
  process.env.TENANCY_AUTH_ENABLED = "true"; process.env.SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only";
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/auth/v1/user")) return reply(invalid ? {} : { id: "owner-user" }, !invalid, invalid ? 401 : 200);
    if (url.includes("business_memberships")) return reply(memberships);
    if (url.includes("rpc/create_business_for_owner")) return reply(rpc);
    return reply({ hidden: true }, false, 500);
  };
  const source = handlerSource.replace('from "../lib/auth.js"', `from "${authUrl}#${Math.random()}"`).replace('from "../lib/public-tenant.js"', `from "${routeUrl}#${Math.random()}"`).replace('from "../lib/audit.js"', `from "${auditUrl}#${Math.random()}"`);
  return { handler: (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${Math.random()}`)).default, calls };
}

test("public routes are validated server-side and do not accept internal tenant IDs", async () => {
  assert.equal(normalisePublicBusinessSlug(" Hartlepool-Garage "), "hartlepool-garage");
  assert.equal(normalisePublicBusinessSlug("business-aac022a4-48db-47a7-823e-bdc710fb1a48"), "business-aac022a4-48db-47a7-823e-bdc710fb1a48");
  const queried = [];
  const resolved = await resolvePublicBusinessRoute({ findActivePublicSlug: async (slug) => { queried.push(slug); return { business_id: "business-b", route_type: "slug", route_value: slug, active: true }; } }, "hartlepool-garage");
  assert.deepEqual(resolved, { businessId: "business-b", slug: "hartlepool-garage" });
  assert.deepEqual(queried, ["hartlepool-garage"]);
  assert.equal(await resolvePublicBusinessRoute({ findActivePublicSlug: async () => ({ business_id: "business-b", route_type: "slug", route_value: "other", active: true }) }, "hartlepool-garage"), null);
  assert.equal(await resolvePublicBusinessRoute({ findActivePublicSlug: async () => null }, "business-aac022a4-48db-47a7-823e-bdc710fb1a48"), null, "an ID-like route is harmless without a server-owned mapping");
});

test("public enquiry limiter is bounded, per-route, and requires durable infrastructure for distributed production", () => {
  resetPublicEnquiryRateLimitsForTest();
  for (let i = 0; i < 20; i++) assert.equal(checkPublicEnquiryRateLimit({ slug: "garage-a", clientAddress: "198.51.100.7", now: 1 }).allowed, true);
  assert.equal(checkPublicEnquiryRateLimit({ slug: "garage-a", clientAddress: "198.51.100.7", now: 1 }).allowed, false);
  assert.equal(checkPublicEnquiryRateLimit({ slug: "garage-b", clientAddress: "198.51.100.7", now: 1 }).allowed, true);
});

test("authenticated user without a membership can atomically create one owner business", { concurrency: false }, async () => {
  const { handler, calls } = await load(); const res = response();
  await handler({ method: "POST", headers: { authorization: "Bearer verified" }, body: { business_name: "Hartlepool Garage", business_type: "Garage", public_slug: "hartlepool-garage", role: "owner", business_id: "attacker-business" } }, res);
  assert.equal(res.statusCode, 400, "mass-assignment fields are rejected");
  const created = response();
  await handler({ method: "POST", headers: { authorization: "Bearer verified", "x-role": "owner" }, body: { business_name: "Hartlepool Garage", business_type: "Garage", public_slug: "hartlepool-garage" } }, created);
  assert.equal(created.statusCode, 201); assert.deepEqual(created.body, { public_slug: "hartlepool-garage", public_path: "/?business=hartlepool-garage" });
  const rpc = calls.find((call) => call.url.includes("rpc/create_business_for_owner"));
  const body = JSON.parse(rpc.options.body); assert.equal(body.p_owner_user_id, "owner-user"); assert.equal(body.p_public_slug, "hartlepool-garage"); assert.equal(body.role, undefined); assert.equal(body.business_id, undefined);
});

test("business onboarding rejects invalid auth, duplicate membership, and duplicate routes safely", { concurrency: false }, async () => {
  let loaded = await load(); let res = response(); await loaded.handler({ method: "POST", headers: {}, body: {} }, res); assert.equal(res.statusCode, 401);
  loaded = await load({ invalid: true }); res = response(); await loaded.handler({ method: "GET", headers: { authorization: "Bearer bad" } }, res); assert.equal(res.statusCode, 401);
  loaded = await load({ memberships: [{ business_id: "business-a" }] }); res = response(); await loaded.handler({ method: "POST", headers: { authorization: "Bearer good" }, body: { business_name: "Other Business", business_type: "", public_slug: "other-business" } }, res); assert.equal(res.statusCode, 409);
  loaded = await load({ rpc: { message: "duplicate" } }); res = response(); await loaded.handler({ method: "POST", headers: { authorization: "Bearer good" }, body: { business_name: "Other Business", business_type: "", public_slug: "other-business" } }, res); assert.equal(res.statusCode, 500);
});

test("an authenticated existing owner resolves to their dashboard instead of onboarding", { concurrency: false }, async () => {
  const { handler, calls } = await load({ memberships: [{ business_id: "collins-business" }] });
  const res = response();
  await handler({ method: "GET", headers: { authorization: "Bearer verified" }, query: { business_id: "attacker-business", role: "owner" } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { needs_business: false });
  const membershipQuery = calls.find((call) => call.url.includes("business_memberships"));
  assert.match(membershipQuery.url, /user_id=eq.owner-user/);
  assert.doesNotMatch(membershipQuery.url, /attacker-business/);
});

test("an authenticated user without a membership is sent only to onboarding", { concurrency: false }, async () => {
  const { handler } = await load({ memberships: [] }); const res = response();
  await handler({ method: "GET", headers: { authorization: "Bearer verified" } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { needs_business: true });
});

test("public enquiry maps a slug to its server-resolved business and scopes lead creation", { concurrency: false }, async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only"; process.env.OPENAI_API_KEY = "openai-server-only"; resetPublicEnquiryRateLimitsForTest();
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("business_public_routes")) return reply([{ business_id: "business-b", route_type: "slug", route_value: "garage-b", active: true }]);
    if (url.includes("business_settings")) return reply([{ business_name: "Garage B", business_type: "Garage" }]);
    if (url.includes("business_configurations")) return reply([{ business_id: "business-b", industry_template_id: "automotive" }]);
    if (url === "https://api.openai.com/v1/responses") return reply({ output_text: JSON.stringify({ reply: "Thanks", lead: { name: "Test Customer", phone: "07000000000", email: null, location: "Hartlepool", job_type: "MOT", description: "MOT request", urgency: "Normal", qualified: true, priority: "Normal", notes: "" } }) });
    if (url.includes("leads?")) return reply([]);
    if (url.endsWith("/rest/v1/leads")) return reply([{ id: 99, business_id: "business-b" }]);
    return reply([], true);
  };
  const enquiry = await import(new URL(`../api/enquiry.js?route=${Math.random()}`, import.meta.url));
  const res = { statusCode: 0, body: null, headers: {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader(key, value) { this.headers[key] = value; } };
  await enquiry.default({ method: "POST", headers: { "x-forwarded-for": "198.51.100.8" }, query: { business: "garage-b", business_id: "business-a" }, body: { message: "I need an MOT. My number is 07000000000", messages: [] } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.leadCaptured, true);
  assert.deepEqual(Object.keys(res.body).sort(), ["leadCaptured", "reply"], "public enquiries never receive the stored lead row or internal tenant identifier");
  const leadQuery = calls.find((call) => call.url.includes("leads?")); const leadWrite = calls.find((call) => call.url.endsWith("/rest/v1/leads"));
  assert.match(leadQuery.url, /business_id=eq.business-b/); assert.equal(JSON.parse(leadWrite.options.body).business_id, "business-b");
});

test.after(() => { for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); globalThis.fetch = savedFetch; });
