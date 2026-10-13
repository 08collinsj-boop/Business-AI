import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import workHandler from '../lib/colzo-workflow-handler.js';
import clientsHandler from '../lib/colzo-clients-handler.js';

const originalEnv={...process.env}, originalFetch=globalThis.fetch;
const businessA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const businessB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const userA='11111111-1111-4111-8111-111111111111';
const userB='22222222-2222-4222-8222-222222222222';
const projectId='33333333-3333-4333-8333-333333333333';
const quoteId='44444444-4444-4444-8444-444444444444';
const clientId='55555555-5555-4555-8555-555555555555';
const t0='2026-10-12T12:00:00Z';
const state={colzo_projects:[],colzo_quotes:[],colzo_clients:[],business_audit_events:[]};
let ticks=0;
const response=(data,code=200)=>({status:code,ok:code>=200&&code<400,text:async()=>JSON.stringify(data),json:async()=>data});
const res=()=>({code:null,data:null,headers:{},setHeader(k,v){this.headers[k]=v},status(v){this.code=v;return this},json(v){this.data=v;return this}});
const which=token=>token==='userB'?userB:userA;
const businessFor=userId=>userId===userB?businessB:businessA;
function fakeStorage(url,init={}){
 const parsed=new URL(url);
 const table=parsed.pathname.split('/').at(-1);
 const params=parsed.searchParams;
 if(table==='user'&&parsed.pathname.endsWith('/auth/v1/user')){
  const token=String(init.headers?.Authorization||'').replace('Bearer ','');
  if(!['userA','userB'].includes(token))return response({error:'Invalid'},401);
  return response({id:which(token)});
 }
 if(table==='business_memberships'){
  const userId=String(params.get('user_id')||'').replace(/^eq\./,'');
  return response([{business_id:businessFor(userId),role:'owner'}]);
 }
 if(table==='leads'){
  const id=String(params.get('id')||'').replace(/^eq\./,'');
  const b=String(params.get('business_id')||'').replace(/^eq\./,'');
  return response((id==='101'&&b===businessA||id==='202'&&b===businessB)?[{id:Number(id)}]:[]);
 }
 if(table==='business_audit_events'){
  state.business_audit_events.push(JSON.parse(init.body));return response([],201);
 }
 if(!Object.hasOwn(state,table))throw Error('Unexpected storage table '+table);
 const rows=state[table];
 const scope=row=>{
  for(const key of ['business_id','id','lead_id','updated_at']){
   const value=params.get(key);if(value?.startsWith('eq.')&&String(row[key]??'')!==value.slice(3))return false;
  }
  return true;
 };
 if(!init.method||init.method==='GET')return response(rows.filter(scope).map(row=>({...row})));
 const body=JSON.parse(init.body);
 if(init.method==='POST'){
  const id=table==='colzo_projects'?projectId:table==='colzo_quotes'?quoteId:clientId;
  const record={id,...body,status:table==='colzo_clients'?undefined:body.status||(table==='colzo_projects'?'planned':'draft'),progress:table==='colzo_projects'?body.progress??0:undefined,created_at:t0,updated_at:t0};
  rows.push(record);return response([{...record}],201);
 }
 if(init.method==='PATCH'){
  const matched=rows.filter(scope);
  for(const row of matched)Object.assign(row,body,{updated_at:new Date(Date.UTC(2026,9,13,12,0,++ticks)).toISOString()});
  return response(matched.map(row=>({...row})));
 }
 throw Error('Unexpected operation '+init.method);
}
const request=async(handler,method,token,kind,body)=>{
 const reply=res();await handler({method,headers:{authorization:`Bearer ${token}`},query:kind?{kind}:undefined,body},reply);return reply;
};
test('Projects/Clients/Quotes full mocked CRUD: owner permissions, cross-tenant isolation, optimistic conflicts, and quote lifecycle', {concurrency:false},async()=>{
 process.env.TENANCY_AUTH_ENABLED='true';
 process.env.SUPABASE_URL='https://mock.supabase.invalid';
 process.env.SUPABASE_SERVICE_ROLE_KEY='mock-service-role-not-real';
 globalThis.fetch=async(url,init)=>fakeStorage(String(url),init);
 // Project creation: linked leads may only come from this business.
 let reply=await request(workHandler,'POST','userA','projects',{title:'Site refurbishment',lead_id:202,status:'active',progress:5});
 assert.equal(reply.code,404);assert.equal(state.colzo_projects.length,0);
 reply=await request(workHandler,'POST','userA','projects',{title:'Site refurbishment',lead_id:101,status:'active',progress:35,client_name:'Client A'});
 assert.equal(reply.code,201);assert.equal(reply.data.item.business_id,businessA);assert.equal(reply.data.item.progress,35);
 // Owner B cannot read or alter owner A's records, even with known UUID.
 reply=await request(workHandler,'GET','userB','projects');assert.equal(reply.code,200);assert.deepEqual(reply.data.items,[]);
 reply=await request(workHandler,'PATCH','userB','projects',{id:projectId,expected_updated_at:t0,progress:100});assert.equal(reply.code,404);
 // A must present the version they originally loaded. A stale form conflicts.
 reply=await request(workHandler,'PATCH','userA','projects',{id:projectId,progress:100});assert.equal(reply.code,400);
 reply=await request(workHandler,'PATCH','userA','projects',{id:projectId,expected_updated_at:'2026-10-10T00:00:00Z',progress:100});assert.equal(reply.code,409);
 reply=await request(workHandler,'PATCH','userA','projects',{id:projectId,expected_updated_at:t0,progress:100});
 assert.equal(reply.code,200);assert.equal(reply.data.item.status,'completed');assert.equal(reply.data.item.progress,100);
 const projectVersion=reply.data.item.updated_at;
 reply=await request(workHandler,'PATCH','userA','projects',{id:projectId,expected_updated_at:projectVersion,status:'active'});
 assert.equal(reply.code,409);assert.equal(state.colzo_projects[0].status,'completed');
 reply=await request(workHandler,'PATCH','userA','projects',{id:projectId,expected_updated_at:projectVersion,status:'active',progress:20});
 assert.equal(reply.code,200);assert.equal(reply.data.item.progress,20);
 // A cannot construct accepted or sent quotes directly without approval.
 reply=await request(workHandler,'POST','userA','quotes',{lead_id:101,title:'Electrical works',amount_gbp:249.99,status:'accepted'});
 assert.equal(reply.code,400);assert.equal(state.colzo_quotes.length,0);
 reply=await request(workHandler,'POST','userA','quotes',{lead_id:101,title:'Electrical works',amount_gbp:249.99,status:'sent'});
 assert.equal(reply.code,400);
 reply=await request(workHandler,'POST','userA','quotes',{lead_id:202,title:'Cross-company works',amount_gbp:100});assert.equal(reply.code,404);
 reply=await request(workHandler,'POST','userA','quotes',{lead_id:101,title:'Electrical works',amount_gbp:249.99});
 assert.equal(reply.code,201);assert.equal(reply.data.item.status,'draft');
 reply=await request(workHandler,'GET','userB','quotes');assert.equal(reply.code,200);assert.deepEqual(reply.data.items,[]);
 reply=await request(workHandler,'PATCH','userA','quotes',{id:quoteId,expected_updated_at:t0,status:'accepted'});assert.equal(reply.code,400);
 reply=await request(workHandler,'PATCH','userA','quotes',{id:quoteId,expected_updated_at:t0,status:'sent',amount_gbp:1});assert.equal(reply.code,400);
 reply=await request(workHandler,'PATCH','userA','quotes',{id:quoteId,expected_updated_at:t0,status:'sent'});assert.equal(reply.code,200);
 const sentVersion=reply.data.item.updated_at;
 reply=await request(workHandler,'PATCH','userA','quotes',{id:quoteId,expected_updated_at:t0,status:'accepted'});assert.equal(reply.code,409);
 reply=await request(workHandler,'PATCH','userA','quotes',{id:quoteId,expected_updated_at:sentVersion,amount_gbp:1});assert.equal(reply.code,409);
 reply=await request(workHandler,'PATCH','userA','quotes',{id:quoteId,expected_updated_at:sentVersion,notes:'Changed terms'});assert.equal(reply.code,409);
 reply=await request(workHandler,'PATCH','userA','quotes',{id:quoteId,expected_updated_at:sentVersion,status:'accepted'});assert.equal(reply.code,200);
 // Clients are business-scoped and edits must provide an exact previous version.
 reply=await request(clientsHandler,'POST','userA',null,{full_name:'Client Smith',email:'client@example.com'});
 assert.equal(reply.code,201);assert.equal(reply.data.client.business_id,businessA);
 reply=await request(clientsHandler,'GET','userB');assert.equal(reply.code,200);assert.deepEqual(reply.data.clients,[]);
 reply=await request(clientsHandler,'PATCH','userB',null,{id:clientId,expected_updated_at:t0,phone:'01234567890'});assert.equal(reply.code,409);
 reply=await request(clientsHandler,'PATCH','userA',null,{id:clientId,phone:'01234567890'});assert.equal(reply.code,400);
 reply=await request(clientsHandler,'PATCH','userA',null,{id:clientId,expected_updated_at:t0,phone:'01234567890'});
 assert.equal(reply.code,200);const current=reply.data.client.updated_at;
 reply=await request(clientsHandler,'PATCH','userA',null,{id:clientId,expected_updated_at:t0,email:'wrong@example.com'});assert.equal(reply.code,409);
 reply=await request(clientsHandler,'PATCH','userA',null,{id:clientId,expected_updated_at:current,email:'correct@example.com'});assert.equal(reply.code,200);
 assert.equal(reply.data.client.email,'correct@example.com');
 assert.ok(state.business_audit_events.length>=6);
 for(const audit of state.business_audit_events)assert.doesNotMatch(JSON.stringify(audit.metadata),/customer|email|description|notes/i);
 assert.ok(state.colzo_projects.every(x=>x.business_id===businessA));
 assert.ok(state.colzo_quotes.every(x=>x.business_id===businessA));
 assert.ok(state.colzo_clients.every(x=>x.business_id===businessA));
});
test('server and owner UI enforce optimistic versioning for projects, quotes and clients',async()=>{
 const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
 const [work,clients,ui]=await Promise.all(['lib/colzo-workflow-handler.js','lib/colzo-clients-handler.js','assets/colzo-workspace.js'].map(read));
 assert.match(work,/if\(patch&&!validVersion\(expectedVersion\)\)/);
 assert.match(work,/old\.updated_at!==expectedVersion/);
 assert.match(work,/updated_at=eq\.\$\{encodeURIComponent\(old\.updated_at\)\}/);
 assert.match(clients,/updated_at=eq\.\$\{encodeURIComponent\(version\)\}/);
 assert.match(work,/Date\.parse\(value\)\+1/);
 assert.match(clients,/Date\.parse\(value\)\+1/);
 assert.match(ui,/state\.modalVersion=existing\?\.updated_at\|\|null/);
 assert.match(ui,/expected_updated_at:state\.modalVersion/);
 assert.match(ui,/expected_updated_at:state\.quoteRows\.find/);
 assert.match(work,/body\.status!==undefined&&body\.status!=='draft'/);
 assert.match(work,/This sent or final quote is locked/);
});
test.after(()=>{
 globalThis.fetch=originalFetch;
 for(const k of Object.keys(process.env))if(!(k in originalEnv))delete process.env[k];
 Object.assign(process.env,originalEnv);
});
