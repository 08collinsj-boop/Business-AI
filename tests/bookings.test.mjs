import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../api/bookings.js", import.meta.url), "utf8");
const authSource = await readFile(new URL("../lib/auth.js", import.meta.url), "utf8");
const auditSource = await readFile(new URL("../lib/audit.js", import.meta.url), "utf8");
const authUrl = `data:text/javascript;base64,${Buffer.from(authSource).toString("base64")}`;
const auditUrl = `data:text/javascript;base64,${Buffer.from(auditSource).toString("base64")}`;
const savedEnv = { ...process.env };
const savedFetch = globalThis.fetch;

const reply = (body, ok = true) => ({ ok, text: async () => JSON.stringify(body), json: async () => body });
const result = () => ({ statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

async function load(enabled, api, membership = { business_id: "business-a", role: "member" }) {
  process.env.TENANCY_AUTH_ENABLED = enabled;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  globalThis.fetch = async (url, options = {}) => {
    if (url.endsWith("/auth/v1/user")) return reply({ id: "user-a" });
    if (url.includes("business_memberships")) return reply(membership ? [membership] : []);
    return api(url, options);
  };
  const moduleSource = source.replace('from "../lib/auth.js"', `from "${authUrl}#${Math.random()}"`).replace('from "../lib/audit.js"', `from "${auditUrl}#${Math.random()}"`);
  return (await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}#${Math.random()}`)).default;
}

test("bookings require authenticated tenant access and scope reads", { concurrency: false }, async () => {
  let handler = await load("false", async () => reply([]));
  let res = result();
  await handler({ method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 503);

  handler = await load("true", async () => reply([], false));
  res = result(); await handler({ method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 401);

  let calls = [];
  handler = await load("true", async (url) => { calls.push(url); return reply([{ id: 1, business_id: "business-a", title: "Repair" }]); });
  res = result();
  await handler({ method: "GET", headers: { authorization: "Bearer good" }, query: { business_id: "business-b" } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(calls[0], /business_id=eq.business-a/);
  assert.doesNotMatch(calls[0], /business-b/);
});

test("bookings validate, tenant-check related leads, and scope writes", { concurrency: false }, async () => {
  const booking = { id: 7, business_id: "business-a", lead_id: 1, title: "Repair", status: "requested", starts_at: null, ends_at: null };
  let calls = [];
  let handler = await load("true", async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("/leads?")) return reply([{ id: 1, name: "Ada", phone: "07000", email: "a@example.test", location: "Town" }]);
    if (url.includes("lead_history")) return reply(null);
    if (options.method === "POST") return reply([{ ...booking, ...JSON.parse(options.body) }]);
    if (options.method === "PATCH") return reply([{ ...booking, ...JSON.parse(options.body) }]);
    return reply([booking]);
  });
  let res = result();
  await handler({ method: "POST", headers: { authorization: "Bearer good" }, body: { title: "Repair", lead_id: 1, business_id: "business-b", starts_at: "2026-09-16T09:00:00Z" } }, res);
  assert.equal(res.statusCode, 400);

  res = result();
  await handler({ method: "POST", headers: { authorization: "Bearer good" }, body: { title: "Repair", lead_id: 1, starts_at: "2026-09-16T09:00:00Z" } }, res);
  assert.equal(res.statusCode, 201);
  const insert = calls.find(call => call.options.method === "POST" && call.url.endsWith("/rest/v1/bookings"));
  assert.equal(JSON.parse(insert.options.body).business_id, "business-a");
  assert.equal(JSON.parse(insert.options.body).customer_name, "Ada");

  res = result();
  await handler({ method: "PATCH", headers: { authorization: "Bearer good" }, body: { id: 7, status: "confirmed" } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(calls.find(call => call.options.method === "PATCH").url, /id=eq.7&business_id=eq.business-a/);

  calls = [];
  handler = await load("true", async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("/bookings?")) return reply([]);
    return reply([]);
  });
  res = result();
  await handler({ method: "PATCH", headers: { authorization: "Bearer good" }, body: { id: 999, status: "cancelled", business_id: "business-b" } }, res);
  assert.equal(res.statusCode, 400);
  res = result();
  await handler({ method: "PATCH", headers: { authorization: "Bearer good" }, body: { id: 999, status: "cancelled" } }, res);
  assert.equal(res.statusCode, 404);
  assert.match(calls[0].url, /id=eq.999&business_id=eq.business-a/);

  for (const body of [{ title: "" }, { title: "ok", starts_at: "not-a-date" }, { title: "ok", status: "bad" }, "{"]) {
    res = result();
    await handler({ method: "POST", headers: { authorization: "Bearer good" }, body }, res);
    assert.equal(res.statusCode, 400);
  }
});

test.after(() => {
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  globalThis.fetch = savedFetch;
});
