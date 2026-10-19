import test from 'node:test';
import assert from 'node:assert/strict';
const keys=['TENANCY_AUTH_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','VERCEL_ENV','VERCEL_GIT_COMMIT_REF'];
const previous=keys.map(key=>[key,process.env[key]]);
const originalFetch=globalThis.fetch;
const tenant='synthetic-business';
Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-key',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-complete-ui-motion-20261017'});
const {default:handler}=await import('../lib/business-profile-handler.js');
test.after(()=>{globalThis.fetch=originalFetch;for(const [key,value] of previous)if(value===undefined)delete process.env[key];else process.env[key]=value});
const previousPath=`${tenant}/avatar/old-image.webp`;
const reply=data=>({ok:true,status:200,text:async()=>JSON.stringify(data),json:async()=>data});
async function run({writeResult=[]}={}){
 let currentPath=previousPath;const requests=[];
 globalThis.fetch=async(input,init={})=>{
  const path=String(input),method=init.method||'GET';requests.push({path,method,body:init.body});
  if(path.endsWith('/auth/v1/user'))return reply({id:'synthetic-owner'});
  if(path.includes('/business_memberships?'))return reply([{business_id:tenant,role:'owner'}]);
  if(path.includes('/business_settings?')&&method==='GET')return reply([{id:7,business_id:tenant,business_name:'Fixture',profile_image_path:currentPath}]);
  if(path.includes('/business_settings?')&&method==='PATCH'){
   if(Array.isArray(writeResult)&&writeResult.length){currentPath=String(writeResult[0]?.profile_image_path??previousPath)};
   return reply(writeResult);
  }
  if(path.includes('/business_configurations?'))return reply([{business_id:tenant}]);
  if(path.includes('/business_public_routes?'))return reply([]);
  if(path.endsWith('/business_audit_events'))return reply(null);
  if(path.includes('/storage/v1/object/')&&method==='DELETE')return reply(null);
  throw Error('Unexpected synthetic endpoint');
 };
 const res={statusCode:0,status(code){this.statusCode=code;return this},json(payload){this.body=payload;return this},setHeader(){}};
 await handler({method:'POST',headers:{authorization:'Bearer synthetic-token'},body:{action:'remove_media',slot:'avatar'}},res);
 return {res,requests};
}
test('Preview refuses image deletion when profile media removal was not persisted',async()=>{
 const {res,requests}=await run({writeResult:[]});
 assert.equal(res.statusCode,503);
 assert.equal(requests.filter(r=>r.method==='DELETE').length,0);
});
test('Preview refuses old image deletion on wrong-tenant saved representation',async()=>{
 const {res,requests}=await run({writeResult:[{business_id:'different',profile_image_path:''}]});
 assert.equal(res.statusCode,503);
 assert.equal(requests.filter(r=>r.method==='DELETE').length,0);
});
test('Preview removes old image only after confirmed tenant-scoped update',async()=>{
 const {res,requests}=await run({writeResult:[{id:7,business_id:tenant,profile_image_path:''}]});
 assert.equal(res.statusCode,200);
 assert.equal(requests.filter(r=>r.method==='DELETE').length,1);
});
