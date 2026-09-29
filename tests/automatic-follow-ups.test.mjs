import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("automatic follow-ups are opt-in and owner-controlled", async () => {
  const html = await read("index.html");
  const settings = await read("api/settings.js");
  assert.match(html, /id="automaticFollowUpCard"/);
  assert.match(html, /Create follow-up reminders automatically/);
  assert.match(html, /24 hours/);
  assert.match(html, /48 hours/);
  assert.match(html, /72 hours/);
  assert.match(html, /Customer communication stays manual in this Pilot/);
  assert.match(settings, /automatic_follow_up_enabled/);
  assert.match(settings, /automatic_follow_up_hours/);
  assert.match(settings, /\[24, 48, 72\]/);
});

test("new AI-captured leads receive one private follow-up action when enabled", async () => {
  const enquiry = await read("api/enquiry.js");
  assert.match(enquiry, /createAutomaticFollowUp/);
  assert.match(enquiry, /Automatic follow-up/);
  assert.match(enquiry, /No customer message is sent automatically/);
  assert.match(enquiry, /existingLeadBeforeCapture/);
  assert.match(enquiry, /action_type: "follow_up"/);
  assert.match(enquiry, /status: "pending"/);
  assert.match(enquiry, /follow_up\.automatic_created/);
});

test("contacting or converting a lead completes only Business AI automatic follow-up actions", async () => {
  const leads = await read("api/leads.js");
  assert.match(leads, /completeAutomaticFollowUps/);
  assert.match(leads, /title=eq\.\$\{encodeURIComponent\("Automatic follow-up"\)\}/);
  assert.match(leads, /updates\.status !== "New"/);
  assert.match(leads, /follow_up\.automatic_completed/);
});

test("value dashboard reports automatic follow-up activity", async () => {
  const handler = await read("lib/value-dashboard-handler.js");
  const html = await read("index.html");
  assert.match(handler, /automatic_follow_ups_created/);
  assert.match(handler, /automatic_follow_ups_completed/);
  assert.match(html, /id="valueFollowUpSummary"/);
  assert.match(html, /Automatic follow-ups:/);
});
