import assert from "node:assert/strict";
import test from "node:test";
import {
  requireAuthenticatedUser,
  requireAal2,
  requireBusinessMember
} from "../lib/auth.js";

// Synthetic-only contract: the designated Development Preview must never
// silently become an unauthenticated legacy workspace when flags are absent.
// No real Supabase credentials, HTTP calls, emails or users are used.
const baseline = { ...process.env };
const originalFetch = globalThis.fetch;
const keys = [
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_GIT_COMMIT_REF",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TENANCY_AUTH_ENABLED",
  "COLZO_SCOPED_PILOT_ACCESS",
  "PILOT_FREE_STARTER_MARKETING",
  "BILLING_ENABLED"
];

function configure(overrides = {}) {
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, {
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "feature/colzo-connected-workspace-20261112",
    SUPABASE_URL: "https://mvwseobgkexzpmmkgcxe.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "fictional-test-only",
    PILOT_FREE_STARTER_MARKETING: "false",
    BILLING_ENABLED: "false"
  }, overrides);
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    throw new Error("Unsafe external request during misconfiguration test");
  };
  return () => requests;
}

const request = { headers: { authorization: "Bearer synthetic-token" } };
const guards = [
  ["authenticated user", () => requireAuthenticatedUser(request)],
  ["AAL2", () => requireAal2(request)],
  ["business membership", () => requireBusinessMember(request)]
];

for (const branch of [
  "feature/colzo-dev-qa-role-provisioning-20261119",
  "fix/colzo-iphone-workhub-20261120",
  "qa/colzo-data-exit-review-20261120"
]) {
  test(`current security QA stack fails closed when misconfigured: ${branch}`, async () => {
    for (const overrides of [
      {},
      { TENANCY_AUTH_ENABLED: "true" },
      { COLZO_SCOPED_PILOT_ACCESS: "true" },
      { TENANCY_AUTH_ENABLED: "true", COLZO_SCOPED_PILOT_ACCESS: "true", SUPABASE_URL: "https://wrong-fixture.supabase.co" }
    ]) {
      const requests = configure({ VERCEL_GIT_COMMIT_REF: branch, ...overrides });
      for (const [name, guard] of guards) {
        await assert.rejects(guard, { status: 403, code: "PILOT_ACCESS_REQUIRED" }, name);
      }
      assert.equal(requests(), 0, "deny before contacting Auth or tenant storage");
    }
    const requests = configure({ VERCEL_GIT_COMMIT_REF: branch,
      TENANCY_AUTH_ENABLED: "true", COLZO_SCOPED_PILOT_ACCESS: "true" });
    await assert.rejects(() => requireBusinessMember({ headers: {} }), { status: 401 });
    assert.equal(requests(), 0);
  });
}

test("Development Preview refuses missing or mismatched auth and pilot flags before network access", async () => {
  const scenarios = [
    ["both unset", {}],
    ["tenancy set but scoped pilot absent", { TENANCY_AUTH_ENABLED: "true" }],
    ["pilot set but tenancy absent", { COLZO_SCOPED_PILOT_ACCESS: "true" }],
    ["tenancy disabled", { TENANCY_AUTH_ENABLED: "false", COLZO_SCOPED_PILOT_ACCESS: "true" }],
    ["pilot disabled", { TENANCY_AUTH_ENABLED: "true", COLZO_SCOPED_PILOT_ACCESS: "false" }],
    ["flags incorrect case", { TENANCY_AUTH_ENABLED: "TRUE", COLZO_SCOPED_PILOT_ACCESS: "TRUE" }],
    ["protected branch wrong target", { SUPABASE_URL: "https://wrong-fixture.supabase.co" }],
    ["protected branch missing target", { SUPABASE_URL: "" }],
    ["stacked QA branch missing flags", { VERCEL_GIT_COMMIT_REF: "qa/colzo-playwright-ci-20261115" }]
  ];
  for (const [name, overrides] of scenarios) {
    const requests = configure(overrides);
    for (const [guardName, guard] of guards) {
      await assert.rejects(guard, { status: 403, code: "PILOT_ACCESS_REQUIRED" },
        name + ": " + guardName);
    }
    assert.equal(requests(), 0, name + ": must not contact Auth or tenant storage");
  }
});

test("missing Git metadata remains outside the explicitly scoped QA branch policy", async () => {
  const requests = configure({});
  delete process.env.VERCEL_GIT_COMMIT_REF;
  assert.deepEqual(await requireBusinessMember({}), {
    enforced: false, userId: null, businessId: null, role: null
  });
  assert.equal(requests(), 0);
});

test("correctly configured Development Preview still demands genuine credentials", async () => {
  const requests = configure({
    TENANCY_AUTH_ENABLED: "true",
    COLZO_SCOPED_PILOT_ACCESS: "true"
  });
  for (const [name, guard] of [
    ["authenticated user", () => requireAuthenticatedUser({ headers: {} })],
    ["AAL2", () => requireAal2({ headers: {} })],
    ["business membership", () => requireBusinessMember({ headers: {} })]
  ]) {
    await assert.rejects(guard, { status: 401 }, name);
  }
  assert.equal(requests(), 0, "missing token must not fetch user or membership");
});

test("other environments keep their previously explicit legacy configuration", async () => {
  const scenarios = [
    ["production", { VERCEL_ENV: "production" }],
    ["non-Vercel synthetic fixture", { VERCEL: "0" }],
    ["local", { VERCEL_ENV: "development" }],
    ["another project on an unrelated branch", { SUPABASE_URL: "https://other-fixture.supabase.co", VERCEL_GIT_COMMIT_REF: "feature/unrelated-fixture" }],
    ["another branch", { VERCEL_GIT_COMMIT_REF: "feature/unrelated-fixture" }]
  ];
  for (const [name, overrides] of scenarios) {
    const requests = configure(overrides);
    assert.deepEqual(await requireBusinessMember({}), {
      enforced: false, userId: null, businessId: null, role: null
    }, name);
    assert.equal(requests(), 0, name);
  }
});

test.after(() => {
  for (const key of Object.keys(process.env)) if (!(key in baseline)) delete process.env[key];
  Object.assign(process.env, baseline);
  globalThis.fetch = originalFetch;
});
