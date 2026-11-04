"""Explicitly invoked synthetic acceptance for an EMPTY, socket-only disposable cluster.

Never uses a network host, Supabase URL, credentials or shared database.
Requires PostgreSQL client binaries supplied by the caller; installs nothing.
"""
import argparse
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time

parser = argparse.ArgumentParser()
parser.add_argument('--bin', required=True)
parser.add_argument('--socket', required=True)
parser.add_argument('--database', required=True)
args = parser.parse_args()
if not re.fullmatch(r'colzo_disposable_[a-z_]+', args.database):
    parser.error('only explicitly disposable databases are supported')
if not args.socket.startswith('/tmp/colzo-pg-') or not Path(args.socket).is_dir():
    parser.error('a private disposable Unix socket directory is required')
if os.stat(args.socket).st_mode & 0o077:
    parser.error('socket directory must be private (0700)')
root = Path(__file__).resolve().parent.parent
env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
base = [str(Path(args.bin) / 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
        '-h', args.socket, '-p', '55432', '-d', args.database]
checks = []


def query(sql, allowed_failure=False, database=None):
    command = base if database is None else base[:-1] + [database]
    result = subprocess.run(command + ['-c', sql], capture_output=True, text=True, env=env, timeout=15)
    if result.returncode and not allowed_failure:
        raise AssertionError(result.stderr)
    return result


def scalar(sql):
    return query(sql).stdout.strip()


def check(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)


def race(sqls, hold_sql, first_must_wait=False):
    # A separate backend holds the row so workers must overlap in the database.
    holder = subprocess.Popen(base, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, text=True, env=env)
    try:
        holder.stdin.write('BEGIN;\n' + hold_sql + ';\n')
        holder.stdin.flush()
        if not holder.stdout.readline().strip():
            raise AssertionError('holder failed before acquiring the test lock')
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(sqls)) as pool:
            if first_must_wait:
                jobs = [pool.submit(query, sqls[0], True)]
                deadline = time.monotonic() + 1.5
                waiting = 0
                while time.monotonic() < deadline:
                    waiting = int(scalar("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'"))
                    if waiting >= 1:
                        break
                    time.sleep(0.02)
                check('first backend waits before competing writers start', waiting >= 1)
                jobs += [pool.submit(query, sql, True) for sql in sqls[1:]]
            else:
                jobs = [pool.submit(query, sql, True) for sql in sqls]
            waiting = 0
            deadline = time.monotonic() + 1.5
            while time.monotonic() < deadline:
                waiting = int(scalar("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'"))
                if waiting >= 2:
                    break
                time.sleep(0.02)
            check('independent backends actually waited concurrently', waiting >= 2)
            holder.stdin.write('COMMIT;\n\\q\n')
            holder.stdin.flush()
            results = [job.result() for job in jobs]
        holder.communicate(timeout=5)
        if holder.returncode:
            raise AssertionError('lock holder failed')
        return results
    finally:
        if holder.poll() is None:
            holder.terminate()
            holder.communicate(timeout=5)


if scalar('SHOW listen_addresses') != '':
    raise AssertionError('database must have TCP disabled')
if scalar("SELECT count(*) FROM pg_tables WHERE schemaname='public'") != '0':
    raise AssertionError('database must be empty before installing synthetic fixtures')
for name in ['tests/fixtures/colzo-pilot-postgres-bootstrap.sql',
             'supabase/migrations/20260916180000_add_business_creation_and_public_routes.sql',
             'docs/colzo-pilot-review/scoped-pilot-access.STAGED.sql',
             'docs/colzo-pilot-review/pilot-expiry-enforcement.STAGED.sql',
             'docs/colzo-pilot-review/pilot-provisioning.STAGED.sql',
             'docs/colzo-pilot-review/pilot-workspace-provisioning.STAGED.sql']:
    query((root / name).read_text())

