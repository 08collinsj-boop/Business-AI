import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const configSource = await readFile(new URL("../api/public-config.js", import.meta.url), "utf8");
const savedEnv = { ...process.env };

function response() { return { statusCode: 0, body: null, headers: {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader(key, value) { this.headers[key] = value; } }; }
async function configHandler() { return (await import(`data:text/javascript;base64,${Buffer.from(configSource).toString("base64")}#${Math.random()}`)).default; }

test("public config is gated and exposes only browser-safe Supabase config", { concurrency: false }, async () => {
  const handler = await configHandler(); let res = response();
  for (const value of ["false", "TRUE", "1", "yes"]) { process.env.FRONTEND_AUTH_ENABLED = value; res = response(); await handler({}, res); assert.equal(res.statusCode, 404); }
  process.env.FRONTEND_AUTH_ENABLED = "true"; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY; res = response(); await handler({}, res); assert.equal(res.statusCode, 503);
  process.env.SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_ANON_KEY = "browser-safe-key"; res = response(); await handler({}, res);
  assert.deepEqual(res.body, { frontendAuthEnabled: true, supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "browser-safe-key" }); assert.equal(res.headers["Cache-Control"], "no-store");
});

test("frontend auth uses Supabase sessions only for private API requests", () => {
  assert.match(html, /signInWithPassword/); assert.match(html, /onAuthStateChange/); assert.match(html, /auth\.signOut/);
  assert.match(html, /headers\.set\('Authorization',`Bearer \$\{session\.access_token\}`\)/);
  assert.match(html, /fetch\('\/api\/enquiry',\{[\s\S]*?headers:\{'Content-Type':'application\/json'\}/);
  assert.doesNotMatch(html, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY/);
  assert.doesNotMatch(html, /localStorage\.setItem\([^)]*token/i);
  assert.match(html, /response\.status===401&&supabaseClient/); assert.match(html, /response\.status===403/);
});

test.after(() => { for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); });
