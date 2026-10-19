import assert from "node:assert/strict";
import test from "node:test";

const saved = ["TENANCY_AUTH_ENABLED", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].map(k=>[k,process.env[k]]);
Object.assign(process.env, {TENANCY_AUTH_ENABLED:"true", SUPABASE_URL:"https://fixture.supabase.co", SUPABASE_SERVICE_ROLE_KEY:"fixture-service-key"});
const {default: handler} = await import("../lib/colzo-leads-handler.js");
const savedFetch=globalThis.fetch;
test.after(()=>{globalThis.fetch=savedFetch; for(const [k,v] of saved) v===undefined?delete process.env[k]:process.env[k]=v;});
const current={id:17,business_id:"synthetic-business",status:"New",priority:"Normal",notes:"",estimated_value:0,follow_up_date:null};
const reply=data=>({ok:true,text:async()=>JSON.stringify(data),json:async()=>data});
function mock({created=[],updated=[],found=[current]}={}){
 const calls=[];
 globalThis.fetch=async(url,options={})=>{
  const path=String(url),method=options.method||"GET";calls.push({path,method});
  if(path.endsWith("/auth/v1/user"))return reply({id:"synthetic-user"});
  if(path.includes("/business_memberships?"))return reply([{business_id:"synthetic-business",role:"owner"}]);
  if(path.includes("/leads?")&&method==="GET")return reply(found);
  if(path.includes("/leads?")&&method==="PATCH")return reply(updated);
  if(path.endsWith("/rest/v1/leads")&&method==="POST")return reply(created);
  return reply(null);
 };
 return calls;
}
async function run(method,body){
 const req={method,body,headers:{authorization:"Bearer synthetic-token"}};
 const res={statusCode:200,body:null,status(n){this.statusCode=n;return this},json(b){this.body=b;return this}};
 await handler(req,res);return res;
}
const effects=calls=>calls.filter(c=>/\/(lead_history|business_audit_events|actions)(\?|$)/.test(c.path)&&["POST","PATCH"].includes(c.method));
test("empty creation representation returns conflict without audit",{concurrency:false},async()=>{
 const calls=mock({created:[]});assert.equal((await run("POST",{name:"Synthetic"})).statusCode,409);assert.equal(effects(calls).length,0);
});
test("wrong tenant creation representation is never reported saved",{concurrency:false},async()=>{
 const calls=mock({created:[{id:17,business_id:"different-business",name:"Synthetic"}]});
 assert.equal((await run("POST",{name:"Synthetic"})).statusCode,503);assert.equal(effects(calls).length,0);
});
test("empty update representation cannot create history or finish follow ups",{concurrency:false},async()=>{
 const calls=mock({updated:[]});
 assert.equal((await run("PATCH",{id:17,status:"Contacted"})).statusCode,409);
 assert.equal(effects(calls).length,0);
});
test("unchanged saved status cannot trigger a completed lead workflow",{concurrency:false},async()=>{
 const calls=mock({updated:[current]});
 assert.equal((await run("PATCH",{id:17,status:"Contacted"})).statusCode,503);
 assert.equal(effects(calls).length,0);
});
test("unsafe numeric lead ID rejected before lead fetch",{concurrency:false},async()=>{
 const calls=mock();assert.equal((await run("PATCH",{id:"9007199254740993",status:"Contacted"})).statusCode,400);
 assert.equal(calls.some(c=>c.path.includes("/rest/v1/leads?")),false);
});
test("confirmed creation and update preserve success and history",{concurrency:false},async()=>{
 const a=mock({created:[{id:23,business_id:"synthetic-business",name:"Synthetic",status:"New"}]});
 const cr=await run("POST",{name:"Synthetic"});assert.equal(cr.statusCode,201);assert.equal(cr.body.id,23);
 assert.equal(effects(a).filter(c=>c.path.includes("business_audit_events")).length,1);
 const b=mock({updated:[{...current,status:"Contacted"}]});
 const up=await run("PATCH",{id:17,status:"Contacted"});assert.equal(up.statusCode,200);
 assert.equal(effects(b).filter(c=>c.path.includes("lead_history")).length,1);
});

