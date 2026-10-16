import test from 'node:test';
import assert from 'node:assert/strict';
import {createColzoWhatsAppInboxHandler} from '../lib/colzo-whatsapp-persistent-handler.js';

const TENANT='12345678-1234-4234-8234-123456789012';
const OTHER='22345678-1234-4234-8234-123456789012';
const DATE='2026-10-16T12:00:00.000Z';
const response=()=>({statusCode:0,body:null,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(data){this.body=data;return this}});
function setup({enabled=true,allowed=true,mfa=true,rows=[],request}={}){
 const calls=[];
 const store=request|| (async(path,opt={})=>{calls.push({path,opt});return rows});
 const handler=createColzoWhatsAppInboxHandler({
  enabled:()=>enabled,
  requireAdmin:async()=> allowed ? {enforced:true,businessId:TENANT,role:'owner'} : Promise.reject(Object.assign(new Error('Denied'),{status:403})),
  requireMfa:async()=>mfa ? {enforced:true} : Promise.reject(Object.assign(new Error('MFA'),{status:403,code:'MFA_REQUIRED'})),
  request:store
 });
 return {handler,calls};
}
async function invoke(handler,method,query={},body={},headers={}){
 const res=response();await handler({method,query,body,headers},res);return res;
}
test('flag off fails closed without fetching auth, data or WhatsApp provider',async()=>{
 let touched=false;
 const {handler}=setup({enabled:false,request:async()=>{touched=true;return[]}});
 const res=await invoke(handler,'GET');
 assert.equal(res.statusCode,404);assert.equal(touched,false);
});
test('GET requires valid owner/admin membership and tenant-scopes its query',async()=>{
 const a=setup({rows:[{business_id:TENANT,fixture_key:'demo-a',customer_label:'Example',state:'review',updated_at:DATE}]});
 const got=await invoke(a.handler,'GET',{business_id:OTHER});
 assert.equal(got.statusCode,200);assert.equal(got.body.items.length,1);
 assert.match(a.calls[0].path,/business_id=eq\.12345678/);
 assert.doesNotMatch(a.calls[0].path,/22345678/);
 const denied=await invoke(setup({allowed:false}).handler,'GET');
 assert.equal(denied.statusCode,403);
});
test('POST inserts only three known fictional records, ignoring client-supplied business or text',async()=>{
 const a=setup({rows:[]});
 const rejected=await invoke(a.handler,'POST',{}, {business_id:OTHER,message:'injected',phone:'+447700900000'});
 assert.equal(rejected.statusCode,400);assert.equal(a.calls.length,0);
 const res=await invoke(a.handler,'POST',{}, {});
 assert.equal(res.statusCode,200);
 assert.equal(a.calls.length,1);
 assert.equal(a.calls[0].opt.method,'POST');
 const sent=JSON.parse(a.calls[0].opt.body);
 assert.equal(sent.length,3);
 assert.ok(sent.every(x=>x.business_id===TENANT && x.synthetic===true));
 assert.ok(sent.every(x=>!('phone' in x)&&!('message' in x)&&!('provider_account_sid' in x)));
 assert.match(a.calls[0].path,/on_conflict=business_id,fixture_key/);
});
test('synthetic writes demand MFA, disallow caller-defined statuses and fail closed',async()=>{
 const noMfa=setup({mfa:false});
 assert.equal((await invoke(noMfa.handler,'POST')).statusCode,403);
 assert.equal(noMfa.calls.length,0);
 const bad=setup();
 assert.equal((await invoke(bad.handler,'PATCH',{}, {fixture_key:'demo-a',state:'review',expected_updated_at:DATE})).statusCode,400);
 assert.equal(bad.calls.length,0);
 assert.equal((await invoke(bad.handler,'PATCH',{}, {fixture_key:'demo-a',state:'human',expected_updated_at:'not-a-date'})).statusCode,400);
 assert.equal((await invoke(bad.handler,'DELETE')).statusCode,405);
});
test('PATCH handover is atomic, tenant-scoped and guarded by expected timestamp and current review state',async()=>{
 const a=setup({rows:[{business_id:TENANT,fixture_key:'demo-a',state:'human',draft:null,updated_at:'2026-10-16T12:00:01.000Z'}]});
 const res=await invoke(a.handler,'PATCH',{}, {fixture_key:'demo-a',state:'human',expected_updated_at:DATE});
 assert.equal(res.statusCode,200);
 assert.equal(a.calls.length,1);
 assert.equal(a.calls[0].opt.method,'PATCH');
 assert.match(a.calls[0].path,/business_id=eq\.12345678/);
 assert.match(a.calls[0].path,/fixture_key=eq\.demo-a/);
 assert.match(a.calls[0].path,/state=eq\.review/);
 assert.match(a.calls[0].path,/updated_at=eq\./);
 const sent=JSON.parse(a.calls[0].opt.body);
 assert.equal(sent.state,'human');assert.equal(sent.draft,null);
 assert.ok(Date.parse(sent.updated_at)>Date.parse(DATE));
});
test('missing atomic PATCH row is a 409 stale revision and never a success',async()=>{
 const a=setup({rows:[]});
 const res=await invoke(a.handler,'PATCH',{}, {fixture_key:'demo-a',state:'human',expected_updated_at:DATE});
 assert.equal(res.statusCode,409);
});
test('server-side data layer never accepts free text, phone data or message sending',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../lib/colzo-whatsapp-persistent-handler.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/twilio\.messages|messages\.create|\/api\/whatsapp-inbound/);
 assert.match(source,/requireBusinessAdmin/);
 assert.match(source,/requireAal2/);
});

