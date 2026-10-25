import test from 'node:test';
import assert from 'node:assert/strict';

const saved={...process.env}, originalFetch=globalThis.fetch;
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const user='33333333-3333-4333-8333-333333333333';
const token=aal=>'test.'+Buffer.from(JSON.stringify({aal})).toString('base64url')+'.synthetic';
const reply=(body,ok=true)=>({ok,status:ok?200:503,json:async()=>body,text:async()=>JSON.stringify(body)});
const res=()=>({statusCode:0,body:null,setHeader(){},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}});
function enable(){Object.assign(process.env,{COLZO_SCOPED_PILOT_ACCESS:'true',VERCEL_ENV:'preview',
 VERCEL_GIT_COMMIT_REF:'feature/colzo-scoped-pilot-access-20261023',TENANCY_AUTH_ENABLED:'true',
 SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic',
 PILOT_FREE_STARTER_MARKETING:'false',BILLING_ENABLED:'false'});}
function grant(offset=-86400000){const start=Date.now()+offset;return {business_id:a,status:'active',activated_at:new Date(start).toISOString(),expires_at:new Date(start+14*86400000).toISOString()};}
function backend({rows=[grant()],role='owner',authOk=true,broken=false}={}){
 const calls=[];globalThis.fetch=async(url,opts={})=>{
  const href=String(url);calls.push({href,method:opts.method||'GET'});
  if(href.endsWith('/auth/v1/user'))return reply({id:user,email:'fixture@example.test'},authOk);
  if(href.includes('business_memberships'))return reply([{business_id:a,role}]);
  if(href.includes('colzo_pilot_access'))return reply(rows,!broken);
  if(href.includes('business_billing_usage'))return reply([{quantity:250}]);
  if(href.includes('business_team_invitations'))return reply([]);
  if(href.includes('business_public_routes'))return reply([{route_value:'fixture-business'}]);
  return reply([]);
 };return calls;
}

