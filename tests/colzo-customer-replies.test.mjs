import test from 'node:test';
import assert from 'node:assert/strict';

const original = {...process.env}, beforeFetch=globalThis.fetch;
Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-role'});
test.after(()=>{globalThis.fetch=beforeFetch;for(const k of Object.keys(process.env))if(!(k in original))delete process.env[k];Object.assign(process.env,original);});
const reply=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body,text:async()=>JSON.stringify(body)});
const response=()=>({statusCode:0,body:null,status(n){this.statusCode=n;return this},json(x){this.body=x;return this},setHeader(){}});
async function invoke({method='GET',headers={},body={},query={}}){
 const {default:handler}=await import('../lib/customer-replies-handler.js?qa='+Math.random());
 const res=response();await handler({method,headers,body,query},res);return res;
}
function fixture({actor='owner',leadBusiness='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',customerGrant=true,stored=null}={}){
 const calls=[];
 globalThis.fetch=async (url,options={})=>{
  const u=String(url),method=options.method||'GET';calls.push({u,method,body:options.body&&JSON.parse(options.body)});
  if(u.endsWith('/auth/v1/user'))return reply({id:actor==='owner'?'user-owner':'customer-one',email:'fixture@example.invalid'});
  if(u.includes('/business_memberships?'))return reply(actor==='owner'?[{business_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',role:'owner'}]:[]);
  if(u.includes('/leads?'))return reply(leadBusiness?[{id:42,business_id:leadBusiness}]:[]);
  if(u.includes('/customer_enquiry_access?'))return reply(customerGrant?[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lead_id:42,business_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}]:[]);
  if(u.includes('/customer_visible_replies?')&&method==='GET')return reply(stored?[stored]:[]);
  if(u.endsWith('/customer_visible_replies')&&method==='POST')return reply([{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',business_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lead_id:42,body:'We can review on Friday',created_at:'2026-10-23T11:00:00Z'}],201);
  throw Error('Unexpected '+u);
 };return calls;
}
test('only an authenticated business member can create a reply for its own lead',async()=>{
 const calls=fixture();
 const out=await invoke({method:'POST',headers:{authorization:'Bearer valid'},body:{lead_id:42,message:'We can review on Friday',request_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}});
 assert.equal(out.statusCode,201);
 assert.equal(out.body.reply.message,'We can review on Friday');
 assert.ok(calls.some(x=>x.method==='POST'&&x.u.endsWith('/customer_visible_replies')));
 assert.ok(calls.some(x=>x.u.includes('/leads?')&&x.u.includes('business_id=eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')));
});
test('an enquiry in another business is never replied to',async()=>{
 const calls=fixture({leadBusiness:null});
 const out=await invoke({method:'POST',headers:{authorization:'Bearer valid'},body:{lead_id:42,message:'Private reply',request_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}});
 assert.equal(out.statusCode,404);
 assert.ok(!calls.some(x=>x.method==='POST'));
});
test('customer sees a reply only through its verified enquiry grant',async()=>{
 const calls=fixture({actor:'customer',customerGrant:true,stored:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',business_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lead_id:42,body:'We can review on Friday',created_at:'2026-10-23T11:00:00Z'}});
 const out=await invoke({method:'GET',headers:{authorization:'Bearer valid'},query:{lead_id:'42'}});
 assert.equal(out.statusCode,200);assert.equal(out.body.replies[0].message,'We can review on Friday');
 assert.ok(calls.some(x=>x.u.includes('/customer_enquiry_access?')&&x.u.includes('customer_user_id=eq.customer-one')));
});
test('unlinked customer cannot retrieve another person reply',async()=>{
 const calls=fixture({actor:'customer',customerGrant:false});
 const out=await invoke({method:'GET',headers:{authorization:'Bearer valid'},query:{lead_id:'42'}});
 assert.equal(out.statusCode,404);assert.ok(!calls.some(x=>x.u.includes('/customer_visible_replies?')));
});
test('invalid request and unauthenticated calls cannot write anything',async()=>{
 const calls=fixture();
 const bad=await invoke({method:'POST',headers:{authorization:'Bearer valid'},body:{lead_id:42,message:'   ',request_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}});
 assert.equal(bad.statusCode,400);
 const denied=await invoke({method:'POST',body:{lead_id:42,message:'Hello',request_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}});
 assert.equal(denied.statusCode,401);
 assert.ok(!calls.some(x=>x.method==='POST'));
});

test('owner reply endpoint reports whether the enquiry has a linked customer account',async()=>{
 fixture({actor:'owner',customerGrant:true,stored:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',business_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lead_id:42,body:'Friday suits',created_at:'2026-10-23T11:00:00Z'}});
 const response=await invoke({method:'GET',headers:{authorization:'Bearer valid'},query:{view:'business',lead_id:'42'}});
 assert.equal(response.statusCode,200);
 assert.equal(response.body.customer_portal_linked,true);
 assert.equal(response.body.replies[0].message,'Friday suits');
});
test('cannot claim customer delivery for an enquiry without a customer portal link',async()=>{
 const calls=fixture({customerGrant:false});
 const out=await invoke({method:'POST',headers:{authorization:'Bearer valid'},body:{lead_id:42,message:'Please confirm',request_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}});
 assert.equal(out.statusCode,409);
 assert.match(out.body.error,/customer.*link/i);
 assert.ok(!calls.some(x=>x.method==='POST'));
});
test('owner history cannot be read from another business',async()=>{
 const calls=fixture({actor:'owner',leadBusiness:null});
 const out=await invoke({method:'GET',headers:{authorization:'Bearer valid'},query:{view:'business',lead_id:'42'}});
 assert.equal(out.statusCode,404);
 assert.ok(!calls.some(x=>x.u.includes('/customer_visible_replies?')));
});
test('reply interface includes a saved, customer-visible owner form and customer account message thread',async()=>{
 const {readFile}=await import('node:fs/promises');
 const owner=await readFile(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
 const portal=await readFile(new URL('../assets/customer-portal.js',import.meta.url),'utf8');
 assert.match(owner,/id="cnCustomerReplyForm"/);
 assert.match(owner,/data-cn-replies-refresh/);
 assert.match(owner,/customer_portal_linked/);
 assert.match(owner,/\/api\/customer-replies\?view=business/);
 assert.match(owner,/Confirmed in customer portal/);
 assert.match(portal,/Replies from the business/);
 assert.match(portal,/business_replies/);
});


test('reply endpoint fails closed without a server-side feature enablement flag',async()=>{
 const prior=process.env.COLZO_CUSTOMER_REPLIES_ENABLED;
 delete process.env.COLZO_CUSTOMER_REPLIES_ENABLED;
 try{
   const calls=fixture();
   const out=await invoke({method:'POST',headers:{authorization:'Bearer valid'},body:{lead_id:42,message:'Do not send',request_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}});
   assert.equal(out.statusCode,503);
   assert.match(out.body.error,/not enabled/i);
   assert.equal(calls.filter(x=>x.u.includes('/rest/v1/')).length,0,'no reply or enquiry tables should be queried');
 }finally{if(prior===undefined)delete process.env.COLZO_CUSTOMER_REPLIES_ENABLED;else process.env.COLZO_CUSTOMER_REPLIES_ENABLED=prior}
});
