import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assessClosureDependencies} from '../scripts/colzo-closure-dependencies.mjs';
const snapshot=JSON.parse(await readFile(new URL('../docs/colzo-pilot-review/CLOSURE_DEPENDENCIES_20261106.json',import.meta.url)));
test('complete live catalog snapshot refuses incomplete six-table closure coverage',()=>{
 const plan=Object.fromEntries(snapshot.metadata.tables.map(t=>[t.name,'retain']));
 for(const name of ['leads','lead_history','bookings','actions','business_knowledge_sources','business_knowledge_items'])plan['public.'+name]='delete';
 const result=assessClosureDependencies(snapshot,plan,snapshot.metadata_sha256);
 assert.equal(result.ready,false);assert.equal(result.executionSupported,false);
 assert.equal(result.tableCount,51);assert.equal(result.foreignKeyCount,77);
 assert.ok(result.blockers.some(x=>x.code==='RETAINED_DEPENDENCY'&&x.child==='public.voice_calls'));
 assert.ok(result.blockers.some(x=>x.code==='UNSCOPED_REFERENCE'&&x.child==='public.business_knowledge_sources'));
 assert.deepEqual(result.deletionOrder,[]);
});
const fixture={tables:[{name:'public.businesses',business_id:false},{name:'public.parents',business_id:true},{name:'public.children',business_id:true}],foreign_keys:[{name:'child_parent',child:'public.children',parent:'public.parents',child_columns:['parent_id','business_id'],parent_columns:['id','business_id'],on_delete:'c'}]};
const wrap=metadata=>({metadata,metadata_only:true});
test('metadata planner orders children before parents without generating SQL or enabling execution',()=>{
 const result=assessClosureDependencies(wrap(fixture),{'public.businesses':'retain','public.parents':'delete','public.children':'delete'});
 assert.equal(result.ready,true);assert.deepEqual(result.deletionOrder,['public.children','public.parents']);
 assert.equal(result.executionSupported,false);assert.equal('sql' in result,false);
});
test('unknown cascading child, private table, stale fingerprint and root deletion fail closed',()=>{
 const plan={'public.businesses':'retain','public.parents':'delete','public.children':'delete'};
 assert.throws(()=>assessClosureDependencies(snapshot,{},'0'.repeat(64)),/fingerprint/);
 const extra=structuredClone(fixture);extra.tables.push({name:'private.audit',business_id:true});extra.foreign_keys.push({name:'private_parent',child:'private.audit',parent:'public.parents',child_columns:['parent_id'],parent_columns:['id'],on_delete:'c'});
 const result=assessClosureDependencies(wrap(extra),plan);
 assert.equal(result.ready,false);assert.ok(result.blockers.some(x=>x.code==='UNCLASSIFIED_TABLE'&&x.table==='private.audit'));
 assert.ok(result.blockers.some(x=>x.code==='UNSCOPED_REFERENCE'));
 assert.equal(assessClosureDependencies(wrap(fixture),{...plan,'public.businesses':'delete'}).ready,false);
 assert.equal(assessClosureDependencies(wrap(extra),{...plan,'private.audit':'delete'}).ready,false);
});
test('shared tables, unknown plan entries, invalid actions and cycles are not silently ignored',()=>{
 const plan={'public.businesses':'retain','public.parents':'delete','public.children':'delete'};
 const shared=structuredClone(fixture);shared.tables[2].business_id=false;
 assert.ok(assessClosureDependencies(wrap(shared),plan).blockers.some(x=>x.code==='UNSCOPED_TABLE'));
 assert.ok(assessClosureDependencies(wrap(fixture),{...plan,'public.missing':'delete'}).blockers.some(x=>x.code==='UNKNOWN_TABLE'));
 assert.ok(assessClosureDependencies(wrap(fixture),{...plan,'public.children':'cascade'}).blockers.some(x=>x.code==='INVALID_ACTION'));
 const cycle=structuredClone(fixture);cycle.foreign_keys.push({name:'reverse',child:'public.parents',parent:'public.children',child_columns:['child_id','business_id'],parent_columns:['id','business_id'],on_delete:'r'});
 assert.ok(assessClosureDependencies(wrap(cycle),plan).blockers.some(x=>x.code==='DEPENDENCY_CYCLE'));
});
