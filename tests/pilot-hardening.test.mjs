import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { enforcePublicEnquiryRateLimit, isDurablePublicRateLimitEnabled, publicRateLimitWindow, publicSourceFingerprint } from "../lib/public-rate-limit.js";

const auditSource = await readFile(new URL("../lib/audit.js", import.meta.url), "utf8");
const lifecycleSource = await readFile(new URL("../lib/data-lifecycle-handler.js", import.meta.url), "utf8");
const subjectSource = await readFile(new URL("../lib/data-subjects-handler.js", import.meta.url), "utf8");
const health = (await import(new URL(`../lib/health-handler.js?health=${Math.random()}`, import.meta.url))).default;
const savedEnv = { ...process.env }; const savedFetch = globalThis.fetch;

test("durable public quota mode uses an HMAC source fingerprint and fails closed without its server secret", async () => {
  process.env.PUBLIC_ENQUIRY_RATE_LIMIT_MODE = "database"; process.env.RATE_LIMIT_SALT = "test-salt";
  assert.equal(isDurablePublicRateLimitEnabled(), true);
  assert.match(publicSourceFingerprint("198.51.100.9"), /^[a-f0-9]{64}$/);
  assert.equal(publicRateLimitWindow(Date.UTC(2026, 0, 1, 0, 11)).endsWith("00:10:00.000Z"), true);
  let received = null;
  const result = await enforcePublicEnquiryRateLimit({ businessId: "business-a", slug: "business-a", clientAddress: "198.51.100.9", now: 0, repository: { consumeQuota: async (value) => { received = value; return true; } } });
  assert.equal(result.allowed, true); assert.equal(received.businessId, "business-a"); assert.match(received.sourceFingerprint, /^[a-f0-9]{64}$/);
  delete process.env.RATE_LIMIT_SALT;
  assert.equal((await enforcePublicEnquiryRateLimit({ businessId: "business-a", slug: "business-a", clientAddress: "198.51.100.9", repository: {} })).allowed, false);
});

test("audit helper excludes personal data and secrets from metadata", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only";
  let body = null; globalThis.fetch = async (_url, options) => { body = JSON.parse(options.body); return { ok: true }; };
  const audit = await import(`data:text/javascript;base64,${Buffer.from(auditSource).toString("base64")}#${Math.random()}`);
  await audit.recordAuditEvent({ businessId: "business-a", actorUserId: "user-a", action: "lead.updated", resourceType: "lead", resourceId: "1", metadata: { status: "Contacted", phone: "07000", notes: "private", token: "secret" } });
  assert.deepEqual(body.metadata, { status: "Contacted" });
});

test("lifecycle export/erasure routes are owner-only and tenant-scoped", () => {
  assert.match(lifecycleSource, /requireBusinessMember\(req, \["owner"\]\)/);
  assert.match(lifecycleSource, /business_data_lifecycle_policies\?business_id=eq/);
  assert.match(subjectSource, /requireBusinessMember\(req, \["owner"\]\)/);
  assert.match(subjectSource, /leads\?id=eq\.\$\{leadId\}&business_id=eq/);
  assert.match(subjectSource, /data_subject\.erased/);
  assert.match(subjectSource, /Personal data erased/);
});

test("health endpoint is shallow and never returns configuration values", () => {
  const response = () => ({ statusCode: 0, body: null, headers: {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader(key, value) { this.headers[key] = value; } });
  process.env.SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only"; process.env.OPENAI_API_KEY = "openai-server-only";
  const res = response(); health({ method: "GET" }, res); assert.equal(res.statusCode, 200); assert.deepEqual(res.body, { status: "ok" }); assert.equal(JSON.stringify(res.body).includes("key"), false);
});

test.after(() => { for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); globalThis.fetch = savedFetch; });
