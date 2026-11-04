import test from 'node:test';import assert from 'node:assert/strict';
import {createFictionalDemo} from './fixtures/colzo-fictional-demo.mjs';
const tables=['business_settings','business_configurations','leads','actions','bookings','colzo_clients','colzo_projects','colzo_quotes','business_knowledge_items'];
test('fictional demo persists dashboard records and pending booking across database reopen',async()=>{
 const f=await createFictionalDemo();try{
  const before=await f.snapshot();
  for(const name of tables)assert.equal(before[name].length,2,name);
  assert.equal(before.business_settings[0].services,'Fictional indoor lighting enquiries');
  assert.equal(before.business_configurations[0].ai_handling_mode,'balanced');
  assert.ok(before.bookings.every(x=>x.status==='requested'));
  assert.ok(before.colzo_quotes.every(x=>x.status==='draft'&&x.notes.includes('Fictional')));
  await f.reopen();assert.deepEqual(await f.snapshot(),before);
 }finally{await f.close();}
});
test('fictional tenant roles read their own leads/actions/knowledge and cannot directly mutate records',async()=>{
 const f=await createFictionalDemo();try{
  for(const t of ['leads','actions','bookings','business_knowledge_items']){
   const a=await f.readAs('a',t),b=await f.readAs('b',t);
   assert.equal(a.length,1,t);assert.equal(b.length,1,t);
   assert.equal(a[0].business_id,f.ids.a);assert.equal(b[0].business_id,f.ids.b);
  }
  await f.db.exec('SET ROLE authenticated');
  await assert.rejects(f.db.exec("UPDATE colzo_quotes SET amount_gbp=1"),/permission denied/);
  await f.db.exec('RESET ROLE');
  await assert.rejects(f.db.query('INSERT INTO colzo_quotes(business_id,lead_id,title,amount_gbp) VALUES($1,2,$2,0)',[f.ids.a,'Fictional cross tenant']),/foreign key/);
 }finally{await f.close();}
});
test('fictional manual knowledge needs approval and cannot attach another business source',async()=>{
 const f=await createFictionalDemo();try{
  const item=(await f.db.query('SELECT * FROM business_knowledge_items WHERE business_id=$1',[f.ids.a])).rows[0];
  await f.db.query("UPDATE business_knowledge_items SET status='needs_review' WHERE id=$1",[item.id]);
  assert.equal((await f.db.query("SELECT count(*)::int n FROM business_knowledge_items WHERE business_id=$1 AND status='active'",[f.ids.a])).rows[0].n,0);
  await f.db.query("UPDATE business_knowledge_items SET status='active' WHERE id=$1",[item.id]);
  await assert.rejects(f.db.query('UPDATE business_knowledge_items SET business_id=$1 WHERE id=$2',[f.ids.b,item.id]),/foreign key/);
 }finally{await f.close();}
});
test('fictional booking is idempotent; expired fixtures deny access without affecting the other business',async()=>{
 const f=await createFictionalDemo();try{
  const before=(await f.db.query('SELECT count(*)::int n FROM bookings')).rows[0].n;
  const r=(await f.db.query("SELECT public.request_colzo_pilot_booking($1,1,'Fictional retry','QA Alex','','alex.qa@example.invalid','','Example only') result",[f.ids.a])).rows[0].result;
  assert.equal(r.created,false);assert.equal((await f.db.query('SELECT count(*)::int n FROM bookings')).rows[0].n,before);
  await f.db.query("UPDATE colzo_pilot_access SET activated_at=now()-interval '15 days',expires_at=now()-interval '1 day' WHERE business_id=$1",[f.ids.a]);
  assert.equal((await f.readAs('a','leads')).length,0);assert.equal((await f.readAs('b','leads')).length,1);
  await assert.rejects(f.db.query("SELECT public.request_colzo_pilot_booking($1,1,'Fictional retry','','','','','')",[f.ids.a]),/Approved pilot access required/);
 }finally{await f.close();}
});
