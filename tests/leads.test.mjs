import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const leadsSource = await readFile(new URL("../api/leads.js", import.meta.url), "utf8");
const authSource = await readFile(new URL("../api/_auth.js", import.meta.url), "utf8");
const auditSource = await readFile(new URL("../api/_audit.js", import.meta.url), "utf8");
const authUrl = `data:text/javascript;base64,${Buffer.from(authSource).toString("base64")}`;
const auditUrl = `data:text/javascript;base64,${Buffer.from(auditSource).toString("base64")}`;
const savedEnv = { ...process.env };
const savedFetch = globalThis.fetch;

function reply(body, ok = true) { return { ok, text: async () => JSON.stringify(body), json: async () => body }; }
function result() {
  return { statusCode: 0, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
async function load({ enabled, fetchImpl }) {
  process.env.TENANCY_AUTH_ENABLED = enabled;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  globalThis.fetch = fetchImpl;
  const source = leadsSource.replace('from "./_auth.js"', `from "${authUrl}#${Math.random()}"`).replace('from "./_audit.js"', `from "${auditUrl}#${Math.random()}"`);
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${Math.random()}`)).default;
}
function authRouter(api) {
  return async (url, options = {}) => {
    if (url.endsWith("/auth/v1/user")) return reply({ id: "user-a" });
    if (url.includes("business_memberships")) return reply([{ business_id: "business-a", role: "owner" }]);
    return api(url, options);
  };
}

test("leads API legacy gate and tenant isolation", { concurrency: false }, async () => {
  let calls = [];
  let handler = await load({ enabled: "false", fetchImpl: async (url) => { calls.push(url); return reply([]); } });
  let res = result(); await handler({ method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 200); assert.doesNotMatch(calls[0], /business_id/);

  handler = await load({ enabled: "true", fetchImpl: async () => reply({ message: "no" }, false) });
  res = result(); await handler({ method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 401);
  res = result(); await handler({ method: "GET", headers: { authorization: "Bearer bad" } }, res);
  assert.equal(res.statusCode, 401);

  calls = [];
  handler = await load({ enabled: "true", fetchImpl: authRouter(async (url) => { calls.push(url); return reply([{ id: 1, business_id: "business-a" }]); }) });
  res = result(); await handler({ method: "GET", headers: { authorization: "Bearer good" }, query: { business_id: "business-b" } }, res);
  assert.equal(res.statusCode, 200); assert.match(calls[0], /business_id=eq.business-a/); assert.equal(res.body[0].business_id, "business-a");
});

test("leads API validates writes and scopes both lookup and update", { concurrency: false }, async () => {
  let calls = [];
  const current = { id: 1, business_id: "business-a", status: "New", priority: "Normal", estimated_value: 0, notes: "", follow_up_date: null };
  let handler = await load({ enabled: "true", fetchImpl: authRouter(async (url, options) => {
    calls.push({ url, options });
    if (options.method === "PATCH") return reply([{ ...current, status: "Contacted" }]);
    if (url.includes("lead_history")) { assert.equal(JSON.parse(options.body).business_id, "business-a"); return reply(null); }
    return reply([current]);
  }) });
  let res = result(); await handler({ method: "PATCH", headers: { authorization: "Bearer good" }, body: { id: 1, status: "Contacted" } }, res);
  assert.equal(res.statusCode, 200);
  const leadCalls = calls.filter((call) => call.url.includes("/leads?"));
  assert.ok(leadCalls.every((call) => call.url.includes("business_id=eq.business-a")));

  handler = await load({ enabled: "true", fetchImpl: authRouter(async (url) => url.includes("/leads?") ? reply([]) : reply(null)) });
  res = result(); await handler({ method: "PATCH", headers: { authorization: "Bearer good" }, body: { id: 99, status: "Contacted" } }, res);
  assert.equal(res.statusCode, 404);
  handler = await load({ enabled: "true", fetchImpl: authRouter(async (url) => url.includes("/leads?") ? reply([current]) : reply(null)) });
  for (const body of [{ id: "x", status: "New" }, { id: 1, status: "Bad" }, { id: 1, priority: "Urgent" }, { id: 1, estimated_value: -1 }, { id: 1, follow_up_date: "2026-99-99" }, { id: 1, business_id: "business-b", status: "New" }]) {
    res = result(); await handler({ method: "PATCH", headers: { authorization: "Bearer good" }, body }, res);
    assert.equal(res.statusCode, 400);
  }
  res = result(); await handler({ method: "PATCH", headers: { authorization: "Bearer good" }, body: "{" }, res);
  assert.equal(res.statusCode, 400);
});

test.after(() => { for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); globalThis.fetch = savedFetch; });
