import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync('assets/colzo-native.js','utf8');
const begin=source.indexOf(' async function saveWork(form){'),end=source.indexOf(" const primaryScreens=",begin);
assert.ok(begin>=0&&end>begin);
const version='2026-10-19T12:00:00.123456+00:00';
async function submit(resource,loaded=version,pilotBranch=false){
 const calls=[],error={textContent:''},button={disabled:false};
 const state={workBusy:false,workModal:resource,workSelected:11};
 const form={dataset:{kind:resource,id:'11',version:loaded},querySelector:()=>button};
 class FixtureFormData {get(key){return {title:'QA draft',status:resource==='actions'?'pending':'requested',notes:'Unsaved QA note',action_type:'custom',priority:'normal'}[key]||''}}
 const context={state,FormData:FixtureFormData,window:{colzoPreviewAuthTransportEnabled:!pilotBranch,colzoWorkVersionsEnabled:pilotBranch},
   validWorkId:()=>true,workPick:()=>({id:11,status:resource==='actions'?'pending':'requested',action_type:'custom',updated_at:'2026-10-19T12:01:00Z'}),
   root:{querySelector:()=>error},showWorkFormError:message=>{error.textContent=message},
   api:async(url,init)=>{calls.push(JSON.parse(init.body));throw new Error('Conflict: draft not saved')},render:()=>{throw new Error('A rejected save must not replace the form')}};
 await runInNewContext(source.slice(begin,end)+'\nsaveWork(form)',{...context,form});
 return {calls,state,error,button};
}
for(const resource of ['actions','bookings']){
 test(resource+' editor uses its original form version and keeps the editor open on conflict',async()=>{
   const f=await submit(resource);assert.equal(f.calls.length,1);assert.equal(f.calls[0].expected_updated_at,version);
   assert.equal(f.state.workModal,resource);assert.equal(f.state.workBusy,false);assert.equal(f.button.disabled,false);
   assert.match(f.error.textContent,/draft not saved/);
 });
 test(resource+' editor without a loaded version cannot submit',async()=>{
   const f=await submit(resource,'');assert.equal(f.calls.length,0);assert.match(f.error.textContent,/Reload.*not been saved/);
 });
}

for(const resource of ['actions','bookings']) {
 test(resource+' pilot editor sends the originally viewed version without legacy transport',async()=>{
  const f=await submit(resource,version,true);
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].expected_updated_at,version);
  assert.equal(f.state.workModal,resource);assert.match(f.error.textContent,/draft not saved/);
 });
 test(resource+' pilot editor without a version fails closed without legacy transport',async()=>{
  const f=await submit(resource,'',true);assert.equal(f.calls.length,0);
  assert.match(f.error.textContent,/Reload.*not been saved/);
 });
}
