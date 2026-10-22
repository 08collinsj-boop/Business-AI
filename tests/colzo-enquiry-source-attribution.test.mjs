import test from 'node:test';
import assert from 'node:assert/strict';

const keys = ['TENANCY_AUTH_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
const before = new Map(keys.map(key => [key, process.env[key]]));
Object.assign(process.env, {
  TENANCY_AUTH_ENABLED: 'true',
  SUPABASE_URL: 'https://synthetic.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-key'
});
const { default: handler } = await import('../lib/colzo-leads-handler.js');
const oldFetch = globalThis.fetch;
test.after(() => {
  globalThis.fetch = oldFetch;
  for (const [key,value] of before) value === undefined ? delete process.env[key] : process.env[key] = value;
});
const ok = data => ({ok:true,status:200,text:async()=>JSON.stringify(data),json:async()=>data});
const res = () => ({statusCode:0,body:null,status(code){this.statusCode=code;return this},json(value){this.body=value;return this}});

test('QA F05: owner enquiry source uses only tenant-scoped canonical audit metadata', async () => {
  const requests = [];
  globalThis.fetch = async url => {
    const href = String(url);requests.push(href);
    if (href.endsWith('/auth/v1/user')) return ok({id:'synthetic-owner'});
    if (href.includes('business_memberships?')) return ok([{business_id:'business-a',role:'owner'}]);
    if (href.includes('/rest/v1/leads?')) return ok([
      {id:1,business_id:'business-a',job_type:'Electrical enquiry',status:'New'},
      {id:2,business_id:'business-a',job_type:'Another enquiry',status:'New'}
    ]);
    if (href.includes('/rest/v1/business_audit_events?')) return ok([
      {business_id:'business-b',resource_id:'1',metadata:{source:'qr'}},
      {business_id:'business-a',resource_id:'1',metadata:{source:'directory'}},
      {business_id:'business-a',resource_id:'2',metadata:{source:'unknown-string'}}
    ]);
    throw Error('Unexpected network call: '+href);
  };
  const result=res();
  await handler({method:'GET',headers:{authorization:'Bearer synthetic-owner-token'}},result);
  assert.equal(result.statusCode,200);
  assert.equal(result.body.length,2);
  assert.equal(result.body[0].enquiry_source,'directory');
  assert.equal(result.body[0].source_label,'Colzo directory');
  assert.equal(result.body[1].source_label,'Not recorded');
  assert.ok(requests.some(uri => uri.includes('/rest/v1/business_audit_events?') && uri.includes('business_id=eq.business-a')));
  assert.ok(!requests.some(uri=>uri.includes('business_id=eq.business-b')));
});
