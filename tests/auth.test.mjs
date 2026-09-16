import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/auth.js", import.meta.url), "utf8");
const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

function response({ ok = true, body = null }) {
  return { ok, json: async () => body, text: async () => JSON.stringify(body) };
}

async function loadAuth({ enabled = "true", url = "https://example.supabase.co", key = "service-key", fetchImpl }) {
  process.env.TENANCY_AUTH_ENABLED = enabled;
  if (url === null) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = url;
  if (key === null) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = key;
  globalThis.fetch = fetchImpl || (async () => response({ ok: false }));
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${Math.random()}`);
}

function verifiedUserAndMembership(membership) {
  return async (url, options) => {
    if (url.endsWith("/auth/v1/user")) {
      assert.equal(options.headers.Authorization, "Bearer good-token");
      return response({ body: { id: "user-a" } });
    }
    assert.match(url, /user_id=eq.user-a/);
    assert.equal(options.headers.Authorization, "Bearer service-key");
    return response({ body: membership ? [membership] : [] });
  };
}

test("shared auth module gate, verification, membership, and roles", { concurrency: false }, async () => {
  let auth = await loadAuth({ enabled: "TRUE" });
  assert.equal(auth.isTenancyAuthEnabled(), false);
  assert.deepEqual(await auth.requireBusinessMember({}), { enforced: false, userId: null, businessId: null, role: null });

  auth = await loadAuth({ enabled: "true", url: null });
  await assert.rejects(() => auth.requireBusinessMember({ headers: { authorization: "Bearer good-token" } }), { status: 500 });

  auth = await loadAuth({ fetchImpl: verifiedUserAndMembership({ business_id: "business-a", role: "owner" }) });
  await assert.rejects(() => auth.requireBusinessMember({ headers: {} }), { status: 401 });
  await assert.rejects(() => auth.requireBusinessMember({ headers: { authorization: "Basic x" } }), { status: 401 });
  assert.equal(auth.extractBearerToken({ headers: { authorization: "Bearer token extra" } }), null);

  auth = await loadAuth({ fetchImpl: async () => response({ ok: false }) });
  await assert.rejects(() => auth.requireBusinessMember({ headers: { authorization: "Bearer expired" } }), { status: 401 });

  auth = await loadAuth({ fetchImpl: verifiedUserAndMembership(null) });
  await assert.rejects(() => auth.requireBusinessMember({ headers: { authorization: "Bearer good-token" } }), { status: 403 });

  auth = await loadAuth({ fetchImpl: verifiedUserAndMembership({ business_id: "business-a", role: "owner" }) });
  const owner = await auth.requireBusinessMember({ headers: { authorization: "Bearer good-token" }, body: { business_id: "business-b", role: "member" } });
  assert.deepEqual(owner, { enforced: true, userId: "user-a", businessId: "business-a", role: "owner" });
  await auth.requireBusinessAdmin({ headers: { authorization: "Bearer good-token" } });

  auth = await loadAuth({ fetchImpl: verifiedUserAndMembership({ business_id: "business-a", role: "admin" }) });
  assert.equal((await auth.requireBusinessAdmin({ headers: { authorization: "Bearer good-token" } })).role, "admin");

  auth = await loadAuth({ fetchImpl: verifiedUserAndMembership({ business_id: "business-a", role: "member" }) });
  assert.equal((await auth.requireBusinessMember({ headers: { authorization: "Bearer good-token" } })).role, "member");
  await assert.rejects(() => auth.requireBusinessAdmin({ headers: { authorization: "Bearer good-token" } }), { status: 403 });
  await assert.rejects(() => auth.requireBusinessMember({ headers: { authorization: "Bearer good-token" } }, ["superuser"]), { status: 500 });
});

test.after(() => {
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
  globalThis.fetch = originalFetch;
});
