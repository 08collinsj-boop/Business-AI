import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf(' function clients(){'),source.indexOf(' function customerProfile(){'));
const render=new Function('state','records','safe','day','empty','colzoRecordForm','contact',body+'; return clients();');
const customer={id:'qa',full_name:'  Alex   Example ',created_at:'2026-10-16'};
function screen(overrides={}){
 const state={colzoRecords:{clients:[customer]},clientSearch:'',colzoLoading:'',...overrides};
 return render(state,()=>({enquiries:[]}),v=>String(v??''),()=> '16 Oct',v=>`<p>${v}</p>`,()=>'',()=> '');
}
test('customer directory initials match multiword profile names',()=>{
 assert.match(screen(),/<span class="cn-avatar">AE<\/span>/);
});
test('unmatched customer searches do not claim the saved directory is empty',()=>{
 const html=screen({clientSearch:'missing'});
 assert.match(html,/No customers match your search/);
 assert.doesNotMatch(html,/No saved customers yet/);
});
test('customer directory distinguishes loading, empty and singular count',()=>{
 assert.match(screen(),/1 saved customer<\/p>/);
 assert.match(screen(),/1 record<\/span>/);
 assert.match(screen({colzoRecords:{clients:[]}}),/No saved customers yet/);
 assert.doesNotMatch(screen({colzoRecords:{clients:null},colzoLoading:'clients'}),/No saved customers yet/);
});
