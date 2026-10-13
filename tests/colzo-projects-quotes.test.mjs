import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import handler,{validateColzoWork,PROJECT_STATUSES,QUOTE_STATUSES} from '../lib/colzo-workflow-handler.js';
const original={...process.env},savedFetch=globalThis.fetch;
const businessId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const userId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const projectId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const respond=(data,status=200)=>({ok:status<400,status,text:async()=>JSON.stringify(data),json:async()=>data});
const res=()=>({code:null,data:null,setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
const configure=mock=>{process.env.TENANCY_AUTH_ENABLED='true';process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='service-test';globalThis.fetch=async(url,options={})=>mock(String(url),options);};
const authenticated=url=>url.includes('/auth/v1/user')?respond({id:userId}):url.includes('/business_memberships?')?respond([{business_id:businessId,role:'owner'}]):null;
test('projects validate statuses, ranges, tenant assigned IDs and free-text limits',()=>{
 assert.deepEqual(PROJECT_STATUSES,['planned','active','paused','completed']);
 assert.ok(validateColzoWork('projects',{title:'Brand refresh',status:'active',progress:45,lead_id:12,client_name:'Example'}));
 assert.equal(validateColzoWork('projects',{title:'Brand refresh',business_id:businessId}),null);
 assert.equal(validateColzoWork('projects',{title:'Brand refresh',progress:101}),null);
 assert.equal(validateColzoWork('projects',{title:'Brand refresh',status:'deleted'}),null);
 assert.equal(validateColzoWork('projects',{title:'Brand refresh',notes:'x'.repeat(4001)}),null);
 assert.equal(validateColzoWork('projects',{title:'Brand refresh',id:projectId}),null);
 assert.equal(validateColzoWork('projects',{id:projectId},true),null);
 assert.equal(validateColzoWork('projects',{title:'Done',status:'completed'}).progress,100);
});
test('quotes cannot invent values, spoof tenant, or mark sent during draft creation without validation',()=>{
 assert.deepEqual(QUOTE_STATUSES,['draft','sent','accepted','declined']);
 assert.ok(validateColzoWork('quotes',{lead_id:12,title:'Website design',amount_gbp:34.99}));
 for(const invalid of [{lead_id:12,title:'Quote'}, {lead_id:12,title:'Quote',amount_gbp:-1},{lead_id:12,title:'Quote',amount_gbp:'20'},{lead_id:12,title:'Quote',amount_gbp:0.123},{lead_id:12,title:'Quote',amount_gbp:20,customer_email:'forged'}])assert.equal(validateColzoWork('quotes',invalid),null);
});
test('projects GET uses authenticated tenant scoping', {concurrency:false},async()=>{
 let got='';configure((url)=>{const auth=authenticated(url);if(auth)return auth;if(url.includes('/colzo_projects?')){got=url;return respond([]);}throw Error('Unexpected URL '+url);});
 const response=res();await handler({method:'GET',headers:{authorization:'Bearer example'},query:{kind:'projects'}},response);
 assert.equal(response.code,200);assert.deepEqual(response.data.items,[]);assert.ok(got.includes('business_id=eq.'+businessId));
});
test('projects cannot attach another tenant\'s enquiry', {concurrency:false},async()=>{
 let didInsert=false;
 configure((url,options)=>{const auth=authenticated(url);if(auth)return auth;if(url.includes('/leads?'))return respond([]);if(url.endsWith('/colzo_projects')){didInsert=true;return respond([]);}throw Error('Unexpected '+url);});
 const response=res();await handler({method:'POST',headers:{authorization:'Bearer example'},query:{kind:'projects'},body:{title:'Private project',lead_id:14,status:'active'}},response);
 assert.equal(response.code,404);assert.equal(didInsert,false);
});
test('unverified browser cannot read tenant projects or quotes', {concurrency:false},async()=>{
 configure(()=>{throw Error('Unexpected authentication call');});
 const response=res();await handler({method:'GET',headers:{},query:{kind:'quotes'}},response);
 assert.equal(response.code,401);
});
test('project updates have optimistic timestamp checks and cannot modify another tenant', {concurrency:false},async()=>{
 let uri='';configure((url,options)=>{const auth=authenticated(url);if(auth)return auth;if(url.includes('/colzo_projects?')&&options.method==='PATCH'){uri=url;return respond([{id:projectId,status:'completed',progress:100}]);}if(url.includes('/colzo_projects?'))return respond([{id:projectId,status:'active',progress:40,updated_at:'2026-10-12T12:00:00Z'}]);if(url.includes('business_audit_events'))return respond([]);throw Error(url);});
 const response=res();await handler({method:'PATCH',headers:{authorization:'Bearer example'},query:{kind:'projects'},body:{id:projectId,expected_updated_at:'2026-10-12T12:00:00Z',progress:100}},response);
 assert.equal(response.code,200);assert.ok(uri.includes('business_id=eq.'+businessId));assert.match(uri,/updated_at=eq\./);
});
test('DB migration creates tenant-safe records with RLS and never uses public grants',async()=>{
 const sql=await readFile(new URL('../supabase/migrations/20261012235500_add_colzo_projects_quotes.sql',import.meta.url),'utf8');
 for(const table of ['colzo_projects','colzo_quotes']){
 assert.match(sql,new RegExp('create table if not exists public\\.'+table));assert.match(sql,new RegExp('alter table public\\.'+table+' enable row level security'));
 assert.match(sql,new RegExp('revoke all on public\\.'+table+' from public,anon,authenticated'));}
 assert.match(sql,/foreign key\(lead_id,business_id\)/);
 assert.doesNotMatch(sql,/security definer|grant all to authenticated|truncate|delete from public/i);
});
test('frontend has functioning four tab UI, project modal, quote flow, filters and no invented revenue',async()=>{
 const [html,js,css,ops]=await Promise.all(['index.html','assets/colzo-workspace.js','assets/colzo-interface.css','api/operations.js'].map(x=>readFile(new URL('../'+x,import.meta.url),'utf8')));
 for(const name of ['colzoProjectsView','colzoLeadDetailView','colzoProjectsList','colzoEnquiriesList','colzoWorkspaceForm','colzoLiveTrend'])assert.ok(html.includes(`id="${name}"`));
 for(const label of ['All','New','In Progress','Won'])assert.ok(html.includes(`data-colzo-enquiry-filter="${label}"`));
 assert.match(js,/\/api\/colzo\/projects/);assert.match(js,/\/api\/colzo\/quotes/);
 assert.match(js,/new FormData\(form\)/);assert.match(js,/await request\(url,/);
 assert.match(js,/Estimated, not received revenue/);assert.match(js,/Recorded enquiries, not revenue/);
 assert.match(js,/showView\('bookings'\)/);assert.match(js,/mark as in progress|Mark as in progress/);
 assert.match(css,/#c8ff2e/);assert.match(ops,/"colzo-work": colzoWorkHandler/);
});
test.after(()=>{globalThis.fetch=savedFetch;for(const k of Object.keys(process.env))if(!(k in original))delete process.env[k];Object.assign(process.env,original);});
