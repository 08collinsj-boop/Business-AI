import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../assets/colzo-native.js", import.meta.url), "utf8");
const start = source.indexOf(" async function saveColzoRecord(form){");
const end = source.indexOf(" function colzoRecordForm(resource,record=null){", start);
assert.ok(start >= 0 && end > start, "Colzo record save function exists");
const saveFunction = source.slice(start, end);

async function submit(resource, fields, record) {
  const calls = [], feedback = { textContent: "" }, button = { disabled: false };
  const state = { colzoBusy: false, colzoFeedback: "", colzoForm: { resource, record: record || null }, colzoError: "" };
  const form = {
    dataset: { resource, recordId: record?.id || "" },
    querySelector: selector => selector === "[type=submit]" ? button : null
  };
  class FixtureFormData {
    entries() { return Object.entries(fields); }
  }
  const context = vm.createContext({
    state, content: { querySelector: () => feedback }, FormData: FixtureFormData,
    api: async (url, options) => {
      calls.push({ url, method: options.method, body: JSON.parse(options.body) });
      return { id: record?.id || "33333333-3333-4333-8333-333333333333" };
    },
    loadColzoResource: async () => {}, encodeURIComponent
  });
  vm.runInContext(saveFunction + "\nglobalThis.saveColzoRecord=saveColzoRecord;", context);
  await context.saveColzoRecord(form);
  return { calls, feedback: feedback.textContent, state };
}

const version = "2026-10-15T10:00:00.000Z";
const record = { id: "33333333-3333-4333-8333-333333333333", updated_at: version };

test("saved customer edit supplies exact server record version", async () => {
  const result = await submit("clients", { full_name: "Existing Customer", phone: "07000000000" }, record);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].method, "PATCH");
  assert.equal(result.calls[0].body.expected_updated_at, version);
  assert.equal(result.calls[0].body.business_id, undefined);
});

test("saved project edit supplies exact server record version", async () => {
  const result = await submit("projects", { title: "Existing Project", client_name: "Customer", status: "active", progress: "35", lead_id: "" }, record);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].body.expected_updated_at, version);
  assert.equal(result.calls[0].body.lead_id, null);
});

test("quote lifecycle transition is never mixed with term edits", async () => {
  const result = await submit("quotes", { lead_id: "41", title: "Existing Quote", amount_gbp: "225", status: "sent", notes: "Updated terms" }, { ...record, status: "draft" });
  assert.equal(result.calls.length, 0);
  assert.match(result.feedback, /status|send|issue|separate/i);
});

test("record edits without a known version stop before the API call", async () => {
  const result = await submit("clients", { full_name: "Unknown version" }, { id: record.id });
  assert.equal(result.calls.length, 0);
  assert.match(result.feedback, /reload|refresh|version|updated/i);
});

test("new quotes remain drafts", async () => {
  const result = await submit("quotes", { lead_id: "41", title: "New Draft Quote", amount_gbp: "100", status: "draft", notes: "" }, null);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].method, "POST");
  assert.equal(result.calls[0].body.status, "draft");
  assert.equal(result.calls[0].body.expected_updated_at, undefined);
});