A, B = ['10000000-0000-4000-8000-00000000000' + str(i) for i in (1, 2)]
U, V = ['20000000-0000-4000-8000-00000000000' + str(i) for i in (1, 2)]
W = '20000000-0000-4000-8000-000000000003'
Z = '20000000-0000-4000-8000-000000000004'
grant_a = f"SELECT colzo_pilot_private.grant_access('{A}','{U}','concurrent-grant','synthetic verified ownership')"
results = race([grant_a] * 8, f"SELECT id FROM businesses WHERE id='{A}' FOR UPDATE")
check('eight identical grant requests return one unchanged result', all(r.returncode == 0 for r in results) and len({r.stdout for r in results}) == 1)
check('grant audit is unique', scalar("SELECT count(*) FROM colzo_pilot_private.audit WHERE action='granted'") == '1')

invites = [f"SELECT colzo_pilot_private.invite('{A}','{U}','member{i}@example.invalid','{i+1:064x}','invite-{i}')" for i in range(8)]
results = race(invites, f"SELECT id FROM businesses WHERE id='{A}' FOR UPDATE")
check('eight competing invitations allocate exactly one remaining seat', sum(r.returncode == 0 for r in results) == 1 and all(r.returncode == 0 or 'seat capacity' in r.stderr for r in results))
email = scalar('SELECT invited_email FROM colzo_pilot_private.invitations')
token = scalar('SELECT token_hash FROM colzo_pilot_private.invitations')
query(f"INSERT INTO auth.users VALUES('{W}','{email}',now())")
accept = f"SELECT colzo_pilot_private.accept_invite('{A}','{W}','{token}','accept-replay')"
results = race([accept] * 8, f"SELECT id FROM businesses WHERE id='{A}' FOR UPDATE")
check('eight concurrent acceptance retries are idempotent', all(r.returncode == 0 for r in results) and len({r.stdout for r in results}) == 1)
check('acceptance audit and two-seat limit persist', scalar(f"SELECT count(*) FROM business_memberships WHERE business_id='{A}'") == '2' and scalar("SELECT count(*) FROM colzo_pilot_private.audit WHERE action='accepted'") == '1')

query(f"SELECT colzo_pilot_private.grant_access('{B}','{V}','grant-b','synthetic verified ownership')")
users = ['30000000-0000-4000-8000-' + f'{i+1:012d}' for i in range(8)]
for i, user in enumerate(users):
    query(f"INSERT INTO auth.users VALUES('{user}','legacy{i}@example.invalid',now())")
results = race([f"INSERT INTO business_memberships VALUES('{B}','{user}','member')" for user in users],
               f"SELECT id FROM businesses WHERE id='{B}' FOR UPDATE")
check('legacy concurrent membership writers cannot allocate a third seat', sum(r.returncode == 0 for r in results) == 1 and scalar(f"SELECT count(*) FROM business_memberships WHERE business_id='{B}'") == '2')

query(f"INSERT INTO auth.users VALUES('{Z}','new-owner@example.invalid',now())")
requests = [f"SELECT colzo_pilot_private.provision_workspace('{Z}','Synthetic race','Service','synthetic-race-{i}','workspace-{i}','synthetic reviewed ownership')" for i in range(8)]
results = race(requests, f"SELECT id FROM auth.users WHERE id='{Z}' FOR UPDATE")
check('different concurrent workspace requests create one owner workspace', sum(r.returncode == 0 for r in results) == 1 and scalar(f"SELECT count(*) FROM business_memberships WHERE user_id='{Z}'") == '1')
check('failed competing creation leaves no orphan businesses', scalar('SELECT count(*) FROM businesses') == '3')

query(f"UPDATE colzo_pilot_access SET activated_at=now()-interval '15 days',expires_at=now()-interval '1 day' WHERE business_id='{A}'")
def readable(user):
    return scalar(f"BEGIN;SET LOCAL ROLE authenticated;SELECT set_config('request.jwt.claim.sub','{user}',true);SELECT count(*) FROM leads;ROLLBACK").splitlines()[-1]
