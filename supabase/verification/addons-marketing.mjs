// Disposable PostgreSQL only. No network or remote project configuration.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const a = '00000000-0000-4000-8000-000000000001', b = '00000000-0000-4000-8000-000000000002';
const ua = '00000000-0000-4000-8000-000000000011', ub = '00000000-0000-4000-8000-000000000012';
const migration = await readFile(new URL('../migrations/20260923120000_add_addons_marketing.sql', import.meta.url), 'utf8');
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table businesses(id uuid primary key);
create table business_memberships(business_id uuid references businesses(id), user_id uuid references auth.users(id), role text);
grant usage on schema public,auth to authenticated,service_role;
grant select on business_memberships to authenticated,service_role;
insert into businesses values ('${a}'),('${b}'); insert into auth.users values ('${ua}'),('${ub}');
insert into business_memberships values ('${a}','${ua}','owner'),('${b}','${ub}','member');`);
const hardening = await readFile(new URL('../migrations/20260916190000_add_pilot_hardening_foundation.sql', import.meta.url), 'utf8');
await db.exec(hardening.slice(0, hardening.indexOf('create table if not exists public.public_enquiry_rate_limit_buckets')));
await db.exec('grant insert on business_audit_events to service_role; grant usage,select on all sequences in schema public to service_role;');
// DDL is transactional: a rollback removes all new objects.
await db.exec('begin;'); await db.exec(migration); await db.exec('rollback;');
assert.equal((await db.query("select to_regclass('public.business_feature_entitlements') as table_name")).rows[0].table_name, null);
await db.exec(migration);
await db.exec('set role service_role;');
const grant = (business, key = 'ai_marketing', status = 'active') => db.query('insert into business_feature_entitlements(business_id,feature_key,status,source) values($1,$2,$3,$4)', [business,key,status,'manual']);
await grant(a); await grant(b);
await assert.rejects(grant(a));
await assert.rejects(grant(a,'unknown'));
await assert.rejects(grant(a,'ai_phone'));
await assert.rejects(db.query("update business_feature_entitlements set status='invalid' where business_id=$1",[a]));
await assert.rejects(db.query("update business_feature_entitlements set source='stripe' where business_id=$1",[a]));
const input = { content_type:'social_post', platform:'facebook', tone:'friendly', prompt:'Promote repairs', extra_instructions:'' };
const reserve = async (business = a, actor = ua, hash = 'a'.repeat(64), request = input) => (await db.query('select reserve_marketing_generation($1,$2,$3,$4) as result',[business,actor,JSON.stringify(request),hash])).rows[0].result;
assert.equal((await reserve(b,ua)).reason,'membership');
const first = await reserve(); assert.equal(first.allowed,true);
assert.equal((await reserve()).reason,'rate_limit');
assert.equal((await reserve(a,ua,'b'.repeat(64))).reason,'rate_limit');
assert.equal((await reserve(b,ub)).allowed,true);
await db.exec('reset role;');
assert.equal((await db.query('select count(*)::int as n from business_audit_events')).rows[0].n,2);
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${ua}',false);`);
assert.equal((await db.query('select business_id,feature_key,status from business_feature_entitlements')).rows.length,1);
assert.equal((await db.query('select business_id,feature_key from business_feature_entitlements where business_id=$1',[b])).rows.length,0);
assert.equal((await db.query('select * from marketing_generations')).rows.length,1);
assert.equal((await db.query('select * from marketing_generations where business_id=$1',[b])).rows.length,0);
await assert.rejects(grant(a,'ai_phone','inactive'));
await assert.rejects(db.query("update business_feature_entitlements set status='active' where business_id=$1",[b]));
await assert.rejects(db.query("update marketing_generations set business_id=$1",[b]));
await assert.rejects(reserve());
await db.exec('reset role; set role anon;');
await assert.rejects(db.query('select business_id from business_feature_entitlements'));
await assert.rejects(db.query('select * from marketing_generations'));
await assert.rejects(reserve());
await db.exec('reset role; set role service_role;');
await db.query("update business_feature_entitlements set expires_at=now()-interval '1 second' where business_id=$1",[a]);
assert.equal((await reserve()).reason,'entitlement');
await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${ua}',false);`);
assert.equal((await db.query('select * from marketing_generations')).rows.length,0);
await db.exec('reset role; set role service_role;');
await db.query('update business_feature_entitlements set expires_at=null where business_id=$1',[a]);
// Move attempts beyond burst window to exercise hourly and daily quotas.
for (let i=1;i<10;i++) {
  await db.query("update marketing_generations set created_at=now()-interval '2 minutes' where business_id=$1",[a]);
  assert.equal((await reserve(a,ua,String(i).repeat(64))).allowed,true);
}
await db.query("update marketing_generations set created_at=now()-interval '2 minutes' where business_id=$1",[a]);
assert.equal((await reserve()).reason,'rate_limit');
for (let i=0;i<40;i++) {
  await db.query("update marketing_generations set created_at=now()-interval '2 hours' where business_id=$1",[a]);
  assert.equal((await reserve()).allowed,true);
}
await db.query("update marketing_generations set created_at=now()-interval '2 hours' where business_id=$1",[a]);
assert.equal((await reserve()).reason,'rate_limit');
// A failed insert leaves no reservation; rate window ages out without cleanup.
await db.query("update marketing_generations set created_at=now()-interval '25 hours' where business_id=$1",[a]);
const before = (await db.query('select count(*)::int as n from marketing_generations')).rows[0].n;
await assert.rejects(reserve(a,ua,'z'.repeat(64)));
await assert.rejects(reserve(a,ua,'a'.repeat(64),{...input, platform:'unknown'}));
await assert.rejects(reserve(a,ua,'a'.repeat(64),{...input, prompt:'x'.repeat(2001)}));
assert.equal((await db.query('select count(*)::int as n from marketing_generations')).rows[0].n,before);
assert.equal((await reserve()).allowed,true);
await db.close();
console.log('PASS: DDL rollback/apply, constraints, unique entitlements, audit, tenant/member isolation, denied client writes/RPC, coming-soon rejection, expiry/revocation, stored history RLS, duplicate/burst/hour/day limits, failed-reservation rollback.');
