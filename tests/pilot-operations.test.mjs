import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const team = await readFile(new URL("../lib/team-handler.js", import.meta.url), "utf8");
const handovers = await readFile(new URL("../lib/handover-handler.js", import.meta.url), "utf8");
const enquiry = await readFile(new URL("../api/enquiry.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("team invitations are owner-authorised and cannot grant owner access", () => {
  assert.match(team, /requireBusinessMember\(req, \["owner"\]\)/);
  assert.match(team, /\["admin", "member"\]/);
  assert.doesNotMatch(team, /role[^\n]{0,80}"owner"/);
  assert.match(team, /accept_business_team_invitation/);
  assert.match(team, /p_email: auth\.email/);
  assert.match(team, /business_id=eq\.\$\{encodeURIComponent\(auth\.businessId\)\}/);
  assert.doesNotMatch(team, /body\.business_id|body\.role.*owner/);
});

test("handover reads and status updates are tenant-scoped and require membership", () => {
  assert.match(handovers, /requireBusinessMember\(req\)/);
  assert.match(handovers, /lead_handovers\?business_id=eq/);
  assert.match(handovers, /id=eq\.\$\{encodeURIComponent\(body\.id\)\}&business_id=eq/);
  assert.match(handovers, /\["acknowledged", "resolved"\]/);
  assert.match(handovers, /handover\.\$\{body\.status\}/);
});

test("public AI handovers remain linked to the resolved tenant lead and action", () => {
  assert.match(enquiry, /rpc\/save_public_enquiry/);
  assert.match(enquiry, /p_business_id: businessId/);
  assert.match(enquiry, /decideAIHandover\(mode/);
  assert.match(enquiry, /resolvePublicBusiness\(req\)/);
});

test("owner operations UI keeps support, team, privacy, and public enquiries separate", () => {
  assert.match(html, /Human handovers/);
  assert.match(html, /Team access/);
  assert.match(html, /Privacy & retention/);
  assert.match(html, /Pilot help/);
  assert.match(html, /api\('\/api\/team'/);
  assert.match(html, /api\('\/api\/handovers'/);
  assert.match(html, /api\('\/api\/data-lifecycle'/);
  assert.doesNotMatch(html, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|RATE_LIMIT_SALT/);
});
