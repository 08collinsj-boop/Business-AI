import assert from 'node:assert/strict';
import test from 'node:test';

// Intentional contradictory service-role responses are entirely synthetic.
const BUSINESS='11111111-1111-4111-8111-111111111111';
const FOREIGN='22222222-2222-4222-8222-222222222222';
const USER='33333333-3333-4333-8333-333333333333';
const settings=(business_id=BUSINESS,business_name='Existing fictional business')=>({id:9,business_id,business_name,business_type:'Services',phone:'',email:'',opening_hours:'',services:'',profile_image_path:'',profile_banner_path:''});
const config=(business_id=BUSINESS)=>({business_id,description:'Existing summary',website:'',service_areas:''});
const route=(business_id=BUSINESS)=>({business_id,route_value:'fictional-shop'});
const reply=data=>({ok:true,status:200,text:async()=>JSON.stringify(data),json:async()=>data});
const makeRes=()=>({statusCode:0,body:null,setHeader(){},status(code){this.statusCode=code;return this;},json(v){this.body=v;return this;}});

async function fixture(t,{method='GET',body=null,production=false,settingsRows=[settings()],configRows=[config()],routeRows=[route()],settingsPatchRows=undefined,configPatchRows=undefined,configFindRows=[config()]}={}){
 const env={TENANCY_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'false',
   SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',
   SUPABASE_SERVICE_ROLE_KEY:'fixture-service-role',VERCEL_ENV:production?'production':'preview',
   VERCEL_GIT_COMMIT_REF:production?'main':'fix/colzo-pilot-release-gates-20261026'};
 const originals=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
 const originalFetch=globalThis.fetch;Object.assign(process.env,env);
 const calls=[];
 globalThis.fetch=async(href,options={})=>{
  const uri=new URL(String(href));const method=options.method||'GET';
  const table=uri.pathname.split('/').at(-1);
  calls.push({table,method,query:uri.searchParams,body:options.body&&JSON.parse(options.body),prefer:options.headers?.Prefer||''});
  if(uri.pathname==='/auth/v1/user')return reply({id:USER,email:'qa@example.invalid'});
  if(table==='business_memberships')return reply([{business_id:BUSINESS,role:'owner'}]);
  if(table==='business_settings'){
   if(method==='PATCH')return reply(settingsPatchRows===undefined?[{...settings(),...JSON.parse(options.body)}]:settingsPatchRows);
   return reply(settingsRows);
  }
  if(table==='business_configurations'){
   if(method==='PATCH'||method==='POST')return reply(configPatchRows===undefined?[{...config(),...JSON.parse(options.body)}]:configPatchRows);
   return reply(uri.searchParams.has('select')&&uri.searchParams.get('select')==='business_id'?configFindRows:configRows);
  }
  if(table==='business_public_routes')return reply(routeRows);
  if(table==='business_audit_events')return reply(null);
  throw new Error('Unexpected synthetic path '+uri.pathname);
 };
 t.after(()=>{globalThis.fetch=originalFetch;for(const [key,val]of Object.entries(originals))val===undefined?delete process.env[key]:process.env[key]=val;});
 const {default:handler}=await import('../lib/business-profile-handler.js?profile-tenant-tests='+Math.random());
 const outgoing=makeRes();
 await handler({method,headers:{authorization:'Bearer synthetic-only'},body},outgoing);
 return {outgoing,calls};
}