test('workspace membership rejects expired, missing, foreign, duplicate or unavailable pilot grants',async()=>{
 enable();const {requireBusinessMember}=await import('../lib/auth.js');
 for(const options of [{rows:[grant(-15*86400000)]},{rows:[]},{rows:[{...grant(),business_id:b}]},
  {rows:[grant(),grant()]},{rows:[{...grant(),status:'revoked'}]},{rows:[grant(86400000)]},{broken:true}]){
  const calls=backend(options);
  await assert.rejects(()=>requireBusinessMember({headers:{authorization:'Bearer '+token('aal2')},query:{business_id:b},body:{business_id:b}}),{status:403,code:'PILOT_ACCESS_REQUIRED'});
  assert.ok(calls.every(call=>call.method==='GET'));
 }
});
test('active pilot still requires verified identity and correct roles; exhaustion does not lock existing records',async()=>{
 enable();const auth=await import('../lib/auth.js');
 backend();assert.equal((await auth.requireBusinessMember({headers:{authorization:'Bearer '+token('aal2')}})).businessId,a);
 backend({role:'member'});await assert.rejects(()=>auth.requireBusinessAdmin({headers:{authorization:'Bearer '+token('aal2')}}),{status:403});
 backend({authOk:false});await assert.rejects(()=>auth.requireBusinessMember({headers:{authorization:'Bearer '+token('aal2')}}),{status:401});
 backend();await assert.rejects(()=>auth.requireAal2({headers:{authorization:'Bearer '+token('aal1')}}),{status:403,code:'MFA_REQUIRED'});
 assert.equal((await auth.requireAal2({headers:{authorization:'Bearer '+token('aal2')}})).userId,user);
});
test('scoped mode cannot fall back to unauthenticated legacy membership',async()=>{
 enable();process.env.TENANCY_AUTH_ENABLED='false';backend();
 const {requireBusinessMember}=await import('../lib/auth.js');
 await assert.rejects(()=>requireBusinessMember({}),{status:403,code:'PILOT_ACCESS_REQUIRED'});
});
test('expired pilot cannot read or write records through protected standalone handlers',async()=>{
 enable();
 const routes=[['../api/leads.js',{}],['../api/bookings.js',{}],['../api/actions.js',{}],
  ['../api/history.js',{lead_id:'1'}],['../api/settings.js',{}],['../api/pipeline.js',{}],
  ['../api/business-configuration.js',{}],['../lib/colzo-records-handler.js',{resource:'clients'}],
  ['../lib/colzo-leads-handler.js',{}],['../lib/billing-handler.js',{}],['../lib/addons-handler.js',{}],
  ['../lib/team-handler.js',{}],['../lib/handover-handler.js',{}],['../lib/value-dashboard-handler.js',{}]];
 for(const [path,query] of routes){
  const calls=backend({rows:[grant(-15*86400000)]});const handler=(await import(path)).default;const out=res();
  await handler({method:'GET',headers:{authorization:'Bearer '+token('aal2')},query},out);
  assert.equal(out.statusCode,403,path);assert.equal(out.body.code,'PILOT_ACCESS_REQUIRED',path);
  assert.ok(calls.every(call=>/auth\/v1\/user|business_memberships|colzo_pilot_access|business_billing_usage/.test(call.href)),path+' reached protected storage');
 }
 const handler=(await import('../lib/colzo-records-handler.js')).default;
 for(const method of ['POST','PATCH']){
  const calls=backend({rows:[grant(-15*86400000)]}),out=res();
  await handler({method,headers:{authorization:'Bearer '+token('aal2')},query:{resource:'clients',...(method==='PATCH'?{id:b}:{})},body:{full_name:'Fixture',expected_updated_at:new Date().toISOString()}},out);
  assert.equal(out.statusCode,403);assert.ok(calls.every(call=>call.method==='GET'));
 }
});
test('scoped team mutations are blocked until an audited atomic seat workflow exists',async()=>{
 enable();const handler=(await import('../lib/team-handler.js')).default;
 for(const body of [{email:'fixture@example.test',role:'member'},{action:'accept',invitation_id:b},{invitation_id:b,status:'revoked'}]){
  const calls=backend(),out=res();
  await handler({method:body.status?'PATCH':'POST',headers:{authorization:'Bearer '+token('aal2')},query:{},body},out);
  assert.equal(out.statusCode,403);assert.equal(out.body.code,'PILOT_TEAM_MANAGED');
  assert.ok(calls.every(call=>call.method==='GET'));
 }
});
test('scoped business provisioning is operator-controlled while recovery identity remains usable',async()=>{
 enable();let calls=backend();const handler=(await import('../api/business-onboarding.js')).default;const out=res();
 await handler({method:'POST',headers:{authorization:'Bearer '+token('aal2')},body:{business_name:'Fixture',business_type:'Testing'}},out);
 assert.equal(out.statusCode,403);assert.equal(out.body.code,'PILOT_PROVISIONING_MANAGED');
 assert.ok(calls.every(call=>call.method==='GET'));
 // Expiry never disables Supabase identity verification or removes MFA factors.
 calls=backend({rows:[grant(-15*86400000)]});const auth=await import('../lib/auth.js');
 assert.equal((await auth.requireAuthenticatedUser({headers:{authorization:'Bearer '+token('aal1')}})).userId,user);
 assert.ok(calls.every(call=>call.href.endsWith('/auth/v1/user')));
});
test('two independent businesses retain tenant scope and one pilot expiry cannot unlock the other',async()=>{
 enable();const handler=(await import('../lib/colzo-records-handler.js')).default;
 const secondUser='44444444-4444-4444-8444-444444444444';
 let firstExpired=false;const recordReads=[];
 globalThis.fetch=async(url,opts={})=>{
  const href=String(url);
  if(href.endsWith('/auth/v1/user'))return reply({id:opts.headers.Authorization==='Bearer account-a'?user:secondUser});
  if(href.includes('business_memberships'))return reply([{business_id:href.includes(secondUser)?b:a,role:'owner'}]);
  if(href.includes('colzo_pilot_access')){
   const business=href.includes(b)?b:a;
   return reply([{...grant(business===a&&firstExpired?-15*86400000:-86400000),business_id:business}]);
  }
  if(href.includes('business_billing_usage'))return reply([{quantity:0}]);
  if(href.includes('colzo_clients')){
   const business=href.includes(b)?b:a;recordReads.push(business);
   return reply([{id:business,business_id:business,full_name:'Synthetic '+business}]);
  }
  throw Error('Unexpected fixture request '+href);
 };
 for(const [bearer,business,foreign] of [['account-a',a,b],['account-b',b,a]]){
  const out=res();await handler({method:'GET',headers:{authorization:'Bearer '+bearer},query:{resource:'clients',business_id:foreign}},out);
  assert.equal(out.statusCode,200);assert.deepEqual(out.body.map(row=>row.business_id),[business]);
 }
 firstExpired=true;
 for(const [bearer,status] of [['account-a',403],['account-b',200]]){
  const out=res();await handler({method:'GET',headers:{authorization:'Bearer '+bearer},query:{resource:'clients'}},out);
  assert.equal(out.statusCode,status);
 }
 assert.deepEqual(recordReads,[a,b,b]);
});
test.after(()=>{for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);globalThis.fetch=originalFetch;});
