import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../api/actions.js", import.meta.url), "utf8");
const authSource = await readFile(new URL("../api/_auth.js", import.meta.url), "utf8");
const auditSource = await readFile(new URL("../api/_audit.js", import.meta.url), "utf8");
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
  const moduleSource = source.replace('from "./_auth.js"', `from "${authUrl}#${Math.random()}"`).replace('from "./_audit.js"', `from "${auditUrl}#${Math.random()}"`);
  return (await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}#${Math.random()}`)).default;
}

test("actions require authentication and tenant-scope reads", { concurrency: false }, async () => {
  let handler = await load("false", async () => reply([])); let res = result();
  await handler({ method: "GET", headers: {} }, res); assert.equal(res.statusCode, 503);
  handler = await load("true", async () => reply({}, false)); res = result();
  await handler({ method: "GET", headers: {} }, res); assert.equal(res.statusCode, 401);
  let calls = [];
  handler = await load("true", async url => { calls.push(url); return reply([{ id: 1, business_id: "business-a" }]); }); res = result();
  await handler({ method: "GET", headers: { authorization: "Bearer good" }, query: { business_id: "business-b" } }, res);
  assert.equal(res.statusCode, 200); assert.match(calls[0], /business_id=eq.business-a/); assert.doesNotMatch(calls[0], /business-b/);
});

test("actions create, complete, and reject cross-tenant or malformed input", { concurrency: false }, async () => {
  const current = { id: 4, business_id: "business-a", lead_id: 1, booking_id: null, title: "Call", status: "pending" };
  let calls = [];
  let handler = await load("true", async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("/leads?")) return reply([{ id: 1 }]);
    if (url.includes("lead_history")) return reply(null);
    if (options.method === "POST") return reply([{ ...current, ...JSON.parse(options.body) }]);
    if (options.method === "PATCH") return reply([{ ...current, ...JSON.parse(options.body) }]);
    return reply([current]);
  });
  let res = result();
  await handler({ method: "POST", headers: { authorization: "Bearer good" }, body: { title: "Call", lead_id: 1, business_id: "business-b" } }, res);
  assert.equal(res.statusCode, 400);
  res = result();
  await handler({ method: "POST", headers: { authorization: "Bearer good" }, body: { title: "Call", lead_id: 1, action_type: "call_customer" } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(JSON.parse(calls.find(call => call.options.method === "POST" && call.url.endsWith("/rest/v1/actions")).options.body).business_id, "business-a");
  res = result();
  await handler({ method: "PATCH", headers: { authorization: "Bearer good" }, body: { id: 4, status: "completed" } }, res);
  assert.equal(res.statusCode, 200);
  const patch = calls.find(call => call.options.method === "PATCH");
  assert.match(patch.url, /id=eq.4&business_id=eq.business-a/);
  assert.ok(JSON.parse(patch.options.body).completed_at);

  handler = await load("true", async url => url.includes("/actions?") ? reply([]) : reply([])); res = result();
  await handler({ method: "PATCH", headers: { authorization: "Bearer good" }, body: { id: 99, status: "completed" } }, res);
  assert.equal(res.statusCode, 404);
  for (const body of [{ title: "" }, { title: "x", priority: "bad" }, { title: "x", due_at: "bad" }, "{"]) {
    res = result(); await handler({ method: "POST", headers: { authorization: "Bearer good" }, body }, res); assert.equal(res.statusCode, 400);
  }
});

test.after(() => {
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  globalThis.fetch = savedFetch;
});
