import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const originalEnv={...process.env},originalFetch=globalThis.fetch;
const business='10000000-0000-4000-8000-000000000001',foreign='10000000-0000-4000-8000-000000000002';
Object.assign(process.env,{COLZO_SCOPED_PILOT_ACCESS:'true',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-scoped-pilot-access-20261023',TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic',PILOT_FREE_STARTER_MARKETING:'false'});
const handler=(await import('../api/business-onboarding.js?pilot-status')).default;
const response=()=>({statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}});
function fixture(rows,{members=[{business_id:business,role:'owner'}],auth=true,broken=false}={}){
 const calls=[];
 globalThis.fetch=async(url,options={})=>{
  const href=String(url);calls.push({href,method:options.method||'GET'});
  const reply=(data,status=200)=>({ok:status<400,status,text:async()=>JSON.stringify(data),json:async()=>data});
  if(href.endsWith('/auth/v1/user'))return reply({id:'synthetic-owner'},auth?200:401);
  if(href.includes('/business_memberships?'))return reply(members);
  if(href.includes('/colzo_pilot_access?'))return reply(rows,broken?503:200);
  if(href.includes('/business_public_routes?'))return reply([{route_value:'synthetic-business'}]);
  throw Error('Unexpected status request');
 };return calls;
}
function grant(days,status='active'){const start=Date.now()-days*86400000;return {business_id:business,status,activated_at:new Date(start).toISOString(),expires_at:new Date(start+1209600000).toISOString(),granted_by:'private-operator-evidence'};}
async function get(){const out=response();await handler({method:'GET',headers:{authorization:'Bearer synthetic'},query:{business_id:foreign}},out);return out;}
test('expired, revoked, pending and missing pilots receive their own recovery status without protected route reads',async()=>{
 for(const [row,status] of [[grant(15),'pilot_expired'],[grant(1,'revoked'),'pilot_revoked'],[grant(-1),'pilot_pending'],[null,'pilot_required']]){
  const calls=fixture(row?[row]:[]),out=await get();
  assert.equal(out.statusCode,200);assert.equal(out.body.pilot_access?.status,status);assert.equal(out.body.pilot_access.active,false);
  assert.equal(out.headers['Cache-Control'],'no-store');assert.equal(out.body.public_slug,undefined);
  assert.ok(calls.every(c=>c.method==='GET'&&!c.href.includes('/business_public_routes?')));
  assert.ok(calls.filter(c=>c.href.includes('/colzo_pilot_access?')).every(c=>c.href.includes('business_id=eq.'+business)&&!c.href.includes(foreign)));
  assert.ok(!JSON.stringify(out.body).includes('private-operator-evidence'));
 }
});
test('active pilot status carries the exact expiry and preserves the normal onboarding route',async()=>{
 const row=grant(1);fixture([row]);const out=await get();
 assert.equal(out.statusCode,200);assert.equal(out.body.public_slug,'synthetic-business');
 assert.deepEqual(out.body.pilot_access,{active:true,status:'pilot',expires_at:row.expires_at});
});
test('status never selects a first membership or treats an unavailable grant as active',async()=>{
 fixture([],{members:[{business_id:business,role:'owner'},{business_id:foreign,role:'owner'}]});assert.equal((await get()).statusCode,403);
 fixture([],{broken:true});assert.equal((await get()).statusCode,503);
 fixture([{...grant(1),business_id:foreign}]);assert.equal((await get()).body.pilot_access?.active,false);
 fixture([grant(1),grant(1)]);assert.equal((await get()).body.pilot_access?.active,false);
 fixture([],{auth:false});assert.equal((await get()).statusCode,401);
});
test('identity without membership receives approval guidance and cannot start business setup',async()=>{
 fixture([],{members:[]});const out=await get();
 assert.equal(out.body.needs_business,true);assert.equal(out.body.pilot_access?.status,'pilot_required');
});
test('login bootstrap explains pilot expiry before opening a protected workspace and preserves the session',async()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const start=html.indexOf('let colzoLoginFailure=null;'),end=html.indexOf('let readyAuthUserId=null;',start);
 const calls=[],views=[];let signedOut=0;
 const context={frontendAuthEnabled:true,setAppLoading(){},setAuthView:(...args)=>views.push(args),loadLegalState:async()=>({}),invitationIdFromLocation:()=>null,api:async path=>{calls.push(path);if(path==='/api/business-onboarding')return {needs_business:false,pilot_access:{active:false,status:'pilot_expired',expires_at:'2026-10-20T12:00:00Z'}};throw Error('Protected workspace should not be reached');},clearPrivateState(){},applyBusinessContext(){},authenticatedBusinessRole:'owner',window:{location:{pathname:'/'}},supabaseClient:{auth:{signOut(){signedOut++;}}}};
 vm.runInNewContext(html.slice(start,end)+'globalThis.run=handleSession;',context);
 await context.run({user:{id:'synthetic-owner'}});
 assert.equal(calls.length,1);assert.equal(signedOut,0);assert.equal(views.at(-1)[0],'auth-required');
 assert.match(views.at(-1)[1],/14.day.*ended|pilot.*ended/i);assert.match(views.at(-1)[1],/recovery/i);
});
test.after(()=>{globalThis.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];Object.assign(process.env,originalEnv);});
