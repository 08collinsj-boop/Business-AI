import test from 'node:test';
import assert from 'node:assert/strict';
import { PREVIEW_DATASETS, collectDraftTenantExport } from '../lib/colzo-tenant-export-engine.js';

const business = '10000000-0000-4000-8000-000000000001';

const expectedNewClasses = [
  'business_configurations', 'business_public_routes', 'business_data_lifecycle_policies',
  'business_team_invitations', 'lead_handovers', 'business_legal_acceptances',
  'marketing_image_usage_events', 'marketing_automation_media',
  'marketing_automation_settings', 'marketing_strategy_settings',
  'business_incident_controls', 'business_referral_profiles',
  'business_feature_entitlements', 'customer_complaints', 'pilot_feedback',
  'review_email_outbox', 'voice_calls', 'voice_call_events'
];

const keyless = new Set([
  'business_configurations', 'business_data_lifecycle_policies',
  'marketing_automation_settings', 'marketing_strategy_settings',
  'business_incident_controls', 'business_referral_profiles',
  'business_feature_entitlements'
]);

function reader({overrides={}} = {}) {
  const requests=[];
  async function readPage(query) {
    requests.push(query);
    if (Object.hasOwn(overrides, query.table)) return overrides[query.table];
    if (query.offset > 0) return [];
    if (keyless.has(query.table)) {
      return [{business_id:business, ...(query.table==='business_feature_entitlements'?{feature_key:'ai_marketing'}:{})}];
    }
    return [{id:1,business_id:business}];
  }
  return {readPage,requests};
}

test('reviewed nonsecret classes are included in a strictly partial export', async () => {
  for (const name of expectedNewClasses) assert.ok(PREVIEW_DATASETS[name], name + ' must have a field allowlist');
  const x = reader();
  const result = await collectDraftTenantExport({businessId:business,readPage:x.readPage});
  assert.equal(result.export_complete, false);
  assert.equal(result.snapshot_consistent, false);
  assert.equal(result.deletion_authorised, false);
  assert.equal(result.data.business_configurations[0].business_id,business);
  assert.equal(result.data.business_feature_entitlements[0].feature_key,'ai_marketing');
  assert.equal(result.data.voice_call_events.length,1);
  assert.ok(result.omitted_public_tables.includes('businesses') || !result.omitted_public_tables.includes('business_configurations'));
});

test('dataset allowlists never select provider secret fields or global/shared identity tables', () => {
  const names = Object.keys(PREVIEW_DATASETS);
  for (const denied of ['marketing_meta_connections','marketing_social_accounts','stripe_webhook_events','business_billing_accounts','user_legal_acceptances','customer_profiles','customer_enquiry_access','business_audit_events']) {
    assert.ok(!names.includes(denied), denied);
  }
  const allFields = Object.values(PREVIEW_DATASETS).join(',');
  for (const denied of ['token_ciphertext','token_iv','token_tag','webhook_secret_reference','stripe_subscription_id','api_key']) assert.ok(!allFields.split(',').includes(denied),denied);
});

test('business-id-only primary keys and compound primary keys use stable ordered keys', async()=> {
  const x=reader();
  await collectDraftTenantExport({businessId:business,readPage:x.readPage});
  assert.equal(x.requests.find(r=>r.table==='business_configurations').order,'business_id.asc');
  assert.equal(x.requests.find(r=>r.table==='business_feature_entitlements').order,'business_id.asc,feature_key.asc');
  assert.equal(x.requests.find(r=>r.table==='lead_handovers').order,'id.asc');
});

test('missing compound key and duplicate business keys fail closed', async()=> {
  for (const overrides of [
    {business_feature_entitlements:[{business_id:business}]},
    {business_configurations:[{business_id:business},{business_id:business}]},
    {business_feature_entitlements:[{business_id:business,feature_key:'starter'},{business_id:business,feature_key:'starter'}]}
  ]) {
    const x=reader({overrides});
    await assert.rejects(collectDraftTenantExport({businessId:business,readPage:x.readPage}),/Tenant export is unavailable or incomplete/);
  }
});

test('foreign business without numerical row id is not exported',async()=>{
  const x=reader({overrides:{business_configurations:[{business_id:'20000000-0000-4000-8000-000000000002'}]}});
  await assert.rejects(collectDraftTenantExport({businessId:business,readPage:x.readPage}),/Tenant export is unavailable or incomplete/);
});

test('unrequested secret columns in new business settings fail closed',async()=>{
  const x=reader({overrides:{business_configurations:[{business_id:business,provider_token:'should not be returned'}]}});
  await assert.rejects(collectDraftTenantExport({businessId:business,readPage:x.readPage}),/Tenant export is unavailable or incomplete/);
});

test('larger fictional lead exports walk all 200-row pages without truncation',async()=>{
  const x=reader();
  x.readPage=async ({table,order,offset,limit}) => {
    x.requests.push({table,order,offset,limit});
    if (table==='leads') return Array.from({length:Math.max(0,Math.min(limit,421-offset))},(_,i)=>({id:offset+i+1,business_id:business}));
    if (keyless.has(table)) return [{business_id:business,...(table==='business_feature_entitlements'?{feature_key:'x'}:{})}];
    return [];
  };
  const result=await collectDraftTenantExport({businessId:business,readPage:x.readPage});
  assert.equal(result.data.leads.length,421);
  assert.deepEqual(x.requests.filter(r=>r.table==='leads').map(r=>r.offset),[0,200,400]);
});

test('oversized result pages and silent truncation at table caps are rejected',async()=>{
  const oversized=reader();
  oversized.readPage=async ({table})=>table==='leads'?Array.from({length:201},(_,i)=>({id:i+1,business_id:business})):[];
  await assert.rejects(collectDraftTenantExport({businessId:business,readPage:oversized.readPage}),/unavailable or incomplete/);
  const overCap=reader();
  overCap.readPage=async ({table,offset,limit})=>table==='leads'?Array.from({length:Math.min(limit,5001-offset)},(_,i)=>({id:offset+i+1,business_id:business})):[];
  await assert.rejects(collectDraftTenantExport({businessId:business,readPage:overCap.readPage}),/unavailable or incomplete/);
});

test('invalid zero primary key in exported customer records fails closed',async()=>{
  const x=reader({overrides:{leads:[{id:0,business_id:business}]}});
  await assert.rejects(collectDraftTenantExport({businessId:business,readPage:x.readPage}),/unavailable or incomplete/);
});
