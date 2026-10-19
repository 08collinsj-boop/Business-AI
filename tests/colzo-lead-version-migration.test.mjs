import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const sql=await readFile(new URL('../supabase/migrations/20261019162954_colzo_lead_write_versions.sql',import.meta.url),'utf8');
test('lead version migration preserves existing data/RLS, advances legacy writes and atomically rejects stale edits',async()=>{
 const db=new PGlite();
 try{
   await db.exec("create role anon; create role authenticated; create table public.leads(id bigint primary key,business_id uuid not null,notes text); alter table public.leads enable row level security; insert into public.leads values(1,'87654321-4321-4321-8432-123456789abc','Synthetic original');");
   await db.exec(sql);
   let rows=(await db.query('select notes,updated_at::text as version from public.leads')).rows;
   assert.equal(rows[0].notes,'Synthetic original');assert.ok(rows[0].version);
   const firstVersion=rows[0].version;
   const change="update public.leads set notes=$1 where id=1 and business_id='87654321-4321-4321-8432-123456789abc' and updated_at=$2::timestamptz returning notes,updated_at::text as version";
   const first=(await db.query(change,['First writer',firstVersion])).rows;
   assert.equal(first.length,1);assert.notEqual(first[0].version,firstVersion);
   const stale=(await db.query(change,['Stale writer',firstVersion])).rows;
   assert.equal(stale.length,0);
   assert.equal((await db.query('select notes from public.leads')).rows[0].notes,'First writer');
   const legacy=(await db.query("update public.leads set notes='Legacy writer',updated_at='2000-01-01' returning updated_at::text as version")).rows[0];
   assert.notEqual(legacy.version,first[0].version,'legacy writes must invalidate loaded Colzo versions');
   assert.ok(Date.parse(legacy.version)>Date.parse('2000-01-01'),'callers cannot choose the version');
   const versions=(await db.query("select relrowsecurity from pg_class where oid='public.leads'::regclass")).rows;
   assert.equal(versions[0].relrowsecurity,true);
   assert.equal((await db.query("select has_function_privilege('authenticated','public.colzo_stamp_lead_version()','EXECUTE') allowed")).rows[0].allowed,false);
   await db.exec(sql);
   assert.equal((await db.query('select count(*)::int n from public.leads')).rows[0].n,1);
   assert.equal((await db.query("select count(*)::int n from pg_trigger where tgrelid='public.leads'::regclass and not tgisinternal")).rows[0].n,1);
 }finally{await db.close()}
});
