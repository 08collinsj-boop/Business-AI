import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const configSource = await readFile(new URL("../lib/public-config-handler.js", import.meta.url), "utf8");
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
  assert.match(html, /body\.public-enquiry \.app,body\.public-enquiry \.bottom-nav,body\.public-enquiry #authScreen,body\.public-enquiry #businessSetupScreen,body\.public-enquiry #configurationOnboardingScreen\{display:none\}/, "public customer mode hides the standalone private dashboard navigation");
  assert.match(html, /url\.searchParams\.set\('business',publicEnquirySlug\)/);
  assert.match(html, /Customer enquiry link[\s\S]{0,600}It does not reveal your internal business ID/);
  const publicHandler = html.slice(html.indexOf("async function sendPublicEnquiry"), html.indexOf("$('publicEnquiryForm').addEventListener"));
  assert.doesNotMatch(publicHandler, /Authorization|access_token|business_id/);
  assert.match(publicHandler, /AI_ENQUIRY_ALLOWANCE_REACHED[\s\S]*SUBSCRIPTION_REQUIRED[\s\S]*PAYMENT_REQUIRED[\s\S]*BILLING_CONFIGURATION_ERROR[\s\S]*BILLING_UNAVAILABLE/, "billing/subscription blocks are not misrepresented as transient AI failures");
  assert.match(publicHandler, /This assistant is currently unavailable\. Please contact the business directly\./);
});

test("owner navigation is focused while AI and bookings remain reachable from authenticated workspace cards", () => {
  const nav = html.slice(html.indexOf("<nav class=\"bottom-nav\""), html.indexOf("</nav>", html.indexOf("<nav class=\"bottom-nav\"")));
  assert.match(nav, /data-view="dashboard"[\s\S]*Home/);
  assert.match(nav, /data-view="leads"[\s\S]*Leads/);
  assert.match(nav, /data-view="actions"[\s\S]*Actions/);
  assert.match(nav, /data-view="settings"[\s\S]*Settings/);
  assert.doesNotMatch(nav, /data-view="(?:voice|bookings|enquiries)"/);
  assert.match(html, /showView\('enquiries'\)[\s\S]{0,200}Test your AI/);
  assert.match(html, /showView\('bookings'\)[\s\S]{0,200}Bookings/);
  assert.match(html, /const navContext=\['addons','marketing'\]\.includes\(view\)\?'settings':\(view==='enquiries'\|\|view==='bookings'\)\?'dashboard':view;/, "internal owner tools retain a truthful Home navigation context");
  assert.match(html, /id="actionsFormCard" class="card work-form" hidden role="dialog"/, "new actions open in a focused sheet rather than permanently occupying the list");
  assert.match(html, /id="bookingsFormCard" class="card work-form" hidden role="dialog"/, "new bookings open in a focused sheet rather than permanently occupying the list");
});

test("owner dashboard uses semantic colour presentation without inventing metrics or activity", () => {
  for (const token of ["--accent-blue", "--attention-red", "--action-orange", "--success-green", "--quote-purple", "--activity-pink"]) assert.match(html, new RegExp(token));
  assert.match(html, /metric-icon blue[\s\S]{0,180}New leads/);
  assert.match(html, /metric-icon red[\s\S]{0,180}Needs attention/);
  assert.match(html, /metric-icon orange[\s\S]{0,180}Actions due/);
  assert.match(html, /metric-icon green[\s\S]{0,180}Total enquiries/);
  assert.match(html, /const activityTone=lead=>/);
  assert.match(html, /ai-feature-card/);
  assert.match(html, /Let AI handle the enquiries/);
  assert.doesNotMatch(html, /\+33%|\+20%|Save time, stay organised, grow faster/);
});

test("auth-state changes defer private API work until Supabase releases its callback lock", () => {
  assert.match(html, /onAuthStateChange\(\(event,nextSession\)=>\{[\s\S]*?if\(event==='INITIAL_SESSION'\)return;[\s\S]*?window\.setTimeout\(\(\)=>\{handleSession\(nextSession\)\.catch\(\(\)=>\{\}\);\},0\);[\s\S]*?\}\);/);
  assert.doesNotMatch(html, /onAuthStateChange\(\(_event,nextSession\)=>handleSession\(nextSession\)\)/);
});

