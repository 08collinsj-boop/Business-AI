import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const apiModules = ["leads.js", "history.js", "pipeline.js", "settings.js", "business-configuration.js", "business-onboarding.js", "bookings.js", "actions.js", "operations.js", "public-config.js", "enquiry.js", "stripe-webhook.js"];
const libraryModules = ["auth.js", "audit.js", "business-configuration.js", "operational-log.js", "public-rate-limit.js", "public-tenant.js", "public-business-handler.js", "voice.js", "voice-simulation.js", "voice-status-handler.js", "audit-log-handler.js", "data-lifecycle-handler.js", "data-subjects-handler.js", "health-handler.js", "voice-webhook-handler.js", "voice-calls-handler.js", "team-handler.js", "handover-handler.js", "billing.js", "stripe.js", "billing-handler.js", "stripe-webhook-handler.js"];

test("all Vercel API modules load directly as ESM", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.type, "module");
  for (const moduleName of apiModules) {
    const module = await import(new URL(`../api/${moduleName}`, import.meta.url));
    assert.equal(typeof module.default, "function", `${moduleName} must export a handler`);
  }
  for (const moduleName of libraryModules) {
    await import(new URL(`../lib/${moduleName}`, import.meta.url));
  }
});

test("auth gates enable only for the exact lowercase true value", async () => {
  const saved = process.env.TENANCY_AUTH_ENABLED;
  const auth = await import(new URL(`../lib/auth.js?gate=${Math.random()}`, import.meta.url));
  for (const value of [undefined, "TRUE", "1", "yes", "false"]) {
    if (value === undefined) delete process.env.TENANCY_AUTH_ENABLED; else process.env.TENANCY_AUTH_ENABLED = value;
    assert.equal(auth.isTenancyAuthEnabled(), false);
  }
  process.env.TENANCY_AUTH_ENABLED = "true";
  assert.equal(auth.isTenancyAuthEnabled(), true);
  if (saved === undefined) delete process.env.TENANCY_AUTH_ENABLED; else process.env.TENANCY_AUTH_ENABLED = saved;
});
