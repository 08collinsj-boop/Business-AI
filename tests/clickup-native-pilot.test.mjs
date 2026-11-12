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