test('even with its flag set, default handler refuses a non-development Supabase project',async()=>{
 const mod=await import('../lib/colzo-whatsapp-persistent-handler.js');
 const previous={url:process.env.SUPABASE_URL,flag:process.env.COLZO_WHATSAPP_PERSISTENCE_ENABLED};
 try{
  process.env.COLZO_WHATSAPP_PERSISTENCE_ENABLED='true';
  process.env.SUPABASE_URL='https://production-different.supabase.co';
  const res=await invoke(mod.default,'GET');
  assert.equal(res.statusCode,404);
 }finally{
  if(previous.url===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=previous.url;
  if(previous.flag===undefined)delete process.env.COLZO_WHATSAPP_PERSISTENCE_ENABLED;
  else process.env.COLZO_WHATSAPP_PERSISTENCE_ENABLED=previous.flag;
 }
});

test('PATCH accepts PostgreSQL JSON timestamp with microsecond precision and UTC offset without altering optimistic lock',async()=>{
 // Business-AI-Dev row_to_json(timestamptz) returns +00:00 and up to 6 decimals.
 const timestamp='2026-10-16T12:34:56.123456+00:00';
 const a=setup({rows:[{fixture_key:'demo-a',state:'human',updated_at:'2026-10-16T12:34:57.000Z'}]});
 const res=await invoke(a.handler,'PATCH',{}, {fixture_key:'demo-a',state:'human',expected_updated_at:timestamp});
 assert.equal(res.statusCode,200);
 assert.equal(a.calls.length,1);
 assert.match(a.calls[0].path,/business_id=eq\.12345678/);
 assert.match(a.calls[0].path,/state=eq\.review/);
 assert.ok(a.calls[0].path.includes('updated_at=eq.'+encodeURIComponent(timestamp)));
 assert.ok(Date.parse(JSON.parse(a.calls[0].opt.body).updated_at)>Date.parse(timestamp));
});

test('PATCH accepts PostgreSQL timestamp that omits fractional seconds',async()=>{
 const timestamp='2026-10-16T12:34:56+00:00';
 const a=setup({rows:[{fixture_key:'demo-b',state:'human'}]});
 const res=await invoke(a.handler,'PATCH',{}, {fixture_key:'demo-b',state:'human',expected_updated_at:timestamp});
 assert.equal(res.statusCode,200);
 assert.ok(a.calls[0].path.includes(encodeURIComponent(timestamp)));
});

test('PATCH still rejects invalid calendar values, extra content and malformed timezone offsets',async()=>{
 const invalid=['2026-02-30T12:00:00+00:00','2026-13-10T12:00:00+00:00','2026-10-16T12:34:56.1234567+00:00',
  '2026-10-16T12:34:56+25:00','2026-10-16T12:34:56+00:99',
  '2026-10-16T12:34:56.000Z&business_id=eq.foreign','just now'];
 const a=setup();
 for(const timestamp of invalid){
  const result=await invoke(a.handler,'PATCH',{}, {fixture_key:'demo-a',state:'human',expected_updated_at:timestamp});
  assert.equal(result.statusCode,400, 'reject '+timestamp);
 }
 assert.equal(a.calls.length,0);
});
