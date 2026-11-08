// Isolated HTTP fault injection: production handlers, synthetic identities and
// loopback sockets only. This does not prove live Supabase/issued-session behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';

const DEV='https://mvwseobgkexzpmmkgcxe.supabase.co';
const USER='30000000-0000-4000-8000-000000000001';
const BUSINESS='10000000-0000-4000-8000-000000000001';
const SESSION='40000000-0000-4000-8000-000000000001';
const token='fixture.'+Buffer.from(JSON.stringify({sub:USER,session_id:SESSION,aal:'aal2'})).toString('base64url')+'.synthetic';
const listen=async server=>{server.listen(0,'127.0.0.1');await once(server,'listening');return 'http://127.0.0.1:'+server.address().port;};
const close=async server=>{if(!server?.listening)return;const closed=once(server,'close');server.close();server.closeAllConnections();await closed;};

test('protected handlers deny reads and writes during socket-level validation failures and recover afterwards', {timeout:30000},async t=>{
 const saved={...process.env},nativeFetch=globalThis.fetch;
 let fault=null,api,upstream;const upstreamCalls=[];
 Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'true',
  COLZO_PREVIEW_STRICT_SESSION_REPLAY:'false',VERCEL_ENV:'preview',
  VERCEL_GIT_COMMIT_REF:'feature/colzo-preview-self-serve-pilot-20261102',
  SUPABASE_URL:DEV,SUPABASE_SERVICE_ROLE_KEY:'synthetic-server-key',
  PILOT_FREE_STARTER_MARKETING:'false',BILLING_ENABLED:'false'});
 try{
  upstream=createServer((req,res)=>{
   const path=new URL(req.url,'http://fixture.invalid').pathname;
   upstreamCalls.push({path,method:req.method});
   const stage=path==='/auth/v1/user'?'auth':path.endsWith('/business_memberships')?'membership':path.endsWith('/colzo_pilot_access')?'grant':path.endsWith('/colzo_preview_session_active')?'session':'record';
   if(fault?.stage===stage){
    if(fault.kind==='reset'){req.socket.destroy();return;}
    res.writeHead(fault.kind==='503'?503:200,{'Content-Type':'application/json'});
    res.end(fault.kind==='503'?'synthetic-private-upstream-error':'{invalid-json');return;
   }
   let body;
   if(stage==='auth')body={id:USER};
   else if(stage==='membership')body=[{business_id:BUSINESS,role:'owner'}];
   else if(stage==='session')body=true;
   else if(stage==='grant'){
    const start=Date.now()-86400000;
    body=[{business_id:BUSINESS,status:'active',activated_at:new Date(start).toISOString(),expires_at:new Date(start+336*3600000).toISOString()}];
   }else if(path.endsWith('/business_billing_usage'))body=[];
   else if(['/rest/v1/bookings','/rest/v1/leads','/rest/v1/colzo_clients'].includes(path))body=[{id:path.endsWith('/colzo_clients')?SESSION:1,business_id:BUSINESS,title:'SYNTHETIC_RECORD_SENTINEL'}];
   else {res.writeHead(500);res.end('Unexpected fixture path');return;}
   res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(body));
  });
  const upstreamOrigin=await listen(upstream);
  // Keep exact Development eligibility guards, but route every backend request
  // to a real loopback HTTP server. No real credentials or external requests.
  globalThis.fetch=(url,options)=>{
   const target=new URL(String(url));assert.equal(target.origin,DEV,'external network forbidden');
   return nativeFetch(upstreamOrigin+target.pathname+target.search,{...options,signal:AbortSignal.timeout(3000)});
  };
  const routes={bookings:(await import('../api/bookings.js')).default,
   enquiries:(await import('../lib/colzo-leads-handler.js')).default,
   customers:(await import('../lib/colzo-records-handler.js')).default};
  api=createServer(async(req,res)=>{
   const route=new URL(req.url,'http://fixture.invalid').pathname.slice(1);
   req.query=route==='customers'?{resource:'clients'}:{};
   if(req.method==='PATCH')req.query.id=route==='customers'?SESSION:'1';
   req.body={title:'Synthetic unsaved',full_name:'Synthetic unsaved',expected_updated_at:'2026-11-08T00:00:00.000Z'};
   res.status=code=>{res.statusCode=code;return res;};
   res.json=body=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));return res;};
   try{await routes[route](req,res);}catch{res.statusCode=599;res.end('{}');}
  });
  const apiOrigin=await listen(api);
  const request=async(route,method='GET')=>{
   const response=await nativeFetch(apiOrigin+'/'+route,{method,headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(3000)});
   return {status:response.status,text:await response.text()};
  };
  const positive=async()=>{
   fault=null;
   for(const route of Object.keys(routes)){
    const result=await request(route);assert.equal(result.status,200,route+' positive control');
    assert.match(result.text,/SYNTHETIC_RECORD_SENTINEL/,route+' must reach protected records');
   }
  };
  await positive();
  for(const stage of ['auth','membership','grant','session'])for(const kind of ['503','malformed','reset']){
   await t.test(stage+' '+kind+' denies all three handlers before record access',async()=>{
    process.env.COLZO_PREVIEW_STRICT_SESSION_REPLAY=stage==='session'?'true':'false';
    fault={stage,kind};upstreamCalls.length=0;
    for(const route of Object.keys(routes))for(const method of ['GET','POST','PATCH']){
     const result=await request(route,method);
     assert.ok([401,403,500].includes(result.status),route+' '+method+' '+result.status);
     assert.doesNotMatch(result.text,/SYNTHETIC_RECORD_SENTINEL|synthetic-private-upstream-error|synthetic-server-key/);
    }
    const allowed=['/auth/v1/user','/rest/v1/business_memberships','/rest/v1/colzo_pilot_access','/rest/v1/business_billing_usage','/rest/v1/rpc/colzo_preview_session_active'];
    assert.ok(upstreamCalls.every(call=>allowed.includes(call.path)),'no record read, write, audit or provider side effect');
    assert.ok(upstreamCalls.some(call=>call.path.includes(stage==='auth'?'/auth/v1/user':stage==='membership'?'business_memberships':stage==='grant'?'colzo_pilot_access':'colzo_preview_session_active')),'fault stage actually reached');
    await positive();
   });
  }
 }finally{
  globalThis.fetch=nativeFetch;
  for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];
  Object.assign(process.env,saved);await close(api);await close(upstream);
 }
});
