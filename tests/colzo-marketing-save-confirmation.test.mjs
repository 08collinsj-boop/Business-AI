import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../lib/marketing-handler.js';
const B='11111111-1111-4111-8111-111111111111',ID='22222222-2222-4222-8222-222222222222';
const output={main_copy:'Synthetic content',short_alternative:'Short',call_to_action:'Contact us',hashtags:[],missing_information:[]};
const row={id:ID,business_id:B,platform:'instagram',status:'completed',approval_status:'draft',output,updated_at:'2026-10-19T10:00:00.000Z'};
const reply=data=>({ok:true,status:200,text:async()=>JSON.stringify(data),json:async()=>data});
async function run(t,action,saved){
 const vars={SUPABASE_URL:'https://synthetic.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-only',TENANCY_AUTH_ENABLED:'true'};
 const old=Object.fromEntries(Object.keys(vars).map(k=>[k,process.env[k]]));Object.assign(process.env,vars);
 const oldFetch=globalThis.fetch,calls=[];
 globalThis.fetch=async(input,opts={})=>{
  const u=new URL(input),method=opts.method||'GET';calls.push({path:u.pathname,method,params:u.searchParams,body:opts.body?JSON.parse(opts.body):null,headers:opts.headers});
  if(u.pathname==='/auth/v1/user')return reply({id:'synthetic-user'});
  if(u.pathname==='/rest/v1/business_memberships')return reply([{business_id:B,role:'owner'}]);
  if(u.pathname==='/rest/v1/business_feature_entitlements')return reply([{feature_key:'ai_marketing',status:'active'}]);
  if(u.pathname==='/rest/v1/marketing_generations')return reply(method==='GET'?[row]:typeof saved==='function'?saved(JSON.parse(opts.body)):saved);
  if(u.pathname==='/rest/v1/business_audit_events')return reply([]);
  throw Error('No provider calls permitted: '+u.pathname);
 };
 t.after(()=>{globalThis.fetch=oldFetch;for(const [k,v]of Object.entries(old))v===undefined?delete process.env[k]:process.env[k]=v;});
 const res={code:0,status(n){this.code=n;return this;},json(b){this.body=b;return this;},setHeader(){}};
 await handler({method:action==='delete'?'DELETE':'PATCH',query:{},headers:{authorization:'Bearer fixture'},body:{action,generation_id:ID,...(action==='edit'?{output}:{})}},res);
 return{res,calls};
}
for(const action of ['edit','approve','delete']){
 for(const [label,saved]of [['empty',[]],['null',null],['wrong ID',[{...row,id:B}]],['wrong tenant',[{...row,business_id:ID}]],['unchanged record',[row]]])test(`Marketing ${action}: ${label} confirmation cannot produce success or audit`,async t=>{
  const {res,calls}=await run(t,action,saved);assert.equal(res.code,label==='empty'?409:503);assert.ok(!calls.some(c=>c.path==='/rest/v1/business_audit_events'));
  assert.equal(calls.filter(c=>c.method==='PATCH').length,1,'no write retries');
 });
 test(`Marketing ${action}: confirmed write preserves tenant and returns saved state`,async t=>{
  const {res,calls}=await run(t,action,patch=>[{...row,...patch}]);assert.equal(res.code,200);
  const write=calls.find(c=>c.method==='PATCH');assert.equal(write.params.get('business_id'),'eq.'+B);assert.equal(write.params.get('id'),'eq.'+ID);assert.equal(write.headers.Prefer,'return=representation');
  assert.equal(calls.filter(c=>c.path==='/rest/v1/business_audit_events').length,1);
  if(action==='edit')assert.deepEqual(res.body.generation.output,output);
  if(action==='approve')assert.equal(res.body.generation.approval_status,'approved');
  if(action==='delete')assert.equal(res.body.deleted,true);
 });
}