check('expired A cannot read directly while independent active B can', readable(U) == '0' and readable(V) == '1')

query(f"INSERT INTO auth.users VALUES('40000000-0000-4000-8000-000000000001','rollback@example.invalid',now())")
query("BEGIN;SELECT colzo_pilot_private.provision_workspace('40000000-0000-4000-8000-000000000001','Synthetic rollback','Service','synthetic-rollback','rollback-request','synthetic reviewed ownership');ROLLBACK")
check('transaction rollback leaves no new business or owner membership', scalar('SELECT count(*) FROM businesses') == '3' and scalar("SELECT count(*) FROM business_memberships WHERE user_id='40000000-0000-4000-8000-000000000001'") == '0')

owners = ['50000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002']
shared = '50000000-0000-4000-8000-000000000003'
query(f"INSERT INTO auth.users VALUES('{shared}','shared-member@example.invalid',now())")
cross = []
for i, owner in enumerate(owners):
    query(f"INSERT INTO auth.users VALUES('{owner}','cross-owner{i}@example.invalid',now())")
    business = json.loads(scalar(f"SELECT colzo_pilot_private.provision_workspace('{owner}','Synthetic cross {i}','Service','synthetic-cross-{i}','cross-workspace-{i}','synthetic verified ownership')"))['business_id']
    token = f'{i+100:064x}'
    query(f"SELECT colzo_pilot_private.invite('{business}','{owner}','shared-member@example.invalid','{token}','cross-invite-{i}')")
    cross.append(f"SELECT colzo_pilot_private.accept_invite('{business}','{shared}','{token}','cross-accept-{i}')")
results = race(cross, f"SELECT id FROM auth.users WHERE id='{shared}' FOR UPDATE")
check('same verified recipient cannot join two businesses concurrently', sum(r.returncode == 0 for r in results) == 1 and scalar(f"SELECT count(*) FROM business_memberships WHERE user_id='{shared}'") == '1')

# New negative cases also cover legacy destinations, not just pilot targets.
legacy = '60000000-0000-4000-8000-000000000001'
query(f"INSERT INTO businesses(id) VALUES('{legacy}')")
legacy_add = f"INSERT INTO business_memberships VALUES('{legacy}','{U}','member')"
denied = query(legacy_add, True)
check('legacy destination rejects an existing expired pilot member', denied.returncode != 0 and 'cross business membership' in denied.stderr)
results = race([legacy_add] * 8, f"SELECT id FROM auth.users WHERE id='{U}' FOR UPDATE")
check('eight legacy writers cannot add an existing pilot member', all(r.returncode != 0 and 'cross business membership' in r.stderr for r in results))

recipient = '60000000-0000-4000-8000-000000000002'
owner = '60000000-0000-4000-8000-000000000003'
query(f"INSERT INTO auth.users VALUES('{recipient}','mixed-recipient@example.invalid',now()),('{owner}','mixed-owner@example.invalid',now())")
business = json.loads(scalar(f"SELECT colzo_pilot_private.provision_workspace('{owner}','Synthetic mixed','Service','synthetic-mixed','mixed-workspace','synthetic verified ownership')"))['business_id']
query(f"SELECT colzo_pilot_private.invite('{business}','{owner}','mixed-recipient@example.invalid','{'e'*64}','mixed-invite')")
results = race([f"SELECT colzo_pilot_private.accept_invite('{business}','{recipient}','{'e'*64}','mixed-accept')",
                f"INSERT INTO business_memberships VALUES('{legacy}','{recipient}','member')"],
               f"SELECT id FROM auth.users WHERE id='{recipient}' FOR UPDATE")
check('pilot acceptance racing a legacy destination permits one membership only', sum(r.returncode == 0 for r in results) == 1 and scalar(f"SELECT count(*) FROM business_memberships WHERE user_id='{recipient}'") == '1')

