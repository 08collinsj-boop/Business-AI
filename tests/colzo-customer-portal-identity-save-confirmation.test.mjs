import test from 'node:test';
import assert from 'node:assert/strict';

// Contradictory service-role responses use entirely fictional user IDs,
// customer enquiries, and profile details. No real Auth, DB or HTTP calls.
const USER='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const BUSINESS='33333333-3333-4333-8333-333333333333';
const ACCESS='44444444-4444-4444-8444-444444444444';
const profile={user_id:USER,display_name:'Fictional portal owner'};
const access={id:ACCESS,customer_user_id:USER,business_id:BUSINESS,lead_id:42,created_at:'2026-10-30T12:00:00Z'};
const response=data=>({ok:true,status:200,text:async()=>JSON.stringify(data),json:async()=>data});
const responder=()=>({statusCode:0,body:null,status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;},setHeader(){}});
async function fixture(t,{profileResponse=[profile],accessResponse=[access],postResponse=null,method='GET',displayName='Confirmed Customer',legacy=false}={}){
 const vars={TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',
   SUPABASE_SERVICE_ROLE_KEY:'synthetic-do-not-use',VERCEL_ENV:legacy?'production':'preview',
   VERCEL_GIT_COMMIT_REF:'fix/colzo-pilot-release-gates-20261026'};
 const original=Object.fromEntries(Object.keys(vars).map(k=>[k,process.env[k]]));
 const oldFetch=globalThis.fetch;Object.assign(process.env,vars);
 const calls=[];
 globalThis.fetch=async(href,options={})=>{
  const url=new URL(String(href));const verb=options.method||'GET';
  calls.push({path:url.pathname,verb,params:url.searchParams,body:options.body&&JSON.parse(options.body)});
  if(url.pathname==='/auth/v1/user')return response({id:USER,email:'fictional@example.invalid'});
  const table=url.pathname.split('/').at(-1);
  if(table==='customer_profiles')return response(verb==='POST'?(postResponse===null?[{...profile,display_name:displayName}]:postResponse):profileResponse);
  if(table==='customer_enquiry_access')return response(accessResponse);
  if(table==='leads')return response([{id:42,business_id:BUSINESS,job_type:'Fictional repair',description:'Fictional customer question',status:'New'}]);
  if(table==='business_settings')return response([{business_id:BUSINESS,business_name:'Fictional Test Business',business_type:'Services',review_requests_enabled:false}]);
  if(table==='business_public_routes')return response([]);
  if(table==='lead_handovers'||table==='actions')return response([]);
  throw Error('Unexpected synthetic route: '+url.pathname);
 };
 t.after(()=>{globalThis.fetch=oldFetch;for(const [key,value]of Object.entries(original))value===undefined?delete process.env[key]:process.env[key]=value;});
 const {default:handler}=await import('../lib/customer-portal-handler.js?customer-provenance='+Math.random());
 const res=responder();await handler({method,headers:{authorization:'Bearer fictional-only'},
  body:method==='POST'?{action:'profile',display_name:displayName}:undefined},res);
 return{res,calls};
}

test('customer portal GET returns own profile and enquiry without internal identifiers',async t=>{
 const{res,calls}=await fixture(t);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.customer.display_name,profile.display_name);
 assert.equal(res.body.enquiries.length,1);
 assert.equal(res.body.enquiries[0].business.name,'Fictional Test Business');
 assert.equal(calls.find(x=>x.path.endsWith('customer_profiles')).params.get('user_id'),'eq.'+USER);
 const grant=calls.find(x=>x.path.endsWith('customer_enquiry_access'));
 assert.equal(grant.params.get('customer_user_id'),'eq.'+USER);
 assert.match(grant.params.get('select'),/customer_user_id/);
});

for(const[label,profileResponse]of[
 ['foreign user',[{...profile,user_id:OTHER,display_name:'Other customer private name'}]],
 ['missing user provenance',[{display_name:'Other customer private name'}]],
 ['malformed null',null],
 ['malformed object',{display_name:'Other customer private name'}]
]){
 test('customer portal GET refuses '+label+' profile without revealing private name',async t=>{
  const{res}=await fixture(t,{profileResponse});
  assert.equal(res.statusCode,503);
  assert.deepEqual(res.body,{error:'Customer portal is temporarily unavailable'});
  assert.doesNotMatch(JSON.stringify(res.body),/private name/);
 });
}

for(const[label,accessResponse]of[
 ['foreign customer',[{...access,customer_user_id:OTHER}]],
 ['missing customer provenance',[{id:ACCESS,business_id:BUSINESS,lead_id:42}]],
 ['malformed null',null],
 ['malformed object',{...access}],
 ['invalid lead reference',[{...access,lead_id:'unexpected'}]]
]){
 test('customer portal refuses '+label+' access row before querying linked private enquiry',async t=>{
  const{res,calls}=await fixture(t,{accessResponse});
  assert.equal(res.statusCode,503);
  assert.deepEqual(res.body,{error:'Customer portal is temporarily unavailable'});
  assert.equal(calls.filter(x=>x.path.endsWith('/leads')).length,0);
 });
}

test('customer portal accepts an authenticated user with a genuinely empty enquiry list',async t=>{
 const{res,calls}=await fixture(t,{accessResponse:[]});
 assert.equal(res.statusCode,200);assert.deepEqual(res.body.enquiries,[]);
 assert.equal(calls.filter(x=>x.path.endsWith('/leads')).length,0);
});

test('customer portal POST confirms the persisted profile owner and display name',async t=>{
 const{res,calls}=await fixture(t,{method:'POST'});
 assert.equal(res.statusCode,200);
 assert.equal(res.body.customer.display_name,'Confirmed Customer');
 assert.equal(calls.find(x=>x.verb==='POST'&&x.path.endsWith('customer_profiles')).body.user_id,USER);
});
for(const[label,postResponse]of[
 ['no saved row',[]],
 ['foreign user',[{user_id:OTHER,display_name:'Confirmed Customer'}]],
 ['missing owner identifier',[{display_name:'Confirmed Customer'}]],
 ['different saved name',[{user_id:USER,display_name:'Old customer name'}]],
 ['multiple rows',[{user_id:USER,display_name:'Confirmed Customer'},{user_id:OTHER,display_name:'Confirmed Customer'}]],
 ['nonarray response',{user_id:USER,display_name:'Confirmed Customer'}]
]){
 test('customer portal profile POST refuses '+label+' instead of false save acknowledgement',async t=>{
  const{res}=await fixture(t,{method:'POST',postResponse});
  assert.equal(res.statusCode,503);assert.deepEqual(res.body,{error:'Customer portal is temporarily unavailable'});
 });
}
test('legacy Production customer portal retains pre-existing optimistic profile behavior',async t=>{
 const{res}=await fixture(t,{method:'POST',postResponse:[],legacy:true});
 assert.equal(res.statusCode,200);assert.equal(res.body.customer.display_name,'Confirmed Customer');
});
