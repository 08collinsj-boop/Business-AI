import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const apiSource = await readFile(new URL("../lib/public-business-handler.js", import.meta.url), "utf8");
const routeSource = await readFile(new URL("../lib/public-tenant.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
const serviceWorker = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const savedEnv = { ...process.env }; const savedFetch = globalThis.fetch;
const routeUrl = `data:text/javascript;base64,${Buffer.from(routeSource).toString("base64")}`;
const reply = (body, ok = true) => ({ ok, text: async () => JSON.stringify(body) });
const response = () => ({ statusCode: 0, body: null, headers: {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader(key, value) { this.headers[key] = value; } });

async function load({ route, settings, configuration = {} } = {}) {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only";
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url.includes("business_public_routes")) return reply(route ? [route] : []);
    if (url.includes("business_settings")) return reply(settings ? [settings] : []);
    if (url.includes("business_configurations")) return reply([configuration]);
    return reply({ hidden: true }, false);
  };
  const source = apiSource.replace('from "./public-tenant.js"', `from "${routeUrl}#${Math.random()}"`);
  return { handler: (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${Math.random()}`)).default, calls };
}

test("a verified public slug returns only its business-facing identity", { concurrency: false }, async () => {
  const { handler, calls } = await load({
    route: { business_id: "business-a", route_type: "slug", route_value: "collins-ltd", active: true },
    settings: { business_name: "Collins LTD.", business_type: "Electrical services", phone: "01234 567890", opening_hours: "Mon–Fri 08:00–18:00", services: "Electrical repairs" },
    configuration: { description: "Local electrical services", service_areas: "Hartlepool" }
  });
  const res = response();
  await handler({ method: "GET", query: { business: "collins-ltd", business_id: "business-b" } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { business: { name: "Collins LTD.", type: "Electrical services", description: "Local electrical services", services: "Electrical repairs", service_areas: "Hartlepool", opening_hours: "Mon–Fri 08:00–18:00", phone: "01234 567890" } });
  assert.equal("business_id" in res.body.business, false);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.ok(calls.some((url) => url.includes("business_id=eq.business-a")));
  assert.ok(calls.every((url) => !url.includes("business-b")), "request-supplied tenant IDs never affect the lookup");
});

test("unknown or mismatched public routes fail without tenant disclosure", { concurrency: false }, async () => {
  let loaded = await load({ route: null }); let res = response();
  await loaded.handler({ method: "GET", query: { business: "missing-business" } }, res);
  assert.equal(res.statusCode, 404); assert.deepEqual(res.body, { error: "Business not available" });
  loaded = await load({ route: { business_id: "business-b", route_type: "slug", route_value: "other-business", active: true } }); res = response();
  await loaded.handler({ method: "GET", query: { business: "collins-ltd" } }, res);
  assert.equal(res.statusCode, 404); assert.deepEqual(res.body, { error: "Business not available" });
});

test("different public routes keep customer branding isolated between businesses", { concurrency: false }, async () => {
  const { handler } = await load({
    route: { business_id: "business-b", route_type: "slug", route_value: "hartlepool-test-electrical", active: true },
    settings: { business_name: "Hartlepool Test Electrical", business_type: "Electrical services", phone: "", opening_hours: "", services: "Testing only" },
    configuration: { description: "Independent tenant B", service_areas: "Hartlepool" }
  });
  const res = response();
  await handler({ method: "GET", query: { business: "hartlepool-test-electrical" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.business.name, "Hartlepool Test Electrical");
  assert.notEqual(res.body.business.name, "Collins LTD.");
  assert.equal("business_id" in res.body.business, false);
});

test("the public customer UI is business-first, transparent and separate from owner PWA state", () => {
  assert.match(html, /id="publicBusinessName"/);
  assert.match(html, /AI assistant for/);
  assert.match(html, /Powered by Business AI/);
  assert.match(html, /async function loadPublicBusinessIdentity/);
  assert.match(html, /new URL\('\/api\/public-business',window\.location\.origin\)/);
  const publicSection = html.slice(html.indexOf("const publicEnquiryMessages"), html.indexOf("$('publicEnquiryForm').addEventListener"));
  assert.doesNotMatch(publicSection, /Authorization|access_token|business_id/);
  assert.match(html, /public-customer-shell/);
  assert.match(html, /env\(safe-area-inset-bottom\)/);
  assert.match(html, /registerOwnerPwa\(\);/);
  const publicInitialisation = html.slice(html.indexOf("async function initializeApp"), html.indexOf("initializeApp();"));
  assert.doesNotMatch(publicInitialisation, /registerOwnerPwa/, "public visitors are not prompted to install the owner app");
});

test("PWA metadata and worker cache only static non-sensitive assets", () => {
  assert.equal(manifest.name, "Business AI"); assert.equal(manifest.display, "standalone"); assert.equal(manifest.start_url, "/");
  assert.ok(manifest.icons.some((icon) => icon.src === "/assets/icons/business-ai-192.png" && icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.src === "/assets/icons/business-ai-512.png" && icon.sizes === "512x512"));
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest">/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.doesNotMatch(serviceWorker, /cache\.put\([^)]*\/api\//);
  assert.doesNotMatch(serviceWorker, /Authorization|access_token|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY/);
});

test.after(() => { for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); globalThis.fetch = savedFetch; });
