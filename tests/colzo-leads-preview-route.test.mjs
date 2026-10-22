import assert from "node:assert/strict";
import test from "node:test";
const keys=["VERCEL_ENV","VERCEL_GIT_COMMIT_REF","SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","TENANCY_AUTH_ENABLED","COLZO_EXPECTED_SUPABASE_PROJECT_REF"];
const old=new Map(keys.map(k=>[k,process.env[k]]));
Object.assign(process.env,{VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:"feature/colzo-complete-ui-motion-20261017",SUPABASE_URL:"https://mvwseobgkexzpmmkgcxe.supabase.co",SUPABASE_SERVICE_ROLE_KEY:"synthetic-service-only",TENANCY_AUTH_ENABLED:"true"});
delete process.env.COLZO_EXPECTED_SUPABASE_PROJECT_REF;
const {default: operations}=await import("../api/operations.js");
const oldFetch=globalThis.fetch;
test.after(()=>{globalThis.fetch=oldFetch;for(const [key,v] of old){if(v===undefined)delete process.env[key];else process.env[key]=v;}});
function response(body,status=200){return {ok:status>=200&&status<300,status,text:async()=>JSON.stringify(body),json:async()=>body};}
function network(){
 const calls=[];
 globalThis.fetch=async(uri,opts={})=>{
  const url=String(uri);calls.push({url,method:opts.method||"GET"});
  if(url.endsWith("/auth/v1/user"))return response({id:"synthetic-owner"});
  if(url.includes("/business_memberships?"))return response([{business_id:"synthetic-business",role:"owner"}]);
  if(url.endsWith("/rest/v1/leads")&&opts.method==="POST")return response([]);
  return response(null);
 };
 return calls;
}
async function submit(headers){
 const req={method:"POST",query:{operation:"leads"},headers,body:{name:"Synthetic Lead"}};
 const res={statusCode:200,body:null,headersSent:false,status(n){this.statusCode=n;return this;},json(b){this.body=b;this.headersSent=true;return this;},setHeader(){}};
 await operations(req,res);return res;
}
test("Colzo Preview dispatcher uses confirmed-save Leads handler for valid verified sessions",{concurrency:false},async()=>{
 const calls=network();
 const res=await submit({"x-colzo-supabase-authorization":"Bearer synthetic-owner-token"});
 assert.equal(res.statusCode,409);
 assert.equal(calls.filter(c=>c.url.includes("/rest/v1/business_audit_events")).length,0);
});
test("Colzo Preview dispatcher refuses unauthenticated lead creation before database access",{concurrency:false},async()=>{
 const calls=network();
 const res=await submit({});
 assert.equal(res.statusCode,401);
 assert.equal(calls.length,0);
});
test("Unexpected Supabase target fails closed before authenticating lead creation",{concurrency:false},async()=>{
 const before=process.env.SUPABASE_URL;process.env.SUPABASE_URL="https://unrelated.supabase.co";
 try{
  const calls=network();const res=await submit({"x-colzo-supabase-authorization":"Bearer synthetic-owner-token"});
  assert.equal(res.statusCode,503);
  assert.equal(calls.length,0);
 }finally{process.env.SUPABASE_URL=before;}
});

