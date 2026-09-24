import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const settingsSource = await readFile(new URL("../api/settings.js", import.meta.url), "utf8");
const authSource = await readFile(new URL("../lib/auth.js", import.meta.url), "utf8");
const auditSource = await readFile(new URL("../lib/audit.js", import.meta.url), "utf8");
const authUrl = `data:text/javascript;base64,${Buffer.from(authSource).toString("base64")}`;
const auditUrl = `data:text/javascript;base64,${Buffer.from(auditSource).toString("base64")}`;
const savedEnv = { ...process.env }; const savedFetch = globalThis.fetch;
const reply = (body, ok = true) => ({ ok, text: async () => JSON.stringify(body), json: async () => body });
const result = () => ({ statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
async function load(enabled, role, api, rejectAuth = false) { process.env.TENANCY_AUTH_ENABLED = enabled; process.env.SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key"; globalThis.fetch = async (url, options = {}) => { if (url.endsWith("/auth/v1/user")) return reply(rejectAuth ? {} : { id: "user-a" }, !rejectAuth); if (url.includes("business_memberships")) return reply([{ business_id: "business-a", role }]); return api(url, options); }; const source = settingsSource.replace('from "../lib/auth.js"', `from "${authUrl}#${Math.random()}"`).replace('from "../lib/audit.js"', `from "${auditUrl}#${Math.random()}"`); return (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${Math.random()}`)).default; }
const current = { id: 4, business_id: "business-a", business_name: "A", urgent_jobs_enabled: true };

test("settings gate, reads, and owner/admin writes are tenant scoped", { concurrency: false }, async () => {
  let calls = [];
  let handler = await load("false", "member", async (url) => { calls.push(url); return reply([current]); }); let res = result(); await handler({ method: "GET", headers: {} }, res); assert.equal(res.statusCode, 200); assert.doesNotMatch(calls[0], /business_id/);
  handler = await load("true", "member", async () => reply([current])); res = result(); await handler({ method: "GET", headers: {} }, res); assert.equal(res.statusCode, 401);
  handler = await load("true", "member", async () => reply([current]), true); res = result(); await handler({ method: "GET", headers: { authorization: "Bearer invalid" } }, res); assert.equal(res.statusCode, 401);
  calls = []; handler = await load("true", "member", async (url) => { calls.push(url); return reply([current]); }); res = result(); await handler({ method: "GET", headers: { authorization: "Bearer good", "x-role": "owner" }, query: { business_id: "business-b" } }, res); assert.equal(res.statusCode, 200); assert.match(calls[0], /business_id=eq.business-a/);
  for (const role of ["owner", "admin"]) { calls = []; handler = await load("true", role, async (url, options) => { calls.push({ url, options }); return options.method === "PATCH" ? reply([{ ...current, business_name: "Updated" }]) : reply([current]); }); res = result(); await handler({ method: "PATCH", headers: { authorization: "Bearer good" }, body: { business_name: "Updated" } }, res); assert.equal(res.statusCode, 200); assert.match(calls.find((c) => c.options.method === "PATCH").url, /business_id=eq.business-a/); }
});

test("settings rejects members, mass assignment, invalid input, and safe failures", { concurrency: false }, async () => {
  let handler = await load("true", "member", async () => reply([current])); let res = result(); await handler({ method: "PATCH", headers: { authorization: "Bearer good" }, body: { business_name: "x" } }, res); assert.equal(res.statusCode, 403);
  handler = await load("true", "owner", async () => reply([current]));
  for (const body of [{ business_id: "business-b" }, { business_name: 12 }, { urgent_jobs_enabled: "yes" }]) { res = result(); await handler({ method: "PATCH", headers: { authorization: "Bearer good" }, body }, res); assert.equal(res.statusCode, 400); }
  res = result(); await handler({ method: "PATCH", headers: { authorization: "Bearer good" }, body: "{" }, res); assert.equal(res.statusCode, 400);
  handler = await load("true", "owner", async () => reply({ internal: "hidden" }, false)); res = result(); await handler({ method: "GET", headers: { authorization: "Bearer good" } }, res); assert.equal(res.statusCode, 500); assert.deepEqual(res.body, { error: "Could not process settings" });
  res = result(); await handler({ method: "POST", headers: {} }, res); assert.equal(res.statusCode, 405);
});
test.after(() => { for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); globalThis.fetch = savedFetch; });
