import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../lib/legal-handler.js';
import { LEGAL_VERSIONS } from '../lib/legal.js';

const BUSINESS='11111111-1111-4111-8111-111111111111';
const FOREIGN='22222222-2222-4222-8222-222222222222';
const USER='33333333-3333-4333-8333-333333333333';
const acceptedAt='2026-10-29T12:34:56.000Z';

test('DPA status requires a current matching returned tenant, document and version', {concurrency:false}, async t => {
  const originalEnv={...process.env}, oldFetch=globalThis.fetch;
  Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'false',
    SUPABASE_URL:'https://fictional-supabase.invalid',SUPABASE_SERVICE_ROLE_KEY:'fictional-service-key'});
  let dpaRows=[];
  globalThis.fetch=async(input, options={})=>{
    const u=new URL(String(input));
    const response=(x)=>({ok:true,status:200,text:async()=>JSON.stringify(x),json:async()=>x});
    if(u.pathname.endsWith('/auth/v1/user')) return response({id:USER,email:'fictional@example.invalid'});
    if(u.pathname.endsWith('/business_memberships')) {
      assert.equal(u.searchParams.get('user_id'),'eq.'+USER);
      return response([{business_id:BUSINESS,role:'owner'}]);
    }
    if(u.pathname.endsWith('/user_legal_acceptances')) return response([]);
    if(u.pathname.endsWith('/business_legal_acceptances')){
      assert.equal(u.searchParams.get('business_id'),'eq.'+BUSINESS);
      assert.equal(u.searchParams.get('document_key'),'eq.dpa');
      assert.equal(u.searchParams.get('document_version'),'eq.'+LEGAL_VERSIONS.dpa);
      return response(dpaRows);
    }
    throw new Error('Unexpected fake legal route '+u.pathname);
  };
  t.after(()=>{
    globalThis.fetch=oldFetch;
    for(const key of Object.keys(process.env)) if(!(key in originalEnv))delete process.env[key];
    Object.assign(process.env,originalEnv);
  });
  const read=async()=>{
    const res={statusCode:0,payload:null,headers:{},setHeader(k,v){this.headers[k]=v},
      status(n){this.statusCode=n;return this},json(x){this.payload=x;return this}};
    await handler({method:'GET',headers:{authorization:'Bearer fictional-only'}},res);
    return res;
  };
  const right={business_id:BUSINESS,document_key:'dpa',document_version:LEGAL_VERSIONS.dpa,accepted_at:acceptedAt};
  await t.test('correct owner business DPA is accepted',async()=>{
    dpaRows=[right];const v=await read();assert.equal(v.statusCode,200);
    assert.equal(v.payload.dpa_required,true);assert.equal(v.payload.dpa_accepted,true);
  });
  await t.test('untrusted foreign-business row cannot satisfy DPA',async()=>{
    dpaRows=[{...right,business_id:FOREIGN}];
    const v=await read();assert.equal(v.statusCode,200);assert.equal(v.payload.dpa_accepted,false);
    assert.equal(v.payload.dpa_accepted_at,null);
  });
  await t.test('wrong-version row cannot satisfy DPA',async()=>{
    dpaRows=[{...right,document_version:'old-version'}];
    const v=await read();assert.equal(v.statusCode,200);assert.equal(v.payload.dpa_accepted,false);
  });
  await t.test('other document row cannot satisfy DPA',async()=>{
    dpaRows=[{...right,document_key:'terms'}];
    const v=await read();assert.equal(v.statusCode,200);assert.equal(v.payload.dpa_accepted,false);
  });
  await t.test('empty DPA read is not accepted',async()=>{
    dpaRows=[];const v=await read();assert.equal(v.statusCode,200);assert.equal(v.payload.dpa_accepted,false);
  });
});
