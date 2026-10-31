import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import verified from '../lib/knowledge-verified-handler.js';
const js=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
test('native owner confirmation satisfies deployed knowledge wrapper',async()=>{
 const feedback={},button={isConnected:true},source={id:'fixture',status:'needs_review'};
 const row={dataset:{knowledgeItem:'item'},querySelector:s=>s.includes('include')?{checked:true}:{value:s.includes('type')?'faq':'Fictional fact'}};
 const form={querySelectorAll:()=>[row],querySelector:s=>s.includes('Feedback')?feedback:button};
 let submitted;
 const context={state:{knowledgeDetail:{source,items:[{}]},knowledgeCanManage:true},content:{querySelector:()=>form},window:{confirm:()=>true},loadKnowledge:async()=>{},render:()=>{},api:async(path,opts)=>{
   submitted=JSON.parse(opts.body);
   const res={statusCode:200,status(n){this.statusCode=n;return this},json(b){this.body=b;return this}};
   // An invalid/missing credential must reach auth denial rather than the
   // earlier accuracy-confirmation rejection. No real service is contacted.
   const old=process.env.TENANCY_AUTH_ENABLED;process.env.TENANCY_AUTH_ENABLED='true';
   try{await verified({method:'PATCH',headers:{},body:submitted},res)}catch{/* No configured backend in this synthetic fixture. */}finally{old===undefined?delete process.env.TENANCY_AUTH_ENABLED:process.env.TENANCY_AUTH_ENABLED=old}
   assert.doesNotMatch(res.body?.error||'',/Confirm that you have reviewed/);
   return {source,items:[]};
 }};
 const start=js.indexOf('async function approveKnowledge()'),end=js.indexOf('async function uploadNativeKnowledgeFile',start);
 vm.runInNewContext(js.slice(start,end)+'globalThis.run=approveKnowledge;',context);
 await context.run();
 assert.equal(submitted.confirmation,true);
 assert.equal(submitted.confirmation_version,'knowledge_accuracy_v1');
 assert.equal(context.state.knowledgeFeedback,'Reviewed knowledge saved. Only approved facts may be used by the assistant.');
});
