import test from 'node:test';
import assert from 'node:assert/strict';
import clickup from '../lib/clickup-handler.js';
import {encryptClickupToken} from '../lib/clickup-provider.js';

const BUSINESS='10000000-0000-4000-8000-000000000001';
const USER='20000000-0000-4000-8000-000000000002';
const KEY='c'.repeat(64);
const TOKEN='oauth-test-token-do-not-expose';
const DEV='https://mvwseobgkexzpmmkgcxe.supabase.co';
function res(){return{headers:{},statusCode:200,setHeader(k,v){this.headers[k.toLowerCase()]=v;return this},status(n){this.statusCode=n;return this},json(v){this.body=v;return this},end(v=''){this.body=v;return this}};}
async function run(role,req,fetcher) {
 const values={SUPABASE_URL:DEV,SUPABASE_SERVICE_ROLE_KEY:'fictional-service-key',
 VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-connected-workspace-20261112',
 TENANCY_AUTH_ENABLED:'true',FRONTEND_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'false',
 CLICKUP_INTEGRATION_ENABLED:'true',CLICKUP_CLIENT_ID:'test-id',CLICKUP_CLIENT_SECRET:'test-secret',
 CLICKUP_REDIRECT_URI:'https://preview.example.org/api/clickup-callback',
 CLICKUP_TOKEN_ENCRYPTION_KEY:KEY};
 const saved=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));
 const previousFetch=globalThis.fetch;
 for(const [k,v] of Object.entries(values))process.env[k]=v;
 const requests=[];
 globalThis.fetch=async(url,options={})=>{
  const value=String(url);requests.push({url:value,options});
  if(value===DEV+'/auth/v1/user')return new Response(JSON.stringify({id:USER}),{status:200});
  if(value.includes('/rest/v1/business_memberships?'))return new Response(JSON.stringify([{business_id:BUSINESS,role}]),{status:200});
  if(value.includes('/rest/v1/colzo_clickup_connections?')){
   assert.match(value,new RegExp('business_id=eq\\.'+BUSINESS));
   const record={business_id:BUSINESS,status:'connected',workspace_id:'123',workspace_name:'Demo operations',...encryptClickupToken(TOKEN,BUSINESS,KEY)};
   return new Response(JSON.stringify([record]),{status:200});
  }
  if(value.includes('/api/v2/team/123/task')){
   assert.equal(options.headers.Authorization,'Bearer '+TOKEN);
   return new Response(JSON.stringify({tasks:[{id:'job-1',name:'Site visit',status:{status:'to do'},due_date:null,list:{id:'222',name:'Jobs'},assignees:[]}]}),{status:200});
  }
  if(value.includes('/api/v2/task/job-1')){
   assert.equal(options.method,'PUT');
   assert.equal(options.headers.Authorization,'Bearer '+TOKEN);
   return new Response(JSON.stringify({id:'job-1',name:'Site visit',status:{status:'in progress'},list:{id:'222',name:'Jobs'},assignees:[]}),{status:200});
  }
  if(value.includes('/rest/v1/business_audit_events'))return new Response('',{status:204});
  return fetcher?fetcher(value,options):new Response('not mocked',{status:500});
 };
 const response=res();
 try{await clickup({method:'GET',headers:{authorization:'Bearer valid-fake-user-jwt'},query:{},...req},response);return{response,requests};}
 finally{globalThis.fetch=previousFetch;for(const [k,v] of Object.entries(saved))v===undefined?delete process.env[k]:process.env[k]=v;}
}
test('status returns tenant-bound display data only, never credentials',async()=>{
 const {response,requests}=await run('owner',{},{});
 assert.equal(response.statusCode,200);assert.equal(response.body.connected,true);
 assert.equal(response.body.workspace.name,'Demo operations');
 assert.equal(JSON.stringify(response.body).includes(TOKEN),false);
 assert.equal(JSON.stringify(response.body).includes('token_ciphertext'),false);
 assert.equal(requests.some(r=>r.url.includes('/api/v2/')),false);
});
test('ClickUp workspace task retrieval uses verified membership and encrypted token',async()=>{
 const {response}=await run('member',{query:{view:'tasks'}});
 assert.equal(response.statusCode,200);
 assert.equal(response.body.tasks[0].title,'Site visit');
 assert.equal(JSON.stringify(response.body).includes(TOKEN),false);
});
test('member cannot approve or update external tasks',async()=>{
 const {response,requests}=await run('member',{method:'POST',body:{action:'update_task',taskId:'job-1',expectedTitle:'Site visit',expectedStatus:'to do',approved:true,change:{status:'in progress'}}});
 assert.equal(response.statusCode,403);
 assert.equal(requests.some(r=>r.url.includes('/api/v2/')),false);
});
test('owner must explicitly approve task updates',async()=>{
 const {response,requests}=await run('owner',{method:'POST',body:{action:'update_task',taskId:'job-1',expectedTitle:'Site visit',expectedStatus:'to do',change:{status:'in progress'}}});
 assert.equal(response.statusCode,400);
 assert.equal(requests.some(r=>r.url.includes('/api/v2/')),false);
});
test('owner approved task update confirms provider result and redacts token',async()=>{
 const {response}=await run('owner',{method:'POST',body:{action:'update_task',taskId:'job-1',expectedTitle:'Site visit',expectedStatus:'to do',approved:true,change:{status:'in progress'}}});
 assert.equal(response.statusCode,200);
 assert.equal(response.body.task.status,'in progress');
 assert.equal(response.body.confirmed,true);
 assert.equal(JSON.stringify(response.body).includes(TOKEN),false);
});

