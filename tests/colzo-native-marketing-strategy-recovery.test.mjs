import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/colzo-native.css',import.meta.url),'utf8');
const handler=readFileSync(new URL('../lib/marketing-automation-handler.js',import.meta.url),'utf8');
const service=readFileSync(new URL('../lib/marketing-automation.js',import.meta.url),'utf8');
test('saved marketing strategy form contains supported goals, frequency, time and brand voice',()=>{
 assert.match(ui,/id="cnAutomationStrategyForm"/);
 assert.match(ui,/fieldSelect\('primary_goal'/);
 assert.match(ui,/fieldSelect\('posts_per_week'/);
 assert.match(ui,/name="preferred_time"/);
 assert.match(ui,/pillar_'\+key/);
 assert.match(ui,/completed_work/);
 assert.match(ui,/voice_'\+key/);
 assert.match(ui,/sales_style/);
 assert.match(ui,/avoid_phrases/);
 assert.match(ui,/data-automation-plan-edit/);
});
test('strategy save is exclusively owner-only, validated and confirmed',()=>{
 const a=ui.indexOf('async function saveNativeMarketingStrategy');
 const b=ui.indexOf('function automations(){',a);
 assert.ok(a>0&&b>a);
 const flow=ui.slice(a,b);
 assert.match(flow,/state\.automationData\?\.can_pause!==true/);
 assert.match(flow,/total!==100/);
 assert.match(flow,/action:'planning_save',strategy,weekly_plan:/);
 assert.match(flow,/api\('\/api\/marketing-automation',\{method:'POST'/);
 assert.match(flow,/result\.settings\.enabled!==saved\.enabled/);
 assert.match(flow,/window\.confirm\(/);
 assert.doesNotMatch(flow,/action:'run_now'|marketing-scheduler|meta_publish|api\/marketing-images|api\/marketing-schedules/);
 assert.match(handler,/req\.method === 'GET' \? null : \['owner'\]/);
 assert.match(service,/export async function saveMarketingPlanning/);
});
test('existing weekly plan is preserved and strategy editor never enables automation',()=>{
 assert.match(ui,/weekly_plan:Array\.isArray\(saved\.weekly_plan\)\?saved\.weekly_plan:\[\]/);
 assert.match(ui,/No posts were generated or scheduled/);
 assert.match(ui,/if\(before==='automations'&&screen!=='automations'\)state\.automationEditing=false/);
 assert.match(ui,/#cnAutomationStrategyForm\[data-cn-dirty="true"\]/);
 assert.match(ui,/data-automation-plan-cancel/);
});
test('Graphite & Volt form styles are constrained to owner, not login or customer',()=>{
 assert.match(css,/#colzoOwner #cnAutomationStrategyForm/);
 assert.match(css,/#colzoOwner \.cn-automation-pillar-grid/);
 assert.doesNotMatch(css,/#authScreen|#customerPortalScreen/);
});
