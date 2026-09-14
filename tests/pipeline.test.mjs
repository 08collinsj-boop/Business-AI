import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const pipelineSource = await readFile(new URL("../api/pipeline.js", import.meta.url), "utf8");
const authSource = await readFile(new URL("../api/_auth.js", import.meta.url), "utf8");
const authUrl = `data:text/javascript;base64,${Buffer.from(authSource).toString("base64")}`;
const savedEnv = { ...process.env }; const savedFetch = globalThis.fetch;
const reply = (body, ok = true) => ({ ok, text: async () => JSON.stringify(body), json: async () => body });
const result = () => ({ statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
async function load(enabled, fetchImpl) { process.env.TENANCY_AUTH_ENABLED = enabled; process.env.SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key"; globalThis.fetch = fetchImpl; const source = pipelineSource.replace('from "./_auth.js"', `from "${authUrl}#${Math.random()}"`); return (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${Math.random()}`)).default; }
function router(api) { return async (url, options = {}) => { if (url.endsWith("/auth/v1/user")) return reply({ id: "user-a" }); if (url.includes("business_memberships")) return reply([{ business_id: "business-a", role: "member" }]); return api(url, options); }; }

test("pipeline preserves legacy mode and scopes all metrics to the authenticated tenant", { concurrency: false }, async () => {
  let calls = [];
  let handler = await load("false", async (url) => { calls.push(url); return reply([]); }); let res = result();
  await handler({ method: "GET", headers: {} }, res); assert.equal(res.statusCode, 200); assert.doesNotMatch(calls[0], /business_id/); assert.equal(res.body.total, 0);
  handler = await load("true", async () => reply({}, false)); res = result(); await handler({ method: "GET", headers: {} }, res); assert.equal(res.statusCode, 401);
  res = result(); await handler({ method: "GET", headers: { authorization: "Bearer bad" } }, res); assert.equal(res.statusCode, 401);
  calls = [];
  const ownLeads = [{ id: 1, status: "New", estimated_value: 100, priority: "High", follow_up_date: null }];
  handler = await load("true", router(async (url) => { calls.push(url); return reply(ownLeads); })); res = result();
  await handler({ method: "GET", headers: { authorization: "Bearer good", "x-business-id": "business-b" }, query: { business_id: "business-b" } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.total, 1); assert.equal(res.body.pipeline_value, 100); assert.match(calls[0], /business_id=eq.business-a/);
  handler = await load("true", router(async () => reply([]))); res = result();
  await handler({ method: "GET", headers: { authorization: "Bearer good" } }, res); assert.equal(res.statusCode, 200); assert.equal(res.body.total, 0); assert.equal(res.body.total_value, 0);
});

test("pipeline returns safe failures and does not aggregate other tenant data", { concurrency: false }, async () => {
  const handler = await load("true", router(async () => reply({ internal: "hidden" }, false))); let res = result();
  await handler({ method: "GET", headers: { authorization: "Bearer good" } }, res); assert.equal(res.statusCode, 500); assert.deepEqual(res.body, { error: "Could not load pipeline" });
  res = result(); await handler({ method: "POST", headers: {} }, res); assert.equal(res.statusCode, 405);
});
test.after(() => { for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); globalThis.fetch = savedFetch; });
