import test from 'node:test';
import assert from 'node:assert/strict';
const keys=['TENANCY_AUTH_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','VERCEL_ENV','VERCEL_GIT_COMMIT_REF'];
const saved=keys.map(k=>[k,process.env[k]]),oldFetch=globalThis.fetch;
Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-key',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-complete-ui-motion-20261017'});
const handlers={actions:(await import('../api/actions.js')).default,bookings:(await import('../api/bookings.js')).default};
test.after(()=>{globalThis.fetch=oldFetch;for(const[k,v]of saved)v===undefined?delete process.env[k]:process.env[k]=v});
const version='2026-10-19T12:00:00.123456+00:00',newer='2026-10-19T12:00:00.123457+00:00';
const reply=d=>({ok:true,json:async()=>d,text:async()=>JSON.stringify(d)});
async function request(resource,{expected=version,currentVersion=version,race=false,savedVersionForm='exact',omitExpected=false,branch='feature/colzo-complete-ui-motion-20261017'}={}){
 process.env.VERCEL_GIT_COMMIT_REF=branch;
 const calls=[],current={id:11,business_id:'synthetic-business',title:'Original',status:resource==='actions'?'pending':'requested',action_type:'custom',lead_id:null,booking_id:null,updated_at:currentVersion};
 globalThis.fetch=async(input,init={})=>{
   const path=String(input),method=init.method||'GET';calls.push({path,method,body:init.body});
   if(path.endsWith('/auth/v1/user'))return reply({id:'synthetic-user'});
   if(path.includes('/business_memberships?'))return reply([{business_id:current.business_id,role:'owner'}]);
   if(path.includes('/'+resource+'?')&&method==='GET')return reply([current]);
   if(path.includes('/'+resource+'?')&&method==='PATCH'){
     const updated={...current,...JSON.parse(init.body)};
     if(savedVersionForm==='microsecond-different')updated.updated_at=updated.updated_at.replace(/\.(\d{3})Z$/,'.$1'+'456+00:00');
     if(savedVersionForm==='utc-offset')updated.updated_at=updated.updated_at.replace(/Z$/,'+00:00');
     return reply(race?[]:[updated]);
   }
   return reply(null);
 };
 const body={id:11,title:'Saved'};if(!omitExpected&&expected!==undefined)body.expected_updated_at=expected;
 const res={statusCode:200,status(n){this.statusCode=n;return this},json(d){this.body=d;return this},setHeader(){}};
 await handlers[resource]({method:'PATCH',body,headers:{authorization:'Bearer synthetic-token'}},res);
 return {res,calls};
}
for(const resource of ['actions','bookings']){
 test(resource+' rejects stale loaded versions before writes or side effects',async()=>{
   const {res,calls}=await request(resource,{currentVersion:newer});assert.equal(res.statusCode,409);
   assert.equal(calls.filter(c=>c.method==='POST'||c.method==='PATCH').length,0);
 });
 test(resource+' atomically matches the exact version and advances it on success',async()=>{
   const {res,calls}=await request(resource);assert.equal(res.statusCode,200);
   const write=calls.find(c=>c.method==='PATCH');const p=new URL(write.path).searchParams;
   assert.equal(p.get('id'),'eq.11');assert.equal(p.get('business_id'),'eq.synthetic-business');assert.equal(p.get('updated_at'),'eq.'+version);
   assert.ok(Date.parse(res.body.updated_at)>Date.parse(version));
 });
 test(resource+' loses a race with 409 and no audit/history success',async()=>{
   const {res,calls}=await request(resource,{race:true});assert.equal(res.statusCode,409);
   assert.equal(calls.filter(c=>c.method==='POST').length,0);
 });
 test(resource+' must reject a returned saved timestamp with a different microsecond value',async()=>{
   const {res,calls}=await request(resource,{savedVersionForm:'microsecond-different'});
   assert.equal(res.statusCode,500);
   assert.equal(calls.filter(c=>c.path.includes('/business_audit_events')&&c.method==='POST').length,0);
 });
 test(resource+' accepts an equivalent stored UTC offset timestamp',async()=>{
   const {res}=await request(resource,{savedVersionForm:'utc-offset'});
   assert.equal(res.statusCode,200);
 });
 test(resource+' refuses missing and invalid versions in the scoped Preview',async()=>{
   for(const expected of [null,'',{},'invalid']){const {res,calls}=await request(resource,{expected});assert.equal(res.statusCode,400);assert.equal(calls.filter(c=>c.method==='PATCH').length,0)}
 });
}

// Match the deployed pilot branch, where the legacy transport flag is false.
for (const resource of ['actions','bookings']) {
 const branch='fix/colzo-pilot-release-gates-20261026';
 test(resource+' pilot branch rejects a stale editor rather than overwriting the winner',async()=>{
  const {res,calls}=await request(resource,{branch,currentVersion:newer});
  assert.equal(res.statusCode,409);
  assert.equal(calls.filter(c=>['POST','PATCH'].includes(c.method)).length,0);
 });
 test(resource+' pilot branch uses atomic version matching and rejects a lost race',async()=>{
  const {res,calls}=await request(resource,{branch,race:true});
  assert.equal(res.statusCode,409);
  assert.equal(new URL(calls.find(c=>c.method==='PATCH').path).searchParams.get('updated_at'),'eq.'+version);
  assert.equal(calls.filter(c=>c.method==='POST').length,0);
 });
 test(resource+' pilot branch rejects missing version and advances an exact version',async()=>{
  const missing=await request(resource,{branch,omitExpected:true});
  assert.equal(missing.res.statusCode,400);
  assert.equal(missing.calls.filter(c=>c.method==='PATCH').length,0);
  const valid=await request(resource,{branch});
  assert.equal(valid.res.statusCode,200);
  assert.equal(new URL(valid.calls.find(c=>c.method==='PATCH').path).searchParams.get('updated_at'),'eq.'+version);
  assert.ok(Date.parse(valid.res.body.updated_at)>Date.parse(version));
 });
}
