import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=()=>readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const style=()=>readFileSync(new URL('../assets/colzo-connected-workspace.css',import.meta.url),'utf8');
const html=()=>readFileSync(new URL('../index.html',import.meta.url),'utf8');
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function view(extra={}){
 const js=source(),start=js.indexOf(' function myWorkScreen(){'),end=js.indexOf(' // A company workspace is shared across',start);
 assert.ok(start>=0&&end>start,'My Work must remain a standalone accessible screen before Company workspace');
 const state={myWorkTasks:null,myWorkLoading:false,myWorkBusy:false,myWorkUnavailable:false,myWorkError:'',myWorkMessage:'',myWorkFilter:'Open',...extra};
 const context={state,safe,dateValue:value=>new Date(value),day:value=>safe(value)};
 vm.createContext(context);vm.runInContext(js.slice(start,end)+'\nthis.view=myWorkScreen;',context);
 return context.view();
}
test('My Work has dedicated native navigation from Company, More and command palette, but does not replace the existing Actions view',()=>{
 const js=source();
 assert.match(js,/myWork:myWorkScreen/);
 assert.match(js,/data-cn-screen="myWork"/);
 assert.match(js,/screen==='myWork'\)loadMyWork/);
 assert.match(js,/screen:'myWork'/);
 assert.match(js,/function actionsScreen\(\)/);
 assert.match(js,/function companyWorkspaceScreen\(\)/);
});
test('My Work is explicit about its unavailable state and never shows synthetic progress metrics',()=>{
 const output=view({myWorkUnavailable:true});
 assert.match(output,/Individual assignments are not active/);
 assert.match(output,/data-cn-screen="actions"/);
 assert.doesNotMatch(output,/0 tasks|No assignments|Mark completed|data-my-work-complete/);
});
test('My Work fails closed on error or initial state without showing stale task contents',()=>{
 assert.match(view({myWorkError:'Unable to verify current assignments'}),/Unable to verify current assignments/);
 assert.doesNotMatch(view({myWorkError:'Unable to verify current assignments',myWorkTasks:[{id:8,title:'Stale'}]}),/Stale/);
 assert.match(view({myWorkLoading:true}),/Checking your assignments/);
 assert.doesNotMatch(view({myWorkLoading:true,myWorkTasks:[{id:8,title:'Stale'}]}),/Stale/);
});
test('My Work renders escaped, server-confirmed assigned tasks with explicit progress action only for pending status',()=>{
 const markup=view({myWorkTasks:[{id:7,title:'<img src=x onerror=alert(1)>',priority:'high',status:'pending',updated_at:'2026-11-12T14:00:00Z',due_at:'2026-11-14T12:00:00Z'},{id:8,title:'Inspect circuit',status:'completed',updated_at:'2026-11-12T14:00:00Z'}],myWorkFilter:'All'});
 assert.match(markup,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(markup,/<img/);
 assert.match(markup,/data-my-work-complete="7"/);
 assert.doesNotMatch(markup,/data-my-work-complete="8"/);
 assert.match(markup,/Inspect circuit/);
});
test('My Work never presents verified zero assignments until the scoped API confirmed an actual empty array',()=>{
 assert.match(view({myWorkTasks:[]}),/No assigned tasks in this view/);
 assert.doesNotMatch(view({myWorkTasks:null}),/No assigned tasks in this view/);
});
test('My Work supports refresh and filtering with mobile accessible controls',()=>{
 const markup=view({myWorkTasks:[{id:1,title:'Review',status:'pending',updated_at:'2026-11-12T14:00:00Z'}]});
 assert.match(markup,/data-my-work-refresh/);
 assert.match(markup,/data-my-work-filter="Open"/);
 assert.match(markup,/data-my-work-filter="Completed"/);
 assert.match(style(),/\.cn-my-work/);
 assert.match(style(),/@media\s*\(max-width:\s*620px\)/);
 assert.match(html(),/colzo-native\.js\?v=20261113-qa-visual-v1/);
});
test('My Work backend call is scoped to signed-in session and marks status with explicit confirmation and optimistic concurrency',()=>{
 const js=source();
 assert.match(js,/api\('\/api\/actions\?scope=mine'\)/);
 assert.match(js,/window\.confirm\('Mark this assigned task completed\?/);
 assert.match(js,/expected_updated_at:task\.updated_at/);
 assert.match(js,/method:'PATCH'/);
 assert.match(js,/if\(requestEpoch!==sessionEpoch\)return/);
 assert.match(js,/myWorkTasks:null/);
 assert.match(js,/Object\.assign\(state,initialState\(\)\)/);
});
function runtime({api,confirm=true}={}){
 const js=source(),start=js.indexOf(' async function loadMyWork(){'),end=js.indexOf(' async function loadCompanyWorkspace(){',start);
 assert.ok(start>0&&end>start,'My Work loader and mutation must be isolated');
 const state={screen:'myWork',myWorkTasks:null,myWorkLoading:false,myWorkBusy:false,myWorkError:'',myWorkUnavailable:false,myWorkMessage:'',myWorkFilter:'Open'};
 const calls=[];
 const context={state,sessionEpoch:0,root:{isConnected:true},render:()=>{},api:async(...args)=>{calls.push(args);return api(...args);},window:{confirm:()=>confirm},Date,console};
 vm.createContext(context);vm.runInContext(js.slice(start,end)+'\nthis.load=loadMyWork;this.complete=completeMyWork;',context);
 return{context,state,calls};
}
const assigned={id:81,assignee_user_id:'44444444-4444-4444-8444-444444444444',title:'Check consumer unit',status:'pending',updated_at:'2026-11-12T14:00:00Z',priority:'high'};
test('runtime: My Work loader shows only scoped server array, no direct browser-user filter',async()=>{
 const x=runtime({api:async url=>{assert.equal(url,'/api/actions?scope=mine');return [assigned];}});
 await x.context.load();
 assert.deepEqual(JSON.parse(JSON.stringify(x.state.myWorkTasks)),[assigned]);
 assert.equal(x.state.myWorkLoading,false);
});
test('runtime: disabled assignment yields an unavailable notice, never an empty task list',async()=>{
 const x=runtime({api:async()=>{throw Error('Individual task assignment is not enabled');}});
 await x.context.load();
 assert.equal(x.state.myWorkUnavailable,true);
 assert.equal(x.state.myWorkTasks,null);
 assert.equal(x.state.myWorkError,'');
});
test('runtime: a session switch discards the old My Work fetch response',async()=>{
 let finish;
 const x=runtime({api:async()=>new Promise(resolve=>{finish=resolve;})});
 const pending=x.context.load();
 x.context.sessionEpoch=1;
 finish([assigned]);await pending;
 assert.equal(x.state.myWorkTasks,null);
});
test('runtime: task cannot complete without explicit user consent',async()=>{
 const x=runtime({confirm:false,api:async()=>{throw Error('No network should be reached');}});
 x.state.myWorkTasks=[assigned];
 await x.context.complete(81);
 assert.equal(x.calls.length,0);
});
test('runtime: confirmed task completion writes only status/id/version and refreshes from the scoped server',async()=>{
 let step=0;
 const x=runtime({api:async(url,init)=>{
  step++;
  if(step===1){assert.equal(url,'/api/actions');assert.equal(init.method,'PATCH');assert.deepEqual(JSON.parse(init.body),{id:81,status:'completed',expected_updated_at:assigned.updated_at});return{...assigned,status:'completed',updated_at:'2026-11-12T14:01:00Z'};}
  assert.equal(url,'/api/actions?scope=mine');return[{...assigned,status:'completed',updated_at:'2026-11-12T14:01:00Z'}];
 }});
 x.state.myWorkTasks=[assigned];await x.context.complete(81);
 assert.equal(step,2);
 assert.equal(x.state.myWorkTasks[0].status,'completed');
 assert.equal(x.state.myWorkMessage,'Task completed and refreshed.');
});
test('runtime: mismatched server-confirmed assignee invalidates the rendered task list',async()=>{
 const x=runtime({api:async()=>({...assigned,status:'completed',assignee_user_id:'55555555-5555-4555-8555-555555555555'})});
 x.state.myWorkTasks=[assigned];await x.context.complete(81);
 assert.equal(x.calls.length,1);
 assert.equal(x.state.myWorkTasks,null);
 assert.match(x.state.myWorkError,/did not confirm/);
});
test('runtime: an unverified follow-up read never triggers a second write',async()=>{
 let writes=0;
 const x=runtime({api:async(url)=>{
  if(url==='/api/actions'){writes++;return{...assigned,status:'completed'};}
  throw Error('Request failed');
 }});
 x.state.myWorkTasks=[assigned];await x.context.complete(81);
 assert.equal(writes,1);
 assert.equal(x.state.myWorkTasks,null);
 assert.match(x.state.myWorkMessage,/list could not be verified/);
});
test('Company and My Work sit under More navigation, not the owner Home tab',()=>{
 const js=source();
 assert.match(js,/\['setting','company','myWork'/);
 assert.match(js,/const primaryScreens=\['home','enquiries','bookings','clients','more'\]/);
});
