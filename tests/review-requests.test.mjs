import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildReviewRequestMessage, normaliseReviewPlatform, normaliseReviewUrl, reviewDestination } from "../lib/review-requests.js";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("review links accept supported HTTPS destinations and reject unsafe hosts", () => {
  assert.match(normaliseReviewUrl("google", "https://g.page/r/example/review"), /^https:\/\/g\.page\//);
  assert.match(normaliseReviewUrl("facebook", "https://www.facebook.com/example/reviews"), /^https:\/\/www\.facebook\.com\//);
  assert.equal(normaliseReviewUrl("google", "http://g.page/r/example/review"), null);
  assert.equal(normaliseReviewUrl("google", "https://google.com.evil.example/review"), null);
  assert.equal(normaliseReviewUrl("facebook", "https://example.com/reviews"), null);
  assert.equal(normaliseReviewPlatform("TRUSTPILOT"), "trustpilot");
  assert.match(normaliseReviewUrl("trustpilot", "https://uk.trustpilot.com/evaluate/example.co.uk"), /^https:\/\/uk\.trustpilot\.com\//);
  assert.equal(normaliseReviewUrl("trustpilot", "https://trustpilot.com.attacker.example/evaluate/example.co.uk"), null);
  assert.equal(normaliseReviewUrl("trustpilot", "http://trustpilot.com/evaluate/example.co.uk"), null);
});

test("review request copy stays neutral and uses configured business destination", () => {
  const destination = reviewDestination({
    review_preferred_platform: "google",
    review_google_url: "https://g.page/r/example/review",
    review_facebook_url: "https://www.facebook.com/example/reviews"
  });
  const message = buildReviewRequestMessage({ businessName: "Collins LTD", destination });
  assert.equal(destination.label, "Google");
  assert.match(message, /Thanks for choosing Collins LTD/);
  assert.match(message, /really appreciate your feedback/);
  assert.doesNotMatch(message, /five star|5-star|positive review/i);
});

test("Trustpilot is supported and can fall back to Google", () => {
  const destination = reviewDestination({review_preferred_platform:"trustpilot",review_trustpilot_url:"https://www.trustpilot.com/evaluate/example.co.uk"});
  assert.equal(destination.platform, "trustpilot");
  assert.match(buildReviewRequestMessage({businessName:"Example Ltd",destination}), /Trustpilot review/);
  const fallback = reviewDestination({review_preferred_platform:"trustpilot",review_google_url:"https://g.page/r/example/review"});
  assert.equal(fallback.platform, "google");
});

test("completed bookings prepare one internal review action and never send a customer message", async () => {
  const bookings = await read("api/bookings.js");
  const actions = await read("api/actions.js");
  assert.match(bookings, /prepareReviewRequest/);
  assert.match(bookings, /current\.status !== "completed" && result\.status === "completed"/);
  assert.match(bookings, /action_type: "request_review"/);
  assert.match(bookings, /Request customer review/);
  assert.match(actions, /Review requests are prepared from completed bookings/);
  assert.match(actions, /review_request\.marked_sent/);
  assert.doesNotMatch(bookings, /sendEmail|sendSms|twilio|messages\.create/i);
});

test("owner UI keeps review requests approval-first and customer portal uses honest-feedback wording", async () => {
  const html = await read("index.html");
  const customerPortal = await read("assets/customer-portal.js");
  assert.match(html, /id="reviewRequestsCard"/);
  assert.match(html, /id="s_review_trustpilot_url"/);
  const settingsApi = await read("api/settings.js");
  const portalApi = await read("lib/customer-portal-handler.js");
  assert.match(settingsApi, /review_trustpilot_url/);
  assert.match(portalApi, /review_trustpilot_url/);
  assert.match(html, /Nothing is sent automatically/);
  assert.match(html, /Keep requests fair/);
  assert.match(html, /Copy message/);
  assert.match(html, /Mark as sent/);
  assert.match(html, /id="valueReviewSummary"/);
  assert.match(customerPortal, /share honest feedback about your experience/);
  assert.match(customerPortal, /review_request\?\.url/);
});
