import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const saved={...process.env},originalFetch=globalThis.fetch;
const business='11111111-1111-4111-8111-111111111111';
function setup(){
 Object.assign(process.env,{COLZO_SCOPED_PILOT_ACCESS:'true',VERCEL_ENV:'preview',TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic',PILOT_FREE_STARTER_MARKETING:'false'});
 const calls=[],start=Date.now()-86400000;
 const reply=data=>({ok:true,status:200,text:async()=>JSON.stringify(data),json:async()=>data});
 globalThis.fetch=async(url,init={})=>{
  const href=String(url);calls.push({href,method:init.method||'GET'});
  if(href.endsWith('/auth/v1/user'))return reply({id:'33333333-3333-4333-8333-333333333333'});
  if(href.includes('business_memberships'))return reply([{business_id:business,role:'owner'}]);
  if(href.includes('colzo_pilot_access'))return reply([{business_id:business,status:'active',activated_at:new Date(start).toISOString(),expires_at:new Date(start+14*86400000).toISOString()}]);
  if(href.includes('business_settings'))return reply([{business_id:business,business_name:'Example'}]);
  if(href.includes('/storage/'))return reply({token:'synthetic-upload',url:'/synthetic?token=synthetic-upload'});
  return reply([]);
 };return calls;
}
afterEach(()=>{process.env={...saved};globalThis.fetch=originalFetch;});
async function call(module,method,body){const handler=(await import(module)).default;const res={setHeader(){},status(n){this.statusCode=n;return this},json(v){this.body=v;return this}};await handler({method,body,query:{},headers:{authorization:'Bearer synthetic'}},res);return res;}
for(const [name,module,body] of [
 ['knowledge','../lib/knowledge-handler.js',{action:'create_upload',file_name:'example.txt',mime_type:'text/plain',size_bytes:10}],
 ['profile','../lib/business-profile-handler.js',{action:'prepare_upload',slot:'avatar',file_name:'example.png',mime_type:'image/png',size_bytes:10}]
])test('scoped '+name+' cannot mint an upload capability or mutate metadata',async()=>{
 const calls=setup();const res=await call(module,'POST',body);
 assert.equal(res.statusCode,403);assert.equal(res.body.code,'PILOT_UPLOAD_UNAVAILABLE');
 assert.ok(calls.every(c=>c.method==='GET'&&!c.href.includes('/storage/')));
});
test('scoped knowledge retains owner manual facts but declares uploads unavailable',async()=>{
 setup();const res=await call('../lib/knowledge-handler.js','GET');assert.equal(res.statusCode,200);assert.equal(res.body.can_manage,true);assert.equal(res.body.can_add_manual,true);assert.equal(res.body.can_upload,false);
});
test('scoped profile retains text editing but declares media uploads unavailable',async()=>{
 setup();const res=await call('../lib/business-profile-handler.js','GET');assert.equal(res.statusCode,200);assert.equal(res.body.can_edit,true);assert.equal(res.body.can_upload_media,false);
});
function renderer(name,end,state){const ui=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');const start=ui.indexOf('function '+name+'()');const until=ui.indexOf(end,start);assert.ok(start>0&&until>start);const ctx={state,safe:v=>String(v??''),day:()=>'',empty:()=>''};vm.runInNewContext(ui.slice(start,until)+'globalThis.draw='+name,ctx);return ctx.draw();}
test('scoped knowledge renderer keeps manual facts and review without offering upload or replacement',()=>{
 const html=renderer('knowledge',' async function loadBilling',{knowledgeCanManage:true,knowledgeCanAddManual:true,knowledgeCanUpload:false,knowledgeFilter:'all',knowledgeSources:[{id:'fixture',file_name:'Fact',status:'active',item_counts:{active:1,total:1}}]});
 assert.match(html,/data-knowledge-create/);assert.match(html,/data-knowledge-open/);assert.doesNotMatch(html,/type="file"|data-knowledge-upload|data-knowledge-replace/);
});
test('scoped profile renderer disables uploads while retaining text save and media removal',()=>{
 const html=renderer('publicProfile',' async function loadAutomation',{publicProfileData:{can_edit:true,can_upload_media:false,profile:{business_name:'Example',profile_image_path:'fixture'} }});
 assert.match(html,/data-public-media-upload="avatar"[^>]*disabled/);assert.match(html,/data-public-media-upload="banner"[^>]*disabled/);assert.match(html,/Save public profile/);assert.match(html,/data-public-media-remove="avatar"/);
});

for(const [name,module,body,status] of [
 ['knowledge','../lib/knowledge-handler.js',{action:'create_upload',file_name:'example.txt',mime_type:'text/plain',size_bytes:10},201],
 ['profile','../lib/business-profile-handler.js',{action:'prepare_upload',slot:'avatar',file_name:'example.png',mime_type:'image/png',size_bytes:10},200]
])test('legacy '+name+' retains authorised uploads when scoped mode is off',async()=>{
 const calls=setup();process.env.COLZO_SCOPED_PILOT_ACCESS='false';const res=await call(module,'POST',body);
 assert.equal(res.statusCode,status);assert.ok(res.body.token);assert.ok(calls.some(c=>c.href.includes('/storage/')));
});
