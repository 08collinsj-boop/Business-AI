#!/usr/bin/env python3
"""WhatsApp SQL QA on EMPTY local disposable PostgreSQL only, no cloud access.
Usage: runuser -u postgres -- env PGHOST=/var/run/postgresql
 PGDATABASE=colzo_wa_sandbox_test COLZO_WA_LOCAL_PG_QA=YES
 python3 scripts/colzo-whatsapp-postgres-qa.py
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess, os

db=os.getenv('PGDATABASE','')
host=os.getenv('PGHOST','')
if os.getenv('COLZO_WA_LOCAL_PG_QA')!='YES' or not db.startswith('colzo_wa_sandbox_') or not host.startswith('/'):
 raise SystemExit('Only an explicitly authorised LOCAL disposable PostgreSQL database is permitted')
env={k:v for k,v in os.environ.items() if k!='PGPASSWORD'}
def query(s, expected_failure=None):
 p=subprocess.run(['psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-d',db,'-c',s],capture_output=True,text=True,env=env,timeout=15)
 if expected_failure:
  assert p.returncode!=0 and expected_failure.lower() in p.stderr.lower(),p.stderr[-320:]
  return ''
 assert p.returncode==0,p.stderr[-480:]
 return p.stdout.strip().splitlines()[-1] if p.stdout.strip() else ''
def eq(name,a,b):
 assert a==b,f'{name}: {a!r} != {b!r}'
 print('PASS',name,flush=True)
eq('local fresh database',query("SELECT current_database()||':'||(inet_server_addr() IS NULL)::text"),db+':true')
eq('no existing businesses',query("SELECT (to_regclass('public.businesses') IS NULL)::text"),'true')
query("""DO $$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.businesses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL);
CREATE TABLE public.business_memberships(business_id uuid REFERENCES public.businesses(id),
 user_id uuid NOT NULL,role text NOT NULL,PRIMARY KEY(business_id,user_id));
ALTER TABLE public.business_memberships ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.business_memberships TO authenticated;
CREATE POLICY member_self ON public.business_memberships FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()));""")
proposal=Path(__file__).resolve().parent.parent/'docs/sql-proposals/colzo_whatsapp_tenant_shadow_receipts.sql'
query(proposal.read_text())
eq('three RLS enabled',query("""SELECT count(*)::text FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
WHERE n.nspname='public' AND c.relname IN
('whatsapp_provider_connections','whatsapp_sender_bindings','whatsapp_inbound_receipts') AND c.relrowsecurity"""),'3')
A='11111111-1111-4111-8111-111111111111'
B='22222222-2222-4222-8222-222222222222'
AC1='AC'+'a'*32
AC2='AC'+'b'*32
S1='aaaaaaaa-0000-4000-8000-000000000001'
S2='bbbbbbbb-0000-4000-8000-000000000001'
N1='aaaaaaaa-0000-4000-8000-000000000002'
N2='bbbbbbbb-0000-4000-8000-000000000002'
SID='SM'+'c'*32
OA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
OB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
MA='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
query(f"""INSERT INTO public.businesses VALUES ('{A}','A'),('{B}','B');
INSERT INTO public.business_memberships VALUES
('{A}','{OA}','owner'),('{B}','{OB}','owner'),('{A}','{MA}','member');
INSERT INTO public.whatsapp_provider_connections(id,business_id,provider_account_sid,status,owner_approved_at) VALUES
('{S1}','{A}','{AC1}','verified',now()),('{S2}','{B}','{AC2}','verified',now());
INSERT INTO public.whatsapp_sender_bindings
(id,business_id,connection_id,provider_account_sid,whatsapp_address,status,verified_at,owner_approved_at)
VALUES ('{N1}','{A}','{S1}','{AC1}','whatsapp:+447700900001','verified',now(),now()),
('{N2}','{B}','{S2}','{AC2}','whatsapp:+447700900002','verified',now(),now());""")
query(f"""INSERT INTO public.whatsapp_sender_bindings
(business_id,connection_id,provider_account_sid,whatsapp_address,status,verified_at,owner_approved_at)
VALUES ('{B}','{S2}','{AC2}','whatsapp:+447700900001','verified',now(),now())""",'duplicate key')
print('PASS global WhatsApp number uniqueness across Twilio accounts')
query(f"""INSERT INTO public.whatsapp_sender_bindings
(business_id,connection_id,provider_account_sid,whatsapp_address)
VALUES ('{B}','{S1}','{AC1}','whatsapp:+447700900099')""",'foreign key constraint')
print('PASS sender cross-tenant foreign key')
def receipt(sid):
 return f"""INSERT INTO public.whatsapp_inbound_receipts
(business_id,sender_binding_id,provider_account_sid,message_sid,customer_reference_hmac)
VALUES ('{A}','{N1}','{AC1}','{sid}','{'f'*64}')
ON CONFLICT(provider_account_sid,message_sid) DO NOTHING RETURNING id"""
assert query(receipt(SID))
eq('idempotent duplicate',query(receipt(SID)),'')
query(f"""INSERT INTO public.whatsapp_inbound_receipts
(business_id,sender_binding_id,provider_account_sid,message_sid,customer_reference_hmac)
VALUES ('{B}','{N1}','{AC1}','SM{'d'*32}','{'f'*64}')""",'foreign key constraint')
print('PASS receipt cross-tenant foreign key')
def role(user,sql):
 return query(f"SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','{user}',false); "+sql)
for table in ['whatsapp_provider_connections','whatsapp_sender_bindings','whatsapp_inbound_receipts']:
 eq('owner A sees only own '+table,role(OA,f"SELECT string_agg(DISTINCT business_id::text,',') FROM public.{table}"),A)
 eq('member denied '+table,role(MA,f"SELECT count(*)::text FROM public.{table}"),'0')
 eq('owner B own '+table,role(OB,f"SELECT count(*)::text FROM public.{table}"),'0' if table.endswith('receipts') else '1')
query(f"SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','{OA}',false); "+receipt('SM'+'e'*32),'permission denied')
print('PASS direct authenticated write denied')
query("SET ROLE anon; SELECT * FROM public.whatsapp_inbound_receipts",'permission denied')
print('PASS anonymous read denied')
with ThreadPoolExecutor(max_workers=5) as pool:
 results=list(pool.map(lambda _:query(receipt('SM'+'a'*32)),range(10)))
eq('ten concurrent duplicate deliveries',str(sum(bool(x) for x in results)),'1')
print('WHATSAPP_SQL_QA_PASS: synthetic local only',flush=True)
