import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const native=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
test('native task creation loads actual authorised ClickUp Lists even if no tasks are returned',()=>{
 assert.match(native,/clickupLists:null/);
 assert.match(native,/clickupListsLoading:false/);
 assert.match(native,/api\('\/api\/clickup\?view=lists'\)/);
 assert.match(native,/data-clickup-create/);
 assert.doesNotMatch(native,/!items\.some\(t=>t\.listId\)/);
});
test('native task editor supplies the expected title for optimistic concurrency',()=>{
 assert.match(native,/data-expected-title=/);
 assert.match(native,/expectedTitle:form\.dataset\.expectedTitle/);
});
test('owner-only controls are visually gated by server-reported role',()=>{
 assert.match(native,/canManage/);
 assert.match(native,/s\?\.canManage/);
});
test('network failure leaves the existing edited form and user inputs intact',()=>{
 assert.match(native,/cnClickupInlineError/);
 assert.match(native,/form\.isConnected/);
});

test('empty list refresh bypasses a stale cached list response',()=>{
 assert.match(native,/async function openClickupCreate\(force=false\)/);
 assert.match(native,/if\(state\.clickupLists&&!force\)/);
 assert.match(native,/openClickupCreate\(target\.hasAttribute\('data-clickup-retry-lists'\)\)/);
});

test('provider failure never presents stale tasks as empty but current, and allows reauthorisation',()=>{
 assert.match(native,/state\.clickupTasks=null;state\.clickupSelected=null;state\.clickupMessage=\'\';state\.clickupError=/);
 assert.match(native,/data-clickup-connect[^']*Reconnect ClickUp/);
 assert.match(native,/if\(connected&&state\.clickupError&&!state\.clickupTasks\)/);
});
test('ambiguous create failures explicitly warn against blindly retrying duplicate creation',()=>{
 assert.match(native,/Check ClickUp before trying to create this task again/);
});