query(f"DELETE FROM business_memberships WHERE business_id='{A}' AND user_id='{U}'")
before = scalar('SELECT count(*) FROM businesses')
restart = query(f"SELECT colzo_pilot_private.provision_workspace('{U}','Synthetic restart','Service','synthetic-restart','restart-workspace','synthetic verified ownership')", True)
check('expired owner cannot restart pilot through atomic workspace creation', restart.returncode != 0 and 'owner already received pilot access' in restart.stderr and scalar('SELECT count(*) FROM businesses') == before)

transition_business = '70000000-0000-4000-8000-000000000001'
transition_owner = '70000000-0000-4000-8000-000000000002'
query(f"INSERT INTO auth.users VALUES('{transition_owner}','transition-owner@example.invalid',now())")
query(f"INSERT INTO businesses(id) VALUES('{transition_business}');INSERT INTO business_memberships VALUES('{transition_business}','{transition_owner}','owner')")
transition_users = ['70000000-0000-4000-8000-' + f'{i+10:012d}' for i in range(8)]
for i, user in enumerate(transition_users):
    query(f"INSERT INTO auth.users VALUES('{user}','transition-{i}@example.invalid',now())")
transition_grant = f"SELECT colzo_pilot_private.grant_access('{transition_business}','{transition_owner}','transition-grant','synthetic verified ownership')"
results = race([transition_grant] + [f"INSERT INTO business_memberships VALUES('{transition_business}','{user}','member')" for user in transition_users],
               f"SELECT id FROM businesses WHERE id='{transition_business}' FOR UPDATE", first_must_wait=True)
check('designation transition serializes against eight legacy writers', results[0].returncode == 0 and sum(r.returncode == 0 for r in results[1:]) == 1 and scalar(f"SELECT count(*) FROM business_memberships WHERE business_id='{transition_business}'") == '2')

for isolation in ['REPEATABLE READ', 'SERIALIZABLE']:
    denied = query(f"BEGIN ISOLATION LEVEL {isolation};SELECT colzo_pilot_private.grant_access('{A}','{U}','isolation-denied','synthetic verified ownership');COMMIT", True)
    check('operator rejects stale snapshot mode: ' + isolation, denied.returncode != 0 and 'read committed required' in denied.stderr)
    denied = query(f"BEGIN ISOLATION LEVEL {isolation};INSERT INTO business_memberships VALUES('{legacy}','{U}','member');COMMIT", True)
    check('legacy writer rejects stale snapshot mode: ' + isolation, denied.returncode != 0 and 'read committed required' in denied.stderr)

