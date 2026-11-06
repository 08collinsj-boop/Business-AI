import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const html=readFileSync('index.html','utf8');
const start=html.indexOf('async function saveLifecyclePolicy()');
const source=html.slice(start,html.indexOf('\nasync function ',start+10));
function fixture(version,fail=false){
 const nodes={lifecycleStatus:{},leadRetentionDays:{value:'180'},auditRetentionDays:{value:'730'}};const calls=[];
 const context={window:{colzoRecordVersionsEnabled:true},$:id=>nodes[id],lifecyclePolicy:version?{updated_at:version}:null,esc:x=>x,fillLifecycle(){},toast:()=>calls.push('toast'),api:async(path,options)=>{calls.push(JSON.parse(options.body));if(fail)throw Error('Policy changed. Reload before saving.');return {updated_at:'2026-11-06T01:00:00.000Z'};}};
 runInNewContext(source,context);return {context,nodes,calls};
}
test('retention form sends the exact loaded version and refuses an unloaded policy',async()=>{
 const f=fixture('2026-11-01T00:00:00.123456+00:00');await f.context.saveLifecyclePolicy();assert.equal(f.calls[0].expected_updated_at,'2026-11-01T00:00:00.123456+00:00');
 const missing=fixture();await missing.context.saveLifecyclePolicy();assert.equal(missing.calls.length,0);assert.match(missing.nodes.lifecycleStatus.innerHTML,/Reload/);
});
test('stale retention response preserves user inputs and never shows saved success',async()=>{
 const f=fixture('2026-11-01T00:00:00Z',true);await f.context.saveLifecyclePolicy();assert.equal(f.calls.length,1);assert.equal(f.nodes.leadRetentionDays.value,'180');assert.match(f.nodes.lifecycleStatus.innerHTML,/Reload/);assert.equal(f.context.lifecyclePolicy.updated_at,'2026-11-01T00:00:00Z');
});