test('pilot Preview business profile GET returns own profile and queries tenant provenance',async t=>{
 const {outgoing,calls}=await fixture(t);
 assert.equal(outgoing.statusCode,200);
 assert.equal(outgoing.body.profile.business_name,'Existing fictional business');
 assert.equal(outgoing.body.profile.public_slug,'fictional-shop');
 for(const table of ['business_settings','business_configurations','business_public_routes']){
  const request=calls.find(x=>x.table===table);
  assert.ok(request);
  assert.equal(request.query.get('business_id'),'eq.'+BUSINESS);
  assert.match(request.query.get('select'),/business_id/);
 }
});
for(const [kind,field,data] of [
 ['settings foreign','settingsRows',[settings(FOREIGN,'Private foreign business')]],
 ['settings missing ownership','settingsRows',[{...settings(),business_id:undefined,business_name:'Private foreign business'}]],
 ['settings malformed','settingsRows',{...settings()}],
 ['settings duplicate','settingsRows',[settings(),settings(FOREIGN,'Private foreign business')]],
 ['configuration foreign','configRows',[config(FOREIGN)]],
 ['configuration missing ownership','configRows',[{description:'Private foreign summary'}]],
 ['configuration malformed','configRows',{...config()}],
 ['public route foreign','routeRows',[route(FOREIGN)]],
 ['public route missing ownership','routeRows',[{route_value:'foreign-private-route'}]],
 ['public route malformed','routeRows',{...route()}]
]){
 test('pilot Preview business profile rejects '+kind+' service-role response',async t=>{
  const {outgoing}=await fixture(t,{[field]:data});
  assert.equal(outgoing.statusCode,503);
  assert.equal(outgoing.body.error,'Could not process business profile');
  assert.doesNotMatch(JSON.stringify(outgoing.body),/Private foreign|foreign-private/);
 });
}
test('pilot Preview business profile GET permits empty optional configuration and slug',async t=>{
 const{outgoing}=await fixture(t,{configRows:[],routeRows:[]});
 assert.equal(outgoing.statusCode,200);
 assert.equal(outgoing.body.profile.description,'');
 assert.equal(outgoing.body.profile.public_slug,'');
});
test('pilot Preview business profile PATCH confirms actual saved settings and emits one audit',async t=>{
 const{outgoing,calls}=await fixture(t,{method:'PATCH',body:{business_name:'New fictional name'}});
 assert.equal(outgoing.statusCode,200);
 const patch=calls.find(x=>x.table==='business_settings'&&x.method==='PATCH');
 assert.match(patch.prefer,/return=representation/);
 assert.equal(calls.filter(x=>x.table==='business_audit_events').length,1);
});
for(const [label,rows] of [
 ['empty 200 rowset',[]],
 ['foreign row',[{...settings(FOREIGN),business_name:'New fictional name'}]],
 ['missing tenant',[{id:9,business_name:'New fictional name'}]],
 ['stale persisted value',[settings()]],
 ['null body',null],
 ['malformed body',{...settings(BUSINESS,'New fictional name')}]
]){
 test('pilot Preview business profile PATCH rejects '+label+' without false success or audit',async t=>{
  const {outgoing,calls}=await fixture(t,{method:'PATCH',body:{business_name:'New fictional name'},settingsPatchRows:rows});
  assert.equal(outgoing.statusCode,503);
  assert.equal(outgoing.body.error,'Could not process business profile');
  assert.equal(calls.filter(x=>x.table==='business_audit_events').length,0);
 });
}
test('pilot Preview business profile PATCH validates configuration row provenance before choosing patch vs insert',async t=>{
 const{outgoing,calls}=await fixture(t,{method:'PATCH',body:{description:'New fictional summary'},configFindRows:[{business_id:FOREIGN}]});
 assert.equal(outgoing.statusCode,503);
 assert.equal(calls.filter(x=>x.table==='business_configurations'&&['PATCH','POST'].includes(x.method)).length,0);
 assert.equal(calls.filter(x=>x.table==='business_audit_events').length,0);
});
test('pilot Preview business profile PATCH verifies persisted configuration name',async t=>{
 const{outgoing,calls}=await fixture(t,{method:'PATCH',body:{description:'New fictional summary'},configPatchRows:[]});
 assert.equal(outgoing.statusCode,503);
 assert.equal(calls.filter(x=>x.table==='business_audit_events').length,0);
});
test('legacy Production remains optimistic, original query projection and no new tenant guard',async t=>{
 const{outgoing,calls}=await fixture(t,{method:'PATCH',body:{business_name:'New fictional name'},production:true,settingsPatchRows:[]});
 assert.equal(outgoing.statusCode,200);
 assert.equal(calls.find(x=>x.table==='business_settings'&&x.method==='PATCH').prefer,'return=minimal');
 const get=calls.find(x=>x.table==='business_settings'&&x.method==='GET');
 assert.doesNotMatch(get.query.get('select'),/business_id/);
});
