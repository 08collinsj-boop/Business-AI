/* Optional isolated PostgreSQL-17-compatible migration/constraints test.
   Uses an in-memory PGlite database with ONLY fabricated tenant data.
   No Supabase URLs, customer accounts or production credentials are used. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase/migrations/20261012235500_add_colzo_projects_quotes.sql');
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const expectSqlError = async (db,sql,expected)=>{
  let thrown=false;
  try { await db.query(sql); }
  catch(error){thrown=true;assert.match(String(error.message),expected,`unexpected SQL rejection: ${sql}`);}
  assert.ok(thrown,`Should have rejected: ${sql}`);
};
const assertRows=async(db,sql,expected)=>assert.equal((await db.query(sql)).rows.length,expected,sql);
async function run(){
  const db=new PGlite();
  let completed=0;
  const step=(description)=>{completed++;console.log(`PASS ${String(completed).padStart(2,'0')} ${description}`);};
  try{
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role with bypassrls;
      create table public.businesses(id uuid primary key);
      create table public.leads(
        id bigint primary key,
        business_id uuid not null references public.businesses(id),
        unique(id,business_id)
      );
      insert into public.businesses(id) values ('${A}'),('${B}');
      insert into public.leads(id,business_id) values (101,'${A}'),(202,'${B}');
    `);
    const sql=fs.readFileSync(MIGRATION,'utf8');
    assert.ok(!/truncate|drop\s+table|delete\s+from/i.test(sql));
    await db.exec(sql);
    step('Migration applies cleanly to isolated PostgreSQL 17.5 engine');
    await db.exec(sql);
    step('Migration is repeatable without resetting existing tables or records');
    const tables=['colzo_projects','colzo_quotes','colzo_clients'];
    const flags=(await db.query(`select relname, relrowsecurity from pg_class where relname like 'colzo_%' order by relname`)).rows;
    for(const table of tables)assert.ok(flags.find(x=>x.relname===table&&x.relrowsecurity),`${table} RLS enabled`);
    step('Projects, quotes and clients all have row-level security switched on');
    for(const name of tables){
      const grants=(await db.query(`select has_table_privilege('anon','public.${name}','SELECT') as anon_read,has_table_privilege('authenticated','public.${name}','INSERT') as member_write,has_table_privilege('service_role','public.${name}','SELECT,INSERT,UPDATE') as server_only`)).rows[0];
      assert.equal(grants.anon_read,false,name+' public read');
      assert.equal(grants.member_write,false,name+' direct user write');
      assert.equal(grants.server_only,true,name+' trusted service role');
    }
    step('Anonymous and direct authenticated-table privileges are denied; service role is allowed');
    await db.query('set role authenticated');
    await expectSqlError(db,'select * from public.colzo_clients',/permission denied/);
    await expectSqlError(db,`insert into public.colzo_projects(business_id,title) values('${A}','Forbidden direct insert')`,/permission denied/);
    await db.query('reset role');
    step('Authenticated role cannot read or insert protected tables using SQL');
    await db.exec(`insert into public.colzo_projects(business_id,lead_id,title,status,progress) values('${A}',101,'Test electrical project','active',30)`);
    await assertRows(db,'select id from public.colzo_projects',1);
    step('Linked project can be created for the matching tenant');
    await expectSqlError(db,`insert into public.colzo_projects(business_id,lead_id,title) values('${B}',101,'Cross tenant project')`,/foreign key constraint/);
    await expectSqlError(db,`insert into public.colzo_quotes(business_id,lead_id,title,amount_gbp) values('${B}',101,'Wrong tenant quote',150.00)`,/foreign key constraint/);
    step('Database composite foreign keys reject cross-business lead associations');
    await expectSqlError(db,`insert into public.colzo_projects(business_id,title,progress) values('${A}','Bad progress',101)`,/check constraint/);
    await expectSqlError(db,`insert into public.colzo_projects(business_id,title,status) values('${A}','Bad status','deleted')`,/check constraint/);
    await expectSqlError(db,`insert into public.colzo_quotes(business_id,lead_id,title,amount_gbp) values('${A}',101,'Bad amount',-1)`,/check constraint/);
    await expectSqlError(db,`insert into public.colzo_clients(business_id,full_name) values('${A}','X')`,/check constraint/);
    step('Progress, status, money and contact name constraints reject invalid data');
    await db.exec(`
      insert into public.colzo_clients(business_id,full_name,email) values('${A}','Mock Customer','mock@example.invalid');
      insert into public.colzo_quotes(business_id,lead_id,title,amount_gbp) values('${A}',101,'Private draft quote',199.99);
    `);
    const quote=(await db.query('select amount_gbp,status from public.colzo_quotes limit 1')).rows[0];
    assert.equal(String(quote.amount_gbp),'199.99');assert.equal(quote.status,'draft');
    step('GBP decimals and draft status persist correctly in the isolated DB');
    const project=(await db.query('select id,updated_at from public.colzo_projects limit 1')).rows[0];
    const old=project.updated_at;
    const newer='2026-10-13T12:45:23.000Z';
    const first=await db.query('update public.colzo_projects set progress=60,updated_at=$1 where id=$2 and business_id=$3 and updated_at=$4 returning id', [newer,project.id,A,old]);
    assert.equal(first.rows.length,1);
    const stale=await db.query('update public.colzo_projects set progress=5 where id=$1 and business_id=$2 and updated_at=$3 returning id',[project.id,A,old]);
    assert.equal(stale.rows.length,0);
    const wrongTenant=await db.query('update public.colzo_projects set progress=5 where id=$1 and business_id=$2 returning id',[project.id,B]);
    assert.equal(wrongTenant.rows.length,0);
    step('Atomic version-checked edits reject stale changes and cross-tenant updates');
    const allRows=(await db.query(`select (select count(*)::int from public.colzo_projects) as projects,(select count(*)::int from public.colzo_quotes) as quotes,(select count(*)::int from public.colzo_clients) as clients`)).rows[0];
    assert.deepEqual(allRows,{projects:1,quotes:1,clients:1});
    step('All legitimate mock records remain after rejected writes');
    console.log(`\nSQL smoke PASS: ${completed} checks. Isolated memory-only DB, no real data, no external writes.`);
  } finally{await db.close();}
}
run().catch(error=>{console.error('SQL smoke FAILED:',error.stack||String(error));process.exitCode=1});
