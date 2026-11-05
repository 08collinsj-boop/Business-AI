import test from 'node:test';
import assert from 'node:assert/strict';

const saved = {...process.env}, oldFetch = globalThis.fetch;
const user = '33333333-3333-4333-8333-333333333333';
const business = '11111111-1111-4111-8111-111111111111';
const jwt = claims => 'fixture.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.synthetic';
function setup() {
  Object.assign(process.env, {TENANCY_AUTH_ENABLED:'true', COLZO_SCOPED_PILOT_ACCESS:'true',
    VERCEL_ENV:'preview', VERCEL_GIT_COMMIT_REF:'feature/colzo-scoped-pilot-access-20261023', SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY:'synthetic', PILOT_FREE_STARTER_MARKETING:'false'});
  const calls = [];
  globalThis.fetch = async url => {
    const path = String(url); calls.push(path);
    let body;
    if (path.endsWith('/auth/v1/user')) body = {id:user};
    else if (path.includes('business_memberships')) body = [{business_id:business, role:'owner'}];
    else if (path.includes('colzo_pilot_access')) { const start=Date.now()-1000; body = [{business_id:business, status:'active',
      activated_at:new Date(start).toISOString(), expires_at:new Date(start+336*3600000).toISOString()}]; }
    else if (path.includes('business_billing_usage')) body = [];
    else throw new Error('Unexpected protected data request: ' + path);
    return {ok:true, json:async()=>body, text:async()=>JSON.stringify(body)};
  };
  return calls;
}
const req = claims => ({headers:{authorization:'Bearer '+jwt(claims)},query:{}});
const res = () => ({setHeader(){},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}});

test('scoped Development workspace rejects AAL1, absent and malformed assurance before tenant data reads', async () => {
  const {requireBusinessMember} = await import('../lib/auth.js');
  for (const claims of [{aal:'aal1'}, {}, {aal:'aal2-suffix'}, {aal:['aal2']}]) {
    const calls = setup();
    await assert.rejects(requireBusinessMember(req(claims)), {status:403,code:'MFA_REQUIRED'});
    assert.deepEqual(calls, ['https://mvwseobgkexzpmmkgcxe.supabase.co/auth/v1/user']);
  }
});
test('AAL1 cannot GET or mutate bookings, enquiries or customer records behind the MFA dialog', async () => {
  for (const path of ['../api/bookings.js','../lib/colzo-leads-handler.js','../lib/colzo-records-handler.js']) {
    const handler = (await import(path)).default;
    for (const method of ['GET','POST','PATCH']) {
      const calls=setup(), out=res();
      await handler({...req({aal:'aal1'}),method,query:{resource:'clients',id:business},body:{expected_updated_at:'2026-11-05T12:00:00.000Z'}},out);
      assert.equal(out.statusCode,403,path+' '+method);
      assert.equal(out.body.code,'MFA_REQUIRED');
      assert.equal(calls.length,1,'must not fetch tenant records or mutate anything');
    }
  }
});
test('verified AAL2 workspace access and AAL1 identity recovery remain usable', async () => {
  setup(); const auth = await import('../lib/auth.js');
  assert.equal((await auth.requireBusinessMember(req({aal:'aal2'}))).businessId,business);
  setup(); assert.equal((await auth.requireAuthenticatedUser(req({aal:'aal1'}))).userId,user);
});
test('workspace MFA addition does not change non-scoped or Production membership behavior', async () => {
  const {requireBusinessMember} = await import('../lib/auth.js');
  for (const [key,value] of [['COLZO_SCOPED_PILOT_ACCESS','false'],['VERCEL_ENV','production']]) {
    setup();process.env[key]=value;
    if (key==='VERCEL_ENV') await assert.rejects(requireBusinessMember(req({aal:'aal1'})), {code:'PILOT_ACCESS_REQUIRED'});
    else assert.equal((await requireBusinessMember(req({aal:'aal1'}))).businessId,business);
  }
});
test.after(()=>{for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);globalThis.fetch=oldFetch;});
