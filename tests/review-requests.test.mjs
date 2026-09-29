import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildReviewRequestMessage, normaliseReviewUrl, reviewDestination } from "../lib/review-requests.js";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("review destinations accept recognised Google and Facebook HTTPS links only", () => {
  assert.match(normaliseReviewUrl("google", "https://g.page/example/review"), /^https:\/\/g\.page\//);
  assert.match(normaliseReviewUrl("facebook", "https://www.facebook.com/example/reviews"), /^https:\/\/www\.facebook\.com\//);
  assert.equal(normaliseReviewUrl("google", "http://g.page/example/review"), null);
  assert.equal(normaliseReviewUrl("google", "https://example.com/review"), null);
  assert.equal(normaliseReviewUrl("facebook", "https://example.com/review"), null);
});

test("review request copy is neutral and uses the configured destination without review gating", () => {
  const destination = reviewDestination({ review_preferred_platform: "google", review_google_url: "https://g.page/example/review" });
  const message = buildReviewRequestMessage({ businessName: "Example Electrical", destination });
  assert.match(message, /Thanks for choosing Example Electrical/);
  assert.match(message, /we'd really appreciate your feedback/);
  assert.match(message, /Google review/);
  assert.doesNotMatch(message, /happy|satisfied|five star|5-star/i);
});

test("completing a booking prepares one internal review-request action and never sends customer messages", async () => {
  const bookings = await read("api/bookings.js");
  const migration = await read("supabase/migrations/20260929144034_add_review_requests.sql");
  assert.match(bookings, /prepareReviewRequest/);
  assert.match(bookings, /action_type: "request_review"/);
  assert.match(bookings, /current\.status !== "completed" && result\.status === "completed"/);
  assert.match(migration, /actions_one_review_request_per_booking_idx/);
  assert.doesNotMatch(bookings, /sendEmail|sendSms|sendMessage|twilio/i);
});

test("owner settings keep review requests approval-required and customer portal reveals the link only after marked sent", async () => {
  const html = await read("index.html");
  const portal = await read("lib/customer-portal-handler.js");
  const ui = await read("assets/customer-portal.js");
  assert.match(html, /id="reviewRequestsCard"/);
  assert.match(html, /Nothing is sent automatically/);
  assert.match(html, /No review gating/);
  assert.match(html, /Mark sent/);
  assert.match(portal, /action_type=eq\.request_review&status=eq\.completed/);
  assert.match(portal, /review_request: destination/);
  assert.match(ui, /Leave a /);
});

test("ROI includes prepared and marked-sent review request counts", async () => {
  const handler = await read("lib/value-dashboard-handler.js");
  const html = await read("index.html");
  assert.match(handler, /review_requests_prepared/);
  assert.match(handler, /review_requests_marked_sent/);
  assert.match(html, /id="valueReviewSummary"/);
});
