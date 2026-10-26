"""Explicitly invoked synthetic release-package checks on a NEW private socket cluster.
No network hosts, source exports, real identities or shared writes are supported.
"""
import argparse,json,os,re,subprocess,hashlib
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--bin',required=True);p.add_argument('--socket',required=True);p.add_argument('--output',required=True)
p.add_argument('--managed-installer',action='store_true')
a=p.parse_args();sock=Path(a.socket)
if not str(sock).startswith('/tmp/colzo-pg-') or not sock.is_dir() or sock.stat().st_mode & 0o077:p.error('private disposable socket required')
root=Path(__file__).resolve().parent.parent
env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
base=[str(Path(a.bin)/'psql'),'-X','-qAt','-v','ON_ERROR_STOP=1','-h',str(sock),'-p','55432','-U','fixture_cluster_admin' if a.managed_installer else 'postgres']
def sql(text,db='postgres',required=True,installer=False):
 if installer and a.managed_installer:text='SET ROLE postgres;'+text
 r=subprocess.run(base+['-d',db],input=text,text=True,capture_output=True,env=env,timeout=30)
 if required and r.returncode:raise AssertionError(r.stderr)
 return r
if sql('SHOW listen_addresses').stdout.strip():raise AssertionError('TCP must be disabled')
if sql("SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','colzo_pilot_operator')").stdout.strip()!='0':raise AssertionError('fresh fixture cluster required')
sql('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;')
if a.managed_installer:sql('CREATE ROLE postgres NOSUPERUSER CREATEROLE CREATEDB BYPASSRLS; ALTER SCHEMA public OWNER TO postgres; GRANT CREATE ON DATABASE postgres TO postgres;')
bootstrap=(root/'tests/fixtures/colzo-pilot-postgres-bootstrap.sql').read_text().replace('create role anon; create role authenticated; create role service_role bypassrls;','')
creator=(root/'supabase/migrations/20260916180000_add_business_creation_and_public_routes.sql').read_text()
patch="""ALTER TABLE bookings ADD COLUMN lead_id bigint, ADD COLUMN source text, ADD COLUMN status text, ADD COLUMN title text, ADD COLUMN customer_name text, ADD COLUMN customer_phone text, ADD COLUMN customer_email text, ADD COLUMN location text, ADD COLUMN notes text;
CREATE TABLE business_audit_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,business_id uuid,action text,resource_type text,resource_id text,metadata jsonb);
ALTER TABLE lead_history ADD COLUMN lead_id bigint, ADD COLUMN action text, ADD COLUMN old_value text, ADD COLUMN new_value text;"""
package=(root/'docs/colzo-pilot-review/pilot-release-application.PROPOSED.sql').read_text()
checks=[]
def check(name,ok):
 if not ok:raise AssertionError(name)
 checks.append(name)
for kind in ['owner','late','success']:
 db='colzo_disposable_package_'+kind
 sql('CREATE DATABASE '+db+' OWNER postgres')
 if a.managed_installer:sql('ALTER SCHEMA public OWNER TO postgres',db)
 sql(bootstrap+creator+patch,db,installer=True)
 if kind=='owner':sql('ALTER FUNCTION public.create_business_for_owner(uuid,text,text,text) OWNER TO authenticated;',db)
 if kind=='late':sql("INSERT INTO bookings(id,business_id,lead_id,source,status) VALUES(3,'10000000-0000-4000-8000-000000000001',1,'ai_request','requested'),(4,'10000000-0000-4000-8000-000000000001',1,'ai_request','requested');",db)
 r=sql(package,db,False,installer=True)
 if kind!='success':
  check(kind+' fails as expected',r.returncode!=0 and ('unsafe creator dependency' in r.stderr if kind=='owner' else 'could not create unique index' in r.stderr))
  check(kind+' preserves no staged objects',sql("SELECT to_regclass('public.colzo_pilot_access') IS NULL AND to_regnamespace('colzo_pilot_private') IS NULL AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='colzo_pilot_operator') AND NOT EXISTS(SELECT 1 FROM pg_policies WHERE policyname='colzo_pilot_expiry_guard')",db).stdout.strip()=='t')
  check(kind+' existing records preserved',sql('SELECT count(*) FROM bookings',db).stdout.strip()==('4' if kind=='late' else '2'))
 else:
  check('all five proposals commit with assertions',r.returncode==0)
  check('no pilot activation or audit',sql('SELECT NOT EXISTS(SELECT 1 FROM colzo_pilot_access) AND NOT EXISTS(SELECT 1 FROM colzo_pilot_private.audit)',db).stdout.strip()=='t')
  check('operator remains NOLOGIN NOINHERIT',sql("SELECT NOT rolcanlogin AND NOT rolinherit FROM pg_roles WHERE rolname='colzo_pilot_operator'",db).stdout.strip()=='t')
result={'status':'PASS','checks':len(checks),'evidence':checks,'server':sql('SHOW server_version').stdout.strip(),'application_sha256':hashlib.sha256(package.encode()).hexdigest(),'managed_installer_fixture':a.managed_installer,'shared_database_used':False,'scope':'Synthetic fixtures; not managed Auth, Storage or actual-source recovery'}
Path(a.output).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
