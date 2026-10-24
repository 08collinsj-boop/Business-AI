"""Synthetic roundtrip of the diagnostic reconstruction into an independent cluster.
Run as the non-root cluster owner after audit-colzo-recovery-postgres.py.
Auth schemas are fixtures; this does not test GoTrue login, TOTP or shared data.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

p=argparse.ArgumentParser()
for name in ['bin','socket','workdir']:
    p.add_argument('--'+name,required=True)
p.add_argument('--port',default='55433')
p.add_argument('--user',default='user')
a=p.parse_args()
socket,work=Path(a.socket),Path(a.workdir)
if not str(socket).startswith('/tmp/colzo-') or not socket.is_dir() or socket.stat().st_mode & 0o077:
    p.error('private disposable socket required')
if not str(work).startswith('/tmp/colzo-'):
    p.error('private disposable work directory required')
os.umask(0o077)
work.mkdir(mode=0o700)
env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
pg=Path(a.bin)
source='colzo_disposable_audit_candidate'
checks=[]
started=time.monotonic()

def run(command,sql=None):
    r=subprocess.run([str(x) for x in command],input=sql,env=env,capture_output=True,text=True,timeout=60)
    if r.returncode:raise RuntimeError(r.stderr)
    return r.stdout

def query(sql,target=False):
    return run([pg/'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-h',work/'socket' if target else socket,'-p','55436' if target else a.port,'-U','recovery_admin' if target else a.user,'-d','colzo_disposable_restored' if target else source],sql)

def check(label,condition):
    if not condition:raise AssertionError(label)
    checks.append(label)

check('source TCP disabled',query('SHOW listen_addresses;').strip()=='')
check('source version 17',query('SHOW server_version;').startswith('17.'))
query("""CREATE TABLE auth.identities(id uuid primary key,user_id uuid references auth.users,provider text);
CREATE TABLE auth.mfa_factors(id uuid primary key,user_id uuid references auth.users,secret text);
ALTER TABLE auth.users ADD COLUMN encrypted_password text;
CREATE TABLE storage.objects(id uuid primary key,bucket_id text references storage.buckets,name text,version text);
INSERT INTO auth.users(id,email,email_confirmed_at,encrypted_password) VALUES
('90000000-0000-4000-8000-000000000001','recovery-a@example.invalid',now(),'synthetic-password-hash-a'),
('90000000-0000-4000-8000-000000000002','recovery-b@example.invalid',now(),'synthetic-password-hash-b');
INSERT INTO auth.identities VALUES ('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','email');
INSERT INTO auth.mfa_factors VALUES ('92000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','synthetic-encrypted-factor');
SELECT * FROM public.create_business_for_owner('90000000-0000-4000-8000-000000000001','Synthetic recovery A','test','synthetic-recovery-a');
SELECT * FROM public.create_business_for_owner('90000000-0000-4000-8000-000000000002','Synthetic recovery B','test','synthetic-recovery-b');
INSERT INTO public.leads(name,business_id) SELECT 'synthetic recovery record',business_id FROM public.business_memberships WHERE user_id IN ('90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002');
INSERT INTO storage.objects SELECT '93000000-0000-4000-8000-000000000001',id,'synthetic/recovery.bin','synthetic-v1' FROM storage.buckets ORDER BY id LIMIT 1;""")
tables=json.loads(query("SELECT json_agg(format('%I.%I',schemaname,tablename) ORDER BY schemaname,tablename) FROM pg_tables WHERE schemaname IN ('public','auth','storage');"))
def fingerprints(target=False):
    return {table:query("SELECT count(*)||':'||md5(coalesce(string_agg(row_to_json(t)::text,E'\\n' ORDER BY row_to_json(t)::text),'')) FROM "+table+' t;',target).strip() for table in tables}
before=fingerprints()
run([pg/'pg_dumpall','-h',socket,'-p',a.port,'-U',a.user,'--roles-only','--no-role-passwords','-f',work/'roles.sql'])
run([pg/'pg_dump','-h',socket,'-p',a.port,'-U',a.user,'-d',source,'--format=custom','-f',work/'database.dump'])
check('archive contents readable',bool(run([pg/'pg_restore','--list',work/'database.dump'])))
(work/'socket').mkdir(mode=0o700)
run([pg/'initdb','-D',work/'target','--username=recovery_admin','--no-locale','--encoding=UTF8','--auth-local=trust'])
run([pg/'pg_ctl','-D',work/'target','-l',work/'target.log','-o',"-k "+str(work/'socket')+" -p 55436 -c listen_addresses='' -c shared_buffers=16MB -c max_connections=20",'start'])
try:
    run([pg/'psql','-X','-q','-v','ON_ERROR_STOP=1','-h',work/'socket','-p','55436','-U','recovery_admin','-d','postgres','-f',work/'roles.sql'])
    run([pg/'createdb','-h',work/'socket','-p','55436','-U','recovery_admin','colzo_disposable_restored'])
    run([pg/'pg_restore','--exit-on-error','-h',work/'socket','-p','55436','-U','recovery_admin','-d','colzo_disposable_restored',work/'database.dump'])
    check('independent target TCP disabled',query('SHOW listen_addresses;',True).strip()=='')
    check('all table counts and complete row fingerprints survive',before==fingerprints(True))
    check('Auth fixture includes both users, identity and factor material',query("SELECT (SELECT count(*) FROM auth.users)||':'||(SELECT count(*) FROM auth.identities)||':'||(SELECT count(*) FROM auth.mfa_factors);",True).strip()=='2:1:1')
    check('Storage metadata fixture survives',query('SELECT count(*) FROM storage.objects;',True).strip()=='1')
    for user in ['90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002']:
        count=query("SET request.jwt.claim.sub='"+user+"';SET ROLE authenticated;SELECT count(*) FROM public.leads;",True).strip()
        check('restored tenant '+user[-1]+' sees exactly own lead',count=='1')
    check('browser still denied owner provisioning',query("SELECT has_function_privilege('authenticated','public.create_business_for_owner(uuid,text,text,text)','EXECUTE');",True).strip()=='f')
    result={'scope':'Synthetic reconstructed schema with minimal Auth/Storage fixtures. No real login, TOTP, object byte restore or shared backup.', 'checks':checks,'tables_fingerprinted':len(tables),'duration_seconds':round(time.monotonic()-started,3),'archive_sha256':hashlib.sha256((work/'database.dump').read_bytes()).hexdigest()}
    (work/'result.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result))
finally:
    run([pg/'pg_ctl','-D',work/'target','stop','-m','fast'])
