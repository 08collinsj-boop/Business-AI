"""Native overlapping-backend booking checks on a NEW disposable database only.
Requires an already running private Unix-socket PostgreSQL 17 fixture cluster.
Never connects by TCP, resets a database, or reads actual Development records.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import re
import select
import subprocess
import time

A = '10000000-0000-4000-8000-000000000001'
B = '10000000-0000-4000-8000-000000000002'
ROOT = Path(__file__).resolve().parent.parent


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--bin', required=True)
    p.add_argument('--socket', required=True)
    p.add_argument('--port', default='55433')
    p.add_argument('--user', default='user')
    p.add_argument('--database', required=True)
    p.add_argument('--output', required=True)
    a = p.parse_args()
    sock = Path(a.socket)
    if not str(sock).startswith('/tmp/colzo-') or not sock.is_dir() or sock.stat().st_mode & 0o077:
        p.error('private 0700 disposable Unix socket required')
    if not re.fullmatch(r'colzo_disposable_booking_[0-9_]{1,35}', a.database):
        p.error('new colzo_disposable_booking_<numeric suffix> database required')
    base = [str(Path(a.bin)/'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', str(sock), '-p', a.port, '-U', a.user]
    env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}

    def execute(sql, db=None, app='colzo-booking-inspection', required=True):
        r = subprocess.run(base+['-d', db or a.database], input=sql, capture_output=True, text=True,
                           env={**env, 'PGAPPNAME': app}, timeout=30)
        if required and r.returncode:
            raise RuntimeError(r.stderr)
        return r

    if execute('SHOW listen_addresses;', 'postgres').stdout.strip():
        raise RuntimeError('TCP must be disabled')
    version = execute('SELECT version();', 'postgres').stdout.strip()
    if not version.startswith('PostgreSQL 17.'):
        raise RuntimeError('PostgreSQL 17 required')
    roles = json.loads(execute("SELECT json_agg(json_build_object('role',rolname,'super',rolsuper,'bypass',rolbypassrls)) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role');", 'postgres').stdout)
    if {r['role'] for r in roles} != {'anon','authenticated','service_role'} or any(r['super'] for r in roles):
        raise RuntimeError('expected non-superuser fixture roles required')
    if not next(r['bypass'] for r in roles if r['role']=='service_role'):
        raise RuntimeError('expected service_role fixture required')
    # CREATE must fail if this database already exists; never reuse or reset it.
    execute('CREATE DATABASE '+a.database+';', 'postgres')
    execute((ROOT/'tests/fixtures/colzo-booking-postgres-bootstrap.sql').read_text())
    proposal = (ROOT/'docs/colzo-pilot-review/pilot-idempotent-bookings.STAGED.sql').read_text()
    execute(proposal)
    execute(f"INSERT INTO leads(id,business_id) SELECT n,'{A}'::uuid FROM generate_series(3,8) n;")
    checks = []
    backends = []

    def check(name, passed, details=None):
        checks.append({'name': name, 'pass': bool(passed), **({'details':details} if details is not None else {})})

    def request(lead=1, business=A, role='service_role', pid=False):
        prefix = 'SELECT pg_backend_pid();' if pid else ''
        return f"SET ROLE {role};{prefix}SELECT public.request_colzo_pilot_booking('{business}',{lead},'Repair','Example','','example@example.invalid','Example town','Fictional request');"

    def parsed(r):
        return json.loads(r.stdout.strip().splitlines()[-1])

    def counts(lead):
        q = f"SELECT json_build_array((SELECT count(*) FROM bookings WHERE lead_id={lead}),(SELECT count(*) FROM lead_history WHERE lead_id={lead}),(SELECT count(*) FROM business_audit_events WHERE metadata->>'lead_id'='{lead}'));"
        return json.loads(execute(q).stdout)

    def active():
        execute(f"UPDATE colzo_pilot_access SET status='active',activated_at=now()-interval '1 day',expires_at=now()+interval '13 days' WHERE business_id='{A}';")

    def expiring():
        execute(f"WITH t AS (SELECT clock_timestamp()+interval '3 seconds' AS expiry) UPDATE colzo_pilot_access SET status='active',activated_at=t.expiry-interval '336 hours',expires_at=t.expiry FROM t WHERE business_id='{A}';")

    def expired_wait():
        execute(f"SELECT pg_sleep(greatest(0,extract(epoch FROM (expires_at-clock_timestamp())))+0.1) FROM colzo_pilot_access WHERE business_id='{A}';")

    def holder(sql):
        proc = subprocess.Popen(base+['-d', a.database], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, text=True, env={**env,'PGAPPNAME':'colzo-booking-lock-holder'})
        proc.stdin.write('BEGIN;'+sql+";SELECT 'LOCK_HELD';\n");proc.stdin.flush()
        try:
            deadline=time.monotonic()+10
            buffered=b''
            while True:
                ready,_,_=select.select([proc.stdout],[],[],max(0,deadline-time.monotonic()))
                if not ready:raise RuntimeError('fixture lock was not established')
                chunk=os.read(proc.stdout.fileno(),4096)
                buffered+=chunk
                if b'LOCK_HELD\n' in buffered.replace(b'\r',b''):return proc
                if proc.poll() is not None:raise RuntimeError('fixture lock process ended')
        except BaseException:
            proc.kill();proc.communicate();raise

    def release(proc):
        try:
            out,err=proc.communicate('COMMIT;\n',timeout=10)
            if proc.returncode:raise RuntimeError(err)
        finally:
            if proc.poll() is None:
                proc.kill();proc.communicate(timeout=5)

    def waiting(app, n=1, kind=None):
        deadline=time.monotonic()+10
        while time.monotonic()<deadline:
            filt=" AND wait_event='advisory'" if kind=='advisory' else ''
            q=f"SELECT count(*) FROM pg_stat_activity WHERE datname='{a.database}' AND application_name LIKE '{app}%' AND wait_event_type='Lock'{filt};"
            if int(execute(q).stdout.strip())>=n:return True
            time.sleep(0.03)
        return False

    # Hold the routine's advisory lock until eight independent backends overlap.
    lock=holder(f"SELECT pg_advisory_xact_lock(hashtextextended('colzo-pilot-booking:{A}:1',0))")
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures=[pool.submit(execute,request(pid=True),app='colzo-booking-worker-'+str(i),required=False) for i in range(8)]
        try:overlap=waiting('colzo-booking-worker-',8,'advisory')
        finally:release(lock)
        results=[f.result(timeout=30) for f in futures]
    good=all(r.returncode==0 for r in results)
    values=[parsed(r) for r in results if r.returncode==0]
    backends=[int(r.stdout.strip().splitlines()[0]) for r in results if r.returncode==0]
    check('eight_backends_overlap',overlap and len(set(backends))==8,{'backends':backends})
    check('one_booking_one_history_one_audit',good and len({v['id'] for v in values})==1 and sum(v['created'] for v in values)==1 and counts(1)==[1,1,1],{'counts':counts(1)})

    # Expiry while waiting on the lead row must roll back every write.
    lock=holder('SELECT id FROM leads WHERE id=3 FOR UPDATE')
    expiring()
    with ThreadPoolExecutor(max_workers=1) as pool:
        future=pool.submit(execute,request(3),app='colzo-booking-lead-wait',required=False)
        try:blocked=waiting('colzo-booking-lead-wait');expired_wait()
        finally:release(lock)
        r=future.result(timeout=30)
    check('expiry_after_lead_lock_wait',blocked and r.returncode!=0 and counts(3)==[0,0,0],{'counts':counts(3),'request_exit':r.returncode})

    # An audit delay must not carry a request beyond its final authorization point.
    active()
    execute("CREATE FUNCTION fixture_slow_audit() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.metadata->>'lead_id'='4' THEN PERFORM pg_advisory_xact_lock(886611); END IF; RETURN NEW; END$$;CREATE TRIGGER fixture_audit_delay BEFORE INSERT ON business_audit_events FOR EACH ROW EXECUTE FUNCTION fixture_slow_audit();")
    lock=holder('SELECT pg_advisory_xact_lock(886611)');expiring()
    with ThreadPoolExecutor(max_workers=1) as pool:
        future=pool.submit(execute,request(4),app='colzo-booking-expiry-audit-wait',required=False)
        try:blocked=waiting('colzo-booking-expiry-audit-wait',kind='advisory');expired_wait()
        finally:release(lock)
        r=future.result(timeout=30)
    check('expiry_during_audit_wait',blocked and r.returncode!=0 and counts(4)==[0,0,0],{'counts':counts(4),'request_exit':r.returncode})

    # Revocation waits for the current transaction; later operations fail closed.
    active()
    execute("CREATE FUNCTION fixture_hold_audit() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.metadata->>'lead_id'='5' THEN PERFORM pg_advisory_xact_lock(887711); END IF; RETURN NEW; END$$;CREATE TRIGGER fixture_audit_hold BEFORE INSERT ON business_audit_events FOR EACH ROW EXECUTE FUNCTION fixture_hold_audit();")
    lock=holder('SELECT pg_advisory_xact_lock(887711)')
    with ThreadPoolExecutor(max_workers=2) as pool:
        operation=pool.submit(execute,request(5),app='colzo-booking-audit-wait',required=False)
        try:
            held=waiting('colzo-booking-audit-wait',kind='advisory')
            revoke=pool.submit(execute,f"UPDATE colzo_pilot_access SET status='revoked' WHERE business_id='{A}';",app='colzo-booking-revoke-wait',required=False)
            revoke_waits=waiting('colzo-booking-revoke-wait')
        finally:release(lock)
        operation_result=operation.result(timeout=30);revoke_result=revoke.result(timeout=30)
    denied=execute(request(6),required=False)
    check('revocation_serializes_and_denies_later_request',held and revoke_waits and operation_result.returncode==0 and revoke_result.returncode==0 and denied.returncode!=0 and counts(6)==[0,0,0])

    # A permitted older writer can win the unique index; RPC must reuse its row.
    active()
    lock=holder(f"INSERT INTO bookings(business_id,lead_id,title,status,source) VALUES('{A}',7,'Legacy fixture','requested','ai_request')")
    with ThreadPoolExecutor(max_workers=1) as pool:
        future=pool.submit(execute,request(7),app='colzo-booking-legacy-wait',required=False)
        try:blocked=waiting('colzo-booking-legacy-wait')
        finally:release(lock)
        r=future.result(timeout=30)
    check('legacy_writer_unique_conflict_reuses_row',blocked and r.returncode==0 and parsed(r)['created'] is False and counts(7)==[1,0,0],{'counts':counts(7)})

    execute("CREATE FUNCTION fixture_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.metadata->>'lead_id'='8' THEN RAISE EXCEPTION 'Synthetic audit rejection'; END IF; RETURN NEW; END$$;CREATE TRIGGER fixture_audit_failure BEFORE INSERT ON business_audit_events FOR EACH ROW EXECUTE FUNCTION fixture_fail_audit();")
    r=execute(request(8),required=False)
    check('audit_failure_rolls_back',r.returncode!=0 and counts(8)==[0,0,0],{'counts':counts(8)})
    for role in ['anon','authenticated']:
        r=execute(request(2,B,role),required=False);check(role+'_cannot_execute',r.returncode!=0 and 'permission denied for function' in r.stderr)
    r=execute(request(2,A),required=False);check('foreign_lead_denied',r.returncode!=0)
    r=execute(request(2,B),required=False);check('independent_business_succeeds',r.returncode==0 and parsed(r)['business_id']==B)
    report={'scope':'Native synthetic transaction/race checks only; not genuine Development recovery or Auth/Storage acceptance','server':version,'database':a.database,'proposal_sha256':hashlib.sha256(proposal.encode()).hexdigest(),'checks':checks,'passed':sum(c['pass'] for c in checks),'failed':sum(not c['pass'] for c in checks),'failures':[c['name'] for c in checks if not c['pass']]}
    Path(a.output).write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'passed':report['passed'],'failed':report['failed'],'failures':report['failures']}))
    raise SystemExit(0 if not report['failed'] else 1)


if __name__=='__main__':
    main()
