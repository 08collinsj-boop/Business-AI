import test from 'node:test';
import assert from 'node:assert/strict';

// Isolated handler acceptance: Auth/storage responses and server clock are
// controlled fixtures. No live token, browser session or database is used.
test('retained authenticated requests lose workspace access at expiry and cannot revive it', async () => {
  const savedEnv = {...process.env};
  const originalFetch = globalThis.fetch;
  const OriginalDate = globalThis.Date;
  const business = '11111111-1111-4111-8111-111111111111';
  const foreign = '22222222-2222-4222-8222-222222222222';
  const user = '33333333-3333-4333-8333-333333333333';
  const grant = Object.freeze({business_id:business,status:'active',activated_at:'2026-10-01T12:00:00.000Z',expires_at:'2026-10-15T12:00:00.000Z'});
  const record = Object.freeze({id:business,business_id:business,full_name:'Fictional retained customer'});
  let clock = OriginalDate.parse(grant.expires_at) - 1;
  let authValid = true;
  let member = true;
  const calls = [];
  const reply = (body, ok=true) => ({ok,status:ok?200:401,json:async()=>body,text:async()=>JSON.stringify(body)});
  const headers = Object.freeze({authorization:'Bearer synthetic-retained-session'});
  try {
    Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'true',VERCEL_ENV:'preview',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-fixture-key',PILOT_FREE_STARTER_MARKETING:'false',BILLING_ENABLED:'false'});
    globalThis.Date = class extends OriginalDate {
      constructor(...args) { super(...(args.length ? args : [clock])); }
      static now() { return clock; }
    };
    globalThis.fetch = async (url, options={}) => {
      const path = new URL(String(url));
      calls.push({path:path.pathname,method:options.method||'GET'});
      if (path.pathname.endsWith('/auth/v1/user')) {
        assert.equal(options.headers.Authorization,headers.authorization);
        return reply({id:user,email:'fixture@example.invalid'},authValid);
      }
      if (path.pathname.endsWith('/business_memberships')) return reply(member?[{business_id:business,role:'owner'}]:[]);
      if (path.pathname.endsWith('/colzo_pilot_access')) {
        assert.equal(path.searchParams.get('business_id'),'eq.'+business);
        return reply([grant]);
      }
      if (path.pathname.endsWith('/business_billing_usage')) return reply([{quantity:0}]);
      if (path.pathname.endsWith('/colzo_clients')) {
        assert.equal(path.searchParams.get('business_id'),'eq.'+business);
        return reply([record]);
      }
      throw new Error('Unexpected fixture request '+path.pathname);
    };
    const handler = (await import('../lib/colzo-records-handler.js')).default;
    async function invoke(method='GET', query={}) {
      const out={statusCode:0,body:null,setHeader(){},status(value){this.statusCode=value;return this;},json(value){this.body=value;return this;}};
      await handler({method,headers,query:{resource:'clients',...query},body:{full_name:'Fictional changed name',expected_updated_at:grant.activated_at}},out);
      return out;
    }
    const active = await invoke('GET',{business_id:foreign});
    assert.equal(active.statusCode,200);
    assert.deepEqual(active.body,[record]);
    const readsBeforeExpiry=calls.filter(c=>c.path.endsWith('/colzo_clients')).length;
    for (const instant of [OriginalDate.parse(grant.expires_at),OriginalDate.parse(grant.expires_at)+1]) {
      clock=instant;
      for (const method of ['GET','POST','PATCH']) {
        const denied=await invoke(method,{business_id:foreign,id:business});
        assert.equal(denied.statusCode,403);
        assert.equal(denied.body.code,'PILOT_ACCESS_REQUIRED');
      }
    }
    assert.equal(calls.filter(c=>c.path.endsWith('/colzo_clients')).length,readsBeforeExpiry);
    // A newly verified request cannot restore an expired workspace either.
    assert.equal((await invoke()).statusCode,403);
    // Independent identity revocation/membership changes are checked again.
    clock=OriginalDate.parse(grant.expires_at)-1;
    authValid=false;
    assert.equal((await invoke()).statusCode,401);
    authValid=true;member=false;
    assert.equal((await invoke()).statusCode,403);
    assert.ok(calls.every(c=>c.method==='GET'));
    assert.equal(record.full_name,'Fictional retained customer');
    assert.equal(grant.expires_at,'2026-10-15T12:00:00.000Z');
  } finally {
    globalThis.fetch=originalFetch;globalThis.Date=OriginalDate;
    for(const key of Object.keys(process.env)) if(!(key in savedEnv)) delete process.env[key];
    Object.assign(process.env,savedEnv);
  }
});
