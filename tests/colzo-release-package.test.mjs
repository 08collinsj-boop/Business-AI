import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {assemble, sources, managementPayload} from '../scripts/assemble-colzo-release.mjs';
const root=new URL('../',import.meta.url);
const inputs=await Promise.all(sources.map(async name=>({name,sql:await readFile(new URL('docs/colzo-pilot-review/'+name,root),'utf8')})));
async function fixture(){
 const db=new PGlite();
 await db.exec(await readFile(new URL('tests/fixtures/colzo-pilot-postgres-bootstrap.sql',root),'utf8'));
 await db.exec(await readFile(new URL('supabase/migrations/20260916180000_add_business_creation_and_public_routes.sql',root),'utf8'));
 // Disposable fixture only: align booking columns with the real proposal.
 await db.exec(`ALTER TABLE bookings ADD COLUMN lead_id bigint, ADD COLUMN source text, ADD COLUMN status text, ADD COLUMN title text, ADD COLUMN customer_name text, ADD COLUMN customer_phone text, ADD COLUMN customer_email text, ADD COLUMN location text, ADD COLUMN notes text;
 CREATE TABLE business_audit_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,business_id uuid,action text,resource_type text,resource_id text,metadata jsonb);
 ALTER TABLE lead_history ADD COLUMN lead_id bigint, ADD COLUMN action text, ADD COLUMN old_value text, ADD COLUMN new_value text;`);
 return db;
}
const runnable=sql=>sql.replace(/^\\set ON_ERROR_STOP on\n/,'');
test('assembly preserves exact bodies with one enclosing transaction',()=>{
 const sql=assemble(inputs);
 assert.equal((sql.match(/^BEGIN;$/gm)||[]).length,1);
 assert.equal((sql.match(/^COMMIT;$/gm)||[]).length,1);
 for(const {sql:body} of inputs)assert.ok(sql.includes(body.replace(/^BEGIN;\n/m,'').replace(/^COMMIT;\n?/m,'')));
 assert.throws(()=>assemble(inputs.map((v,i)=>i===1?{...v,sql:v.sql+'\nCOMMIT;\n'}:v)),/transaction boundary/);
 assert.throws(()=>assemble([...inputs].reverse()),/source order/);
});
test('exact package applies all five proposals and no pilot is activated',async()=>{
 const db=await fixture();try{
  const payload=managementPayload(assemble(inputs));
  assert.equal(payload.ref,'mvwseobgkexzpmmkgcxe');
  assert.equal(payload.read_only,false);
  await db.exec(payload.query);
  assert.equal((await db.query('select count(*)::int n from colzo_pilot_access')).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from colzo_pilot_private.audit')).rows[0].n,0);
  assert.equal((await db.query("select has_function_privilege('authenticated','public.request_colzo_pilot_booking(uuid,bigint,text,text,text,text,text,text)','EXECUTE') ok")).rows[0].ok,false);
 }finally{await db.close();}
});
test('late index failure rolls back table, functions, policies and operator role',async()=>{
 const db=await fixture();try{
  await db.exec("INSERT INTO bookings(id,business_id,lead_id,source,status) VALUES(3,'10000000-0000-4000-8000-000000000001',1,'ai_request','requested'),(4,'10000000-0000-4000-8000-000000000001',1,'ai_request','requested')");
  await assert.rejects(db.exec(runnable(assemble(inputs))),/unique|duplicat/i);
  await db.exec('ROLLBACK');
  const row=(await db.query("select to_regclass('public.colzo_pilot_access') grants,to_regnamespace('colzo_pilot_private') private,(select count(*)::int from pg_roles where rolname='colzo_pilot_operator') operators,(select count(*)::int from pg_policies where policyname='colzo_pilot_expiry_guard') policies,(select count(*)::int from bookings) bookings")).rows[0];
  assert.deepEqual(row,{grants:null,private:null,operators:0,policies:0,bookings:4});
 }finally{await db.close();}
});
test('source integrity rejects hidden transaction controls and altered definitions',()=>{
 const altered=inputs.map((v,i)=>i===1?{...v,sql:v.sql.replace('CREATE SCHEMA','commit; -- early commit\nbegin;\nCREATE SCHEMA')}:v);
 assert.throws(()=>assemble(altered),/source integrity/);
 assert.throws(()=>assemble(inputs.map((v,i)=>i===2?{...v,sql:v.sql.replace('NOLOGIN','LOGIN')}:v)),/source integrity/);
});
test('untrusted existing creator owner aborts and rolls back proposed objects',async()=>{
 const db=await fixture();try{
  await db.exec('ALTER FUNCTION public.create_business_for_owner(uuid,text,text,text) OWNER TO authenticated');
  await assert.rejects(db.exec(runnable(assemble(inputs))),/unsafe creator dependency/);
  await db.exec('ROLLBACK');
  assert.equal((await db.query("select to_regclass('public.colzo_pilot_access') g")).rows[0].g,null);
 }finally{await db.close();}
});