test("dashboard context uses a server-returned role and keeps test conversations tenant-scoped", () => {
  assert.match(html, /const applyBusinessContext=onboarding=>\{/);
  assert.match(html, /\['owner','admin','member'\]\.includes\(onboarding\?\.role\)/);
  assert.match(html, /const enquiryStorageKey=slug=>`business-ai-enquiry-conversation:\$\{slug\}`/);
  assert.match(html, /sessionStorage\.removeItem\(enquiryStorageKey\(authenticatedPublicBusinessSlug\)\)/);
  assert.doesNotMatch(html, /const enquiryStorageKey='business-ai-enquiry-conversation'/);
  assert.match(html, /const onboarding=await api\('\/api\/business-onboarding'\);\s*applyBusinessContext\(onboarding\);\s*await beginConfigurationOnboarding\(\);/s, "new owners continue into the secure configuration wizard");
  assert.match(html, /data-owner-only/, "owner-only operations are separated in the UI as well as by the API");
});

test("configuration onboarding is a complete app state, not an overlay on private navigation", () => {
  assert.match(html, /\.bottom-nav\{[\s\S]{0,800}?display:none;/, "private navigation is hidden until the authenticated app is ready");
  assert.match(html, /body\.auth-ready \.bottom-nav\{display:grid\}/, "private navigation appears only after setup is complete");
  assert.match(html, /authenticatedBusinessRole==='owner'&&!setup\?\.onboarding\?\.completed\)\{await beginConfigurationOnboarding\(\);return;\}/, "only incomplete owners enter the configuration wizard");
  assert.match(html, /setAuthView\('configuration-onboarding-required'\)/, "wizard uses its own explicit application state");
});

test("configuration onboarding validates only the visible wizard step and reports save failures inline", () => {
  assert.match(html, /<form id="configurationOnboardingForm" class="auth-card onboarding-card" novalidate>/, "hidden future-step inputs cannot block the current step through native form validation");
  assert.doesNotMatch(html, /id="o_(?:business_name|business_type|services|hours)"[^>]*\srequired/, "the wizard owns required-field validation for each active step");
  assert.match(html, /if\(current==='business'&&\(!wizardValue\('o_business_name'\)\|\|!wizardValue\('o_business_type'\)\)\)throw new Error\('Add your business name and type to continue\.'/);
  assert.match(html, /if\(current==='services'&&!wizardValue\('o_services'\)\)throw new Error\('Add at least one service to continue\.'/);
  assert.match(html, /if\(current==='hours'&&!wizardValue\('o_hours'\)\)throw new Error\('Add your opening hours to continue\.'/);
  assert.match(html, /button\.disabled=true;message\.textContent='Saving your progress…';[\s\S]{0,800}?onboardingWizardIndex\+=1;[\s\S]{0,800}?catch\(error\)\{message\.textContent=error\.message\|\|'Could not save your setup\.';\}finally\{button\.disabled=false;\}/, "saving prevents duplicate submits, advances only after success, and preserves the active form on failure");
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
  assert.match(html, /configuration-onboarding-required/, "incomplete owners are directed to a resumable setup wizard");
  assert.match(html, /onboarding_step:complete\?'completed':next/, "wizard progress is persisted server-side");
  assert.match(html, /Completing setup does not grant a trial or subscription/, "onboarding never grants billing entitlements");
});

test("password recovery stays within Supabase Auth and does not expose tenant or secret state", () => {
  assert.match(html, /id="showPasswordReset"/);
  assert.match(html, /resetPasswordForEmail\(\$\('passwordResetEmail'\)\.value\.trim\(\),\{redirectTo:new URL\('\/',window\.location\.origin\)\.toString\(\)\}\)/);
  assert.match(html, /event==='PASSWORD_RECOVERY'.*setAuthenticationMode\('recovery'\)/);
  assert.match(html, /auth\.updateUser\(\{password\}\)/);
  assert.doesNotMatch(html, /resetPasswordForEmail[\s\S]{0,500}(?:business_id|role|SUPABASE_SERVICE_ROLE_KEY)/);
});

test("owner shell uses safe-area-aware mobile composition without changing the public customer shell", () => {
  assert.match(html, /body\.auth-ready \.app\{max-width:680px;padding-top:max\(30px,calc\(env\(safe-area-inset-top\) \+ 24px\)\)/);
  assert.match(html, /bottom:max\(12px,calc\(env\(safe-area-inset-bottom\) \+ 9px\)\)/);
  assert.match(html, /body\.public-enquiry\{padding:0;background:#f4f7fb;color:#17212b\}/);
});

test.after(() => { for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); });
