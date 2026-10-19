import assert from 'node:assert/strict';
import test from 'node:test';
const names=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY','TENANCY_AUTH_ENABLED','VERCEL_ENV','VERCEL_GIT_COMMIT_REF'];
const saved=names.map(k=>[k,process.env[k]]),oldFetch=globalThis.fetch;
Object.assign(process.env,{SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-service-only',OPENAI_API_KEY:'fixture-provider-only',TENANCY_AUTH_ENABLED:'true',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-complete-ui-motion-20261017'});
const {default:handler}=await import('../api/enquiry.js');
test.after(()=>{globalThis.fetch=oldFetch;for(const[k,v]of saved)v===undefined?delete process.env[k]:process.env[k]=v});
const reply=data=>({ok:true,status:200,text:async()=>JSON.stringify(data),json:async()=>data});
async function request(dpaRows) {
 const calls=[];
 globalThis.fetch=async (url,options={})=>{
  const target=String(url);calls.push({target,method:options.method||'GET'});
  if(target.includes('business_public_routes'))return reply([{business_id:'business-a',route_type:'slug',route_value:'fixture-a',active:true}]);
  if(target.includes('business_legal_acceptances'))return reply(dpaRows);
  throw new Error('Unexpected request after legal gate: '+target);
 };
 const res={statusCode:0,headers:{},status(n){this.statusCode=n;return this},json(x){this.body=x;return this},setHeader(k,v){this.headers[k]=v;return this}};
 await handler({method:'POST',headers:{'x-forwarded-for':'198.51.100.90'},query:{business:'fixture-a'},body:{message:'Synthetic test enquiry'}},res);
 return {res,calls};
}
test('actual public enquiry refuses another business DPA acceptance and performs no downstream writes',async()=>{
 const {res,calls}=await request([{id:11,business_id:'business-b',document_key:'dpa',document_version:'1.1'}]);
 assert.equal(res.statusCode,503);
 assert.equal(res.body.code,'LEGAL_SETUP_REQUIRED');
 assert.equal(calls.length,2);
 assert.equal(calls.some(x=>x.method==='POST'),false);
});
test('actual public enquiry refuses an outdated DPA or incomplete acceptance representation',async()=>{
 for(const rows of [[{id:11,business_id:'business-a',document_key:'dpa',document_version:'1.0'}],[{id:11}],[],{}]){
   const {res,calls}=await request(rows);
   assert.equal(res.statusCode,503);
   assert.equal(res.body.code,'LEGAL_SETUP_REQUIRED');
   assert.equal(calls.length,2);
 }
});
