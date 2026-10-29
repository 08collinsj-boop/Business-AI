import test from 'node:test';
import assert from 'node:assert/strict';

const BUSINESS='11111111-1111-4111-8111-111111111111';
const FOREIGN='22222222-2222-4222-8222-222222222222';
const USER='33333333-3333-4333-8333-333333333333';
const reply=(data,status=200)=>({ok:status>=200&&status<300,status,
  text:async()=>JSON.stringify(data),json:async()=>data});

test('lead subject export rejects cross-tenant response rows and pilot erasure never partly writes', {concurrency:false},async t=>{
 const old={...process.env}, originalFetch=globalThis.fetch;
 Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'false',
  VERCEL_ENV:'preview',PILOT_FREE_STARTER_MARKETING:'false',BILLING_ENABLED:'false',
  SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY:'synthetic-fake-key-only'});
 const grantStart=Date.now()-86400000;
 const grant={business_id:BUSINESS,status:'active',
   activated_at:new Date(grantStart).toISOString(),
   expires_at:new Date(grantStart+14*86400000).toISOString()};
 const goodLead={id:1,business_id:BUSINESS,name:'Fictional Person'};
 const validRelated={id:5,business_id:BUSINESS,lead_id:1};
 const resultData={leads:[goodLead],lead_history:[validRelated],bookings:[validRelated],actions:[validRelated]};
 const calls=[];
 let audit=0;
 globalThis.fetch=async(input,options={})=>{
  const u=new URL(String(input)); const method=options.method||'GET';
  calls.push({path:u.pathname,method});
  if(u.pathname.endsWith('/auth/v1/user'))return reply({id:USER,email:'fixture@example.invalid'});
  if(u.pathname.endsWith('/business_memberships'))return reply([{business_id:BUSINESS,role:'owner'}]);
  if(u.pathname.endsWith('/colzo_pilot_access'))return reply([grant]);
  if(u.pathname.endsWith('/business_billing_usage'))return reply([]);
  if(u.pathname.endsWith('/business_audit_events')){audit++;return reply(null,201);}
  for(const [table,data] of Object.entries(resultData)){
   if(u.pathname.endsWith('/'+table)){
    assert.equal(u.searchParams.get('business_id'),'eq.'+BUSINESS);
    return reply(data);
   }
  }
  throw new Error('Unexpected data-subject request '+u.pathname);
 };
 t.after(()=>{globalThis.fetch=originalFetch;
  for(const key of Object.keys(process.env))if(!(key in old))delete process.env[key];
  Object.assign(process.env,old);
 });
 const {default:handler}=await import('../lib/data-subjects-handler.js');
 const call=async(method='GET',leadId='1')=>{
  const res={statusCode:0,body:null,status(s){this.statusCode=s;return this},json(v){this.body=v;return this}};
  await handler({method,headers:{authorization:'Bearer synthetic-qa-session'},
   query:{lead_id:leadId},body:{lead_id:leadId}},res);return res;
 };
 const expectForeignFail=async(table,foreignRows)=>{
  resultData[table]=foreignRows;audit=0;
  const out=await call();
  assert.equal(out.statusCode,500);
  assert.equal(audit,0);
  assert.doesNotMatch(JSON.stringify(out.body),new RegExp(FOREIGN));
  resultData[table]=table==='leads'?[goodLead]:[validRelated];
 };
 await t.test('own lead and matching related records export correctly',async()=>{
  const out=await call();
  assert.equal(out.statusCode,200);
  assert.equal(out.body.lead.business_id,BUSINESS);
  assert.equal(out.body.bookings[0].business_id,BUSINESS);
 });
 await t.test('foreign lead returned by privileged database fails closed',()=>expectForeignFail('leads',[{...goodLead,business_id:FOREIGN}]));
 await t.test('foreign history returned by privileged database fails closed',()=>expectForeignFail('lead_history',[{...validRelated,business_id:FOREIGN}]));
 await t.test('foreign booking returned by privileged database fails closed',()=>expectForeignFail('bookings',[{...validRelated,business_id:FOREIGN}]));
 await t.test('foreign action returned by privileged database fails closed',()=>expectForeignFail('actions',[{...validRelated,business_id:FOREIGN}]));
 await t.test('mismatched lead reference in related table fails closed',()=>expectForeignFail('actions',[{...validRelated,lead_id:2}]));
 await t.test('unsafe huge lead IDs are rejected before service database access',async()=>{
  calls.length=0;
  const out=await call('GET','9007199254740993');
  assert.equal(out.statusCode,400);
  assert.equal(calls.length,2); // even when malformed, owner auth is still checked first
 });
 await t.test('scoped pilot DELETE is blocked before any partial erasure mutation',async()=>{
  process.env.COLZO_SCOPED_PILOT_ACCESS='true';
  const before=calls.filter(c=>c.method==='PATCH').length;
  const out=await call('DELETE','1');
  assert.equal(out.statusCode,503);
  assert.equal(calls.filter(c=>c.method==='PATCH').length,before);
  process.env.COLZO_SCOPED_PILOT_ACCESS='false';
 });
});
