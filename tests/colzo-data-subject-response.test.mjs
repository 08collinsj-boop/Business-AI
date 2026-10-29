import test from "node:test";
import assert from "node:assert/strict";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const USER = "33333333-3333-4333-8333-333333333333";
const reply = (data, status=200) => ({
  ok: status>=200 && status<300, status,
  text: async()=>data===null?"":JSON.stringify(data),
  json: async()=>data
});

test("data-subject export verifies the actual service-role response tenant and lead", {concurrency:false}, async t=>{
  const oldEnv={...process.env}, oldFetch=globalThis.fetch;
  Object.assign(process.env,{
    SUPABASE_URL:"https://synthetic-only.invalid",
    SUPABASE_SERVICE_ROLE_KEY:"fixture-service-only",
    TENANCY_AUTH_ENABLED:"true",
    COLZO_SCOPED_PILOT_ACCESS:"false"
  });
  let lead=[{id:11,business_id:A,name:"Synthetic own lead"}];
  let history=[{id:1,business_id:A,lead_id:11}];
  let bookings=[{id:2,business_id:A,lead_id:11}];
  let actions=[{id:3,business_id:A,lead_id:11}];
  let audit=0, mutations=0, relatedReads=0;
  globalThis.fetch=async(url,options={})=>{
    const u=new URL(String(url));
    if(u.pathname==="/auth/v1/user") return reply({id:USER});
    if(u.pathname==="/rest/v1/business_memberships") return reply([{business_id:A,role:"owner"}]);
    if(u.pathname==="/rest/v1/business_audit_events"){audit++;return reply(null,201);}
    const table=u.pathname.split("/").at(-1);
    if(["leads","lead_history","bookings","actions"].includes(table)){
      assert.equal(u.searchParams.get("business_id"),"eq."+A);
      if(options.method==="PATCH"){mutations++;return reply([]);}
      assert.equal(u.searchParams.get("lead_id")||u.searchParams.get("id"),"eq.11");
      if(table!=="leads") relatedReads++;
      return reply(({leads:lead,lead_history:history,bookings,actions})[table]);
    }
    throw Error("Unexpected fixture request "+u.pathname);
  };
  t.after(()=>{
    globalThis.fetch=oldFetch;
    for(const k of Object.keys(process.env)) if(!(k in oldEnv)) delete process.env[k];
    Object.assign(process.env,oldEnv);
  });
  const {default:handler}=await import("../lib/data-subjects-handler.js");
  async function call(method="GET"){
    const res={statusCode:null,payload:null,
      status(x){this.statusCode=x;return this;},json(x){this.payload=x;return this;}};
    await handler({method,headers:{authorization:"Bearer synthetic-only"},query:{lead_id:11},body:{lead_id:11}},res);
    return res;
  }
  await t.test("foreign lead returned by anomalous service-role read cannot be exported",async()=>{
    lead=[{id:11,business_id:B,name:"Foreign test sentinel"}];audit=0;relatedReads=0;
    const r=await call();assert.equal(r.statusCode,500);
    assert.equal(audit,0);assert.equal(relatedReads,0);
    assert.doesNotMatch(JSON.stringify(r.payload),/Foreign test sentinel/);
  });
  await t.test("wrong lead ID returned by anomalous service-role read cannot be exported",async()=>{
    lead=[{id:12,business_id:A,name:"Wrong ID"}];audit=0;relatedReads=0;
    const r=await call();assert.equal(r.statusCode,500);assert.equal(audit,0);assert.equal(relatedReads,0);
  });
  await t.test("foreign history row cannot leave owner export",async()=>{
    lead=[{id:11,business_id:A,name:"Synthetic own lead"}];
    history=[{id:1,business_id:B,lead_id:11,old_value:"Foreign test sentinel"}];audit=0;
    const r=await call();assert.equal(r.statusCode,500);
    assert.equal(audit,0);assert.doesNotMatch(JSON.stringify(r.payload),/Foreign test sentinel/);
  });
  await t.test("foreign lead reference in bookings is not exported",async()=>{
    history=[{id:1,business_id:A,lead_id:11}];
    bookings=[{id:2,business_id:A,lead_id:12}];audit=0;
    const r=await call();assert.equal(r.statusCode,500);assert.equal(audit,0);
  });
  await t.test("valid lead and three related sets export and audit",async()=>{
    bookings=[{id:2,business_id:A,lead_id:11}];audit=0;
    const r=await call();assert.equal(r.statusCode,200);assert.equal(r.payload.lead.business_id,A);
    assert.equal(r.payload.history.length,1);assert.equal(r.payload.bookings.length,1);
    assert.equal(r.payload.actions.length,1);assert.equal(audit,1);
  });
  await t.test("foreign lead cannot trigger any erase PATCH",async()=>{
    lead=[{id:11,business_id:B,name:"Foreign test sentinel"}];mutations=0;audit=0;
    const r=await call("DELETE");assert.equal(r.statusCode,500);assert.equal(mutations,0);assert.equal(audit,0);
  });
});
