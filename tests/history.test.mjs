import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const historySource = await readFile(new URL("../api/history.js", import.meta.url), "utf8");
const authSource = await readFile(new URL("../api/_auth.js", import.meta.url), "utf8");
const authUrl = `data:text/javascript;base64,${Buffer.from(authSource).toString("base64")}`;
const savedEnv = { ...process.env }; const savedFetch = globalThis.fetch;
const reply = (body, ok = true) => ({ ok, text: async () => JSON.stringify(body), json: async () => body });
const result = () => ({ statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
async function load(enabled, fetchImpl) {
  process.env.TENANCY_AUTH_ENABLED = enabled; process.env.SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key"; globalThis.fetch = fetchImpl;
  const source = historySource.replace('from "./_auth.js"', `from "${authUrl}#${Math.random()}"`);
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${Math.random()}`)).default;
}
function tenantRouter(api) { return async (url, options = {}) => {
  if (url.endsWith("/auth/v1/user")) return reply({ id: "user-a" });
  if (url.includes("business_memberships")) return reply([{ business_id: "business-a", role: "member" }]);
  return api(url, options);
}; }

test("history API preserves legacy mode and enforces tenant ownership", { concurrency: false }, async () => {
  let calls = [];
  let handler = await load("false", async (url) => { calls.push(url); return reply([]); });
  let res = result(); await handler({ method: "GET", query: { lead_id: "99" }, headers: {} }, res);
  assert.equal(res.statusCode, 200); assert.doesNotMatch(calls[0], /business_id/);

  handler = await load("true", async () => reply({}, false));
  res = result(); await handler({ method: "GET", query: { lead_id: "1" }, headers: {} }, res); assert.equal(res.statusCode, 401);
  res = result(); await handler({ method: "GET", query: { lead_id: "1" }, headers: { authorization: "Bearer invalid" } }, res); assert.equal(res.statusCode, 401);

  calls = [];
  handler = await load("true", tenantRouter(async (url) => { calls.push(url); if (url.includes("/leads?")) return reply([{ id: 1 }]); return reply([{ lead_id: 1, business_id: "business-a" }]); }));
  res = result(); await handler({ method: "GET", query: { lead_id: "1", business_id: "business-b" }, headers: { authorization: "Bearer good" } }, res);
  assert.equal(res.statusCode, 200); assert.match(calls[0], /id=eq.1&business_id=eq.business-a/); assert.match(calls[1], /lead_id=eq.1&business_id=eq.business-a/);
  res = result(); await handler({ method: "GET", query: { lead_id: "bad" }, headers: { authorization: "Bearer good" } }, res); assert.equal(res.statusCode, 400);

  handler = await load("true", tenantRouter(async (url) => url.includes("/leads?") ? reply([]) : reply([])));
  res = result(); await handler({ method: "GET", query: { lead_id: "2" }, headers: { authorization: "Bearer good" } }, res); assert.equal(res.statusCode, 404);
  res = result(); await handler({ method: "POST", query: {}, headers: {} }, res); assert.equal(res.statusCode, 405);
});

test("history API returns a safe error for Supabase failures", { concurrency: false }, async () => {
  const handler = await load("true", tenantRouter(async () => reply({ secret: "hidden" }, false)));
  const res = result(); await handler({ method: "GET", query: { lead_id: "1" }, headers: { authorization: "Bearer good" } }, res);
  assert.equal(res.statusCode, 500); assert.deepEqual(res.body, { error: "Could not load lead history" });
});
test.after(() => { for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); globalThis.fetch = savedFetch; });
