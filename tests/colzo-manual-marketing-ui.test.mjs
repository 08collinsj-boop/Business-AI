import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const start=source.indexOf(' function marketing(){');
const end=source.indexOf('\n async function loadPublicProfile(',start);
assert.ok(start>=0&&end>start,'Marketing screen renderer must remain discoverable for UI regression');
const renderer=source.slice(start,end)+'\nglobalThis.html=marketing();';
const draft={id:'33333333-3333-4333-8333-333333333333',platform:'facebook',content_type:'social_post',approval_status:'approved',request_text:'Synthetic example',output:{main_copy:'Fixture only.'},created_at:'2026-10-29T00:00:00Z'};
function screen({manualOnly,form=false}){
 const state={marketingDrafts:[draft],marketingSchedules:[],marketingManualOnly:manualOnly,marketingForm:form,marketingView:'drafts',marketingLoading:false,marketingError:'',marketingBusy:false,marketingFeedback:'',marketingEditing:null,marketingCanApprove:false,marketingSchedulingDraft:null,marketingApprovalDraft:null,marketingImageDraft:null,marketingSchedulesLoading:false,marketingScheduleError:''};
 const context={state,safe:value=>String(value??''),day:()=> '29 Oct',empty:value=>String(value),Intl};
 vm.runInNewContext(renderer,context);
 return context.html;
}
test('manual free-pilot Marketing surface hides image/scheduling provider actions and does not offer AI generation',()=>{
 const html=screen({manualOnly:true,form:true});
 assert.match(html,/id="cnMarketingManualForm"/);
 assert.match(html,/Save manual draft/);
 assert.doesNotMatch(html,/id="cnMarketingForm"/);
 assert.doesNotMatch(html,/data-marketing-media=/);
 assert.doesNotMatch(html,/data-marketing-schedule=/);
 assert.doesNotMatch(html,/data-marketing-view="schedule"/);
 assert.doesNotMatch(html,/Scheduling is explicit/);
});
test('normal Marketing editor and explicit scheduling navigation remain unchanged outside scoped pilot',()=>{
 const html=screen({manualOnly:false,form:true});
 assert.match(html,/id="cnMarketingForm"/);
 assert.match(html,/Generate and save draft/);
 assert.match(html,/data-marketing-view="schedule"/);
 assert.match(html,/data-marketing-schedule=/);
});
