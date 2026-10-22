import test from 'node:test';
import assert from 'node:assert/strict';
const BUSINESS='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const USER='33333333-3333-4333-8333-333333333333';
const current={id:7,business_id:BUSINESS,lead_id:null,booking_id:null,title:'Synthetic QA record',status:'pending'};
const response=data=>({ok:true,status:200,text:async()=>JSON.stringify(data),json:async()=>data});
function result(){return{code:200,status(c){this.code=c;return this;},json(b){this.body=b;return this;},setHeader(){}};}
async function run(t,{route='actions',method='POST',body={title:'Synthetic QA record'},query={},saved=[{...current}],membership=BUSINESS}={}){
 const vars={SUPABASE_URL:'https://synthetic.test',SUPABASE_SERVICE_ROLE_KEY:'fixture-server-only',TENANCY_AUTH_ENABLED:'true'};
 const old=Object.fromEntries(Object.keys(vars).map(k=>[k,process.env[k]]));Object.assign(process.env,vars);
 const oldFetch=globalThis.fetch;const calls=[];
 globalThis.fetch=async(input,options={})=>{
  const url=new URL(input),verb=options.method||'GET';
  if(url.pathname==='/auth/v1/user')return response({id:USER});
  if(url.pathname==='/rest/v1/business_memberships')return response([{business_id:membership,role:'owner'}]);
  calls.push({path:url.pathname,verb,query:url.searchParams,body:options.body?JSON.parse(options.body):null});
  if(url.pathname===`/rest/v1/${route}`){
   if(verb==='GET'&&method==='PATCH')return response([{...current,status:route==='bookings'?'requested':'pending'}]);
   if(verb==='GET')return response([]);
   return response(saved);
  }
  if(['/rest/v1/leads','/rest/v1/bookings'].includes(url.pathname))return response([{id:3,business_id:membership}]);
  return response([]);
 };
 t.after(()=>{globalThis.fetch=oldFetch;Object.entries(old).forEach(([k,v])=>v===undefined?delete process.env[k]:process.env[k]=v);});
 // Direct modules capture configuration at import time; give each fixture its own module.
 const handler=(await import(`../api/${route}.js?fixture=${Math.random()}`)).default;
 const res=result();await handler({method,headers:{authorization:'Bearer synthetic-fixture'},query,body},res);
 return{res,calls};
}
for(const [name,method,body,query] of [
 ['action GET','GET',{}, {id:'9007199254740993'}],
 ['action ID','PATCH',{id:'9007199254740993',status:'completed'},{}],
 ['lead POST','POST',{title:'Synthetic QA record',lead_id:'9007199254740993'},{}],
 ['booking POST','POST',{title:'Synthetic QA record',booking_id:'9007199254740993'},{}],
 ['lead PATCH','PATCH',{id:7,lead_id:'9007199254740993'},{}],
 ['booking PATCH','PATCH',{id:7,booking_id:'9007199254740993'},{}],
 ['lead GET','GET',{}, {lead_id:'9007199254740993'}],
 ['booking GET','GET',{}, {booking_id:'9007199254740993'}],
 ['mixed GET','GET',{}, {lead_id:3,booking_id:'9007199254740993'}]
])test(`Actions rejects unsafe ${name} before any data operation`,async t=>{
 const {res,calls}=await run(t,{method,body,query});assert.equal(res.code,400);assert.equal(calls.length,0);
});
for(const route of ['actions','bookings']) for(const method of ['POST','PATCH']) for(const [label,saved] of [
 ['empty',[]],['null',null],['missing ID',[{business_id:BUSINESS}]],['unsafe ID',[{id:'9007199254740993',business_id:BUSINESS}]],['wrong tenant',[{...current,business_id:OTHER}]],['missing tenant',[{id:7}]],['multiple records',[{...current},{...current,id:8}]]
])test(`${route} ${method} refuses ${label} save confirmation and skips success side effects`,async t=>{
 const body=method==='POST'?{title:'Synthetic QA record'}:{id:7,status:'completed'};
 const {res,calls}=await run(t,{route,method,body,saved});assert.equal(res.code,method==='PATCH'&&label==='empty'?409:500);
 assert.equal(calls.filter(c=>c.verb!=='GET').length,1,'write must not be retried or followed by history/audit');
});
for(const route of ['actions','bookings'])test(`${route} PATCH rejects confirmation for a different record`,async t=>{
 const {res,calls}=await run(t,{route,method:'PATCH',body:{id:7,status:'completed'},saved:[{...current,id:8}]});
 assert.equal(res.code,500);assert.equal(calls.filter(c=>c.verb!=='GET').length,1);
});
for(const route of ['actions','bookings'])for(const method of ['POST','PATCH'])test(`${route} ${method} accepts one confirmed own-business record and preserves scope`,async t=>{
 const body=method==='POST'?{title:'Synthetic QA record'}:{id:7,status:'cancelled'};
 const saved=[{...current,status:'cancelled'}];const {res,calls}=await run(t,{route,method,body,saved});
 assert.equal(res.code,method==='POST'?201:200);assert.equal(res.body.id,7);assert.equal(res.body.business_id,BUSINESS);
 const write=calls.find(c=>c.path===`/rest/v1/${route}`&&c.verb===method);assert.ok(write);
 if(method==='PATCH'){assert.equal(write.query.get('business_id'),'eq.'+BUSINESS);assert.equal(write.query.get('id'),'eq.7');}
 else assert.equal(write.body.business_id,BUSINESS);
 assert.equal(calls.filter(c=>c.path==='/rest/v1/business_audit_events').length,1);
});

test('Actions GET applies a safe action ID together with the business predicate',async t=>{
 const {res,calls}=await run(t,{method:'GET',query:{id:'7'}});
 assert.equal(res.code,200);const query=calls.find(c=>c.path==='/rest/v1/actions').query;
 assert.equal(query.get('id'),'eq.7');assert.equal(query.get('business_id'),'eq.'+BUSINESS);
});
