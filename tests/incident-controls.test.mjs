import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { assertIncidentFeatureAvailable, getIncidentControls, isIncidentFeaturePaused } from '../lib/incident-controls.js';
import incidentControlsHandler from '../lib/incident-controls-handler.js';
import { readFile } from 'node:fs/promises';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
afterEach(() => { globalThis.fetch = originalFetch; process.env = { ...originalEnv }; });
const response = (body, ok = true, status = ok ? 200 : 500) => ({ ok, status, text: async () => JSON.stringify(body), json: async () => body });

function env() {
  Object.assign(process.env, { TENANCY_AUTH_ENABLED: 'true', SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'service-key' });
}

test('incident controls combine business and platform pauses and fail closed', async () => {
  env();
  globalThis.fetch = async (url) => {
    if (url.includes('business_incident_controls')) return response([{ business_id: 'business-a', marketing_generation_paused: true }]);
    if (url.includes('platform_incident_controls')) return response([{ id: 'global', marketing_publishing_paused: true }]);
    throw new Error('unexpected request');
  };
  const state = await getIncidentControls('business-a');
  assert.equal(state.effective.marketing_generation_paused, true);
  assert.equal(state.effective.marketing_publishing_paused, true);
  await assert.rejects(() => assertIncidentFeatureAvailable('business-a', 'marketing_generation'), error => error?.code === 'INCIDENT_PAUSED');
  assert.equal(await isIncidentFeaturePaused('business-a', 'automatic_followups'), false);
  globalThis.fetch = async () => { throw new Error('storage down'); };
  assert.equal(await isIncidentFeaturePaused('business-a', 'automatic_followups'), true);
});

test('incident controls require owner to resume a paused business control', async () => {
  env();
  globalThis.fetch = async (url) => {
    if (url.endsWith('/auth/v1/user')) return response({ id: 'admin-a' });
    if (url.includes('business_memberships')) return response([{ business_id: 'business-a', role: 'admin' }]);
    if (url.includes('business_incident_controls')) return response([{ business_id: 'business-a', ai_receptionist_paused: true, reason: 'Testing' }]);
    if (url.includes('platform_incident_controls')) return response([{ id: 'global' }]);
    throw new Error(`unexpected request ${url}`);
  };
  const res = { statusCode: 0, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await incidentControlsHandler({ method: 'PATCH', headers: { authorization: 'Bearer valid' }, body: { ai_receptionist_paused: false, reason: 'Resume now' } }, res);
  assert.equal(res.statusCode, 403);
});

test('high-risk server paths include incident enforcement', async () => {
  const [enquiry, marketing, publication, automation, operations, vercel] = await Promise.all([
    readFile(new URL('../api/enquiry.js', import.meta.url), 'utf8'),
    readFile(new URL('../lib/marketing-handler.js', import.meta.url), 'utf8'),
    readFile(new URL('../lib/marketing-publication.js', import.meta.url), 'utf8'),
    readFile(new URL('../lib/marketing-automation.js', import.meta.url), 'utf8'),
    readFile(new URL('../api/operations.js', import.meta.url), 'utf8'),
    readFile(new URL('../vercel.json', import.meta.url), 'utf8')
  ]);
  assert.match(enquiry, /assertIncidentFeatureAvailable\(businessId, "ai_receptionist"\)/);
  assert.match(enquiry, /isIncidentFeaturePaused\(businessId, "automatic_followups"\)/);
  assert.match(marketing, /marketing_generation/);
  assert.match(publication, /marketing_publishing/);
  assert.match(automation, /marketing_generation/);
  assert.match(operations, /incident-controls/);
  assert.match(vercel, /api\/incident-controls/);
});
