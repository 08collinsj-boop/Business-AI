import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const sql=await readFile(new URL('../supabase/migrations/20261023103000_colzo_customer_visible_replies.sql',import.meta.url),'utf8');
const tenant='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const actor='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const request='cccccccc-cccc-4ccc-8ccc-cccccccccccc';

test('customer-visible reply migration is additive, idempotent, private, and rejects duplicated request IDs',async()=>{
 const db=new PGlite();
 try{
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.exec("create table public.leads(id bigint primary key,business_id uuid not null,description text); insert into public.leads values (42,'"+tenant+"','Synthetic existing lead'); alter table public.leads enable row level security;");
  await db.exec(sql);
  assert.equal((await db.query('select count(*)::int as n from public.leads')).rows[0].n,1,'additive schema must not delete existing lead rows');
  assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.customer_visible_replies'::regclass")).rows[0].relrowsecurity,true);
  for(const role of ['anon','authenticated']){
   for(const privilege of ['SELECT','INSERT','UPDATE','DELETE']){
    const result=await db.query("select has_table_privilege($1,'public.customer_visible_replies',$2) as allowed",[role,privilege]);
    assert.equal(result.rows[0].allowed,false,role+' cannot '+privilege+' replies directly');
   }
  }
  const create='insert into public.customer_visible_replies(business_id,lead_id,created_by,request_id,body) values($1,42,$2,$3,$4)';
  await db.query(create,[tenant,actor,request,'We can review next Friday']);
  assert.equal((await db.query('select body from public.customer_visible_replies')).rows[0].body,'We can review next Friday');
  await assert.rejects(db.query(create,[tenant,actor,request,'Duplicated send']),/duplicate key|unique constraint/i);
  await assert.rejects(db.query(create,[tenant,actor,'dddddddd-dddd-4ddd-8ddd-dddddddddddd','   ']),/check constraint/i);
  await assert.rejects(db.query(create,[tenant,actor,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','x'.repeat(2001)]),/check constraint/i);
  await db.exec(sql);
  assert.equal((await db.query('select count(*)::int as n from public.customer_visible_replies')).rows[0].n,1,'reapplying migration preserves replies');
 }finally{await db.close()}
});
