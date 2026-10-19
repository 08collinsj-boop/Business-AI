import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../lib/colzo-records-handler.js';

const BIZ_A='11111111-1111-4111-8111-111111111111';
const BIZ_B='22222222-2222-4222-8222-222222222222';
const USER_A='33333333-3333-4333-8333-333333333333';
const USER_B='44444444-4444-4444-8444-444444444444';
const IDS={clients:'55555555-5555-4555-8555-555555555555',projects:'66666666-6666-4666-8666-666666666666',quotes:'77777777-7777-4777-8777-777777777777'};
const VERSION='2026-10-19T09:00:00.000Z';
const tenantRecords={
 clients:[{id:IDS.clients,business_id:BIZ_A,full_name:'Fixture Client A',updated_at:VERSION},{id:'88888888-8888-4888-8888-888888888888',business_id:BIZ_B,full_name:'Fixture Client B',updated_at:VERSION}],
 projects:[{id:IDS.projects,business_id:BIZ_A,title:'Fixture Project A',client_name:'Synthetic',status:'planned',updated_at:VERSION},{id:'99999999-9999-4999-8999-999999999999',business_id:BIZ_B,title:'Fixture Project B',client_name:'Synthetic',status:'active',updated_at:VERSION}],
 quotes:[{id:IDS.quotes,business_id:BIZ_A,title:'Fixture Quote A',lead_id:21,amount_gbp:5,status:'draft',updated_at:VERSION},{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',business_id:BIZ_B,title:'Fixture Quote B',lead_id:22,amount_gbp:10,status:'draft',updated_at:VERSION}]
};
const resources=Object.keys(tenantRecords);
const templates={clients:{full_name:'Fixture New Client'},projects:{title:'Fixture New Project',client_name:'Synthetic Client'},quotes:{lead_id:21,title:'Fixture New Quote',amount_gbp:5}};
const reply=(status,body)=>({ok:status>=200&&status<300,status,async json(){return body},async text(){return body==null?'':JSON.stringify(body)}});
async function setup(t,{token='token-a',roleA='owner',roleB='owner',records=tenantRecords}={}){
 const prevFetch=globalThis.fetch;
 const envs=['TENANCY_AUTH_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
 const previous=envs.map(x=>process.env[x]);
 Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://supabase-fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-secret-only'});
 const calls=[];
 globalThis.fetch=async(input,options={})=>{
  const url=new URL(input);
  const method=options.method||'GET';
  const params=url.searchParams;
  calls.push({path:url.pathname,method,params,body:options.body?JSON.parse(options.body):null});
  const session=options.headers?.Authorization?.includes('token-b')?'B':'A';
  const business=session==='A'?BIZ_A:BIZ_B;
  if(url.pathname==='/auth/v1/user')return reply(200,{id:session==='A'?USER_A:USER_B});
  if(url.pathname==='/rest/v1/business_memberships'){
    // Backend uses its server role for membership lookup, not the user's bearer.
    // Membership identity is selected by the user_id query, after Auth verifies token.
    const lookup=params.get('user_id');
    if(lookup==='eq.'+USER_A)return reply(200,[{business_id:BIZ_A,role:roleA}]);
    if(lookup==='eq.'+USER_B)return reply(200,[{business_id:BIZ_B,role:roleB}]);
    return reply(200,[]);
  }
  if(url.pathname==='/rest/v1/business_audit_events')return reply(201,null);
  if(url.pathname==='/rest/v1/leads'){
   const id=params.get('id')?.slice(3);
   const tenant=params.get('business_id')?.slice(3);
   return reply(200,(id==='21'&&tenant===BIZ_A)||(id==='22'&&tenant===BIZ_B)?[{id:Number(id),business_id:tenant}]:[]);
  }
  const resource=resources.find(name=>url.pathname==='/rest/v1/colzo_'+name);
  if(resource){
    const tenant=params.get('business_id')?.slice(3);
    const id=params.get('id')?.slice(3);
    if(method==='GET')return reply(200,records[resource].filter(row=>row.business_id===tenant&&(!id||row.id===id)));
    if(method==='POST'){
      const body=JSON.parse(options.body);
      return reply(201,[{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',...body}]);
    }
    if(method==='PATCH'){
      const body=JSON.parse(options.body);
      const match=records[resource].find(r=>r.business_id===tenant&&r.id===id&&r.updated_at===params.get('updated_at')?.slice(3));
      return reply(200,match?[{...match,...body}]:[]);
    }
  }
  throw Error('Unexpected request '+url.pathname);
 };
 t.after(()=>{globalThis.fetch=prevFetch;envs.forEach((e,i)=>previous[i]===undefined?delete process.env[e]:process.env[e]=previous[i]);});
 return {calls,call:async(method,resource,id=null,body=undefined,auth=token)=>{
  const req={method,query:{resource,...(id?{id}:{})},headers:{authorization:'Bearer '+auth},body};
  const res={statusCode:200,payload:null,status(n){this.statusCode=n;return this},json(p){this.payload=p;return this}};
  await handler(req,res);return {status:res.statusCode,payload:res.payload};
 }};
}
for(const resource of resources){
 test(resource+' collection GET is isolated for independently authenticated A and B',async t=>{
  const {call,calls}=await setup(t);
  const a=await call('GET',resource);
  const b=await call('GET',resource,null,undefined,'token-b');
  assert.equal(a.status,200);assert.equal(b.status,200);
  assert.ok(a.payload.length>0);assert.ok(b.payload.length>0);
  assert.ok(a.payload.every(row=>row.business_id===BIZ_A));
  assert.ok(b.payload.every(row=>row.business_id===BIZ_B));
  const dbCalls=calls.filter(c=>c.path==='/rest/v1/colzo_'+resource);
  assert.deepEqual(dbCalls.map(c=>c.params.get('business_id')),['eq.'+BIZ_A,'eq.'+BIZ_B]);
 });
 test(resource+' direct foreign-ID GET is not visible and returns 404',async t=>{
  const {call,calls}=await setup(t);
  const result=await call('GET',resource,IDS[resource],undefined,'token-b');
  assert.equal(result.status,404);
  assert.ok(!JSON.stringify(result.payload).includes('Fixture '+resource));
  const dbCall=calls.find(c=>c.path==='/rest/v1/colzo_'+resource);
  assert.equal(dbCall.params.get('business_id'),'eq.'+BIZ_B);
  assert.equal(dbCall.params.get('id'),'eq.'+IDS[resource]);
 });
 test(resource+' foreign-ID PATCH is denied before any database update',async t=>{
  const {call,calls}=await setup(t);
  const changes=resource==='quotes'?{notes:'Cross tenant attempt'}:{notes:'Cross tenant attempt'};
  const result=await call('PATCH',resource,IDS[resource],{expected_updated_at:VERSION,...changes},'token-b');
  assert.equal(result.status,404);
  assert.equal(calls.filter(c=>c.path==='/rest/v1/colzo_'+resource&&c.method==='PATCH').length,0);
 });
 test(resource+' member cannot create or edit even within own tenant',async t=>{
  const {call,calls}=await setup(t,{roleA:'member'});
  const create=await call('POST',resource,null,templates[resource]);
  const edit=await call('PATCH',resource,IDS[resource],{expected_updated_at:VERSION,notes:'Not authorised'});
  assert.equal(create.status,403);assert.equal(edit.status,403);
  assert.ok(!calls.some(c=>c.path==='/rest/v1/colzo_'+resource&&['POST','PATCH'].includes(c.method)));
 });
 test(resource+' cannot override the server-assigned business_id on POST',async t=>{
  const {call,calls}=await setup(t);
  const result=await call('POST',resource,null,{...templates[resource],business_id:BIZ_B});
  assert.equal(result.status,400);
  assert.ok(!calls.some(c=>c.path==='/rest/v1/colzo_'+resource&&c.method==='POST'));
 });
 test(resource+' own-row PATCH contains business and version guards',async t=>{
  const {call,calls}=await setup(t);
  const response=await call('PATCH',resource,IDS[resource],{expected_updated_at:VERSION,notes:'Synthetic revision'});
  assert.equal(response.status,200);
  const patch=calls.find(c=>c.path==='/rest/v1/colzo_'+resource&&c.method==='PATCH');
  assert.equal(patch.params.get('business_id'),'eq.'+BIZ_A);
  assert.equal(patch.params.get('updated_at'),'eq.'+VERSION);
  assert.equal(patch.params.get('id'),'eq.'+IDS[resource]);
 });
}
test('quote cannot reference an enquiry owned by business B while A is signed in',async t=>{
 const {call,calls}=await setup(t);
 const attempt=await call('POST','quotes',null,{lead_id:22,title:'Invalid linkage',amount_gbp:8});
 assert.equal(attempt.status,400);
 const leadQuery=calls.find(c=>c.path==='/rest/v1/leads');
 assert.equal(leadQuery.params.get('business_id'),'eq.'+BIZ_A);
 assert.ok(!calls.some(c=>c.path==='/rest/v1/colzo_quotes'&&c.method==='POST'));
});

