import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import verifiedHandler from '../lib/knowledge-verified-handler.js';
import {validateManualFact} from '../lib/knowledge-handler.js';
import {getApprovedKnowledge} from '../lib/knowledge.js';
const oldFetch=globalThis.fetch,oldEnv={...process.env};
afterEach(()=>{globalThis.fetch=oldFetch;process.env={...oldEnv};});
const BUSINESS='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',FAILED='22222222-2222-4222-8222-222222222222';
const FACT={action:'create_manual',item_type:'service',title:'AI receptionist',content:'Business AI offers an AI receptionist service.'};
function setup(role='owner'){
 Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fake-service-key'});
 const sources=[{id:FAILED,business_id:BUSINESS,status:'failed',file_name:'failed.txt',storage_path:'uploaded/original.txt',size_bytes:86}],items=[],calls=[];
 const json=(d,status=200)=>({ok:status<400,status,text:async()=>JSON.stringify(d),json:async()=>d});
 globalThis.fetch=async(url,options={})=>{
 const u=new URL(url),method=options.method||'GET';calls.push({url:String(url),method,body:options.body});
 if(u.pathname==='/auth/v1/user')return json({id:'11111111-1111-4111-8111-111111111111'});
 if(u.pathname.endsWith('/business_memberships'))return json([{business_id:BUSINESS,role}]);
 if(u.pathname.endsWith('/business_audit_events'))return json(null);
 const isSource=u.pathname.endsWith('/business_knowledge_sources');const isItem=u.pathname.endsWith('/business_knowledge_items');
 assert.ok(isSource||isItem,'Manual facts must not invoke inference or storage');
 const collection=isSource?sources:items;
 const matches=r=>(!u.searchParams.has('business_id')||u.searchParams.get('business_id')==='eq.'+r.business_id)&&(!u.searchParams.has('id')||u.searchParams.get('id')==='eq.'+r.id)&&(!u.searchParams.has('source_id')||u.searchParams.get('source_id')==='eq.'+r.source_id)&&(!u.searchParams.has('status')||u.searchParams.get('status')==='eq.'+r.status||u.searchParams.get('status')==='neq.superseded'||u.searchParams.get('status')==='in.(needs_review,active)'&&['needs_review','active'].includes(r.status));
 if(method==='GET')return json(collection.filter(matches));
 const body=options.body?JSON.parse(options.body):null;
 if(method==='POST'){
 for(const row of Array.isArray(body)?body:[body]){const existing=collection.find(r=>r.id&&r.id===row.id);if(existing)Object.assign(existing,row);else collection.push({id:row.id||'33333333-3333-4333-8333-'+String(collection.length).padStart(12,'0'),...row});}return json(null,201);
 }
 if(method==='PATCH'){collection.filter(matches).forEach(r=>Object.assign(r,body));return json(null);}
 assert.fail('Unexpected mutation '+method);
 };
 return {sources,items,calls};
}
async function call(body,method='POST',headers={authorization:'Bearer owner-token'}){const res={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.statusCode=v;return this;},json(v){this.body=v;return this;}};await verifiedHandler({method,headers,query:{},body},res);return res;}
test('manual input rejects overrides, auto-approval fields, invalid types and unbounded text',()=>{
 assert.deepEqual(validateManualFact(FACT),{item_type:'service',title:FACT.title,content:FACT.content});
 for(const body of [{...FACT,business_id:'other'},{...FACT,status:'active'},{...FACT,source_id:FAILED},{...FACT,content:''},{...FACT,title:'x'.repeat(201)},{...FACT,content:'x'.repeat(3001)},{...FACT,item_type:'invented'}])assert.throws(()=>validateManualFact(body));
});
test('manual facts require authenticated owner and never invoke providers',async()=>{
 setup();assert.equal((await call(FACT,'POST',{})).statusCode,401);
 for(const role of ['member','admin']){const state=setup(role);assert.equal((await call(FACT)).statusCode,403);assert.equal(state.sources.length,1);}
});
test('manual fact is tenant-scoped, audited and Needs Review; duplicate submission creates nothing',async()=>{
 const state=setup();const before=structuredClone(state.sources[0]);const result=await call(FACT);
 assert.equal(result.statusCode,201);assert.equal(result.body.source.status,'needs_review');assert.equal(result.body.items[0].status,'needs_review');assert.equal(state.items[0].business_id,BUSINESS);assert.deepEqual(state.sources[0],before);
 assert.deepEqual(await getApprovedKnowledge(BUSINESS,'receptionist'),[]);
 const duplicate=await call({...FACT,title:'Another title',content:'  BUSINESS AI offers an AI receptionist service.  '});assert.equal(duplicate.statusCode,409);assert.equal(state.items.length,1);
 const audit=state.calls.find(c=>c.url.includes('business_audit_events'));assert.match(audit.body,/knowledge.manual_created/);assert.doesNotMatch(audit.body,/offers an AI receptionist/);
});
test('only explicit versioned accuracy approval makes a manual fact active and retrievable for Marketing',async()=>{
 const state=setup();const created=await call(FACT);const id=created.body.source.id;const item=created.body.items[0];
 const approval={action:'approve',source_id:id,items:[{id:item.id,item_type:item.item_type,title:item.title,content:item.content,include:true}]};
 assert.equal((await call(approval,'PATCH')).statusCode,400);assert.equal(state.items[0].status,'needs_review');
 const result=await call({...approval,confirmation:true,confirmation_version:'knowledge_accuracy_v1'},'PATCH');assert.equal(result.statusCode,200);assert.equal(state.items[0].status,'active');
 const facts=await getApprovedKnowledge(BUSINESS,'AI receptionist');assert.equal(facts[0].content,FACT.content);assert.equal(state.sources[0].status,'failed');
});
