import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../lib/colzo-records-handler.js';

const BUSINESS = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const QUOTE = '33333333-3333-4333-8333-333333333333';
const VERSION = '2026-10-18T12:00:00.000Z';

function reply(status, data) {
  return { ok: status >= 200 && status < 300, status,
    async text() { return data === null ? '' : JSON.stringify(data); }, async json() { return data; } };
}
async function request(t, {resource='quotes', method='POST', body, leadExists=false}={}) {
  const previousFetch = globalThis.fetch;
  const envNames = ['TENANCY_AUTH_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
  const previousEnv = envNames.map(name=>process.env[name]);
  process.env.TENANCY_AUTH_ENABLED='true';
  process.env.SUPABASE_URL='https://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-service-key';
  const calls = [];
  globalThis.fetch = async (input, options={}) => {
    const url = new URL(String(input)), verb = options.method || 'GET';
    calls.push({path:url.pathname,verb,params:url.searchParams,body:options.body ? JSON.parse(options.body) : null});
    if (url.pathname === '/auth/v1/user') return reply(200,{id:USER});
    if (url.pathname === '/rest/v1/business_memberships') return reply(200,[{business_id:BUSINESS,role:'owner'}]);
    if (url.pathname === '/rest/v1/business_audit_events') return reply(201,null);
    if (url.pathname === '/rest/v1/leads') return reply(200,leadExists ? [{id:43,business_id:BUSINESS}] : []);
    if (url.pathname === '/rest/v1/colzo_quotes') {
      if (verb === 'GET') return reply(200,[{id:QUOTE,business_id:BUSINESS,lead_id:42,title:'Existing quote',amount_gbp:100,status:'draft',updated_at:VERSION}]);
      if (verb === 'POST') return reply(201,[{id:QUOTE,business_id:BUSINESS,...JSON.parse(options.body)}]);
      if (verb === 'PATCH') return reply(200,[{id:QUOTE,business_id:BUSINESS,...JSON.parse(options.body)}]);
    }
    if (url.pathname === '/rest/v1/colzo_projects' && verb === 'POST') return reply(201,[{id:QUOTE,business_id:BUSINESS,...JSON.parse(options.body)}]);
    return reply(200,[]);
  };
  t.after(()=>{
    globalThis.fetch=previousFetch;
    envNames.forEach((name,i)=>previousEnv[i]===undefined ? delete process.env[name] : process.env[name]=previousEnv[i]);
  });
  const req={method,headers:{authorization:'Bearer synthetic-fixture-token'},query:{resource, ...(method==='PATCH'?{id:QUOTE}:{})},body};
  const res={statusCode:200,payload:null,status(s){this.statusCode=s;return this;},json(v){this.payload=v;return this;}};
  await handler(req,res);
  return {status:res.statusCode,payload:res.payload,calls};
}

test('quote creation rejects a non-owned enquiry before inserting any quote', async t=>{
  const r=await request(t,{body:{lead_id:43,title:'New quote',amount_gbp:50}});
  assert.equal(r.status,400);
  assert.equal(r.calls.some(c=>c.path==='/rest/v1/colzo_quotes'&&c.verb==='POST'),false);
});
test('project creation rejects a non-owned enquiry before inserting a project', async t=>{
  const r=await request(t,{resource:'projects',body:{lead_id:43,title:'New project',client_name:'Test person'}});
  assert.equal(r.status,400);
  assert.equal(r.calls.some(c=>c.path==='/rest/v1/colzo_projects'&&c.verb==='POST'),false);
});
test('quote PATCH cannot relink an owned record to another business enquiry', async t=>{
  const r=await request(t,{method:'PATCH',body:{lead_id:43,expected_updated_at:VERSION}});
  assert.equal(r.status,400);
  assert.equal(r.calls.some(c=>c.path==='/rest/v1/colzo_quotes'&&c.verb==='PATCH'),false);
});
test('quote creation accepts an owned enquiry only after querying within business scope',async t=>{
  const r=await request(t,{body:{lead_id:43,title:'New quote',amount_gbp:50},leadExists:true});
  assert.equal(r.status,201);
  const query=r.calls.find(c=>c.path==='/rest/v1/leads');
  assert.ok(query);
  assert.equal(query.params.get('business_id'),'eq.'+BUSINESS);
  assert.equal(query.params.get('id'),'eq.43');
});
test('project with explicitly empty enquiry remains valid',async t=>{
  const r=await request(t,{resource:'projects',body:{lead_id:null,title:'Standalone project',client_name:'Test person'}});
  assert.equal(r.status,201);
  assert.equal(r.calls.some(c=>c.path==='/rest/v1/leads'),false);
});

test('project creation accepts an enquiry owned by the authenticated business', async t => {
  const r = await request(t, {resource:'projects',body:{lead_id:43,title:'New project',client_name:'Test person'},leadExists:true});
  assert.equal(r.status,201);
  const lookup = r.calls.find(c=>c.path==='/rest/v1/leads');
  assert.equal(lookup.params.get('business_id'),'eq.'+BUSINESS);
  assert.equal(lookup.params.get('id'),'eq.43');
});
test('quote PATCH accepts an owned enquiry with its tenant scoped version guard', async t => {
  const r = await request(t, {method:'PATCH',body:{lead_id:43,expected_updated_at:VERSION},leadExists:true});
  assert.equal(r.status,200);
  const patch = r.calls.find(c=>c.path==='/rest/v1/colzo_quotes'&&c.verb==='PATCH');
  assert.equal(patch.params.get('business_id'),'eq.'+BUSINESS);
  assert.equal(patch.params.get('updated_at'),'eq.'+VERSION);
});
test('unsafe integer enquiry IDs are rejected before database reads or writes', async t => {
  const r = await request(t, {body:{lead_id:'9007199254740993',title:'New quote',amount_gbp:50}});
  assert.equal(r.status,400);
  assert.equal(r.calls.some(c=>c.path==='/rest/v1/leads'||c.path==='/rest/v1/colzo_quotes'),false);
});
