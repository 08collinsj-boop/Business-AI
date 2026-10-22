import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('assets/colzo-native.js','utf8');
const start=source.indexOf(' async function saveColzoRecord(form){');
const end=source.indexOf(' function colzoRecordForm(resource,record=null){',start);
assert.ok(start>=0&&end>start);
const fn=source.slice(start,end);
async function save({writeFails=false,refreshFails=false,refreshThrows=false}={}){
 const feedback={textContent:'',setAttribute(name,value){this[name]=value}},button={textContent:'Create project',disabled:false};
 const form={dataset:{resource:'projects',recordId:''},setAttribute(name,value){this[name]=value},querySelector:s=>s==='[type=submit]'?button:null};
 const state={colzoBusy:false,colzoForm:{resource:'projects',record:null},colzoFeedback:'',colzoError:'',colzoErrorResource:'',screen:'projects'};
 const calls=[],renders=[];
 class FormDataFixture{entries(){return Object.entries({title:'Synthetic project',status:'planned',progress:'20',lead_id:'',notes:''})}}
 const context=vm.createContext({state,content:{querySelector:()=>feedback},FormData:FormDataFixture,encodeURIComponent,render:()=>renders.push('render'),
 api:async(url,options)=>{calls.push({url,method:options.method});if(writeFails)throw Error('Could not write project');return{id:'33333333-3333-4333-8333-333333333333'}},
 loadColzoResource:async resource=>{if(refreshThrows)throw Error('Refresh interrupted');if(refreshFails){state.colzoError='Network load unavailable';state.colzoErrorResource=resource}},
 });
 vm.runInContext(fn+';globalThis.saveRecord=saveColzoRecord',context);
 await context.saveRecord(form);
 return{state,feedback,button,form,calls,renders};
}
test('confirmed create plus failed list reload clearly says saved, but refresh required',async()=>{
 const x=await save({refreshFails:true});
 assert.equal(x.calls.length,1);
 assert.equal(x.calls[0].method,'POST');
 assert.equal(x.state.colzoForm,null);
 assert.match(x.state.colzoFeedback,/created|saved/i);
 assert.match(x.state.colzoFeedback,/refresh|reload|try again/i);
 assert.equal(x.renders.length,1);
 assert.doesNotMatch(x.feedback.textContent,/could not save|could not write/i);
});
test('confirmed create plus unexpected refresh exception must not appear as an unsuccessful write',async()=>{
 const x=await save({refreshThrows:true});
 assert.equal(x.calls.length,1);
 assert.equal(x.state.colzoForm,null);
 assert.match(x.state.colzoFeedback,/saved|created/i);
 assert.match(x.state.colzoFeedback,/refresh|reload|try again/i);
 assert.equal(x.renders.length,1);
 assert.doesNotMatch(x.feedback.textContent,/could not save/i);
});
test('failed initial write still retains edit form and shows clear failure',async()=>{
 const x=await save({writeFails:true});
 assert.ok(x.state.colzoForm);
 assert.equal(x.state.colzoFeedback,'');
 assert.match(x.feedback.textContent,/Could not write project/);
 assert.equal(x.feedback.role,'alert');
 assert.equal(x.renders.length,0);
});
test('normal confirmed write plus successful refresh retains plain success message',async()=>{
 const x=await save();
 assert.equal(x.state.colzoFeedback,'Record created.');
 assert.equal(x.renders.length,0);
});
