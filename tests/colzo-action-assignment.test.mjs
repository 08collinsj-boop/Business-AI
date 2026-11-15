import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Fictional fixtures only. No hosted database, OAuth, CI secrets or accounts.
const B='11111111-1111-4111-8111-111111111111', OTHER='22222222-2222-4222-8222-222222222222';
const OWNER='33333333-3333-4333-8333-333333333333', STAFF='44444444-4444-4444-8444-444444444444', OTHER_STAFF='55555555-5555-4555-8555-555555555555';
const stamp='2026-11-12T12:00:00.000000+00:00';
const row={id:17,business_id:B,title:'Check site wiring',status:'pending',assignee_user_id:STAFF,updated_at:stamp,lead_id:null,booking_id:null,action_type:'custom'};
const reply=(data,status=200)=>new Response(status===204?null:JSON.stringify(data),{status});
const res=()=>({statusCode:0,status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;},setHeader(){return this;}});
const setting={SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fake-service-only',TENANCY_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'false',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-connected-workspace-20261112',COLZO_TEAM_ASSIGNMENTS_ENABLED:'true'};
async function scenario({role='owner',userId=OWNER,method='GET',query={},body,enabled=true,stored=row,allRows=[row],assigneeFound=true,runtime={},patchResultAssignee=undefined}={}){
 const values={...setting,COLZO_TEAM_ASSIGNMENTS_ENABLED:enabled?'true':'false',...runtime};
 const old=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]])),fetchBefore=globalThis.fetch;
 Object.assign(process.env,values);const calls=[];
 globalThis.fetch=async(input,opts={})=>{
   const url=new URL(String(input)),verb=opts.method||'GET';calls.push({url,method:verb,body:opts.body?JSON.parse(opts.body):null});
   if(url.pathname==='/auth/v1/user')return reply({id:userId});
   if(url.pathname==='/rest/v1/business_memberships'&&url.searchParams.has('user_id')&&!url.searchParams.has('business_id'))return reply([{business_id:B,role}]);
   if(url.pathname==='/rest/v1/business_memberships'&&url.searchParams.has('business_id'))return reply(assigneeFound?[{business_id:B,user_id:OTHER_STAFF,role:'member'}]:[]);
   if(url.pathname==='/rest/v1/actions'&&verb==='GET')return reply(url.searchParams.has('id')?[stored]:allRows);
   if(url.pathname==='/rest/v1/actions'&&verb==='POST')return reply([{...row,assignee_user_id:null,...(opts.body?JSON.parse(opts.body):{})}]);
   if(url.pathname==='/rest/v1/actions'&&verb==='PATCH')return reply([{...stored,...(opts.body?JSON.parse(opts.body):{}),...(patchResultAssignee===undefined?{}:{assignee_user_id:patchResultAssignee})}]);
   if(url.pathname==='/rest/v1/business_audit_events')return reply(null,204);
   throw Error('Unexpected synthetic endpoint '+url.pathname);
 };
 try{const {default:handler}=await import('../api/actions.js?assignment-test='+Math.random());const response=res();await handler({method,query,body,headers:{authorization:'Bearer fictional-session'}},response);return{response,calls};}
 finally{globalThis.fetch=fetchBefore;for(const[k,v]of Object.entries(old))v===undefined?delete process.env[k]:process.env[k]=v;}
}

