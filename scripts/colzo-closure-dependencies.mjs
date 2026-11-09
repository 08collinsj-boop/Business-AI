// Offline metadata assessment only. Never generates SQL or connects to a database.
import {createHash} from 'node:crypto';
function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
 return JSON.stringify(value);
}
export function assessClosureDependencies(snapshot,plan,expectedFingerprint){
 const metadata=snapshot?.metadata;
 if(snapshot?.metadata_only!==true||!Array.isArray(metadata?.tables)||!Array.isArray(metadata?.foreign_keys)||!plan||typeof plan!=='object'||Array.isArray(plan))throw Error('Invalid dependency metadata or plan');
 const fingerprint=createHash('sha256').update(canonical(metadata)).digest('hex');
 for(const expected of [expectedFingerprint,snapshot.metadata_sha256])if(expected!==undefined&&expected!==fingerprint)throw Error('Dependency metadata fingerprint mismatch');
 const names=new Set(),blockers=[];
 for(const table of metadata.tables){
  if(!/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(table.name)||typeof table.business_id!=='boolean'||names.has(table.name))throw Error('Invalid table metadata');
  names.add(table.name);
 }
 if(!metadata.tables.some(table=>table.name==='public.businesses'&&table.business_id===false))throw Error('Missing or invalid business root metadata');
 for(const table of metadata.tables){
  const action=Object.hasOwn(plan,table.name)?plan[table.name]:undefined;
  if(action===undefined)blockers.push({code:'UNCLASSIFIED_TABLE',table:table.name});
  else if(action!=='delete'&&action!=='retain')blockers.push({code:'INVALID_ACTION',table:table.name});
  if(action==='delete'){
   if(table.name==='public.businesses')blockers.push({code:'ROOT_DELETION_UNSUPPORTED',table:table.name});
   else if(!table.business_id)blockers.push({code:'UNSCOPED_TABLE',table:table.name});
   if(!table.name.startsWith('public.'))blockers.push({code:'PRIVATE_TABLE_REVIEW',table:table.name});
  }
 }
 for(const name of Object.keys(plan))if(!names.has(name))blockers.push({code:'UNKNOWN_TABLE',table:name});
 const deleting=new Set(metadata.tables.filter(table=>plan[table.name]==='delete').map(table=>table.name));
 const dependencies=new Map([...deleting].map(name=>[name,new Set()]));
 const constraintNames=new Set();
 for(const edge of metadata.foreign_keys){
  if(!edge||!names.has(edge.child)||!names.has(edge.parent)||typeof edge.name!=='string'||!edge.name.trim()||!['a','r','c','n','d'].includes(edge.on_delete)||!Array.isArray(edge.child_columns)||!Array.isArray(edge.parent_columns)||!edge.child_columns.length||edge.child_columns.length!==edge.parent_columns.length||[...edge.child_columns,...edge.parent_columns].some(column=>typeof column!=='string'||!column.trim())||new Set(edge.child_columns).size!==edge.child_columns.length||new Set(edge.parent_columns).size!==edge.parent_columns.length)throw Error('Invalid foreign-key metadata');
  const constraintKey=JSON.stringify([edge.child,edge.name]);
  if(constraintNames.has(constraintKey))throw Error('Duplicate foreign-key metadata');
  constraintNames.add(constraintKey);
  if(!deleting.has(edge.parent))continue;
  if(!deleting.has(edge.child))blockers.push({code:'RETAINED_DEPENDENCY',child:edge.child,parent:edge.parent,constraint:edge.name,onDelete:edge.on_delete});
  const scopeIndex=edge.child_columns.indexOf('business_id');
  const scoped=scopeIndex>=0&&(edge.parent_columns[scopeIndex]==='business_id'||(edge.parent==='public.businesses'&&edge.parent_columns[scopeIndex]==='id'));
  if(!scoped)blockers.push({code:'UNSCOPED_REFERENCE',child:edge.child,parent:edge.parent,constraint:edge.name});
  if(deleting.has(edge.child)&&edge.child!==edge.parent)dependencies.get(edge.parent).add(edge.child);
 }
 const order=[],pending=new Set(deleting);
 while(pending.size){
  const next=[...pending].sort().find(name=>[...dependencies.get(name)].every(child=>!pending.has(child)));
  if(!next){blockers.push({code:'DEPENDENCY_CYCLE',tables:[...pending].sort()});break;}
  pending.delete(next);order.push(next);
 }
 return {metadataFingerprint:fingerprint,tableCount:metadata.tables.length,foreignKeyCount:metadata.foreign_keys.length,ready:blockers.length===0,blockers,deletionOrder:blockers.length?[]:order,executionSupported:false,scope:'dependency assessment only; excludes row authority, retention holds, triggers, Auth, Storage and provider lifecycle'};
}
