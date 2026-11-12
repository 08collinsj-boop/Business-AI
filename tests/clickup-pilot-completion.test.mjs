import test from 'node:test';
import assert from 'node:assert/strict';
import {getClickupLists, assertClickupTaskSnapshot} from '../lib/clickup-provider.js';

const response = data => new Response(JSON.stringify(data), {status:200, headers:{'content-type':'application/json'}});
test('list discovery finds empty folderless and nested lists without needing tasks',async()=>{
  const called=[];
  const endpoints = {
    'team/123/space?archived=false':{spaces:[{id:'10',name:'Operations'}]},
    'space/10/list?archived=false':{lists:[{id:'901',name:'Incoming'}]},
    'space/10/folder?archived=false':{folders:[{id:'20',name:'Clients'}]},
    'folder/20/list?archived=false':{lists:[{id:'902',name:'Quotes'}]}
  };
  const result=await getClickupLists('private-token','123',{fetchImpl:async (url,opt)=>{
    assert.equal(opt.headers.Authorization,'Bearer private-token');
    const route=url.split('/api/v2/')[1];called.push(route);
    assert.ok(endpoints[route],route);return response(endpoints[route]);
  }});
  assert.deepEqual(result,{lists:[
    {id:'901',name:'Incoming',path:'Operations / Incoming'},
    {id:'902',name:'Quotes',path:'Operations / Clients / Quotes'}
  ],truncated:false});
  assert.equal(called.length,4);
  assert.equal(JSON.stringify(result).includes('private-token'),false);
});
test('list discovery rejects untrusted tenant and malformed provider structures',async()=>{
  await assert.rejects(getClickupLists('private-token','oops',{fetchImpl:()=>{throw Error('network must not run')}}),/invalid/i);
  await assert.rejects(getClickupLists('private-token','123',{fetchImpl:async()=>response({spaces:'not-array'})}),/invalid/i);
});
test('list discovery limits remote requests and discloses incomplete results',async()=>{
 const paths=[];
 const result=await getClickupLists('private-token','123',{fetchImpl:async url=>{
   const route=url.split('/api/v2/')[1];paths.push(route);
   if(route.startsWith('team/'))return response({spaces:Array.from({length:20},(_,i)=>({id:String(i+1),name:'Space'}))});
   if(route.endsWith('/list?archived=false'))return response({lists:[]});
   if(route.endsWith('/folder?archived=false'))return response({folders:[]});
   throw Error('unexpected URL '+route);
 }});
 assert.equal(result.truncated,true);
 assert.ok(paths.length<=20,'should never fan out across every space');
});
test('task writes reject a stale title as well as a stale status',()=>{
 const tasks=[{id:'abc',title:'Customer quote',status:'to do'}];
 assert.deepEqual(assertClickupTaskSnapshot(tasks,'abc','Customer quote','to do'),tasks[0]);
 assert.throws(()=>assertClickupTaskSnapshot(tasks,'abc','Old name','to do'),e=>e.status===409);
 assert.throws(()=>assertClickupTaskSnapshot(tasks,'abc','Customer quote','done'),e=>e.status===409);
 assert.throws(()=>assertClickupTaskSnapshot(tasks,'other','Customer quote','to do'),e=>e.status===409);
 assert.throws(()=>assertClickupTaskSnapshot(tasks,'abc','Customer quote',undefined),e=>e.status===409);
});

