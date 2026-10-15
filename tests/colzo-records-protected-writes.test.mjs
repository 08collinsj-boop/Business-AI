import test from "node:test";
import assert from "node:assert/strict";
import handler from "../lib/colzo-records-handler.js";

const BUSINESS_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const QUOTE_ID = "33333333-3333-4333-8333-333333333333";
const VERSION = "2026-10-15T10:00:00.000Z";
const LATER = "2026-10-15T10:00:01.000Z";

function response(status, value) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return value == null ? "" : JSON.stringify(value); },
    async json() { return value; }
  };
}

async function callHandler(t, { method = "PATCH", body = {}, businessId = BUSINESS_ID, record = null, raceOnPatch = false } = {}) {
  const oldFetch = globalThis.fetch;
  const oldEnv = {
    TENANCY_AUTH_ENABLED: process.env.TENANCY_AUTH_ENABLED,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  process.env.TENANCY_AUTH_ENABLED = "true";
  process.env.SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  let saved = record ? structuredClone(record) : null;
  const calls = [];
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    const verb = options.method || "GET";
    calls.push({ url, verb, body: options.body ? JSON.parse(options.body) : null });
    if (url.pathname === "/auth/v1/user") return response(200, { id: USER_ID, email: "owner@example.test" });
    if (url.pathname === "/rest/v1/business_memberships") return response(200, [{ business_id: businessId, role: "owner" }]);
    if (url.pathname === "/rest/v1/business_audit_events") return response(201, null);
    if (url.pathname === "/rest/v1/colzo_quotes") {
      const rowBusiness = url.searchParams.get("business_id");
      const rowId = url.searchParams.get("id");
      if (verb === "GET") {
        if (!saved || rowBusiness !== `eq.${saved.business_id}` || rowId !== `eq.${QUOTE_ID}`) return response(200, []);
        return response(200, [structuredClone(saved)]);
      }
      if (verb === "PATCH") {
        const expected = url.searchParams.get("updated_at");
        if (!saved || rowBusiness !== `eq.${saved.business_id}` || rowId !== `eq.${QUOTE_ID}` || expected !== `eq.${saved.updated_at}` || raceOnPatch) return response(200, []);
        saved = { ...saved, ...calls.at(-1).body, updated_at: calls.at(-1).body.updated_at };
        return response(200, [structuredClone(saved)]);
      }
      if (verb === "DELETE") return response(200, saved ? [{ id: saved.id }] : []);
    }
    return response(200, []);
  };
  t.after(() => {
    globalThis.fetch = oldFetch;
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const req = {
    method,
    headers: { authorization: "Bearer verified-test-token" },
    query: { resource: "quotes", id: QUOTE_ID },
    body
  };
  const res = {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
  await handler(req, res);
  return { status: res.statusCode, payload: res.payload, calls, record: saved };
}

function quote(status = "draft", updated_at = VERSION) {
  return {
    id: QUOTE_ID,
    business_id: BUSINESS_ID,
    lead_id: 42,
    title: "Bathroom renovation",
    amount_gbp: 1250,
    notes: "Materials included",
    status,
    created_at: VERSION,
    updated_at
  };
}

test("PATCH rejects a missing expected_updated_at before any record write", async (t) => {
  const result = await callHandler(t, { body: { status: "sent" }, record: quote() });
  assert.equal(result.status, 400);
  assert.equal(result.calls.some((call) => call.verb === "PATCH" || call.verb === "DELETE"), false);
});

test("PATCH returns 409 for a stale record version", async (t) => {
  const result = await callHandler(t, {
    body: { expected_updated_at: "2026-10-14T10:00:00.000Z", status: "sent" },
    record: quote()
  });
  assert.equal(result.status, 409);
});

test("DELETE is rejected and never reaches the database", async (t) => {
  const result = await callHandler(t, { method: "DELETE", body: {}, record: quote() });
  assert.equal(result.status, 405);
  assert.equal(result.calls.some((call) => call.verb === "DELETE"), false);
});

test("draft quote can transition to sent without changing quote terms", async (t) => {
  const result = await callHandler(t, {
    body: { expected_updated_at: VERSION, status: "sent" },
    record: quote()
  });
  assert.equal(result.status, 200);
  assert.equal(result.record.status, "sent");
  assert.equal(result.record.amount_gbp, 1250);
});

test("draft quote cannot skip directly to accepted", async (t) => {
  const result = await callHandler(t, {
    body: { expected_updated_at: VERSION, status: "accepted" },
    record: quote()
  });
  assert.equal(result.status, 400);
});

test("sent quote terms cannot be edited", async (t) => {
  const result = await callHandler(t, {
    body: { expected_updated_at: VERSION, amount_gbp: 900 },
    record: quote("sent")
  });
  assert.equal(result.status, 400);
});

test("sent quote may transition to accepted without changing terms", async (t) => {
  const result = await callHandler(t, {
    body: { expected_updated_at: VERSION, status: "accepted" },
    record: quote("sent")
  });
  assert.equal(result.status, 200);
  assert.equal(result.record.status, "accepted");
  assert.equal(result.record.amount_gbp, 1250);
});

test("a successful PATCH uses the loaded version in the atomic database predicate", async (t) => {
  const result = await callHandler(t, {
    body: { expected_updated_at: VERSION, status: "sent" },
    record: quote()
  });
  assert.equal(result.status, 200);
  const patch = result.calls.find((call) => call.verb === "PATCH");
  assert.ok(patch, "the update should reach the database");
  assert.equal(patch.url.searchParams.get("updated_at"), `eq.${VERSION}`);
  assert.ok(Date.parse(result.record.updated_at) > Date.parse(VERSION));
});

test("tenant-scoped lookup does not expose another business's quote", async (t) => {
  const foreignBusiness = "44444444-4444-4444-8444-444444444444";
  const result = await callHandler(t, {
    body: { expected_updated_at: VERSION, status: "sent" },
    record: { ...quote(), business_id: foreignBusiness }
  });
  assert.equal(result.status, 404);
});

test("PATCH returns 409 when another writer wins after the initial version check", async (t) => {
  const result = await callHandler(t, {
    body: { expected_updated_at: VERSION, status: "sent" },
    record: quote(),
    raceOnPatch: true
  });
  assert.equal(result.status, 409);
  assert.equal(result.record.status, "draft");
});

test("accepted quotes are immutable", async (t) => {
  const result = await callHandler(t, {
    body: { expected_updated_at: VERSION, notes: "Changed terms" },
    record: quote("accepted")
  });
  assert.equal(result.status, 400);
});

test("quote terms cannot change in the same PATCH as a status transition", async (t) => {
  const result = await callHandler(t, {
    body: { expected_updated_at: VERSION, status: "sent", amount_gbp: 1400 },
    record: quote()
  });
  assert.equal(result.status, 400);
});

test("new quotes cannot be created directly as sent", async (t) => {
  const result = await callHandler(t, {
    method: "POST",
    body: { lead_id: 42, title: "Bathroom renovation", amount_gbp: 1250, status: "sent" }
  });
  assert.equal(result.status, 400);
  assert.equal(result.calls.some((call) => call.verb === "POST" && call.url.pathname === "/rest/v1/colzo_quotes"), false);
});

test("new quotes cannot be created directly as accepted", async (t) => {
  const result = await callHandler(t, {
    method: "POST",
    body: { lead_id: 42, title: "Bathroom renovation", amount_gbp: 1250, status: "accepted" }
  });
  assert.equal(result.status, 400);
  assert.equal(result.calls.some((call) => call.verb === "POST" && call.url.pathname === "/rest/v1/colzo_quotes"), false);
});
