import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("home shows a value and ROI card without presenting estimates as revenue", async () => {
  const html = await read("index.html");
  assert.match(html, /id="valueDashboardCard"/);
  assert.match(html, /Value &amp; ROI/);
  assert.match(html, /Business AI impact/);
  assert.match(html, /not confirmed revenue/i);
  assert.match(html, /Potential value added/);
  assert.match(html, /id="valueSourceBars"/);
  assert.match(html, /loadValueDashboard/);
});

test("value endpoint is tenant-authenticated and source counts deduplicate leads", async () => {
  const handler = await read("lib/value-dashboard-handler.js");
  assert.match(handler, /requireBusinessMember/);
  assert.match(handler, /business_id=eq\.\$\{businessId\}/);
  assert.match(handler, /enquiry\.source_captured/);
  assert.match(handler, /seen\.has/);
  assert.match(handler, /period_opportunity_value/);
});

test("value endpoint uses shared dispatcher route", async () => {
  const operations = await read("api/operations.js");
  const vercel = await read("vercel.json");
  assert.match(operations, /"value-dashboard": valueDashboardHandler/);
  assert.match(vercel, /"source": "\/api\/value-dashboard"/);
});
