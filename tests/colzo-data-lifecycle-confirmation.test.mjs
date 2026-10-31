import test from 'node:test';
import assert from 'node:assert/strict';

const BUSINESS = '11111111-1111-4111-8111-111111111111';
const FOREIGN = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';
const ok = (payload, status=200) => ({ok:status>=200&&status<300,status,
  async text(){return payload==null?'':JSON.stringify(payload)},async json(){return payload}});

test('lifecycle policy save verifies tenant, updated fields and actual persisted response before acknowledging', {concurrency:false}, async t=>{
  const env={...process.env}, originalFetch=globalThis.fetch;
  Object.assign(process.env,{
    TENANCY_AUTH_ENABLED:'true',
    COLZO_SCOPED_PILOT_ACCESS:'false',
    SUPABASE_URL:'https://fictional-test-only.invalid',
    SUPABASE_SERVICE_ROLE_KEY:'fake-test-key'
  });
  let policyRows=[];
  let auditWrites=0;
  let requestCount=0;
  globalThis.fetch=async (input, options={})=>{
    const u=new URL(String(input));
    if(u.pathname.endsWith('/auth/v1/user')) return ok({id:USER,email:'fixture@example.invalid'});
    if(u.pathname.endsWith('/business_memberships')) return ok([{business_id:BUSINESS,role:'owner'}]);
    if(u.pathname.endsWith('/business_data_lifecycle_policies')){
      requestCount++;
      assert.equal(u.searchParams.get('business_id'),'eq.'+BUSINESS);
      if(options.method==='PATCH'){
        assert.equal(options.headers.Prefer,'return=representation');
        return ok(policyRows);
      }
      return ok(policyRows);
    }
    if(u.pathname.endsWith('/business_audit_events')){
      auditWrites++;
      return ok(null,201);
    }
    throw Error('Unexpected fixture endpoint: '+u.pathname);
  };
  t.after(()=>{
    globalThis.fetch=originalFetch;
    for(const key of Object.keys(process.env)) if(!(key in env)) delete process.env[key];
    Object.assign(process.env,env);
  });
  const {default:handler}=await import('../lib/data-lifecycle-handler.js');
  async function call(method='PATCH', body={lead_retention_days:365}){
    const res={statusCode:0,payload:null,
      status(x){this.statusCode=x;return this},
      json(x){this.payload=x;return this}};
    await handler({method,headers:{authorization:'Bearer synthetic-only'},body},res);
    return res;
  }

  await t.test('zero returned rows must not return HTTP 200 success',async()=>{
    policyRows=[];auditWrites=0;
    const result=await call();
    assert.equal(result.statusCode,409);
    assert.equal(auditWrites,0);
  });

  await t.test('foreign business returned by service-role response fails closed',async()=>{
    policyRows=[{business_id:FOREIGN,lead_retention_days:365,audit_retention_days:730}];auditWrites=0;
    const result=await call();
    assert.equal(result.statusCode,500);
    assert.equal(auditWrites,0);
    assert.doesNotMatch(JSON.stringify(result.payload),new RegExp(FOREIGN));
  });

  await t.test('a returned own business row with stale requested value cannot be reported as saved',async()=>{
    policyRows=[{business_id:BUSINESS,lead_retention_days:180,audit_retention_days:730}];auditWrites=0;
    const result=await call();
    assert.equal(result.statusCode,500);
    assert.equal(auditWrites,0);
  });

  await t.test('confirmed own-business response succeeds and audits exactly once',async()=>{
    policyRows=[{business_id:BUSINESS,lead_retention_days:365,audit_retention_days:730}];auditWrites=0;
    const result=await call();
    assert.equal(result.statusCode,200);
    assert.equal(result.payload.business_id,BUSINESS);
    assert.equal(result.payload.lead_retention_days,365);
    assert.equal(auditWrites,1);
  });

  await t.test('GET cannot return an accidentally foreign policy row',async()=>{
    policyRows=[{business_id:FOREIGN,lead_retention_days:365,audit_retention_days:730}];auditWrites=0;
    const result=await call('GET');
    assert.equal(result.statusCode,500);
    assert.equal(auditWrites,0);
    assert.doesNotMatch(JSON.stringify(result.payload),new RegExp(FOREIGN));
  });
  assert.ok(requestCount>=5);
});
