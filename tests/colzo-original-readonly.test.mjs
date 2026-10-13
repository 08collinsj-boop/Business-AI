import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import handler,{readOriginalPublicConfig,readOwnerEnquiries} from '../lib/colzo-original-readonly.js';
const token='Bearer eyA.eyB.signature';
const liveConfig={frontendAuthEnabled:true,supabaseUrl:'https://mvwseobgkexzpmmkgcxe.supabase.co',supabaseAnonKey:'sb_publishable_not_a_secret'};
const response=(value,status=200)=>({ok:status>=200&&status<300,status,json:async()=>value});
const mockRes=()=>({code:null,headers:{},data:null,setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(obj){this.data=obj;return this;}});

test('original auth config is pinned to the previously verified production project',async()=>{
 let url='';const result=await readOriginalPublicConfig(async (u,opt)=>{url=u;assert.equal(opt.method,'GET');assert.equal(opt.redirect,'error');return response(liveConfig)});
 assert.equal(url,'https://app.getbusiness-ai.com/api/public-config');
 assert.deepEqual(result,{supabaseUrl:liveConfig.supabaseUrl,supabaseAnonKey:liveConfig.supabaseAnonKey});
 const bad=await readOriginalPublicConfig(async()=>response({...liveConfig,supabaseUrl:'https://other.supabase.co'}));
 assert.equal(bad,null);
 const missing=await readOriginalPublicConfig(async()=>response({...liveConfig,supabaseAnonKey:null}));
 assert.equal(missing,null);
});

test('GET-only relay rejects missing or malformed bearer tokens without a live request',async()=>{
 let calls=0;const fake=async()=>{calls++;throw Error('should never fetch')};
 for(const bearer of [null,'','Bearer foo','Bearer ../escape','Bearer token with spaces','Bearer a.b.c\nOther: injected']){
  const result=await readOwnerEnquiries(bearer,fake);assert.equal(result.status,401);
 }
 assert.equal(calls,0);
});

test('relay uses fixed original app destination, GET method, no browser cookies and original membership authorization',async()=>{
 const data=[{id:7,name:'Sample Customer',job_type:'Example service',status:'New',created_at:'2026-10-10T00:00:00Z',email:'private@example.com',phone:'private phone',description:'Private information',business_id:'private-tenant'}];
 const checks=[];const result=await readOwnerEnquiries(token,async(url,opts)=>{checks.push({url,method:opts.method,redirect:opts.redirect,cache:opts.cache,headers:opts.headers});return response(data)});
 assert.deepEqual(checks,[{url:'https://app.getbusiness-ai.com/api/leads',method:'GET',redirect:'error',cache:'no-store',headers:{Accept:'application/json',Authorization:token}}]);
 assert.equal(result.status,200);assert.equal(result.body.count,1);
 assert.deepEqual(result.body.items,[{id:'7',name:'Sample Customer',job_type:'Example service',status:'New',created_at:'2026-10-10T00:00:00Z'}]);
 assert.doesNotMatch(JSON.stringify(result),/private@example.com|private phone|Private information|private-tenant/);
});

test('original app 401 and 403 are relayed safely and do not disclose business records',async()=>{
 for(const code of [401,403]){
  const out=await readOwnerEnquiries(token,async()=>response({error:'internal private error',data:'private'},code));
  assert.equal(out.status,code);assert.doesNotMatch(JSON.stringify(out),/internal private|private/);
 }
});

test('preview-only endpoint cannot be used in Production, or for POST, PATCH and DELETE',async()=>{
 const original=process.env.VERCEL_ENV;
 try{
  process.env.VERCEL_ENV='production';const prod=mockRes();await handler({method:'GET',query:{kind:'enquiries'},headers:{authorization:token}},prod);assert.equal(prod.code,404);
  process.env.VERCEL_ENV='preview';for(const method of ['POST','PATCH','DELETE']){const r=mockRes();await handler({method,query:{kind:'enquiries'},headers:{authorization:token}},r);assert.equal(r.code,405);}
  const unknown=mockRes();await handler({method:'GET',query:{kind:'http://evil.example'},headers:{authorization:token}},unknown);assert.equal(unknown.code,404);
 }finally{if(original===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=original;}
});

test('preview verification page never stores sessions or offers data mutations',async()=>{
 const [html,js,vercel,api]=await Promise.all(['colzo-readonly.html','assets/colzo-readonly.js','vercel.json','api/operations.js'].map(file=>readFile(new URL('../'+file,import.meta.url),'utf8')));
 assert.match(html,/Read-only compatibility test/i);assert.match(html,/id="originalLogin"/);
 assert.match(js,/persistSession:false,autoRefreshToken:false,detectSessionInUrl:false/);
 assert.match(js,/signInWithPassword/);
 assert.match(js,/\$\('originalPassword'\)\.value=''/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|setItem|\.insert\(|\.update\(|\.delete\(|fetch\(.+method:'POST'/);
 const [main,workspace]=await Promise.all(['index.html','assets/colzo-workspace.js'].map(file=>readFile(new URL('../'+file,import.meta.url),'utf8')));
 assert.match(main,/id="colzoOriginalReadOnlyLink"[^>]+href="\/colzo\/read-only" hidden/);
 assert.match(workspace,/link\.hidden=status!=='different_project'/);
 assert.match(vercel,/"source": "\/colzo\/read-only"/);
 assert.match(vercel,/"source": "\/api\/colzo-original-readonly"/);
 assert.match(api,/"colzo-original-readonly": colzoOriginalReadOnly/);
});
