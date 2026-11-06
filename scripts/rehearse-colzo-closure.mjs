// Disposable synthetic PostgreSQL rehearsal only. No external connection or erasure worker.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const A='10000000-0000-4000-8000-000000000001',B='10000000-0000-4000-8000-000000000002',U='20000000-0000-4000-8000-000000000001';
const paths={business:'supabase/migrations/20260915000000_add_multi_tenant_auth.sql',lead:'supabase/migrations/20260911230000_create_initial_lead_schema.sql',booking:'supabase/migrations/20260915010000_add_bookings_actions.sql',knowledge:'supabase/migrations/20260923193000_add_business_knowledge_uploads.sql'};
async function tableDDL(path,name){const source=await readFile(new URL('../'+path,import.meta.url),'utf8');const match=source.match(new RegExp('create table if not exists public\\.'+name+' \\([\\s\\S]*?\\n\\);','i'));if(!match)throw Error('Missing fixture DDL '+name);return match[0];}
export async function rehearseClosure(){
 const db=new PGlite(),checks=[];const check=(label,condition)=>{assert.ok(condition,label);checks.push(label);};
 const tables=['leads','lead_history','bookings','actions','business_knowledge_sources','business_knowledge_items'];
 try{
  await db.exec('create schema auth;create table auth.users(id uuid primary key)');
  await db.exec(await tableDDL(paths.business,'businesses'));await db.exec(await tableDDL(paths.business,'business_memberships'));
  await db.exec(await tableDDL(paths.lead,'leads'));await db.exec(await tableDDL(paths.lead,'lead_history'));
  await db.exec('alter table leads add business_id uuid not null references businesses(id);alter table lead_history add business_id uuid not null references businesses(id);create unique index leads_scope on leads(id,business_id)');
  await db.exec(await tableDDL(paths.booking,'bookings'));await db.exec('create unique index bookings_scope on bookings(id,business_id)');await db.exec(await tableDDL(paths.booking,'actions'));
  await db.exec(await tableDDL(paths.knowledge,'business_knowledge_sources'));await db.exec('create unique index sources_scope on business_knowledge_sources(id,business_id)');await db.exec(await tableDDL(paths.knowledge,'business_knowledge_items'));
  // Explicit fixture controls, not deployed schema or chosen retention/hold policy.
  await db.exec('create table fixture_holds(business_id uuid primary key);create table fixture_file_outbox(business_id uuid,path text);create table fixture_grants(business_id uuid primary key,expires_at text);create table fixture_closure_audit(business_id uuid primary key)');
  await db.query('insert into auth.users values ($1)',[U]);
  for(const business of [A,B]){
   await db.query('insert into businesses(id,name) values ($1,$2)',[business,'Synthetic closure '+(business===A?'A':'B')]);
   await db.query("insert into business_memberships(business_id,user_id,role) values ($1,$2,'owner')",[business,U]);
   await db.query('insert into fixture_grants values ($1,$2)',[business,'synthetic-immutable-expiry']);
   const lead=(await db.query("insert into leads(business_id,name) values ($1,'Fictional only') returning id",[business])).rows[0].id;
   const booking=(await db.query("insert into bookings(business_id,lead_id,title) values ($1,$2,'Synthetic booking') returning id",[business,lead])).rows[0].id;
   await db.query("insert into actions(business_id,lead_id,booking_id,title) values ($1,$2,$3,'Synthetic action')",[business,lead,booking]);
   await db.query("insert into lead_history(business_id,lead_id,action) values ($1,$2,'synthetic')",[business,lead]);
   const source=(await db.query("insert into business_knowledge_sources(business_id,created_by,file_name,storage_path,mime_type,size_bytes) values ($1,$2,'synthetic.txt',$3,'text/plain',1) returning id",[business,U,business+'/synthetic.txt'])).rows[0].id;
   await db.query("insert into business_knowledge_items(source_id,business_id,item_type,title,content) values ($1,$2,'faq','Synthetic','Synthetic content')",[source,business]);
  }
  async function snapshot(business){const result={};for(const table of [...tables,'business_memberships','fixture_grants'])result[table]=(await db.query('select * from '+table+' where business_id=$1',[business])).rows;return JSON.stringify(result);}
  const beforeA=await snapshot(A),beforeB=await snapshot(B),grantBefore=(await db.query('select * from fixture_grants order by business_id')).rows;
  const exported=JSON.parse(beforeA);check('synthetic return rows are tenant-bound',Object.values(exported).flat().every(row=>row.business_id===A));
  const checksum=createHash('sha256').update(beforeA).digest('hex');check('synthetic return checksum roundtrips',createHash('sha256').update(JSON.stringify(JSON.parse(beforeA))).digest('hex')===checksum);
  const foreignLead=(await db.query('select id from leads where business_id=$1',[B])).rows[0].id;
  await assert.rejects(db.query("insert into bookings(business_id,lead_id,title) values ($1,$2,'Foreign link')",[A,foreignLead]));checks.push('actual compound foreign key rejects cross-business dependent link');
  async function closeFixture({fail=false}={}){
   return db.transaction(async tx=>{
    const held=await tx.query('select 1 from fixture_holds where business_id=$1',[A]);if(held.rows.length)throw Error('hold');
    const sources=(await tx.query('select storage_path from business_knowledge_sources where business_id=$1',[A])).rows;
    for(const table of ['actions','bookings','lead_history','business_knowledge_items','business_knowledge_sources','leads']){
     await tx.query('delete from '+table+' where business_id=$1',[A]);
     if(fail&&table==='bookings')throw Error('injected failure');
    }
    for(const row of sources)await tx.query('insert into fixture_file_outbox values ($1,$2)',[A,row.storage_path]);
    await tx.query('delete from business_memberships where business_id=$1',[A]);
    await tx.query('insert into fixture_closure_audit values ($1)',[A]);
   });
  }
  await assert.rejects(closeFixture({fail:true}),/injected failure/);check('mid-operation failure restores every target row',await snapshot(A)===beforeA);check('failed operation has no file task or success audit',(await db.query('select 1 from fixture_file_outbox union all select 1 from fixture_closure_audit')).rows.length===0);
  await db.query('insert into fixture_holds values ($1)',[A]);await assert.rejects(closeFixture(),/hold/);check('retention hold blocks all deletion',await snapshot(A)===beforeA);await db.query('delete from fixture_holds where business_id=$1',[A]);
  await db.exec('create table fixture_uncovered_dependency(lead_id bigint references leads(id) on delete restrict)');
  await db.query('insert into fixture_uncovered_dependency select id from leads where business_id=$1',[A]);
  await assert.rejects(closeFixture());check('uncovered restrictive dependency rolls back instead of partial closure',await snapshot(A)===beforeA&&(await db.query('select 1 from fixture_file_outbox union all select 1 from fixture_closure_audit')).rows.length===0);
  await db.exec('drop table fixture_uncovered_dependency');
  await closeFixture();check('all targeted synthetic dependent records removed',(await Promise.all(tables.map(async name=>(await db.query('select count(*)::int as n from '+name+' where business_id=$1',[A])).rows[0].n))).every(n=>n===0));
  check('other business including membership unchanged',await snapshot(B)===beforeB);
  check('shared Auth identity retained',(await db.query('select 1 from auth.users where id=$1',[U])).rows.length===1);
  check('original synthetic grants unchanged',JSON.stringify((await db.query('select * from fixture_grants order by business_id')).rows)===JSON.stringify(grantBefore));
  const outbox=(await db.query('select * from fixture_file_outbox')).rows;check('external file deletion only queued after committed DB changes',outbox.length===1&&outbox[0].business_id===A&&outbox[0].path.startsWith(A+'/'));
  return {syntheticOnly:true,networkUsed:false,sourceDDL:'selected repository table definitions plus explicit fixture controls',dataTables:tables.length,checks,storageBytesDeleted:false,authAccountDeleted:false,liveClosureAccepted:false};
 }finally{await db.close();}
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])console.log(JSON.stringify(await rehearseClosure()));
