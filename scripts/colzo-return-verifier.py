#!/usr/bin/env python3
"""Independent offline verification of a fixed fictional-QA return bundle.

The expected fingerprint must arrive through a separate trusted channel. This
checks integrity, not who authorised/received the package or live completeness.
No network, SQL, extraction, delivery or deletion operations.
"""
import csv, hashlib, importlib.util, io, json, os, re, stat
from pathlib import Path
_spec=importlib.util.spec_from_file_location('receipt_attachment_rules',Path(__file__).with_name('colzo-attachment-return.py'))
_rules=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_rules)
_export=_rules._export
MAX_METADATA_BYTES=16*1024*1024

def verify_bundle(directory,expected_fingerprint):
    if not isinstance(expected_fingerprint,str) or not re.fullmatch('[0-9a-f]{64}',expected_fingerprint):
        raise ValueError('separately trusted fingerprint required')
    root=_rules._no_symlinks(directory)
    if not root.is_dir() or root.stat().st_mode & 0o077:raise ValueError('bundle directory must be private')
    def read(name,limit):
        path=_rules._no_symlinks(root/name)
        fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
        with os.fdopen(fd,'rb') as handle:
            info=os.fstat(handle.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1 or info.st_size>limit:raise ValueError('unsafe or oversized bundle file')
            data=handle.read(limit+1)
        if len(data)>limit:raise ValueError('oversized bundle file')
        return data
    raw_manifest=read('manifest.json',MAX_METADATA_BYTES)
    raw_attachments=read('attachment-manifest.json',MAX_METADATA_BYTES)
    fingerprint=hashlib.sha256(raw_manifest+b'\0'+raw_attachments).hexdigest()
    if fingerprint!=expected_fingerprint:raise ValueError('bundle fingerprint mismatch')
    manifest=json.loads(raw_manifest);attachments=json.loads(raw_attachments)
    if manifest.get('business_id')!=_export.BUSINESS or manifest.get('not_a_database_backup') is not True:raise ValueError('tenant manifest scope')
    if attachments.get('format_version')!=1 or attachments.get('business_id')!=_export.BUSINESS or attachments.get('auth_included') is not False or attachments.get('live_return_verified') is not False or attachments.get('not_a_backup') is not True:raise ValueError('attachment manifest scope')
    payload=json.loads(read('tenant.json',MAX_METADATA_BYTES));refs=_rules.attachment_references(payload)
    expected_names={'tenant.json'}|{name+'.csv' for name,cfg in _export.SPEC.items() if cfg['mode']=='data'}
    files=manifest.get('files')
    if not isinstance(files,list) or len(files)!=len(expected_names):raise ValueError('tenant manifest coverage')
    found=set()
    def integrity(data,item):
        if type(item.get('bytes')) is not int or len(data)!=item['bytes'] or hashlib.sha256(data).hexdigest()!=item.get('sha256'):raise ValueError('bundle file integrity mismatch')
    for item in files:
        if not isinstance(item,dict):raise ValueError('tenant file entry')
        name=item.get('name')
        if not isinstance(name,str) or name not in expected_names or name in found:raise ValueError('tenant file coverage')
        found.add(name);data=read(name,MAX_METADATA_BYTES);integrity(data,item)
        if name!='tenant.json':
            table=name[:-4];columns=_export.SPEC[table]['columns'];rows=payload['categories'][table]['rows']
            actual=list(csv.reader(io.StringIO(data.decode('utf-8-sig'),newline='')))
            expected=[columns]+[[_export.csv_cell(row[column]) for column in columns] for row in rows]
            if actual!=expected or type(item.get('rows')) is not int or item['rows']!=len(rows):raise ValueError('CSV and tenant snapshot disagree')
    if found!=expected_names:raise ValueError('missing tenant files')
    entries=attachments.get('attachments')
    if not isinstance(entries,list) or len(entries)!=len(refs):raise ValueError('attachment coverage')
    seen=set();paths=set();total=0
    for item in entries:
        if not isinstance(item,dict) or set(item)!={'bucket','path','file','bytes','sha256','records'}:raise ValueError('attachment fields')
        bucket,path,name=item['bucket'],item['path'],item['file']
        if not isinstance(bucket,str) or not isinstance(path,str) or not isinstance(name,str) or not re.fullmatch(r'attachments/[0-9]+\.bin',name):raise ValueError('unsafe attachment reference')
        key=(bucket,path)
        if key not in refs or key in seen or name in paths or item['records']!=refs[key]['records']:raise ValueError('attachment reference mismatch')
        seen.add(key);paths.add(name);data=read(name,_rules.MAX_FILE_BYTES);integrity(data,item);total+=len(data)
        if total>_rules.MAX_TOTAL_BYTES:raise ValueError('attachment bundle exceeds limit')
        if refs[key]['sizes'] and refs[key]['sizes']!={len(data)}:raise ValueError('attachment record size mismatch')
        if refs[key]['hashes'] and refs[key]['hashes']!={item['sha256']}:raise ValueError('attachment record hash mismatch')
    expected_root=expected_names|{'manifest.json','attachment-manifest.json','attachments'}
    if {p.name for p in root.iterdir()}!=expected_root:raise ValueError('unlisted bundle file or directory')
    attachment_root=_rules._no_symlinks(root/'attachments')
    if not attachment_root.is_dir() or attachment_root.stat().st_mode & 0o077:raise ValueError('attachment directory must be private')
    if {'attachments/'+p.name for p in attachment_root.iterdir()}!=paths:raise ValueError('unlisted attachment file or directory')
    return {'verified':True,'verification_sha256':fingerprint,'csv_count':len(expected_names)-1,'attachment_count':len(entries),'attachment_bytes':total,'live_return_verified':False,'recipient_delivery_verified':False,'authorisation_verified':False,'not_a_backup':True}
