import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const code = readFileSync(new URL("../api/enquiry.js", import.meta.url), "utf8");
const start = code.indexOf("function findLocationInConversation(conversationText) {");
const end = code.indexOf("\nfunction findJobDetails(", start);
assert.ok(start >= 0 && end > start, "the production helper is present");
const locate = vm.runInNewContext(code.slice(start, end) + "\nfindLocationInConversation;");

const cases = [
  ["user: I'm in Hartlepool and need a quote", "Hartlepool"],
  ["user: I'm based in Middlesbrough and my fuse box is tripping", "Middlesbrough"],
  ["user: I live near Stockton-on-Tees, could you visit?", "Stockton-on-Tees"],
  ["user: We are around Durham because we moved", "Durham"],
  ["user: Can I get a repair in Billingham and then another in Yarm?", "Billingham"],
  ["user: Can you do installation work in Guisborough and my postcode is TS14?", "Guisborough"],
  ["assistant: We are in London\nuser: I'm in Hartlepool", "Hartlepool"],
  ["user: I'm in York\nuser: Sorry, I'm in Darlington", "Darlington"],
  ["user: I'm in Hartlepool\nassistant: Are you in Newcastle?", "Hartlepool"],
  ["user: I'm in a hurry and need a plumber", null],
  ["user: I'm in trouble with a fuse board", null],
  ["user: I live in Newcastle upon Tyne", "Newcastle upon Tyne"],
  ["user: I need a quote for a new kitchen in Hartlepool.", "Hartlepool"],
  ["user: I want work done in Stockton and I can be home tomorrow", "Stockton"],
  ["assistant: We are based in Hartlepool", null],
  ["user: Does your company work in Stockton?", null],
  ["user: I'm near Yarm", "Yarm"],
  ["user: I live around Redcar", "Redcar"],
  ["user: I'm in the middle of a job", null]
];
for (const [conversation, expected] of cases) {
  test("location: " + conversation.replace(/\n/g, " | "), () => {
    assert.equal(locate(conversation), expected);
  });
}