for case in range(3):
    owner = '80000000-0000-4000-8000-' + f'{case * 2 + 1:012d}'
    recipient = '80000000-0000-4000-8000-' + f'{case * 2 + 2:012d}'
    email = f'deadline-{case}@example.invalid'
    token = hashlib.sha256(f'colzo-native-deadline-{case}'.encode()).hexdigest()
    query(f"INSERT INTO auth.users VALUES('{owner}','deadline-owner-{case}@example.invalid',now()),('{recipient}','{email}',now())")
    business = json.loads(scalar(f"SELECT colzo_pilot_private.provision_workspace('{owner}','QA deadline {case}','Fictional service','qa-deadline-{case}','deadline-workspace-{case}','synthetic verified ownership')"))['business_id']
    accepting = case > 0
    if accepting:
        query(f"SELECT colzo_pilot_private.invite('{business}','{owner}','{email}','{token}','deadline-invite-{case}')")
    action = 'accepted' if accepting else 'invited'
    query(f"CREATE FUNCTION colzo_pilot_private.delay_deadline_{case}() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.action='{action}' AND NEW.business_id='{business}' THEN PERFORM pg_sleep(0.8); END IF; RETURN NEW; END$$; CREATE TRIGGER delay_deadline_{case} BEFORE INSERT ON colzo_pilot_private.audit FOR EACH ROW EXECUTE FUNCTION colzo_pilot_private.delay_deadline_{case}()")
    if case == 2:
        query(f"UPDATE colzo_pilot_private.invitations SET expires_at=clock_timestamp()+interval '0.5 seconds' WHERE token_hash='{token}'")
    else:
        query(f"WITH t AS (SELECT clock_timestamp()+interval '0.5 seconds' expiry) UPDATE colzo_pilot_access SET activated_at=t.expiry-interval '336 hours',expires_at=t.expiry FROM t WHERE business_id='{business}'")
    operation = (f"SELECT colzo_pilot_private.accept_invite('{business}','{recipient}','{token}','deadline-accept-{case}')" if accepting
                 else f"SELECT colzo_pilot_private.invite('{business}','{owner}','{email}','{token}','deadline-invite-{case}')")
    result = query(operation, True)
    expected_error = 'invitation unavailable' if case == 2 else 'pilot unavailable'
    check('deadline crossed during audit rolls back: ' + str(case), result.returncode != 0 and expected_error in result.stderr
          and scalar(f"SELECT count(*) FROM business_memberships WHERE user_id='{recipient}'") == '0'
          and scalar(f"SELECT count(*) FROM colzo_pilot_private.audit WHERE business_id='{business}' AND action='{action}'") == '0'
          and scalar(f"SELECT count(*) FROM colzo_pilot_private.invitations WHERE token_hash='{token}' AND status='pending'") == ('1' if accepting else '0'))

# Restore synthetic SQL/data/ACL/RLS into another empty disposable database.
# Cluster roles are retained in this local test, not claimed as an Auth backup.
dump = subprocess.run([str(Path(args.bin) / 'pg_dump'), '-h', args.socket, '-p', '55432',
                       '-d', args.database, '--format=custom'], capture_output=True, env=env, timeout=20)
if dump.returncode:
    raise AssertionError(dump.stderr.decode())
restored_name = args.database + '_restored'
created = subprocess.run([str(Path(args.bin) / 'createdb'), '-h', args.socket, '-p', '55432',
                          '--template=template0', restored_name], capture_output=True, env=env, timeout=10)
if created.returncode:
    raise AssertionError(created.stderr.decode())
restore = subprocess.run([str(Path(args.bin) / 'pg_restore'), '-h', args.socket, '-p', '55432',
                          '-d', restored_name, '--exit-on-error'], input=dump.stdout, capture_output=True, env=env, timeout=20)
if restore.returncode:
    raise AssertionError(restore.stderr.decode())
for table in ['businesses', 'business_memberships', 'leads', 'colzo_pilot_access',
              'colzo_pilot_private.audit', 'colzo_pilot_private.invitations']:
    check('restored row count: ' + table, scalar('SELECT count(*) FROM ' + table) == query('SELECT count(*) FROM ' + table, database=restored_name).stdout.strip())
restored_reads = query(f"BEGIN;SET LOCAL ROLE authenticated;SELECT set_config('request.jwt.claim.sub','{U}',true);SELECT count(*) FROM leads;ROLLBACK", database=restored_name).stdout.strip().splitlines()[-1]
check('restored RLS still denies expired A', restored_reads == '0')
check('restored operator privileges remain denied to browser role', query("SELECT has_function_privilege('authenticated','colzo_pilot_private.grant_access(uuid,uuid,text,text)','EXECUTE')", database=restored_name).stdout.strip() == 'f')

print(json.dumps({'status': 'PASS', 'checks': len(checks), 'postgres_version': scalar('SHOW server_version'),
                  'backend_races': 9, 'workers_per_race': [8, 8, 8, 8, 8, 2, 8, 2, 9], 'shared_database_used': False,
                  'dump_restore_verified': True,
                  'evidence': checks}, indent=2))
