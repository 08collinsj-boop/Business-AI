#!/usr/bin/env python3
"""Offline synthetic export rehearsal; no network, DB, Auth or Storage reads."""
import hashlib
import importlib.util
import json
import tempfile
from pathlib import Path
spec = importlib.util.spec_from_file_location('qa_export', Path(__file__).resolve().parents[1] / 'docs/colzo-pilot-review/qa_export_serializer_20261029.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
categories = {}
for table, cfg in module.SPEC.items():
    rows = []
    if cfg['mode'] == 'data':
        row = dict.fromkeys(cfg['columns'])
        if 'business_id' in row: row['business_id'] = module.BUSINESS
        if 'user_id' in row: row['user_id'] = module.USER
        if 'id' in row: row['id'] = module.BUSINESS if table == 'businesses' else 'synthetic-' + table
        rows = [row]
    categories[table] = {'mode':cfg['mode'], 'row_count':len(rows), 'rows':rows}
payload = {'format_version':1,'business_id':module.BUSINESS,'user_id':module.USER,'captured_at':'2026-11-06T00:00:00Z','categories':categories}
checks=[]
with tempfile.TemporaryDirectory(prefix='colzo-export-synthetic-') as temp:
    root=Path(temp)
    contaminated=root/'mixed';contaminated.mkdir(mode=0o700)
    sentinel=contaminated/'foreign-private-sentinel.txt';sentinel.write_text('synthetic-only')
    try: module.serialize(payload,contaminated)
    except (ValueError,FileExistsError): checks.append('nonempty output refused')
    else: raise AssertionError('export accepted nonempty output directory')
    assert list(contaminated.iterdir())==[sentinel] and sentinel.read_text()=='synthetic-only'
    public=root/'shared';public.mkdir(mode=0o755);public.chmod(0o755)
    try: module.serialize(payload,public)
    except ValueError: checks.append('shared output refused')
    else: raise AssertionError('export accepted group/world-accessible output')
    link=root/'linked';link.symlink_to(contaminated,target_is_directory=True)
    try: module.serialize(payload,link)
    except ValueError: checks.append('symlink output refused')
    else: raise AssertionError('export accepted symlink output')
    ancestor=root/'linked-parent';ancestor.symlink_to(contaminated,target_is_directory=True)
    try: module.serialize(payload,ancestor/'new-export')
    except ValueError: checks.append('symlink output ancestor refused')
    else: raise AssertionError('export accepted symlink output ancestor')
    assert not (contaminated/'new-export').exists()
    target=root/'private'
    manifest=module.serialize(payload,target)
    assert target.stat().st_mode & 0o077 == 0
    assert json.loads((target/'tenant.json').read_text())==payload
    checks.append('all declared synthetic categories JSON roundtrip')
    for item in manifest['files']:
        data=(target/item['name']).read_bytes()
        assert hashlib.sha256(data).hexdigest()==item['sha256'] and len(data)==item['bytes']
    checks.append('every emitted file hash and length verified')
    assert {p.name for p in target.iterdir()}=={'manifest.json'}|{x['name'] for x in manifest['files']}
    checks.append('manifest covers every emitted file')
    assert manifest['not_a_database_backup'] is True
    assert any('Storage' in x for x in manifest['exclusions']) and any('Auth' in x for x in manifest['exclusions'])
    checks.append('Auth and Storage exclusion explicit')
print(json.dumps({'synthetic_only':True,'category_count':len(categories),'data_categories':sum(x['mode']=='data' for x in categories.values()),'checks':checks,'live_return_or_deletion_verified':False}))
