import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const business = '10000000-0000-4000-8000-000000000001';
const foreign = '10000000-0000-4000-8000-000000000002';
const owner = '20000000-0000-4000-8000-000000000001';
const staff = '20000000-0000-4000-8000-000000000002';
const otherOwner = '20000000-0000-4000-8000-000000000003';
const proposal = new URL('../docs/colzo-pilot-review/qa-role-operator.PROPOSED.sql', import.meta.url);

async function fixture(t) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create role colzo_pilot_operator nologin noinherit;
    create schema auth; create schema colzo_pilot_private;
    grant usage on schema colzo_pilot_private to colzo_pilot_operator;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    create table auth.mfa_factors(user_id uuid references auth.users, status text);
    create table public.businesses(id uuid primary key);
    create table public.business_memberships(
      business_id uuid references public.businesses, user_id uuid references auth.users,
      role text, primary key(business_id,user_id));
    create table public.colzo_pilot_access(
      business_id uuid primary key, status text, activated_at timestamptz, expires_at timestamptz);
    create table colzo_pilot_private.invitations(
      business_id uuid, accepted_by uuid, status text, expires_at timestamptz);
    create table colzo_pilot_private.audit(
      request_key text primary key, business_id uuid, actor uuid, action text,
      payload jsonb, result jsonb, recorded_at timestamptz default clock_timestamp());
    insert into auth.users values
      ('${owner}','owner@example.invalid',now()),
      ('${staff}','owner+colzoqa2@example.invalid',now()),
      ('${otherOwner}','other@example.invalid',now());
    insert into auth.mfa_factors values ('${owner}','verified'),('${staff}','verified');
    insert into public.businesses values ('${business}'),('${foreign}');
    insert into public.business_memberships values
      ('${business}','${owner}','owner'),('${business}','${staff}','member'),
      ('${foreign}','${otherOwner}','owner');
    insert into public.colzo_pilot_access values
      ('${business}','active',now()-interval '1 hour',now()+interval '335 hours');
    insert into colzo_pilot_private.invitations values ('${business}','${staff}','accepted',now()+interval '1 day');
    select set_config('colzo.qa_project_ref','mvwseobgkexzpmmkgcxe',false);
  `);
  // Exercise the actual shared replay/lock helpers used by the proposed operator.
  const operators = await readFile(new URL('../docs/colzo-pilot-review/pilot-provisioning.STAGED.sql', import.meta.url), 'utf8');
  for (const name of ['replay', 'lock_active']) {
    const start = operators.indexOf(`CREATE FUNCTION colzo_pilot_private.${name}(`);
    const end = operators.indexOf('END$$;', start) + 'END$$;'.length;
    assert.ok(start >= 0 && end > start);
    await db.exec(operators.slice(start, end));
  }
  const sql = await readFile(proposal, 'utf8').catch(error => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });
  await db.exec(sql);
  return db;
}

async function changeRole(db, overrides = {}) {
  const args = {
    business, owner, staff, expected: 'member', next: 'admin',
    key: 'qa-role-1', evidence: 'Owner approved fictional role testing', ...overrides
  };
  await db.exec('set role colzo_pilot_operator');
  try {
    const result = await db.query(
      'select colzo_pilot_private.set_qa_role($1,$2,$3,$4,$5,$6,$7) as receipt',
      [args.business,args.owner,args.staff,args.expected,args.next,args.key,args.evidence]
    );
    return result.rows[0].receipt;
  } finally {
    await db.exec('reset role');
  }
}

test('audited operator promotes an accepted fictional member and can restore member role', async t => {
  const db = await fixture(t);
  const before = await db.query('select * from public.colzo_pilot_access');
  const receipt = await changeRole(db);
  assert.equal(receipt.role, 'admin');
  assert.equal(receipt.previous_role, 'member');
  assert.equal((await db.query('select count(*)::int as count from colzo_pilot_private.audit')).rows[0].count, 1);
  await changeRole(db, {expected:'admin',next:'member',key:'qa-role-restore'});
  assert.equal((await db.query('select role from public.business_memberships where user_id=$1',[staff])).rows[0].role, 'member');
  assert.deepEqual((await db.query('select * from public.colzo_pilot_access')).rows, before.rows);
});

test('role retries are idempotent and conflicting reuse or stale expectations cannot change access', async t => {
  const db = await fixture(t);
  const receipt = await changeRole(db);
  assert.deepEqual(await changeRole(db), receipt);
  await assert.rejects(changeRole(db,{next:'member'}), /invalid role transition|idempotency conflict/);
  await assert.rejects(changeRole(db,{key:'different-key'}), /role changed/);
  assert.equal((await db.query('select count(*)::int as count from colzo_pilot_private.audit')).rows[0].count, 1);
});

test('ordinary app and service roles cannot execute the operator capability', async t => {
  const db = await fixture(t);
  for (const role of ['anon','authenticated','service_role']) {
    const permission = await db.query("select has_function_privilege($1,'colzo_pilot_private.set_qa_role(uuid,uuid,uuid,text,text,text,text)','execute') as allowed",[role]);
    assert.equal(permission.rows[0].allowed, false, role);
  }
});

test('operator refuses foreign actors, foreign memberships and owner escalation', async t => {
  const db = await fixture(t);
  await assert.rejects(changeRole(db,{owner:otherOwner}), /verified owner/);
  await assert.rejects(changeRole(db,{business:foreign}), /pilot|active/);
  await assert.rejects(changeRole(db,{staff:owner}), /QA recipient|verified QA/);
  await assert.rejects(changeRole(db,{next:'owner'}), /invalid role transition/);
  await db.exec(`insert into public.business_memberships values ('${foreign}','${staff}','member')`);
  await assert.rejects(changeRole(db), /one business/);
});

test('confirmed email, verified MFA and an accepted same-business invitation are required', async t => {
  const db = await fixture(t);
  await db.exec(`update auth.users set email_confirmed_at=null where id='${staff}'`);
  await assert.rejects(changeRole(db), /verified QA/);
  await db.exec(`update auth.users set email_confirmed_at=now() where id='${staff}'; update auth.mfa_factors set status='unverified' where user_id='${staff}'`);
  await assert.rejects(changeRole(db), /verified QA/);
  await db.exec(`update auth.mfa_factors set status='verified'; update colzo_pilot_private.invitations set status='pending'`);
  await assert.rejects(changeRole(db), /accepted invitation/);
});

test('non-QA identities and absent membership cannot be promoted', async t => {
  const db = await fixture(t);
  await db.exec(`update auth.users set email='customer@example.invalid' where id='${staff}'`);
  await assert.rejects(changeRole(db), /verified QA/);
  await db.exec(`update auth.users set email='owner+colzoqa2@example.invalid' where id='${staff}'; delete from public.business_memberships where user_id='${staff}'`);
  await assert.rejects(changeRole(db), /one business/);
});

test('expired or revoked grants prevent role changes and the existing seat limit is preserved', async t => {
  const db = await fixture(t);
  await db.exec("update public.colzo_pilot_access set status='revoked'");
  await assert.rejects(changeRole(db), /pilot|active/);
  await db.exec("update public.colzo_pilot_access set status='active',activated_at=now()-interval '15 days',expires_at=now()-interval '1 day'");
  await assert.rejects(changeRole(db), /pilot|active/);
  await db.exec(`update public.colzo_pilot_access set activated_at=now(),expires_at=now()+interval '14 days'; insert into public.business_memberships values ('${business}','${otherOwner}','member')`);
  await assert.rejects(changeRole(db), /seat capacity/);
});

test('audit failure rolls back the role update', async t => {
  const db = await fixture(t);
  await db.exec("alter table colzo_pilot_private.audit add constraint deny_fixture_audit check(action <> 'qa_role_changed')");
  await assert.rejects(changeRole(db), /deny_fixture_audit/);
  assert.equal((await db.query('select role from public.business_memberships where user_id=$1',[staff])).rows[0].role,'member');
  assert.equal((await db.query('select count(*)::int as count from colzo_pilot_private.audit')).rows[0].count,0);
});

test('operator requires an explicit Development project assertion and approval evidence', async t => {
  const db = await fixture(t);
  await db.exec("select set_config('colzo.qa_project_ref','',false)");
  await assert.rejects(changeRole(db), /Development project assertion/);
  await db.exec("select set_config('colzo.qa_project_ref','mvwseobgkexzpmmkgcxe',false)");
  await assert.rejects(changeRole(db,{evidence:''}), /approval evidence/);
  await assert.rejects(changeRole(db,{evidence:null}), /approval evidence/);
  await assert.rejects(changeRole(db,{next:null}), /invalid role transition/);
});

test('replaying an old promotion after demotion cannot restore Admin access', async t => {
  const db = await fixture(t);
  await changeRole(db);
  await changeRole(db,{expected:'admin',next:'member',key:'restore-member'});
  await assert.rejects(changeRole(db), /role changed after recorded request/);
  assert.equal((await db.query('select role from public.business_memberships where user_id=$1',[staff])).rows[0].role,'member');
});

test('expiry during audit insertion rolls back both role change and audit receipt', async t => {
  const db = await fixture(t);
  await db.exec(`
    create function expire_qa_grant() returns trigger language plpgsql as $$begin
      update public.colzo_pilot_access set expires_at=clock_timestamp()-interval '1 second';
      return new;
    end$$;
    create trigger expire_during_audit before insert on colzo_pilot_private.audit
      for each row execute function expire_qa_grant();
  `);
  await assert.rejects(changeRole(db), /pilot unavailable/);
  assert.equal((await db.query('select role from public.business_memberships where user_id=$1',[staff])).rows[0].role,'member');
  assert.equal((await db.query('select count(*)::int as count from colzo_pilot_private.audit')).rows[0].count,0);
});
