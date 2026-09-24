// Disposable PostgreSQL verification. Never connects to a remote database.
// PGLITE_MODULE must point to an installed @electric-sql/pglite module.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const migration = await readFile(new URL('../migrations/20260922160645_add_ai_handling_modes.sql', import.meta.url), 'utf8');
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table businesses(id uuid primary key);
create table business_memberships(business_id uuid references businesses(id),user_id uuid,role text);
insert into businesses values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into business_memberships values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','owner');
grant usage on schema public,auth to authenticated,service_role;
grant select on business_memberships to authenticated;
`);
const readMigration = name => readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
await db.exec(await readMigration('20260911230000_create_initial_lead_schema.sql'));
await db.exec("alter table leads add column business_id uuid references businesses(id); alter table leads add column status text default 'New'; create unique index leads_id_business on leads(id,business_id); alter table lead_history add column business_id uuid references businesses(id);");
await db.exec(await readMigration('20260915010000_add_bookings_actions.sql'));
await db.exec(await readMigration('20260916170000_add_business_configuration_onboarding.sql'));
// Load the actual durable handover table and its constraints/policies.
const operations = await readMigration('20260917113857_add_pilot_team_and_handover_operations.sql');
await db.exec('create unique index actions_id_business_id_idx on actions(id,business_id);');
await db.exec(operations.slice(operations.indexOf('create table if not exists public.lead_handovers')));
const hardening = await readMigration('20260916190000_add_pilot_hardening_foundation.sql');
await db.exec(hardening.slice(0, hardening.indexOf('create table if not exists public.public_enquiry_rate_limit_buckets')));
await db.exec('grant all on all tables in schema public to service_role; grant usage,select on all sequences in schema public to service_role;');
await db.exec(migration);
await db.exec(migration); // Forward migration remains rerunnable.
assert.deepEqual((await db.query('select ai_handling_mode from business_configurations')).rows.map(r => r.ai_handling_mode), ['balanced','balanced']);
for (const mode of ['human_first','balanced','ai_first']) await db.query('update business_configurations set ai_handling_mode=$1', [mode]);
await assert.rejects(db.query("update business_configurations set ai_handling_mode='invalid'"));
await assert.rejects(db.query('update business_configurations set ai_handling_mode=null'));
await db.exec("set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',false);");
assert.equal((await db.query('select * from business_configurations')).rows.length, 1);
assert.equal((await db.query("select * from business_configurations where business_id='00000000-0000-4000-8000-000000000002'")).rows.length, 0);
await assert.rejects(db.query("update business_configurations set ai_handling_mode='human_first'"));
await assert.rejects(db.query("select save_public_enquiry('00000000-0000-4000-8000-000000000002','{}','balanced',null)"));
await db.exec('reset role; set role anon;');
await assert.rejects(db.query('select * from business_configurations'));
await assert.rejects(db.query("select save_public_enquiry('00000000-0000-4000-8000-000000000001','{}','balanced',null)"));
await db.exec('reset role; set role service_role;');
const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002';
const lead = { phone:'07000000000', name:'Test customer', job_type:'Kitchen rewire', description:'Kitchen rewire enquiry', priority:'High' };
const save = (business, reason, description=lead.description) => db.query('select save_public_enquiry($1,$2,$3,$4) as saved',[business,JSON.stringify({...lead,description}),'human_first',reason]);
const first = (await save(a,'human_first_mode')).rows[0].saved;
for(let i=0;i<4;i++) assert.equal((await save(a,'human_first_mode')).rows[0].saved.id,first.id);
await save(a,'human_requested','Please call after 5');
await save(a,null,'Contact details follow-up');
for(const table of ['leads','actions','lead_handovers','lead_history']) assert.equal(Number((await db.query(`select count(*) as count from ${table} where business_id=$1`,[a])).rows[0].count),1,table);
assert.match((await db.query('select description from leads where id=$1',[first.id])).rows[0].description,/Kitchen rewire enquiry/);
await save(a,'emergency_or_high_risk');
assert.equal((await db.query('select reason from lead_handovers where business_id=$1',[a])).rows[0].reason,'emergency_or_high_risk');
await save(a,'emergency_or_high_risk');
assert.equal(Number((await db.query('select count(*) as count from business_audit_events where business_id=$1',[a])).rows[0].count),3);
const second=(await save(b,'human_requested')).rows[0].saved;
assert.notEqual(second.id,first.id);
assert.equal(Number((await db.query('select count(*) as count from bookings')).rows[0].count),0);
// A failing action insert rolls back the lead, handover, history and audit too.
await db.exec("reset role; alter table actions add constraint test_failure check (title <> 'Human follow-up requested') not valid; set role service_role;");
await assert.rejects(db.query('select save_public_enquiry($1,$2,$3,$4)',[a,JSON.stringify({...lead,phone:'07111111111'}),'balanced','human_requested']));
assert.equal(Number((await db.query("select count(*) as count from leads where phone='07111111111'")).rows[0].count),0);
await db.close();
console.log('PASS: migration rerun, defaults, allowlist, RLS isolation, denied client RPC/writes, retry deduplication, context preservation, escalation, tenant separation, no bookings, transactional rollback.');
