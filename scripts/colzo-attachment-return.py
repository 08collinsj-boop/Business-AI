#!/usr/bin/env python3
"""Offline, fixture-scoped attachment bundler. Never fetches or deletes remote objects.

Requires an already captured fixture snapshot and independently supplied local bytes.
Not an account export, delivery mechanism, backup or authorisation to export live data.
"""
import hashlib
import importlib.util
import json
import os
import re
import shutil
import stat
from pathlib import Path

_spec=importlib.util.spec_from_file_location('colzo_fixture_export',Path(__file__).resolve().parents[1]/'docs/colzo-pilot-review/qa_export_serializer_20261029.py')
_export=importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_export)
MAX_FILE_BYTES=16*1024*1024
MAX_TOTAL_BYTES=64*1024*1024
MAX_FILES=1000

def _safe_path(value):
    if not isinstance(value,str) or not value or len(value)>1024:
        raise ValueError('invalid object path')
    # Object keys must be canonical, relative and non-URL. No decoding ambiguity.
    if any(part in ('','.','..') for part in value.split('/')) or any(c in value for c in ('\\','%',':','?','#')) or any(ord(c)<32 for c in value):
        raise ValueError('unsafe object path')
    return value

def _no_symlinks(path):
    path=Path(path).absolute()
    if any(part.is_symlink() for part in (path,*path.parents)):
        raise ValueError('symlink path is not allowed')
    return path

def attachment_references(payload):
    _export.validate(payload)
    if len(payload['categories']['businesses']['rows'])!=1:
        raise ValueError('exactly one business root is required')
    refs={}
    def add(bucket,path,record,size=None,digest=None):
        _safe_path(path)
        if bucket not in ('business-knowledge','business-profile-media','marketing-images'):
            raise ValueError('unsupported attachment bucket')
        key=(bucket,path)
        if key not in refs: refs[key]={'records':[],'sizes':set(),'hashes':set()}
        refs[key]['records'].append(record)
        if size is not None:
            if type(size) is not int or size<0 or size>MAX_FILE_BYTES: raise ValueError('invalid record size')
            refs[key]['sizes'].add(size)
        if digest is not None:
            if not isinstance(digest,str) or not re.fullmatch('[0-9a-f]{64}',digest): raise ValueError('invalid record hash')
            refs[key]['hashes'].add(digest)
    for row in payload['categories']['business_knowledge_sources']['rows']:
        path=row['storage_path']
        if not path: continue
        _safe_path(path)
        source_id=row['id']
        if not isinstance(source_id,str) or '/' in source_id or not source_id: raise ValueError('invalid source id')
        if path=='manual/'+source_id: continue
        if not path.startswith('source/'+source_id+'/'): raise ValueError('foreign Knowledge source path')
        add('business-knowledge',path,{'table':'business_knowledge_sources','id':source_id},row['size_bytes'],row['sha256'])
    for row in payload['categories']['business_settings']['rows']:
        for column in ('profile_image_path','profile_banner_path'):
            path=row[column]
            if not path: continue
            if not isinstance(path,str) or not path.startswith(_export.BUSINESS+'/'): raise ValueError('foreign profile path')
            add('business-profile-media',path,{'table':'business_settings','id':row['id'],'column':column})
    for table in ('marketing_images','marketing_automation_media'):
        for row in payload['categories'][table]['rows']:
            path=row['storage_path']
            if not path: continue
            if not isinstance(path,str) or not path.startswith(_export.BUSINESS+'/'): raise ValueError('foreign marketing path')
            add(row['storage_bucket'],path,{'table':table,'id':row['id']})
    if len(refs)>MAX_FILES: raise ValueError('too many attachments')
    return refs

def write_bundle(payload,attachments,source_directory,output_directory):
    refs=attachment_references(payload)
    if not isinstance(attachments,list) or len(attachments)>MAX_FILES: raise ValueError('invalid attachment manifest')
    source=_no_symlinks(source_directory)
    if not source.is_dir() or source.stat().st_mode & 0o077: raise ValueError('source directory must be private')
    files={};total=0
    for entry in attachments:
        if not isinstance(entry,dict) or set(entry)!={'bucket','path','file','bytes','sha256'}: raise ValueError('attachment fields')
        bucket,path=entry['bucket'],entry['path']
        _safe_path(path)
        if not isinstance(bucket,str): raise ValueError('invalid bucket')
        key=(bucket,path)
        if key not in refs or key in files: raise ValueError('extra or duplicate attachment')
        name=entry['file']
        if not isinstance(name,str) or not re.fullmatch(r'[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+',name): raise ValueError('unsafe local file name')
        size,digest=entry['bytes'],entry['sha256']
        if type(size) is not int or size<0 or size>MAX_FILE_BYTES: raise ValueError('invalid file size')
        if not isinstance(digest,str) or not re.fullmatch('[0-9a-f]{64}',digest): raise ValueError('invalid file hash')
        total+=size
        if total>MAX_TOTAL_BYTES: raise ValueError('bundle exceeds size limit')
        fd=os.open(source/name,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
        with os.fdopen(fd,'rb') as handle:
            info=os.fstat(handle.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1 or info.st_size!=size: raise ValueError('invalid source file')
            data=handle.read(MAX_FILE_BYTES+1)
        if len(data)!=size or hashlib.sha256(data).hexdigest()!=digest: raise ValueError('source integrity mismatch')
        if refs[key]['sizes'] and refs[key]['sizes']!={size}: raise ValueError('record size mismatch')
        if refs[key]['hashes'] and refs[key]['hashes']!={digest}: raise ValueError('record hash mismatch')
        files[key]=(data,entry)
    if set(files)!=set(refs): raise ValueError('missing referenced attachment')
    output=_no_symlinks(output_directory)
    if not output.parent.is_dir() or output.parent.stat().st_mode & 0o077: raise ValueError('output parent must be private')
    if output.exists(): raise ValueError('output must not exist')
    # All validation finishes before any deliverable is created. Exclusive mkdir
    # prevents accidental overwrite; failed writes remove only this new directory.
    output.mkdir(mode=0o700)
    try:
        _export.serialize(payload,output)
        attachment_dir=output/'attachments';attachment_dir.mkdir(mode=0o700)
        emitted=[]
        for index,(key,(data,entry)) in enumerate(sorted(files.items())):
            name='attachments/'+str(index)+'.bin'
            with (output/name).open('xb') as handle: handle.write(data)
            emitted.append({'bucket':key[0],'path':key[1],'file':name,'bytes':len(data),'sha256':entry['sha256'],'records':refs[key]['records']})
        result={'format_version':1,'scope':'existing fictional QA snapshot plus supplied local attachment bytes','business_id':_export.BUSINESS,'attachments':emitted,'auth_included':False,'live_return_verified':False,'not_a_backup':True,'notes':['tenant manifest describes its own JSON/CSV exclusions; this manifest supplements Storage bytes','No remote object discovery, provider return, Auth export, recipient delivery or deletion performed']}
        (output/'attachment-manifest.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
        fingerprint=hashlib.sha256((output/'manifest.json').read_bytes()+b'\0'+(output/'attachment-manifest.json').read_bytes()).hexdigest()
        # Return separately: never trust a fingerprint copied from inside a bundle.
        return {**result,'verification_sha256':fingerprint}
    except BaseException:
        shutil.rmtree(output)
        raise
