import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {entitlementFromAccount} from '../lib/billing.js';
const BUSINESS='10000000-0000-4000-8000-000000000001';
const OTHER='10000000-0000-4000-8000-000000000002';
const USER='20000000-0000-4000-8000-000000000001';
const roles=['owner','admin','member'];
const rows=roles.map((role,i)=>({business_id:BUSINESS,user_id:`20000000-0000-4000-8000-00000000000${i+1}`,role}));
const response=()=>({statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}});
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status});
async function run(role,{bodyRows=rows,view='summary',authenticated=true}={}){
 const env={SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-only-test-key',TENANCY_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'false',VERCEL_ENV:'preview'};
 const before=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));Object.assign(process.env,env);
 const old=globalThis.fetch;const requests=[];
 globalThis.fetch=async input=>{
  const url=new URL(String(input));requests.push(url);
  if(url.pathname==='/auth/v1/user')return authenticated?reply({id:USER,email:'person@example.invalid'}):reply({},401);
  if(url.pathname==='/rest/v1/business_memberships'&&url.searchParams.has('user_id'))return reply([{business_id:BUSINESS,role}]);
  if(url.pathname==='/rest/v1/business_memberships'&&url.searchParams.has('business_id'))return reply(bodyRows);
  if(url.pathname==='/rest/v1/business_team_invitations')return reply([{business_id:BUSINESS,id:OTHER,invited_email:'do-not-show@example.invalid'}]);
  throw Error('Unexpected synthetic request: '+url.pathname);
 };
 try{const {default:handler}=await import('../lib/team-handler.js?company-workspace='+Math.random());const res=response();await handler({method:'GET',query:{view},headers:{authorization:'Bearer fictional-jwt'}},res);return{res,requests};}
 finally{globalThis.fetch=old;for(const[k,v]of Object.entries(before))v===undefined?delete process.env[k]:process.env[k]=v;}
}

test('staff can read verified company roster counts, never other staff identity or invitation details',async()=>{
 const{res,requests}=await run('member');assert.equal(res.statusCode,200);
 assert.deepEqual(res.body,{role:'member',memberCount:3,roles:{owner:1,admin:1,member:1}});
 assert.doesNotMatch(JSON.stringify(res.body),/20000000|do-not-show|10000000/);
 assert.equal(requests.filter(u=>u.pathname==='/rest/v1/business_team_invitations').length,0);
 const req=requests.find(u=>u.pathname==='/rest/v1/business_memberships'&&u.searchParams.has('business_id'));
 assert.equal(req.searchParams.get('business_id'),'eq.'+BUSINESS);
 assert.match(req.searchParams.get('select'),/business_id,role/);
});
test('admins and owners get team summaries using their verified role',async()=>{
 for(const role of ['owner','admin']){const{res}=await run(role);assert.equal(res.statusCode,200);assert.equal(res.body.role,role);}
});
test('non-owner full team access is denied without querying staff or invitations',async()=>{
 for(const role of ['admin','member']){const{res,requests}=await run(role,{view:'full'});assert.equal(res.statusCode,403);assert.equal(requests.some(u=>u.pathname==='/rest/v1/business_team_invitations'),false);}
});
test('summary fails closed if service-role response contains a foreign tenant',async()=>{
 const{res}=await run('member',{bodyRows:[rows[0],{...rows[1],business_id:OTHER}]});assert.equal(res.statusCode,503);
 assert.doesNotMatch(JSON.stringify(res.body),/10000000|20000000|do-not-show/);
});
test('summary fails closed for null, missing provenance or invalid role',async()=>{
 for(const bodyRows of [null,[{role:'owner'}],[{...rows[0],role:'superadmin'}]]){
  const{res}=await run('member',{bodyRows});assert.equal(res.statusCode,503);
 }
});
test('workspace summary requires a valid authenticated identity',async()=>{
 const{res}=await run('member',{authenticated:false});assert.equal(res.statusCode,401);
});
test('Business team pricing supports 25 Colzo staff without changing Starter, Pro or scoped pilot',()=>{
 const previous=Object.fromEntries(['BILLING_ENABLED','COLZO_SCOPED_PILOT_ACCESS','PILOT_FREE_STARTER_MARKETING'].map(k=>[k,process.env[k]]));
 Object.assign(process.env,{BILLING_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'false',PILOT_FREE_STARTER_MARKETING:'false'});
 try{for(const [plan,staffAllowance] of [['starter',2],['pro',5],['business',25]]){
  const result=entitlementFromAccount({plan,status:'active',current_period_ends_at:'2028-01-01T00:00:00.000Z'},0,new Date('2026-11-12T00:00:00.000Z'));
  assert.equal(result.staffAllowance,staffAllowance,plan);
 }}finally{for(const[k,v]of Object.entries(previous))v===undefined?delete process.env[k]:process.env[k]=v;}
});

test('native company workspace is accessible to each role without granting owner invitation or ClickUp write controls',()=>{
 const js=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../assets/colzo-connected-workspace.css',import.meta.url),'utf8');
 assert.match(js,/function companyWorkspaceScreen\(\)/);
 assert.match(js,/api\('\/api\/team\?view=summary'\)/);
 assert.match(js,/company:companyWorkspaceScreen/);
 assert.match(js,/screen==='company'\)loadCompanyWorkspace/);
 assert.match(js,/data-cn-screen="actions"/);
 assert.match(js,/data-cn-screen="clickup"/);
 assert.match(js,/data-cn-setting="team"/);
 assert.match(js,/state\.teamSummary=null/);
 assert.match(css,/\.cn-company-workspace/);
});

test('rendered company workspace gives all staff working routes but only verified owners the team-control link',()=>{
 const js=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
 const start=js.indexOf(' const companyToolIcon=(name)=>');
 const end=js.indexOf(' // ClickUp is a real external workspace:',start);
 assert.ok(start>=0&&end>start);
 const render=role=>{
  const state={teamSummary:{role,memberCount:20,roles:{owner:1,admin:3,member:16}},companyLoading:false,companyError:''};
  const context={state,safe:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')};
  vm.createContext(context);vm.runInContext(js.slice(start,end)+'\nthis.render=companyWorkspaceScreen;',context);
  return context.render();
 };
 for(const role of ['owner','admin','member']){
  const html=render(role);
  assert.match(html,/20/);
  for(const action of ['myWork','actions','projects','bookings','clickup'])assert.match(html,new RegExp('data-cn-screen="'+action+'"'));
  assert.equal(html.includes('data-cn-setting="team"'),role==='owner');
 }
});

test('staff cannot see an enabled team invitation form without a verified owner-only team read',()=>{
 const js=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
 assert.match(js,/state\.teamData&&!state\.teamError&&!state\.teamLoading\?settingPanel\('Invite a team member'/);
 assert.match(js,/Only a verified business owner can manage invitations/);
});
test('Preview HTML references revisioned company workspace UI and does not rely on an old cached native app',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/\/assets\/colzo-native\.js\?v=20261113-qa-visual-v1/);
 assert.match(html,/\/assets\/colzo-connected-workspace\.css\?v=20261113-qa-visual-v1/);
});
