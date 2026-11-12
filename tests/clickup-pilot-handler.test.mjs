import test from 'node:test';
import assert from 'node:assert/strict';
import clickupHandler from '../lib/clickup-handler.js';
import {encryptClickupToken} from '../lib/clickup-provider.js';

const business='10000000-0000-4000-8000-000000000001';
const owner='20000000-0000-4000-8000-000000000001';
const key='b'.repeat(64);
const env={
 SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',
 SUPABASE_SERVICE_ROLE_KEY:'fictional-service-secret',
 VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-connected-workspace-20261112',
 CLICKUP_INTEGRATION_ENABLED:'true',CLICKUP_CLIENT_ID:'test-client',CLICKUP_CLIENT_SECRET:'test-secret',
 CLICKUP_REDIRECT_URI:'https://example.vercel.app/api/clickup-callback',
 CLICKUP_TOKEN_ENCRYPTION_KEY:key,
 TENANCY_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'false'
};
const task=(name='Original')=>({id:'abc',name,status:{status:'to do'},list:{id:'901',name:'Incoming'},due_date:null,url:'https://app.clickup.com/t/abc'});
function makeRes(){
 return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(x){this.statusCode=x;return this;},json(body){this.body=body;return this;},end(body){this.body=body;return this;}};
}
async function scenario({method='GET',query={},body,role='owner',tasks=[],expectedWrite=false,workspaceRace=false}={}){
 const prev=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
 for(const [k,v] of Object.entries(env))process.env[k]=v;
 const originalFetch=globalThis.fetch;
 const calls=[];
 const sealed=encryptClickupToken('fictional-clickup-access',business,key);
 globalThis.fetch=async (url,options={})=>{
   const path=new URL(url).pathname;
   const method=options.method||'GET';
   calls.push({path,method,body:options.body?JSON.parse(options.body):null});
   const reply=(data,status=200)=>new Response(data===null?'':JSON.stringify(data),{status});
   if(path==='/auth/v1/user')return reply({id:owner});
   if(path==='/rest/v1/business_memberships')return reply([{business_id:business,role}]);
   if(path==='/rest/v1/colzo_clickup_connections'){
     const baseline={business_id:business,status:'connected',workspace_id:'123',workspace_name:'Business',updated_at:'2026-11-12T15:00:00.000Z',available_workspaces:[{id:'123',name:'Business'},{id:'456',name:'Second workspace'}],...sealed};
     if(method==='PATCH'){
       const query=new URL(url).searchParams;
       if(workspaceRace&&query.get('updated_at')==='eq.'+baseline.updated_at)return reply([]);
       return reply([{...baseline,...(options.body?JSON.parse(options.body):{})}]);
     }
     return reply([baseline]);
   }
   if(path==='/rest/v1/business_audit_events')return reply(null,201);
   if(path==='/api/v2/team/123/task')return reply({tasks});
   if(path==='/api/v2/team/123/space')return reply({spaces:[{id:'10',name:'Operations'}]});
   if(path==='/api/v2/space/10/list')return reply({lists:[{id:'901',name:'Incoming'}]});
   if(path==='/api/v2/space/10/folder')return reply({folders:[]});
   if(path==='/api/v2/list/901/task'&&method==='POST')return reply(task(options.body?JSON.parse(options.body).name:''));
   if(path==='/api/v2/task/abc'&&method==='PUT')return reply(task('Updated'));
   throw Error('unexpected URL '+path);
 };
 const res=makeRes();
 try{
   await clickupHandler({method,query,body,headers:{authorization:'Bearer fictional-user-session'}},res);
   if(expectedWrite)assert.ok(calls.some(c=>c.method==='POST'&&c.path==='/api/v2/list/901/task'));
   return {res,calls};
 }finally{
   globalThis.fetch=originalFetch;
   for(const [k,v] of Object.entries(prev)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
 }
}
test('authenticated read lists discovers authorised list even when no tasks exist',async()=>{
 const {res,calls}=await scenario({query:{view:'lists'}});
 assert.equal(res.statusCode,200);
 assert.deepEqual(res.body.lists.map(l=>l.id),['901']);
 assert.ok(!calls.some(c=>c.path==='/api/v2/team/123/task'));
});
test('owner may create in a validated empty list after explicit approval',async()=>{
 const {res}=await scenario({method:'POST',body:{action:'create_task',listId:'901',title:'New task',approved:true},expectedWrite:true,tasks:[]});
 assert.equal(res.statusCode,200);
 assert.equal(res.body.confirmed,true);
 assert.equal(res.body.task.title,'New task');
});
test('member may read lists but cannot create tasks',async()=>{
 const read=await scenario({query:{view:'lists'},role:'member'});
 assert.equal(read.res.statusCode,200);
 const blocked=await scenario({method:'POST',role:'member',body:{action:'create_task',listId:'901',title:'Forbidden',approved:true}});
 assert.equal(blocked.res.statusCode,403);
 assert.ok(!blocked.calls.some(c=>c.path.startsWith('/api/v2/')));
});
test('task name changes fail with 409 rather than overwrite someone else',async()=>{
 const {res,calls}=await scenario({method:'POST',tasks:[task('Changed elsewhere')],body:{action:'update_task',taskId:'abc',expectedTitle:'Original',expectedStatus:'to do',change:{name:'Updated',status:'to do'},approved:true}});
 assert.equal(res.statusCode,409);
 assert.ok(!calls.some(c=>c.method==='PUT'));
});


test('forged list id fails closed without sending a ClickUp create request',async()=>{
 const {res,calls}=await scenario({method:'POST',body:{action:'create_task',listId:'999',title:'Forged',approved:true},tasks:[]});
 assert.equal(res.statusCode,409);
 assert.ok(!calls.some(c=>c.path==='/api/v2/list/999/task'));
});
test('member connection status hides write permissions but allows read-only tasks',async()=>{
 const {res}=await scenario({query:{},role:'member'});
 assert.equal(res.statusCode,200);
 assert.equal(res.body.canManage,false);
 assert.equal(res.body.connected,true);
});
test('owner connection status can show task controls without exposing a token',async()=>{
 const {res}=await scenario({query:{},role:'owner'});
 assert.equal(res.statusCode,200);
 assert.equal(res.body.canManage,true);
 assert.equal(JSON.stringify(res.body).includes('fictional-clickup-access'),false);
});

test('concurrent workspace switch rejects a stale connection instead of overwriting it',async()=>{
 const {res,calls}=await scenario({method:'POST',workspaceRace:true,body:{action:'select_workspace',workspaceId:'456'}});
 assert.equal(res.statusCode,409);
 assert.ok(calls.some(c=>c.method==='PATCH'&&c.path==='/rest/v1/colzo_clickup_connections'));
});

test('uncontended workspace switch succeeds when connection version matches',async()=>{
 const {res}=await scenario({method:'POST',body:{action:'select_workspace',workspaceId:'456'}});
 assert.equal(res.statusCode,200);
 assert.equal(res.body.workspace.id,'456');
});
