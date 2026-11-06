import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const B='11111111-1111-4111-8111-111111111111',U='22222222-2222-4222-8222-222222222222',OLD='2026-11-01T00:00:00.000Z';
test('Development lifecycle updates require the loaded version and atomically reject stale concurrent saves',async t=>{
 const saved={...process.env},originalFetch=globalThis.fetch,db=new PGlite();let audit=0,writes=0;
 Object.assign(process.env,{TENANCY_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'false',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-preview-self-serve-pilot-20261102',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-only'});
 t.after(async()=>{globalThis.fetch=originalFetch;for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);await db.close();});
 await db.exec('create table policy (business_id uuid primary key,lead_retention_days int,audit_retention_days int,updated_at timestamptz)');
 await db.query('insert into policy values ($1,365,730,$2)',[B,OLD]);
 const response=data=>({ok:true,status:200,text:async()=>JSON.stringify(data),json:async()=>data});
 globalThis.fetch=async(input,options={})=>{
  const url=new URL(input);
  if(url.pathname.endsWith('/auth/v1/user'))return response({id:U});
  if(url.pathname.endsWith('/business_memberships'))return response([{business_id:B,role:'owner'}]);
  if(url.pathname.endsWith('/business_audit_events')){audit++;return response(null);}
  if(url.pathname.endsWith('/business_data_lifecycle_policies')){
   assert.equal(url.searchParams.get('business_id'),'eq.'+B);
   if(options.method==='PATCH'){
    writes++;const body=JSON.parse(options.body),version=url.searchParams.get('updated_at');
    const result=version?await db.query('update policy set lead_retention_days=$1,updated_at=$2 where business_id=$3 and updated_at=$4 returning *',[body.lead_retention_days,body.updated_at,B,version.slice(3)]):await db.query('update policy set lead_retention_days=$1,updated_at=$2 where business_id=$3 returning *',[body.lead_retention_days,body.updated_at,B]);
    return response(result.rows);
   }
   return response((await db.query('select * from policy')).rows);
  }
  throw Error('Unexpected fixture request');
 };
 const handler=(await import('../lib/data-lifecycle-handler.js')).default;
 async function call(body){const out={status(n){this.code=n;return this},json(data){this.data=data;return this}};await handler({method:'PATCH',headers:{authorization:'Bearer synthetic-token'},body},out);return out;}
 const missing=await call({lead_retention_days:100});assert.equal(missing.code,400);assert.equal(writes,0);
 const malformed=await call({lead_retention_days:100,expected_updated_at:'not-a-timestamp'});assert.equal(malformed.code,400);assert.equal(writes,0);
 const results=await Promise.all([100,200].map(lead_retention_days=>call({lead_retention_days,expected_updated_at:OLD})));
 assert.deepEqual(results.map(r=>r.code).sort(),[200,409]);assert.equal(audit,1);
 const winner=results.find(r=>r.code===200);assert.ok(Date.parse(winner.data.updated_at)>Date.parse(OLD));
 const current=(await db.query('select * from policy')).rows[0];assert.equal(current.lead_retention_days,winner.data.lead_retention_days);
 assert.equal((await call({lead_retention_days:300,expected_updated_at:OLD})).code,409);assert.equal(audit,1);
});
