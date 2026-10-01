import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [html, marketing, portal, enquiry, migration] = await Promise.all([
  read("index.html"),
  read("assets/marketing.js"),
  read("assets/customer-portal.js"),
  read("api/enquiry.js"),
  read("supabase/migrations/20261001200000_add_contextual_handover_summaries.sql")
]);

test("Batch 1 keeps the existing receptionist and owner UX fixes in place", () => {
  assert.match(html, /ownerAssistantAvailable=data\?\.business\?\.assistant_available===true/);
  assert.match(html, /function requestPublicHuman\(\)[\s\S]*?window\.location\.href='tel:'\+dial/);
  assert.match(html, /const statusLabel=action\.status==='completed'\?'Completed':action\.status==='cancelled'\?'Cancelled':'Pending'/);
});

test("customer account stays behind loading until the authenticated portal is verified", () => {
  assert.match(portal, /setAppLoading==='function'\)setAppLoading\(true\);[\s\S]*?setCustomerSurface\(false\);[\s\S]*?await loadPortal\(\);[\s\S]*?setCustomerSurface\(true\)/);
});

test("DPA acceptance is reloaded from the server before the owner enters the app", () => {
  assert.match(html, /async function acceptBusinessDpa\(\)[\s\S]*?action:'accept_dpa'[\s\S]*?await handleSession\(session\)/);
  assert.match(html, /const businessLegal=await loadLegalState\(\);[\s\S]*?businessLegal\?\.dpa_required&&!businessLegal\?\.dpa_accepted/);
});

test("Marketing trial access cannot loop between Add-ons and a locked workspace", () => {
  assert.match(marketing, /a=>a\.key==='ai_marketing'&&\(a\.entitlement==='active'\|\|a\.trial_included\)/);
  assert.match(marketing, /const canOpen=addon\.key!=='ai_marketing'\|\|addon\.entitlement==='active'\|\|addon\.trial_included/);
});

test("contextual handover summaries are bounded, private workflow data and update the linked action", () => {
  assert.match(enquiry, /buildContextualHandoverSummary/);
  assert.match(enquiry, /handover_summary: handoverSummary/);
  assert.match(enquiry, /Latest customer message:/);
  assert.match(migration, /p_lead->>'handover_summary'/);
  assert.match(migration, /set summary=summary_value,updated_at=now\(\)/);
  assert.match(migration, /set description=summary_value/);
  assert.match(migration, /left\(coalesce\([\s\S]*?, 2000\)/);
});