test('assignments disabled: My Work fails closed before an actions database request',async()=>{
 const{response,calls}=await scenario({enabled:false,query:{scope:'mine'}});
 assert.equal(response.statusCode,503);
 assert.equal(calls.some(c=>c.url.pathname==='/rest/v1/actions'),false);
});
test('My Work uses the authenticated identity only, never caller-supplied staff ID',async()=>{
 const{response,calls}=await scenario({role:'member',userId:STAFF,query:{scope:'mine',assignee_user_id:OTHER_STAFF}});
 assert.equal(response.statusCode,200);
 const q=calls.find(c=>c.url.pathname==='/rest/v1/actions').url.searchParams;
 assert.equal(q.get('business_id'),'eq.'+B);
 assert.equal(q.get('assignee_user_id'),'eq.'+STAFF);
 assert.equal(response.body.length,1);
});
test('My Work denies a contradictory foreign or another-assignee service-role response',async()=>{
 for(const bad of [{...row,business_id:OTHER},{...row,assignee_user_id:OTHER_STAFF}]){
  const{response}=await scenario({userId:STAFF,role:'member',query:{scope:'mine'},allRows:[bad]});
  assert.equal(response.statusCode,500);
  assert.doesNotMatch(JSON.stringify(response.body),/55555555|22222222/);
 }
});
test('unknown My Work filter fails before actions read',async()=>{
 const{response,calls}=await scenario({query:{scope:'another'}});
 assert.equal(response.statusCode,400);
 assert.equal(calls.some(c=>c.url.pathname==='/rest/v1/actions'),false);
});
test('member-created team action is assigned only to their own verified identity',async()=>{
 const{response,calls}=await scenario({role:'member',userId:STAFF,method:'POST',body:{title:'Visit the customer'}});
 assert.equal(response.statusCode,201);
 const post=calls.find(c=>c.url.pathname==='/rest/v1/actions'&&c.method==='POST');
 assert.equal(post.body.assignee_user_id,STAFF);
 assert.equal(post.body.business_id,B);
});
test('staff cannot assign another person or clear their self-assignment',async()=>{
 for(const assignee of [OTHER_STAFF,null]){
  const{response,calls}=await scenario({role:'member',userId:STAFF,method:'POST',body:{title:'Visit',assignee_user_id:assignee}});
  assert.equal(response.statusCode,403);
  assert.equal(calls.some(c=>c.url.pathname==='/rest/v1/actions'),false);
 }
});
test('manager can assign verified same-company member, but not a foreign member',async()=>{
 for(const assigneeFound of [true,false]){
  const{response,calls}=await scenario({role:'admin',method:'POST',body:{title:'Follow-up',assignee_user_id:OTHER_STAFF},assigneeFound});
  assert.equal(response.statusCode,assigneeFound?201:403);
  const membership=calls.find(c=>c.url.pathname==='/rest/v1/business_memberships'&&c.url.searchParams.has('business_id'));
  assert.equal(membership.url.searchParams.get('user_id'),'eq.'+OTHER_STAFF);
  assert.equal(membership.url.searchParams.get('business_id'),'eq.'+B);
  assert.equal(calls.filter(c=>c.url.pathname==='/rest/v1/actions'&&c.method==='POST').length,assigneeFound?1:0);
 }
});
test('assigned member may update only their own task status, never reassign or edit title',async()=>{
 const approved=await scenario({role:'member',userId:STAFF,method:'PATCH',body:{id:17,status:'completed',expected_updated_at:stamp}});
 assert.equal(approved.response.statusCode,200);
 const patch=approved.calls.find(c=>c.method==='PATCH'&&c.url.pathname==='/rest/v1/actions');
 assert.equal(patch.url.searchParams.get('assignee_user_id'),'eq.'+STAFF);
 for(const body of [{id:17,title:'Altered',expected_updated_at:stamp},{id:17,assignee_user_id:OTHER_STAFF,expected_updated_at:stamp}]){
  const{response,calls}=await scenario({role:'member',userId:STAFF,method:'PATCH',body});
  assert.equal(response.statusCode,403);
  assert.equal(calls.some(c=>c.method==='PATCH'&&c.url.pathname==='/rest/v1/actions'),false);
 }
});
test('member cannot update unassigned or another employee task',async()=>{
 for(const assignee_user_id of [null,OTHER_STAFF]){
  const{response,calls}=await scenario({role:'member',userId:STAFF,method:'PATCH',body:{id:17,status:'completed',expected_updated_at:stamp},stored:{...row,assignee_user_id}});
  assert.equal(response.statusCode,403);
  assert.equal(calls.some(c=>c.method==='PATCH'&&c.url.pathname==='/rest/v1/actions'),false);
 }
});

test('assignment flag cannot enable on Production or unrelated Preview branches',async()=>{
 for(const runtime of [
  {VERCEL_ENV:'production'},
  {VERCEL_GIT_COMMIT_REF:'main'},
  {SUPABASE_URL:'https://example.supabase.co'}
 ]){
  const{response,calls}=await scenario({query:{scope:'mine'},runtime});
  assert.equal(response.statusCode,503);
  assert.equal(calls.some(c=>c.url.pathname==='/rest/v1/actions'),false);
 }
});
test('disabled assignments preserve ordinary company action writes, but never accept an uninstalled assignee column',async()=>{
 const good=await scenario({enabled:false,method:'POST',body:{title:'Original team task'}});
 assert.equal(good.response.statusCode,201);
 const post=good.calls.find(c=>c.url.pathname==='/rest/v1/actions'&&c.method==='POST');
 assert.equal(Object.hasOwn(post.body,'assignee_user_id'),false);
 const rejected=await scenario({enabled:false,method:'POST',body:{title:'Attempt',assignee_user_id:STAFF}});
 assert.equal(rejected.response.statusCode,400);
 assert.equal(rejected.calls.some(c=>c.url.pathname==='/rest/v1/actions'),false);
});
test('a stale member task status write retains the original version compare-and-swap filter',async()=>{
 const{response,calls}=await scenario({role:'member',userId:STAFF,method:'PATCH',body:{id:17,status:'completed',expected_updated_at:stamp}});
 assert.equal(response.statusCode,200);
 const patch=calls.find(c=>c.method==='PATCH'&&c.url.pathname==='/rest/v1/actions');
 assert.equal(patch.url.searchParams.get('updated_at'),'eq.'+stamp);
});
test('staged SQL is not a live migration, and delegates assignee membership to a business-bound foreign key',()=>{
 const sql=readFileSync(new URL('../docs/staged-sql/COLZO_ACTION_ASSIGNMENT_NOT_APPLIED.sql',import.meta.url),'utf8');
 assert.match(sql,/STAGED DESIGN ONLY/);
 assert.match(sql,/foreign key\s*\(business_id, assignee_user_id\)/i);
 assert.match(sql,/references public\.business_memberships\s*\(business_id, user_id\)/i);
 assert.match(sql,/on delete set null\s*\(assignee_user_id\)/i);
 assert.doesNotMatch(sql,/grant\s+(?:select|insert|update|delete|all)\s+on/i);
});

test('member task write refuses a contradictory assignee in the server-confirmed result before audit',async()=>{
 const{response,calls}=await scenario({role:'member',userId:STAFF,method:'PATCH',body:{id:17,status:'completed',expected_updated_at:stamp},patchResultAssignee:OTHER_STAFF});
 assert.equal(response.statusCode,500);
 assert.equal(calls.filter(c=>c.url.pathname==='/rest/v1/business_audit_events').length,0);
 assert.doesNotMatch(JSON.stringify(response.body),/55555555/);
});
