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
  assert.match(html, /new URL\('\/api\/enquiry',window\.location\.origin\)/);
  assert.match(html, /api\('\/api\/business-onboarding'\)/);
  assert.match(html, /const publicBusinessSlug=frontendAuthEnabled\?authenticatedPublicBusinessSlug:new URLSearchParams\(window\.location\.search\)\.get\('business'\)/);
  assert.doesNotMatch(html, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY/);
  assert.doesNotMatch(html, /localStorage\.setItem\([^)]*token/i);
  assert.match(html, /response\.status===401&&supabaseClient/); assert.match(html, /response\.status===403/);
  assert.match(html, /api\('\/api\/business-configuration'\)/);
  assert.doesNotMatch(html, /TWILIO_AUTH_TOKEN|VOICE_WEBHOOK/);
});

test("public customer links use only a validated slug and never unlock dashboard data", () => {
  assert.match(html, /const publicSlugFromLocation=\(\)=>\{/);
  assert.match(html, /if\(publicEnquirySlug\)\{document\.body\.classList\.remove\('auth-pending'\);document\.body\.classList\.add\('public-enquiry'\);/);
  assert.match(html, /body\.public-enquiry \.app,body\.public-enquiry \.bottom-nav,body\.public-enquiry #authScreen,body\.public-enquiry #businessSetupScreen\{display:none\}/, "public customer mode hides the standalone private dashboard navigation");
  assert.match(html, /url\.searchParams\.set\('business',publicEnquirySlug\)/);
  assert.match(html, /Customer enquiry link[\s\S]{0,600}It does not reveal your internal business ID/);
  const publicHandler = html.slice(html.indexOf("async function sendPublicEnquiry"), html.indexOf("$('publicEnquiryForm').addEventListener"));
  assert.doesNotMatch(publicHandler, /Authorization|access_token|business_id/);
});

test("auth-state changes defer private API work until Supabase releases its callback lock", () => {
  assert.match(html, /onAuthStateChange\(\(event,nextSession\)=>\{\s*if\(event==='INITIAL_SESSION'\)return;\s*window\.setTimeout\(\(\)=>\{handleSession\(nextSession\)\.catch\(\(\)=>\{\}\);\},0\);\s*\}\);/s);
  assert.doesNotMatch(html, /onAuthStateChange\(\(_event,nextSession\)=>handleSession\(nextSession\)\)/);
});

test("dashboard context uses a server-returned role and keeps test conversations tenant-scoped", () => {
  assert.match(html, /const applyBusinessContext=onboarding=>\{/);
  assert.match(html, /\['owner','admin','member'\]\.includes\(onboarding\?\.role\)/);
  assert.match(html, /const enquiryStorageKey=slug=>`business-ai-enquiry-conversation:\$\{slug\}`/);
  assert.match(html, /sessionStorage\.removeItem\(enquiryStorageKey\(authenticatedPublicBusinessSlug\)\)/);
  assert.doesNotMatch(html, /const enquiryStorageKey='business-ai-enquiry-conversation'/);
  assert.match(html, /const onboarding=await api\('\/api\/business-onboarding'\);\s*applyBusinessContext\(onboarding\);\s*setAuthView\('auth-ready'\);/s, "new owners refresh trusted business context immediately after creation");
  assert.match(html, /data-owner-only/, "owner-only operations are separated in the UI as well as by the API");
});

test("self-service signup creates only an Auth account and waits for email confirmation", () => {
  assert.match(html, /id="signUpForm"/);
  assert.match(html, /auth\.signUp\(\{/);
  assert.match(html, /emailRedirectTo:new URL\('\/',window\.location\.origin\)\.toString\(\)/);
  assert.match(html, /If this email can be used, check your inbox to confirm it, then sign in\./);
  assert.match(html, /password\.length<12/);
  assert.doesNotMatch(html, /auth\.signUp\([\s\S]{0,800}business_id/);
  assert.doesNotMatch(html, /auth\.signUp\([\s\S]{0,800}role:/);
  assert.doesNotMatch(html, /auth\.signUp\([\s\S]{0,800}(?:user_metadata|app_metadata|data:)\s*/);
  assert.match(html, /api\('\/api\/business-onboarding'\)/, "business setup remains a separate authenticated flow");
});

test.after(() => { for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); });
