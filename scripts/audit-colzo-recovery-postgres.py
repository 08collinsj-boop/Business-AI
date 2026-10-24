"""Offline diagnostic replay. No network, installation, shared writes or ledger repair.
Requires a fresh disposable PostgreSQL 17 cluster; failed migrations stay failed.
Platform Auth/Storage schemas are explicitly minimal stubs, not GoTrue acceptance.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--bin', required=True)
    p.add_argument('--socket', required=True)
    p.add_argument('--port', default='55433')
    p.add_argument('--user', default='user')
    p.add_argument('--ledger', required=True)
    p.add_argument('--catalog', required=True)
    p.add_argument('--output', required=True)
    p.add_argument('--privileges')
    a = p.parse_args()
    socket = Path(a.socket)
    if not str(socket).startswith('/tmp/colzo-') or not socket.is_dir() or socket.stat().st_mode & 0o077:
        p.error('private 0700 disposable Unix socket required')
    root = Path(__file__).resolve().parent.parent
    env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
    base = [str(Path(a.bin)/'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', str(socket), '-p', a.port, '-U', a.user]

    def query(sql, db='postgres', required=True):
        r = subprocess.run(base+['-d', db], input=sql, env=env, capture_output=True, text=True, timeout=45)
        if required and r.returncode:
            raise RuntimeError(r.stderr)
        return r

    if query('SHOW listen_addresses;').stdout.strip():
        raise RuntimeError('TCP must be disabled')
    if not query('SHOW server_version;').stdout.startswith('17.'):
        raise RuntimeError('PostgreSQL 17 required')
    # Never reuse or reset a pre-existing database. CREATE DATABASE must succeed.
    dbs = ['colzo_disposable_audit_repo', 'colzo_disposable_audit_ledger', 'colzo_disposable_audit_candidate']
    for db in dbs:
        query('CREATE DATABASE '+db+';')
    query('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;')
    bootstrap = """CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE SCHEMA extensions;
GRANT USAGE ON SCHEMA public,auth,storage,extensions TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon,authenticated,service_role;"""
    ledger = json.loads(Path(a.ledger).read_text())
    live = json.loads(Path(a.catalog).read_text())
    files = sorted((root/'supabase/migrations').glob('*.sql'))
    repo = [{'id':x.name,'sql':x.read_text()} for x in files]
    recorded = [{'id':x['version']+'_'+x['name'], 'sql':'\n;\n'.join(x['statements'])+'\n;'} for x in ledger]
    missing_versions = ['20260926233524', '20260929124200', '20260929144034', '20261004231500', '20261010', '20261019162954']
    candidate = [(x['version'], {'id':'RECORDED:'+x['version']+'_'+x['name'],'sql':'\n;\n'.join(x['statements'])+'\n;'}) for x in ledger]
    for version in missing_versions:
        found = [x for x in files if x.name.split('_',1)[0]==version]
        if len(found)!=1:
            raise RuntimeError('ambiguous candidate source '+version)
        candidate.append((version, {'id':'REPO_ONLY:'+found[0].name,'sql':found[0].read_text()}))
    candidate = [x for _,x in sorted(candidate,key=lambda x:x[0])]
    catalog_sql = (root/'scripts/sql/colzo-schema-catalog.sql').read_text()
    results = {}
    for label, db, chain in zip(['repository','ledger','candidate'], dbs, [repo,recorded,candidate]):
        query(bootstrap, db)
        attempts = []
        for item in chain:
            r = query('BEGIN;\n'+item['sql']+'\nCOMMIT;', db, False)
            attempts.append({'id':item['id'],'sql_sha256':hashlib.sha256(item['sql'].encode()).hexdigest(),'ok':r.returncode==0,'error':r.stderr.strip() if r.returncode else None})
        catalog = json.loads(query(catalog_sql, db).stdout)
        results[label] = {'status':'BLOCKED' if any(not x['ok'] for x in attempts) else 'REPLAYED_WITH_PLATFORM_STUBS','attempts':attempts,'diff':compare_catalog(catalog,live),'catalog_sha256':hashlib.sha256(json.dumps(catalog,sort_keys=True).encode()).hexdigest()}
    if a.privileges:
        live_privileges = json.loads(Path(a.privileges).read_text())
        replay_privileges = json.loads(query((root/'scripts/sql/colzo-effective-privileges.sql').read_text(),dbs[2]).stdout)
        privilege_differences = {}
        for category in ['table_privileges','function_privileges']:
            keys = ['table','role'] if category=='table_privileges' else ['name','args','role']
            def indexed(rows):
                return {tuple(r[k] for k in keys):r for r in rows}
            left,right=indexed(replay_privileges[category]),indexed(live_privileges[category])
            privilege_differences[category] = {'actual_only':[k for k in sorted(right.keys()-left.keys())],'replay_only':[k for k in sorted(left.keys()-right.keys())],'changed':[{'key':k,'replay':left[k],'actual':right[k]} for k in sorted(left.keys()&right.keys()) if left[k]!=right[k]]}
        results['candidate']['privilege_differences']=privilege_differences
    result = {'scope':'Offline diagnostic schema reconstruction, not a source backup, not full Supabase acceptance. Failed migrations were attempted and retained; downstream replay only diagnoses additional differences.', 'server':query('SELECT version();').stdout.strip(), 'results':results}
    Path(a.output).write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({label:{'attempted':len(r['attempts']),'failures':[x['id'] for x in r['attempts'] if not x['ok']], 'diff':{c:{k:len(v) for k,v in d.items()} for c,d in r['diff'].items()}} for label,r in results.items()}))


def entries(catalog, category):
    rows = catalog.get(category) or []
    if category in ['tables','policies']:
        rows = [r for r in rows if r['schema']=='public']
    keys = ['name','args'] if category=='functions' else ['table','name'] if category in ['columns','constraints','indexes','policies','triggers'] else ['schema','name']
    return {tuple(str(r.get(k,'')) for k in keys):r for r in rows}


def compare_catalog(replayed, actual):
    out = {}
    for c in ['tables','columns','constraints','indexes','policies','functions','triggers']:
        expected, live = entries(replayed,c),entries(actual,c)
        changed=[]
        for k in sorted(expected.keys() & live.keys()):
            left,right=dict(expected[k]),dict(live[k])
            # Platform default ACLs are not fabricated by the stubs. Audit privileges separately.
            for row in [left,right]:
                row.pop('owner',None)
                row.pop('acl',None)
            if left!=right:
                # Publish hashes and changed field names, never raw stored function bodies.
                changed.append({'key':k,'fields':[f for f in sorted(set(left)|set(right)) if left.get(f)!=right.get(f)],'replay_sha256':hashlib.sha256(json.dumps(left,sort_keys=True).encode()).hexdigest(),'actual_sha256':hashlib.sha256(json.dumps(right,sort_keys=True).encode()).hexdigest()})
        out[c]={'actual_only':[k for k in sorted(live.keys()-expected.keys())], 'replay_only':[k for k in sorted(expected.keys()-live.keys())], 'changed':changed}
    return out


if __name__=='__main__':
    main()
