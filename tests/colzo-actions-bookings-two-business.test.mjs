import test from 'node:test';
import assert from 'node:assert/strict';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const UA='33333333-3333-4333-8333-333333333333',UB='44444444-4444-4444-8444-444444444444';
const reply=(data,status=200)=>({ok:status<400,status,json:async()=>data,text:async()=>JSON.stringify(data)});
async function fixture(t,route,role='owner'){
 const env={SUPABASE_URL:'https://synthetic.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-only',TENANCY_AUTH_ENABLED:'true'};
 const old=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));Object.assign(process.env,env);
 const oldFetch=globalThis.fetch,calls=[];
 const records=[{id:11,business_id:A,title:'Synthetic A',status:'pending'},{id:22,business_id:B,title:'Synthetic B',status:'pending'}];
 globalThis.fetch=async(input,opts={})=>{
  const u=new URL(input),method=opts.method||'GET',params=u.searchParams,body=opts.body?JSON.parse(opts.body):null;
  calls.push({path:u.pathname,method,params,body});
  if(u.pathname==='/auth/v1/user'){
   const token=opts.headers?.Authorization;
   if(token==='Bearer expired')return reply({message:'Expired'},401);
   return reply({id:token==='Bearer token-b'?UB:UA});
  }
  if(u.pathname==='/rest/v1/business_memberships')return reply([{business_id:params.get('user_id')==='eq.'+UB?B:A,role}]);
  const tenant=params.get('business_id')?.slice(3),id=params.get('id')?.slice(3);
  if(u.pathname===`/rest/v1/${route}`){
   if(method==='GET')return reply(records.filter(r=>r.business_id===tenant&&(!id||String(r.id)===id)));
   if(method==='POST')return reply([{id:33,...body}]);
   if(method==='PATCH'){const row=records.find(r=>r.business_id===tenant&&String(r.id)===id);return reply(row?[{...row,...body}]:[]);}
  }
  if(['/rest/v1/leads','/rest/v1/bookings'].includes(u.pathname)){
   const own=(tenant===A&&id==='11')||(tenant===B&&id==='22');return reply(own?[{id:Number(id),business_id:tenant}]:[]);
  }
  if(['/rest/v1/business_audit_events','/rest/v1/lead_history'].includes(u.pathname))return reply([]);
  throw Error('Unexpected fixture request: '+u.pathname);
 };
 t.after(()=>{globalThis.fetch=oldFetch;for(const [k,v] of Object.entries(old))v===undefined?delete process.env[k]:process.env[k]=v;});
 const handler=(await import(`../api/${route}.js?matrix=${Math.random()}`)).default;
 return{calls,call:async(method,{token='token-a',body={},query={}}={})=>{
  const res={code:200,status(n){this.code=n;return this;},json(b){this.body=b;return this;},setHeader(){}};
  await handler({method,headers:token?{authorization:'Bearer '+token}:{},body,query},res);return res;
 }};
}
for(const route of ['actions','bookings']){
 test(`${route}: independent authenticated users see only their own business`,async t=>{
  const {call,calls}=await fixture(t,route);const a=await call('GET'),b=await call('GET',{token:'token-b'});
  assert.equal(a.code,200);assert.equal(b.code,200);assert.deepEqual(a.body.map(r=>r.business_id),[A]);assert.deepEqual(b.body.map(r=>r.business_id),[B]);
  assert.deepEqual(calls.filter(c=>c.path===`/rest/v1/${route}`).map(c=>c.params.get('business_id')),['eq.'+A,'eq.'+B]);
 });
 test(`${route}: foreign-ID PATCH is denied before a write`,async t=>{
  const {call,calls}=await fixture(t,route);const r=await call('PATCH',{token:'token-b',body:{id:11,status:'cancelled'}});
  assert.equal(r.code,404);assert.ok(!JSON.stringify(r.body).includes('Synthetic A'));assert.ok(!calls.some(c=>c.method==='PATCH'));
 });
 for(const method of ['POST','PATCH'])test(`${route}: ${method} rejects a forged business ID`,async t=>{
  const {call,calls}=await fixture(t,route);const r=await call(method,{body:{...(method==='PATCH'?{id:11}:{}),title:'Synthetic',business_id:B}});
  assert.equal(r.code,400);assert.ok(!calls.some(c=>['POST','PATCH'].includes(c.method)));
 });
 for(const method of ['GET','POST','PATCH'])test(`${route}: ${method} rejects a foreign enquiry link`,async t=>{
  const {call,calls}=await fixture(t,route);const r=await call(method,{body:{...(method==='PATCH'?{id:11}:{}),title:'Synthetic',lead_id:22},query:method==='GET'?{lead_id:22}:{}});
  assert.equal(r.code,404);assert.ok(!calls.some(c=>['POST','PATCH'].includes(c.method)));
  const lookup=calls.find(c=>c.path==='/rest/v1/leads');assert.equal(lookup.params.get('business_id'),'eq.'+A);
 });
 for(const token of [null,'expired'])test(`${route}: ${token?'expired':'missing'} authentication fails before business data access`,async t=>{
  const {call,calls}=await fixture(t,route);const r=await call('POST',{token,body:{title:'Synthetic'}});assert.equal(r.code,401);
  assert.ok(!calls.some(c=>c.path===`/rest/v1/${route}`));
 });
 for(const role of ['owner','admin','member'])test(`${route}: ${role} writes remain confined to its authenticated business`,async t=>{
  const {call,calls}=await fixture(t,route,role);const r=await call('POST',{token:'token-b',body:{title:'Synthetic'}});
  assert.equal(r.code,201);assert.equal(r.body.business_id,B);assert.equal(calls.find(c=>c.path===`/rest/v1/${route}`&&c.method==='POST').body.business_id,B);
 });
 test(`${route}: own-record update includes both tenant and record predicates`,async t=>{
  const {call,calls}=await fixture(t,route);const r=await call('PATCH',{body:{id:11,title:'Synthetic revision'}});assert.equal(r.code,200);
  const write=calls.find(c=>c.method==='PATCH');assert.equal(write.params.get('business_id'),'eq.'+A);assert.equal(write.params.get('id'),'eq.11');
 });
}
test('Actions: a foreign booking link is rejected before creating an action',async t=>{
 const {call,calls}=await fixture(t,'actions');const r=await call('POST',{body:{title:'Synthetic',booking_id:22}});
 assert.equal(r.code,404);assert.ok(!calls.some(c=>c.method==='POST'));
});
