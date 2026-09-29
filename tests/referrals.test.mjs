import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { normaliseReferralCode, referralCodeForBusiness } from "../lib/referrals.js";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("referral codes are strict and deterministic", () => {
  assert.equal(normaliseReferralCode(" bai-abcdef1234 "), "BAI-ABCDEF1234");
  assert.equal(normaliseReferralCode("bad-code"), null);
  assert.equal(
    referralCodeForBusiness("123e4567-e89b-12d3-a456-426614174000"),
    "BAI-123E4567E8"
  );
});

test("signup supports referral links and a manual referral code", async () => {
  const html = await read("index.html");
  assert.match(html, /id="signUpReferralCode"/);
  assert.match(html, /id="newBusinessReferralCode"/);
  assert.match(html, /searchParams\.get\('ref'\)/);
  assert.match(html, /emailRedirectTo:/);
  assert.match(html, /referral_code:referralCode/);
});

test("owner dashboard explains the five-referral reward with animated progress", async () => {
  const html = await read("index.html");
  assert.match(html, /Refer 5 businesses\. Get 1 month free\./);
  assert.match(html, /id="referralProgressBar"/);
  assert.match(html, /referral-progress-fill/);
  assert.match(html, /transition:width \.85s/);
  assert.match(html, /awaiting first payment/);
});

test("referral qualification is payment-driven and the reward discounts only the base subscription item", async () => {
  const webhook = await read("lib/stripe-webhook-handler.js");
  const stripe = await read("lib/stripe.js");
  assert.match(webhook, /qualifyReferralForBusiness/);
  assert.match(webhook, /invoice\.paid/);
  assert.match(webhook, /Number\(object\.amount_paid \|\| 0\) > 0/);
  assert.match(stripe, /duration: "once"/);
  assert.match(stripe, /percent_off: 100/);
  assert.match(stripe, /subscription_items/);
  assert.match(stripe, /plan !== "trial"/);
});

test("referrals use the shared operations dispatcher and Vercel rewrite", async () => {
  const operations = await read("api/operations.js");
  const vercel = await read("vercel.json");
  assert.match(operations, /referrals: referralsHandler/);
  assert.match(vercel, /"source": "\/api\/referrals"/);
  assert.match(vercel, /operation=referrals/);
});
