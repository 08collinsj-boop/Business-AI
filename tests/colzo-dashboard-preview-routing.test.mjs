import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// This file stays synthetic; it does not connect to Dev or use customer credentials.
const branch = "feature/colzo-complete-ui-motion-20261017";
const variables = ["VERCEL_ENV", "VERCEL_GIT_COMMIT_REF", "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY", "TENANCY_AUTH_ENABLED", "COLZO_EXPECTED_SUPABASE_PROJECT_REF"];
const previous = new Map(variables.map(key => [key, process.env[key]]));
Object.assign(process.env, { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: branch,
  SUPABASE_URL: "https://mvwseobgkexzpmmkgcxe.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-only-key", TENANCY_AUTH_ENABLED: "true" });
delete process.env.COLZO_EXPECTED_SUPABASE_PROJECT_REF;
const { default: operations } = await import("../api/operations.js");
test.after(() => { for (const [key, value] of previous) {
  if (value === undefined) delete process.env[key]; else process.env[key] = value;
} });
const paths = ["leads", "pipeline", "settings"];
const tenant = "87654321-4321-4321-8432-123456789abc";
function response(status, payload) {
  return { ok: status >= 200 && status < 300, status,
    text: async () => JSON.stringify(payload), json: async () => payload };
}
function network(calls) {
  return async (input, init = {}) => {
    const uri = String(input);
    calls.push({ uri, header: init.headers?.Authorization });
    if (uri.endsWith("/auth/v1/user"))
      return init.headers?.Authorization === "Bearer fixture-valid-token"
        ? response(200, { id: "synthetic-owner" })
        : response(401, { error: "Invalid token" });
    if (uri.includes("/rest/v1/business_memberships?")) {
      assert.match(uri, /user_id=eq.synthetic-owner/);
      return response(200, [{ business_id: tenant, role: "owner" }]);
    }
    if (uri.includes("/rest/v1/business_settings?")) {
      assert.ok(uri.includes("business_id=eq." + tenant));
      return response(200, [{ id: 1, business_id: tenant, business_name: "Fixture" }]);
    }
    if (uri.includes("/rest/v1/leads?")) {
      assert.ok(uri.includes("business_id=eq." + tenant));
      return response(200, []);
    }
    throw Error("Unexpected fixture URL");
  };
}
async function request(operation, headers = {}) {
  const req = { method: "GET", query: { operation }, headers: { ...headers } };
  const res = { statusCode: 200, body: null, headersSent: false,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; this.headersSent = true; return this; },
    setHeader() {} };
  await operations(req, res);
  return res;
}
test("Every initial dashboard read uses the same checked Preview dispatcher", async () => {
  const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  for (const route of paths) {
    const rewrites = vercel.rewrites.filter(item => item.source === "/api/" + route);
    assert.equal(rewrites.length, 1);
    assert.equal(rewrites[0].destination, "/api/operations?operation=" + route);
  }
});
test("All three initial dashboard routes validate a synthetic owner and tenant-scoped reads",
  { concurrency: false }, async () => {
    const old = globalThis.fetch; const calls = [];
    globalThis.fetch = network(calls);
    try {
      for (const route of paths) {
        const result = await request(route, { authorization: "Vercel preview session marker",
          "x-colzo-supabase-authorization": "Bearer fixture-valid-token" });
        assert.equal(result.statusCode, 200, route + ": " + JSON.stringify(result.body));
      }
      assert.equal(calls.filter(c => c.uri.endsWith("/auth/v1/user")).length, 3);
      assert.ok(calls.some(c => c.uri.includes("/rest/v1/business_settings?")));
    } finally { globalThis.fetch = old; }
  });
test("Dashboard routes reject unauthenticated, invalid and unrelated Preview tokens",
  { concurrency: false }, async () => {
    const oldFetch = globalThis.fetch, oldBranch = process.env.VERCEL_GIT_COMMIT_REF;
    const calls = []; globalThis.fetch = network(calls);
    try {
      for (const route of paths) {
        assert.equal((await request(route)).statusCode, 401, route + " missing token");
        assert.equal((await request(route, {
          "x-colzo-supabase-authorization": "Bearer fixture-invalid-token"
        })).statusCode, 401, route + " invalid token");
      }
      process.env.VERCEL_GIT_COMMIT_REF = "feature/unrelated-preview";
      for (const route of paths) {
        assert.equal((await request(route, {
          "x-colzo-supabase-authorization": "Bearer fixture-valid-token"
        })).statusCode, 401, route + " wrong branch");
      }
      assert.equal(calls.filter(c => c.uri.includes("/rest/v1/business_memberships?")).length, 0);
    } finally {
      globalThis.fetch = oldFetch;
      process.env.VERCEL_GIT_COMMIT_REF = oldBranch;
    }
  });
