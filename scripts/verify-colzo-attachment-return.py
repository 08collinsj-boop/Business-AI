#!/usr/bin/env python3
"""Exercise attachment return only with generated fictional bytes in temporary directories."""
import copy
import hashlib
import importlib.util
import json
import tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
export=load('fixture_export',ROOT/'docs/colzo-pilot-review/qa_export_serializer_20261029.py')
bundle=load('fixture_attachments',ROOT/'scripts/colzo-attachment-return.py')
categories={name:{'mode':cfg['mode'],'row_count':0,'rows':[]} for name,cfg in export.SPEC.items()}
def row(table,**values):
    value=dict.fromkeys(export.SPEC[table]['columns'])
    if 'business_id' in value: value['business_id']=export.BUSINESS
    value.update(values)
    categories[table]['rows'].append(value)
    categories[table]['row_count']+=1
source_id='30000000-0000-4000-8000-000000000001'
row('businesses',id=export.BUSINESS,name='Synthetic attachment business')
row('business_knowledge_sources',id=source_id,storage_path='source/'+source_id+'/fictional.txt',size_bytes=9,sha256=hashlib.sha256(b'fictional').hexdigest())
row('business_knowledge_sources',id='manual-fixture',storage_path='manual/manual-fixture')
row('business_settings',id='synthetic-settings',profile_image_path=export.BUSINESS+'/avatar/synthetic.png',profile_banner_path=export.BUSINESS+'/banner/synthetic.png')
row('marketing_images',id='synthetic-marketing',storage_bucket='marketing-images',storage_path=export.BUSINESS+'/synthetic/image.png')
payload={'format_version':1,'business_id':export.BUSINESS,'user_id':export.USER,'captured_at':'2026-11-06T00:00:00Z','categories':categories}
checks=[]
def reject(label,fn):
    try: fn()
    except (ValueError,OSError): checks.append(label)
    else: raise AssertionError(label+' was accepted')
with tempfile.TemporaryDirectory(prefix='colzo-attachment-synthetic-') as temp:
    root=Path(temp); source=root/'source';source.mkdir(mode=0o700)
    refs=bundle.attachment_references(payload)
    assert len(refs)==4 and any(key[1].startswith('source/') for key in refs)
    checks.append('Knowledge source-id paths included and manual facts need no Storage object')
    manifest=[]
    for index,(bucket,path) in enumerate(sorted(refs)):
        data=b'fictional' if bucket=='business-knowledge' else ('synthetic bytes '+str(index)).encode()
        name=str(index)+'.bin';(source/name).write_bytes(data)
        manifest.append({'bucket':bucket,'path':path,'file':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    result=bundle.write_bundle(payload,manifest,source,root/'return')
    for item in result['attachments']:
        data=(root/'return'/item['file']).read_bytes()
        assert len(data)==item['bytes'] and hashlib.sha256(data).hexdigest()==item['sha256']
    assert (root/'return').stat().st_mode & 0o077==0
    checks.append('four referenced synthetic files roundtrip with hashes and private output')
    assert json.loads((root/'return'/'tenant.json').read_text())==payload
    checks.append('original tenant snapshot accompanies attachment bundle')
    reject('missing referenced file',lambda:bundle.write_bundle(payload,manifest[:-1],source,root/'missing'))
    extra=copy.deepcopy(manifest);extra.append({**manifest[0],'path':export.BUSINESS+'/unreferenced'})
    reject('extra unreferenced file',lambda:bundle.write_bundle(payload,extra,source,root/'extra'))
    reject('duplicate attachment entry',lambda:bundle.write_bundle(payload,manifest+[manifest[0]],source,root/'duplicate'))
    bad=copy.deepcopy(manifest);bad[0]['sha256']='0'*64
    reject('corrupted file hash',lambda:bundle.write_bundle(payload,bad,source,root/'hash'))
    bad=copy.deepcopy(manifest);bad[0]['bytes']+=1
    reject('incorrect file length',lambda:bundle.write_bundle(payload,bad,source,root/'length'))
    bad=copy.deepcopy(manifest);bad[0]['file']='../outside'
    reject('local file path traversal',lambda:bundle.write_bundle(payload,bad,source,root/'traversal'))
    foreign=copy.deepcopy(payload);foreign['categories']['marketing_images']['rows'][0]['storage_path']='foreign-business/image.png'
    reject('foreign marketing object reference',lambda:bundle.attachment_references(foreign))
    foreign=copy.deepcopy(payload);foreign['categories']['business_knowledge_sources']['rows'][0]['storage_path']='source/foreign-record/file.txt'
    reject('foreign Knowledge source reference',lambda:bundle.attachment_references(foreign))
    bad=copy.deepcopy(payload);bad['categories']['business_knowledge_sources']['rows'][0]['size_bytes']=8
    reject('record size metadata mismatch',lambda:bundle.write_bundle(bad,manifest,source,root/'record-size'))
    bad=copy.deepcopy(payload);bad['categories']['business_knowledge_sources']['rows'][0]['sha256']='0'*64
    reject('record hash metadata mismatch',lambda:bundle.write_bundle(bad,manifest,source,root/'record-hash'))
    bad=copy.deepcopy(payload);bad['categories']['businesses']['rows']=[];bad['categories']['businesses']['row_count']=0
    reject('missing business root record',lambda:bundle.attachment_references(bad))
    bad=copy.deepcopy(payload);bad['categories']['marketing_images']['rows'][0]['storage_path']=export.BUSINESS+'/%2e%2e/file'
    reject('encoded object path ambiguity',lambda:bundle.attachment_references(bad))
    bad=copy.deepcopy(manifest);bad[0]['bytes']=bundle.MAX_FILE_BYTES+1
    reject('oversized file',lambda:bundle.write_bundle(payload,bad,source,root/'oversized'))
    original=source/manifest[0]['file'];backup=source/'backup';original.rename(backup);original.symlink_to(backup)
    reject('symlink source file',lambda:bundle.write_bundle(payload,manifest,source,root/'symlink'))
    original.unlink();backup.rename(original)
    ancestor=root/'ancestor';ancestor.symlink_to(source,target_is_directory=True)
    reject('symlink source directory',lambda:bundle.write_bundle(payload,manifest,ancestor,root/'source-link'))
    output_link=root/'output-link';output_link.symlink_to(root,target_is_directory=True)
    reject('symlink output ancestor',lambda:bundle.write_bundle(payload,manifest,source,output_link/'new-return'))
    reject('existing output directory',lambda:bundle.write_bundle(payload,manifest,source,root/'return'))
    serializer=bundle._export.serialize
    def fail_after_write(payload,output):
        (output/'partial.json').write_text('synthetic partial')
        raise OSError('simulated disk failure')
    try:
        bundle._export.serialize=fail_after_write
        reject('partial write failure',lambda:bundle.write_bundle(payload,manifest,source,root/'partial'))
    finally: bundle._export.serialize=serializer
    assert {p.name for p in root.iterdir()}=={'source','return','ancestor','output-link'}
    checks.append('rejected bundles leave no partial deliverable')
    assert result['live_return_verified'] is False and result['auth_included'] is False
    checks.append('live return and Auth lifecycle remain explicitly unverified')
print(json.dumps({'synthetic_only':True,'network_used':False,'file_count':4,'checks':checks,'live_return_verified':False}))
