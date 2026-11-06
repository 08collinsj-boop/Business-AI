#!/usr/bin/env python3
"""Synthetic acceptance for an independent offline return-bundle verifier."""
import copy, hashlib, importlib.util, json, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
bundle=load('receipt_bundle',ROOT/'scripts/colzo-attachment-return.py')
verifier=load('receipt_verifier',ROOT/'scripts/colzo-return-verifier.py')
export=bundle._export
categories={name:{'mode':cfg['mode'],'row_count':0,'rows':[]} for name,cfg in export.SPEC.items()}
def row(table,**values):
    value=dict.fromkeys(export.SPEC[table]['columns']);value.update(values)
    if 'business_id' in value:value['business_id']=export.BUSINESS
    categories[table]['rows'].append(value);categories[table]['row_count']+=1
row('businesses',id=export.BUSINESS,name='Fictional receipt fixture')
source_id='30000000-0000-4000-8000-000000000001';data=b'fictional receipt bytes'
row('business_knowledge_sources',id=source_id,storage_path='source/'+source_id+'/fixture.txt',size_bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
row('leads',id=1,name='=FICTIONAL_FORMULA()',description='Synthetic only')
payload={'format_version':1,'business_id':export.BUSINESS,'user_id':export.USER,'captured_at':'2026-11-06T00:00:00Z','categories':categories}
checks=[]
def reject(label,fn):
    try:fn()
    except (ValueError,OSError):checks.append(label)
    else:raise AssertionError(label+' accepted')
with tempfile.TemporaryDirectory(prefix='colzo-receipt-synthetic-') as temp:
    root=Path(temp);source=root/'source';source.mkdir(mode=0o700);(source/'fixture.bin').write_bytes(data)
    attachments=[{'bucket':'business-knowledge','path':'source/'+source_id+'/fixture.txt','file':'fixture.bin','bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}]
    result=bundle.write_bundle(payload,attachments,source,root/'bundle');output=root/'bundle'
    fingerprint=result['verification_sha256'];before={str(p.relative_to(output)):p.read_bytes() for p in output.rglob('*') if p.is_file()}
    report=verifier.verify_bundle(output,fingerprint)
    assert report['verified'] and report['attachment_count']==1 and report['csv_count']==44
    assert report['live_return_verified'] is False and report['recipient_delivery_verified'] is False
    checks.append('independent receipt verifies JSON,44 CSVs,attachment bytes and explicit acceptance limits')
    assert before=={str(p.relative_to(output)):p.read_bytes() for p in output.rglob('*') if p.is_file()};checks.append('verification performs no writes')
    reject('missing trusted fingerprint',lambda:verifier.verify_bundle(output,None))
    reject('incorrect trusted fingerprint',lambda:verifier.verify_bundle(output,'0'*64))
    target=output/'attachments/0.bin';original=target.read_bytes();target.write_bytes(b'corrupted')
    reject('corrupted attachment',lambda:verifier.verify_bundle(output,fingerprint));target.write_bytes(original)
    target.unlink();reject('missing attachment',lambda:verifier.verify_bundle(output,fingerprint));target.write_bytes(original)
    extra=output/'unlisted.txt';extra.write_text('fictional extra');reject('unlisted file',lambda:verifier.verify_bundle(output,fingerprint));extra.unlink()
    extra=output/'extra';extra.mkdir();reject('unlisted directory',lambda:verifier.verify_bundle(output,fingerprint));extra.rmdir()
    target=output/'leads.csv';original=target.read_bytes();target.write_bytes(original.replace(b"'=FICTIONAL_FORMULA()",b'=FICTIONAL_FORMULA()'))
    reject('modified CSV formula escaping',lambda:verifier.verify_bundle(output,fingerprint));target.write_bytes(original)
    # Even a newly fingerprinted, internally rehashed CSV must agree with JSON.
    csv_path=output/'leads.csv';csv_original=csv_path.read_bytes();manifest_path=output/'manifest.json';manifest_original=manifest_path.read_bytes()
    changed=csv_original.replace(b"'=FICTIONAL_FORMULA()",b'=FICTIONAL_FORMULA()');csv_path.write_bytes(changed)
    altered=json.loads(manifest_original)
    entry=next(item for item in altered['files'] if item['name']=='leads.csv');entry['bytes']=len(changed);entry['sha256']=hashlib.sha256(changed).hexdigest()
    manifest_path.write_text(json.dumps(altered))
    altered_fingerprint=hashlib.sha256(manifest_path.read_bytes()+b'\0'+(output/'attachment-manifest.json').read_bytes()).hexdigest()
    reject('rehashed CSV still must match snapshot and formula escaping',lambda:verifier.verify_bundle(output,altered_fingerprint))
    csv_path.write_bytes(csv_original);manifest_path.write_bytes(manifest_original)
    attachment_manifest=output/'attachment-manifest.json';attachment_original=attachment_manifest.read_bytes();altered=json.loads(attachment_original);altered['attachments'][0]['file']='../outside.bin';attachment_manifest.write_text(json.dumps(altered))
    altered_fingerprint=hashlib.sha256(manifest_path.read_bytes()+b'\0'+attachment_manifest.read_bytes()).hexdigest()
    reject('re-fingerprinted path traversal',lambda:verifier.verify_bundle(output,altered_fingerprint));attachment_manifest.write_bytes(attachment_original)
    (output/'attachments').chmod(0o755);reject('shared attachment directory',lambda:verifier.verify_bundle(output,fingerprint));(output/'attachments').chmod(0o700)
    target=output/'manifest.json';original=target.read_bytes();target.write_bytes(original+b' ')
    reject('modified manifest even with same JSON values',lambda:verifier.verify_bundle(output,fingerprint));target.write_bytes(original)
    target=output/'attachments/0.bin';original=target.read_bytes();target.unlink();target.symlink_to(source/'fixture.bin')
    reject('symlink attachment',lambda:verifier.verify_bundle(output,fingerprint));target.unlink();target.write_bytes(original)
    link=root/'linked';link.symlink_to(root,target_is_directory=True);reject('symlink bundle ancestor',lambda:verifier.verify_bundle(link/'bundle',fingerprint))
    output.chmod(0o755);reject('shared bundle directory',lambda:verifier.verify_bundle(output,fingerprint));output.chmod(0o700)
    assert verifier.verify_bundle(output,fingerprint)['verified'];checks.append('restored unchanged package remains independently verifiable')
print(json.dumps({'synthetic_only':True,'network_used':False,'checks':checks,'live_return_verified':False}))
