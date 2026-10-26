import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {PGlite} from '@electric-sql/pglite';
const A='10000000-0000-4000-8000-000000000001',B='10000000-0000-4000-8000-000000000002';
const source=readFileSync(new URL('../api/enquiry.js',import.meta.url),'utf8');
const path=new URL('../docs/colzo-pilot-review/pilot-idempotent-bookings.STAGED.sql',import.meta.url);
const proposal=existsSync(path)?readFileSync(path,'utf8'):'';
const rpc='rpc/request_colzo_pilot_booking';
const booking={id:7,business_id:A,lead_id:1,status:'requested',source:'ai_request',created:true};
const input={businessId:A,leadId:1,lead:{name:'Example',job_type:'Repair',email:'example@example.invalid'},conversationText:'Please book an appointment.'};
function routine(scoped,storage){
 const start=source.indexOf('function bookingText('),end=source.indexOf('\nasync function createAutomaticFollowUp',start);
 const context={isScopedPilotRequested:()=>scoped,supabaseRequest:storage};
 vm.runInNewContext(source.slice(start,end)+'globalThis.run=createRequestedBooking;',context);return context.run;
}
test('scoped simultaneous booking requests use one atomic operation without legacy inserts',async()=>{
 const calls=[];let legacyRows=0;
 const create=routine(true,async(path,options={})=>{
  calls.push({path,body:options.body});if(path===rpc)return {...booking};
  if(path==='bookings')return [{...booking,id:++legacyRows}];return [];
 });
 const out=await Promise.all(Array.from({length:8},()=>create(input)));
 assert.ok(out.every(r=>r.id===7));assert.equal(legacyRows,0);assert.equal(calls.length,8);assert.ok(calls.every(c=>c.path===rpc));
 const payload=JSON.parse(calls[0].body);assert.equal(payload.p_business_id,A);assert.equal(payload.p_lead_id,1);assert.equal(payload.p_title,'Repair');
});
test('scoped booking RPC errors or inconsistent confirmation fail closed without a fallback write',async()=>{
 for(const invalid of [null,[],{...booking,business_id:B},{...booking,lead_id:2},{...booking,status:'confirmed'},{...booking,source:'manual'},{...booking,id:null},{...booking,created:'yes'}]){
  const calls=[];const create=routine(true,async path=>{calls.push(path);return invalid});
  await assert.rejects(()=>create(input));assert.deepEqual(calls,[rpc]);
 }
 const calls=[];await assert.rejects(()=>routine(true,async path=>{calls.push(path);throw Error('Unavailable')})(input));assert.deepEqual(calls,[rpc]);
});
test('legacy booking creation and deduplication remain available with scoped mode disabled',async()=>{
 let created=0;
 const create=routine(false,async path=>path.startsWith('bookings?')?(created?[{...booking}]:[]):path==='bookings'?(created++,[{...booking}]):[]);
 assert.equal((await create(input)).id,7);assert.equal((await create(input)).id,7);assert.equal(created,1);
});
async function fixture({install=true}={}){
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE TABLE businesses(id uuid PRIMARY KEY);
 CREATE TABLE leads(id bigint PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses,UNIQUE(id,business_id));
 CREATE TABLE colzo_pilot_access(business_id uuid PRIMARY KEY REFERENCES businesses,status text,activated_at timestamptz,expires_at timestamptz);
 CREATE TABLE bookings(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses,lead_id bigint,title text NOT NULL,customer_name text NOT NULL DEFAULT '',customer_phone text NOT NULL DEFAULT '',customer_email text NOT NULL DEFAULT '',location text NOT NULL DEFAULT '',notes text NOT NULL DEFAULT '',status text NOT NULL,source text NOT NULL,FOREIGN KEY(lead_id,business_id) REFERENCES leads(id,business_id));
 CREATE TABLE lead_history(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,business_id uuid NOT NULL,lead_id bigint NOT NULL,action text NOT NULL,old_value text,new_value text);
 CREATE TABLE business_audit_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,business_id uuid NOT NULL,action text NOT NULL,resource_type text NOT NULL,resource_id text NOT NULL,metadata jsonb NOT NULL DEFAULT '{}');
 ALTER TABLE bookings ENABLE ROW LEVEL SECURITY; ALTER TABLE colzo_pilot_access ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON bookings,colzo_pilot_access FROM PUBLIC,anon,authenticated;GRANT SELECT ON colzo_pilot_access TO service_role;
 INSERT INTO businesses VALUES('${A}'),('${B}');INSERT INTO leads VALUES(1,'${A}'),(2,'${B}');
 INSERT INTO colzo_pilot_access VALUES('${A}','active',now()-interval '1 day',now()+interval '13 days'),('${B}','active',now()-interval '1 day',now()+interval '13 days');`);
 if(install)await db.exec(proposal);return db;
}
const args=business=>[business,1,'Repair','Example','','example@example.invalid','Example town','Fictional request'];
async function request(db,business=A){
 await db.exec('SET ROLE service_role');try{return (await db.query('SELECT public.request_colzo_pilot_booking($1,$2,$3,$4,$5,$6,$7,$8) AS booking',args(business))).rows[0].booking}finally{await db.exec('RESET ROLE')}
}
test('SQL retries return the same pending booking and create one history/audit event',async()=>{
 const db=await fixture();try{
  const first=await request(db),again=await request(db);assert.equal(first.id,again.id);assert.equal(first.created,true);assert.equal(again.created,false);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM bookings')).rows[0].n,1);
  for(const table of ['lead_history','business_audit_events'])assert.equal((await db.query('SELECT count(*)::int AS n FROM '+table)).rows[0].n,1);
  assert.equal(first.status,'requested');assert.equal(first.source,'ai_request');assert.equal(first.business_id,A);
  const audit=(await db.query('SELECT metadata FROM business_audit_events')).rows[0].metadata;assert.deepEqual(Object.keys(audit).sort(),['lead_id','source','status']);
 }finally{await db.close()}
});
test('SQL rejects expired/revoked/future/invalid grants, foreign leads and unprivileged callers',async()=>{
 const db=await fixture();try{
  for(const condition of ["status='revoked'","activated_at=now()-interval '15 days',expires_at=now()-interval '1 day'","activated_at=now()+interval '1 day',expires_at=now()+interval '15 days'","expires_at=now()+interval '14 days'"]){
   await db.exec(`UPDATE colzo_pilot_access SET status='active',activated_at=now()-interval '1 day',expires_at=now()+interval '13 days' WHERE business_id='${A}'; UPDATE colzo_pilot_access SET ${condition} WHERE business_id='${A}';`);
   await assert.rejects(()=>request(db),{code:'42501'});
  }
  await assert.rejects(()=>request(db,B),{code:'42501'});
  for(const role of ['anon','authenticated']){
   await db.exec('SET ROLE '+role);try{await assert.rejects(()=>db.query('SELECT public.request_colzo_pilot_booking($1,$2,$3,$4,$5,$6,$7,$8)',args(A)),{code:'42501'})}finally{await db.exec('RESET ROLE')}
  }
  assert.equal((await db.query('SELECT count(*)::int AS n FROM bookings')).rows[0].n,0);
 }finally{await db.close()}
});
test('SQL rolls back booking and history when audit persistence fails',async()=>{
 const db=await fixture();try{
  await db.exec(`CREATE FUNCTION fail_booking_audit() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Synthetic audit failure'; END$$; CREATE TRIGGER refuse_audit BEFORE INSERT ON business_audit_events FOR EACH ROW EXECUTE FUNCTION fail_booking_audit();`);
  await assert.rejects(()=>request(db));
  for(const table of ['bookings','lead_history','business_audit_events'])assert.equal((await db.query('SELECT count(*)::int AS n FROM '+table)).rows[0].n,0);
  await db.exec('DROP TRIGGER refuse_audit ON business_audit_events');assert.equal((await request(db)).created,true);
 }finally{await db.close()}
});
test('SQL uniqueness also protects legacy writers, while a confirmed booking permits a later new request',async()=>{
 const db=await fixture();try{
  const first=await request(db);
  await assert.rejects(()=>db.exec(`INSERT INTO bookings(business_id,lead_id,title,status,source) VALUES('${A}',1,'Duplicate','requested','ai_request')`));
  await db.exec(`UPDATE bookings SET status='confirmed' WHERE id=${first.id}`);const next=await request(db);assert.notEqual(next.id,first.id);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM bookings')).rows[0].n,2);
 }finally{await db.close()}
});
test('staged proposal refuses pre-existing duplicates without deleting or rewriting records',async()=>{
 const db=await fixture({install:false});try{
  await db.exec(`INSERT INTO bookings(business_id,lead_id,title,status,source) VALUES('${A}',1,'First','requested','ai_request'),('${A}',1,'Second','requested','ai_request')`);
  await assert.rejects(()=>db.exec(proposal));await db.exec('ROLLBACK');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM bookings')).rows[0].n,2);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_proc WHERE proname='request_colzo_pilot_booking'")).rows[0].n,0);
 }finally{await db.close()}
});
