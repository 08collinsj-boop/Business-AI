import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const apiModules = ["_auth.js", "leads.js", "history.js", "pipeline.js", "settings.js", "bookings.js", "actions.js", "public-config.js", "enquiry.js"];

test("all Vercel API modules load directly as ESM", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.type, "module");
  for (const moduleName of apiModules) {
    const module = await import(new URL(`../api/${moduleName}`, import.meta.url));
    if (moduleName !== "_auth.js") assert.equal(typeof module.default, "function", `${moduleName} must export a handler`);
  }
});

test("auth gates enable only for the exact lowercase true value", async () => {
  const saved = process.env.TENANCY_AUTH_ENABLED;
  const auth = await import(new URL(`../api/_auth.js?gate=${Math.random()}`, import.meta.url));
  for (const value of [undefined, "TRUE", "1", "yes", "false"]) {
    if (value === undefined) delete process.env.TENANCY_AUTH_ENABLED; else process.env.TENANCY_AUTH_ENABLED = value;
    assert.equal(auth.isTenancyAuthEnabled(), false);
  }
  process.env.TENANCY_AUTH_ENABLED = "true";
  assert.equal(auth.isTenancyAuthEnabled(), true);
  if (saved === undefined) delete process.env.TENANCY_AUTH_ENABLED; else process.env.TENANCY_AUTH_ENABLED = saved;
});
