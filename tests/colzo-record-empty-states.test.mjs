import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const source=readFileSync('assets/colzo-native.js','utf8');
const defaults=()=>({colzoRecords:{projects:[],quotes:[],clients:[]},colzoLoading:'',colzoError:'',colzoFeedback:'',projectFilter:'All',projectSearch:'',search:'',clientSearch:'',colzoForm:null});
function view(screen,changes={}){
 const start=source.indexOf(' function '+screen+'(){'),end=source.indexOf(' function '+(screen==='projects'?'clients':screen==='clients'?'customerProfile':'colzoRecordDetail')+'(){',start);
 assert.ok(start>=0&&end>start);
 const context=vm.createContext({state:{...defaults(),...changes},title:()=>'<h1>Quotes</h1>',safe:String,empty:(message,action='')=>'<div class="cn-empty">'+message+action+'</div>',records:()=>({enquiries:[]}),day:()=>'',contact:()=>'',colzoRecordForm:()=>''});
 vm.runInContext(source.slice(start,end)+';globalThis.show='+screen,context);
 const dom=new JSDOM(context.show());const result=dom.window.document.querySelector('body').textContent;dom.window.close();
 return result;
}
test('project filtered state does not claim saved work is missing and offers clear filters',()=>{
 const html=view('projects',{colzoRecords:{projects:[{id:1,title:'Boiler service',status:'active',notes:''}],quotes:[]},projectSearch:'unrelated'});
 assert.match(html,/No projects match/);
 assert.match(html,/Clear filters/);
 assert.doesNotMatch(html,/No saved projects yet/);
});
test('quotes empty search does not claim there are no saved quotes',()=>{
 const html=view('quotes',{colzoRecords:{projects:[],quotes:[{id:1,title:'Roof quote',status:'draft',notes:''}]},search:'unrelated'});
 assert.match(html,/No quotes match/);
 assert.match(html,/Clear search/);
 assert.doesNotMatch(html,/No saved quotes yet/);
});
test('project and quote first load do not show a misleading no-data message',()=>{
 for(const screen of ['projects','quotes']){
  const html=view(screen,{colzoLoading:screen,colzoRecords:{projects:null,quotes:null}});
  assert.match(html,/Loading saved/);
  assert.doesNotMatch(html,/No saved (projects|quotes) yet/);
 }
});
test('failed project or quote load does not show a contradictory zero-data empty state',()=>{
 for(const screen of ['projects','quotes']){
  const html=view(screen,{colzoError:'Unable to load records',colzoRecords:{projects:null,quotes:null}});
  assert.match(html,/Unable to load records/);
  assert.doesNotMatch(html,/No saved (projects|quotes) yet/);
 }
});
test('genuinely empty loaded project/quote lists preserve helpful initial guidance',()=>{
 assert.match(view('projects'),/No saved projects yet/);
 assert.match(view('quotes'),/No saved quotes yet/);
});


test('a failed first customer load does not simultaneously say no saved customers exist',()=>{
 const html=view('clients',{colzoError:'Customer service unavailable',colzoRecords:{clients:null,projects:[],quotes:[]}});
 assert.match(html,/Customer service unavailable/);
 assert.doesNotMatch(html,/No saved customers yet/);
});
test('customers loading and filtered-search states remain distinct',()=>{
 assert.match(view('clients',{colzoLoading:'clients',colzoRecords:{clients:null,projects:[],quotes:[]}}),/Loading saved customers/);
 const result=view('clients',{colzoRecords:{clients:[{id:'1',full_name:'Example Customer',email:'a@b.com'}],projects:[],quotes:[]},clientSearch:'not-found'});
 assert.match(result,/No customers match/);
 assert.doesNotMatch(result,/No saved customers yet/);
});
