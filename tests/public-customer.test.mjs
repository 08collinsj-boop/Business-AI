import assert from "node:assert/strict";
import test from "node:test";
import { readFile, stat } from "node:fs/promises";

const apiSource = await readFile(new URL("../lib/public-business-handler.js", import.meta.url), "utf8");
const routeSource = await readFile(new URL("../lib/public-tenant.js", import.meta.url), "utf8");
const billingSource = await readFile(new URL("../lib/billing.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
const serviceWorker = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const savedEnv = { ...process.env }; const savedFetch = globalThis.fetch;
const routeUrl = `data:text/javascript;base64,${Buffer.from(routeSource).toString("base64")}`;
const billingUrl = `data:text/javascript;base64,${Buffer.from(billingSource).toString("base64")}`;
const reply = (body, ok = true) => ({ ok, text: async () => JSON.stringify(body) });
const response = () => ({ statusCode: 0, body: null, headers: {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader(key, value) { this.headers[key] = value; } });

async function load({ route, settings, configuration = {} } = {}) {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only";
  process.env.BILLING_ENABLED = "false";
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url.includes("business_public_routes")) return reply(route ? [route] : []);
    if (url.includes("business_settings")) return reply(settings ? [settings] : []);
    if (url.includes("business_configurations")) return reply([configuration]);
    return reply({ hidden: true }, false);
  };
  const source = apiSource
    .replace('from "./public-tenant.js"', `from "${routeUrl}#${Math.random()}"`)
    .replace('from "./billing.js"', `from "${billingUrl}#${Math.random()}"`);
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
  assert.deepEqual(res.body, { business: { name: "Collins LTD.", type: "Electrical services", description: "Local electrical services", services: "Electrical repairs", service_areas: "Hartlepool", opening_hours: "Mon–Fri 08:00–18:00", phone: "01234 567890", assistant_available: true } });
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

test("public directory matches the approved mascot-led reference while keeping search real", () => {
  const directoryMarkup = html.slice(html.indexOf('<main id="publicDirectoryScreen"'), html.indexOf('<main id="publicEnquiryScreen"'));
  assert.match(directoryMarkup, /class="public-directory-brand-mark"/);
  assert.match(directoryMarkup, /business-ai-mascot\.png/);
  assert.match(directoryMarkup, /class="public-directory-account-switch"/);
  assert.match(directoryMarkup, /<h2>Search businesses<\/h2>/);
  assert.match(directoryMarkup, /class="public-directory-hero-mascot"/);
  assert.match(directoryMarkup, /class="public-directory-search-types"/);
  assert.match(html, /\.public-directory-reference-hero\{[\s\S]{0,520}border:1px solid #2a6eaf/);
  assert.match(html, /\.public-directory-reference-search input\{[\s\S]{0,260}min-height:66px[\s\S]{0,260}border:2px solid #2a8cf2/);
});

test("public directory is search-first and does not enumerate businesses on load", () => {
  const directoryMarkup = html.slice(html.indexOf('<main id="publicDirectoryScreen"'), html.indexOf('<main id="publicEnquiryScreen"'));
  const directoryScript = html.slice(html.indexOf('let publicDirectoryBusinesses=[];'), html.indexOf('const publicEnquiryMessages=[];'));
  const publicInitialisation = html.slice(html.indexOf("async function initializeApp"), html.indexOf("initializeApp();"));
  assert.match(directoryMarkup, /id="publicDirectoryResultsPanel" class="public-directory-results-panel" hidden/);
  assert.match(directoryMarkup, /Search by business name, service or area\./);
  assert.match(directoryMarkup, /Start typing to find a business/);
  assert.match(directoryScript, /normalized\.length<2\)\{resetPublicBusinessDirectorySearch\(\);return;\}/);
  assert.match(html, /publicDirectorySearch'\)\?\.addEventListener\('input',queuePublicBusinessDirectorySearch\)/);
  assert.match(directoryScript, /window\.setTimeout\(\(\)=>\{publicDirectorySearchTimer=null;loadPublicBusinessDirectory\(query\);\},220\)/);
  assert.match(publicInitialisation, /classList\.add\('public-directory'\);resetPublicBusinessDirectorySearch\(\);return;/);
  assert.doesNotMatch(publicInitialisation, /classList\.add\('public-directory'\);loadPublicBusinessDirectory\(\);return;/);
  assert.match(html, /body\.public-directory\{padding:0;background:radial-gradient/);
});

test("the public customer UI is transparent and separate from owner PWA state", () => {
  assert.match(html, /id="publicBusinessName"/);
  assert.match(html, /class="public-assistant-hero"/);
  assert.match(html, /Ask a question/);
  assert.match(html, /Request a quote/);
  assert.match(html, /Speak to someone/);
  assert.match(html, /General enquiry/);
  assert.match(html, /function startPublicEnquiry\(message\)/);
  assert.match(html, /This is an AI assistant for/);
  assert.match(html, /async function loadPublicBusinessIdentity/);
  assert.match(html, /new URL\('\/api\/public-business',window\.location\.origin\)/);
  const publicSection = html.slice(html.indexOf("const publicEnquiryMessages"), html.indexOf("$('publicEnquiryForm').addEventListener"));
  assert.doesNotMatch(publicSection, /Authorization|access_token|business_id/);
  assert.match(html, /public-customer-shell/);
  assert.match(html, /env\(safe-area-inset-bottom\)/);
  const publicInitialisation = html.slice(html.indexOf("async function initializeApp"), html.indexOf("initializeApp();"));
  assert.doesNotMatch(publicInitialisation, /registerOwnerPwa/, "public visitors are not prompted to install the owner app");
});

test("public quick actions only guide the existing public conversation", () => {
  const publicSection = html.slice(html.indexOf("function startPublicEnquiry"), html.indexOf("function addPublicEnquiryMessage"));
  assert.match(publicSection, /input\.value=message/);
  assert.doesNotMatch(publicSection, /Authorization|access_token|business_id|fetch\(/);
  assert.match(html, /This is an AI assistant for/);
});

test("approved chat-first customer layout keeps quick actions collapsed with an animated reveal", () => {
  const publicMarkup = html.slice(html.indexOf('<main id="publicEnquiryScreen"'), html.indexOf('<div id="dashboardApp"'));
  assert.match(publicMarkup, /<h1>Business AI assistant<\/h1>/);
  assert.match(publicMarkup, /id="publicQuickActionsToggle"/);
  assert.match(publicMarkup, /aria-expanded="false"/);
  assert.match(publicMarkup, /id="publicQuickActionsBody" class="public-quick-actions-body" aria-hidden="true"/);
  assert.match(publicMarkup, /class="public-chat-card public-chat-primary"/);
  assert.match(publicMarkup, /class="public-online-pill"/);
  assert.match(publicMarkup, /class="public-composer-icon"/);
  assert.match(html, /\.public-quick-actions-body\{[\s\S]{0,360}grid-template-rows:0fr[\s\S]{0,360}transition:grid-template-rows/);
  assert.match(html, /\.public-quick-actions-body\.open\{[\s\S]{0,180}grid-template-rows:1fr/);
  assert.match(html, /function setPublicQuickActions\(open\)/);
  assert.match(html, /publicQuickActionsToggle'\)\?\.addEventListener\('click'/);
});

test("public enquiry uses the approved dark chat-first theme", () => {
  const publicMarkup = html.slice(html.indexOf('<main id="publicEnquiryScreen"'), html.indexOf('<div id="dashboardApp"'));
  assert.match(publicMarkup, /class="public-assistant-hero"/);
  assert.match(publicMarkup, /class="public-quick-actions-panel"/);
  assert.match(publicMarkup, /class="public-chat-card public-chat-primary"/);
  assert.match(publicMarkup, /Business AI assistant/);
  assert.match(html, /\.public-quick-actions-toggle\{[\s\S]{0,900}backdrop-filter:blur\(18px\)/);
});

test("customer visual hierarchy keeps messaging primary", () => {
  const publicMarkup = html.slice(html.indexOf('<main id="publicEnquiryScreen"'), html.indexOf('<div id="dashboardApp"'));
  assert.ok(publicMarkup.indexOf('class="public-assistant-hero"') < publicMarkup.indexOf('id="publicQuickActionsToggle"'));
  assert.ok(publicMarkup.indexOf('id="publicQuickActionsToggle"') < publicMarkup.indexOf('class="public-chat-card public-chat-primary"'));
  assert.match(publicMarkup, /class="quick-icon" aria-hidden="true"/);
  assert.match(publicMarkup, /id="publicMessages"/);
  assert.match(publicMarkup, /id="publicEnquiryForm"/);
});

test("customer uses only the approved local mascot artwork", () => {
  const publicMarkup = html.slice(html.indexOf('<main id="publicEnquiryScreen"'), html.indexOf('<div id="dashboardApp"'));
  assert.match(publicMarkup, /\/assets\/icons\/business-ai-mascot\.png/);
  assert.doesNotMatch(publicMarkup, /https?:\/\/[^"' ]+\.(?:png|jpe?g|webp)/i);
});

test("mobile public enquiry fits the viewport and scrolls only message history", () => {
  assert.match(html, /body\.public-enquiry\{[\s\S]{0,120}height:100dvh;[\s\S]{0,120}overflow:hidden;/);
  assert.match(html, /body\.public-enquiry \.public-chat-first-shell\{[\s\S]{0,160}height:100dvh;[\s\S]{0,160}overflow:hidden;/);
  assert.match(html, /body\.public-enquiry \.public-chat-primary\{[\s\S]{0,180}min-height:0;[\s\S]{0,120}overflow:hidden;/);
  assert.match(html, /body\.public-enquiry \.public-messages\{[\s\S]{0,220}min-height:0;[\s\S]{0,220}overflow-y:auto;/);
  assert.match(html, /body\.public-enquiry \.public-chat-form\{[\s\S]{0,180}position:relative;[\s\S]{0,120}bottom:auto;/);
});

test("PWA metadata uses the approved local icon assets and only static non-sensitive caching", async () => {
  assert.equal(manifest.name, "Business AI"); assert.equal(manifest.display, "standalone"); assert.equal(manifest.start_url, "/");
  assert.ok(manifest.icons.some((icon) => icon.src === "/assets/icons/business-ai-192.png" && icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.src === "/assets/icons/business-ai-512.png" && icon.sizes === "512x512"));
  assert.ok(manifest.icons.every((icon) => icon.purpose === "any"), "the supplied artwork is not declared maskable without a safe maskable crop");
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest">/);
  assert.match(html, /apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /apple-mobile-web-app-status-bar-style" content="black-translucent"/);
  assert.match(html, /apple-mobile-web-app-title" content="Business AI"/);
  assert.match(html, /apple-touch-icon" sizes="180x180" href="\/assets\/icons\/business-ai-180\.png"/);
  assert.match(html, /business-ai-32\.png" sizes="32x32"/);
  assert.match(html, /business-ai-16\.png" sizes="16x16"/);
  for (const size of [16, 32, 180, 192, 512]) {
    const icon = await stat(new URL(`../assets/icons/business-ai-${size}.png`, import.meta.url));
    assert.ok(icon.size > 0, `local ${size}px icon exists`);
  }
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.doesNotMatch(serviceWorker, /cache\.put\([^)]*\/api\//);
  assert.doesNotMatch(serviceWorker, /Authorization|access_token|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY/);
  assert.match(serviceWorker, /business-ai-180\.png/);
});

test("install guidance belongs only to the authenticated owner application", () => {
  const publicMarkup = html.slice(html.indexOf('<main id="publicEnquiryScreen"'), html.indexOf('<div id="dashboardApp"'));
  const ownerMarkup = html.slice(html.indexOf('<div id="dashboardApp"'));
  assert.doesNotMatch(publicMarkup, /Install Business AI|installAppCard|beforeinstallprompt/);
  assert.match(ownerMarkup, /id="installAppCard"/);
  assert.match(ownerMarkup, /Add Business AI to your Home Screen for quick access\./);
  assert.match(html, /window\.addEventListener\('beforeinstallprompt'/);
  assert.match(html, /\(display-mode: standalone\)/);
  assert.match(html, /window\.navigator\.standalone===true/);
  assert.match(html, /Tap Share in Safari/);
});

test.after(() => { for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); globalThis.fetch = savedFetch; });
