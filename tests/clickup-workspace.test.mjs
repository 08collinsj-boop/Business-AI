import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectClickupWorkspace} from '../lib/clickup-provider.js';
const native=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const api=readFileSync(new URL('../lib/clickup-handler.js',import.meta.url),'utf8');
test('workspace changes are limited to explicitly authorized ClickUp workspaces',()=>{
  const workspaces=[{id:'123',name:'Example One'},{id:'456',name:'Example Two'}];
  assert.deepEqual(selectClickupWorkspace(workspaces,'456'),{id:'456',name:'Example Two'});
  assert.throws(()=>selectClickupWorkspace(workspaces,'789'),/authoris|authorized|workspace/i);
  assert.throws(()=>selectClickupWorkspace(workspaces,'javascript:alert(1)'));
});
test('API displays available workspaces without any token and checks authorized selection',()=>{
  assert.match(api,/availableWorkspaces/);
  assert.match(api,/selectClickupWorkspace\(row.available_workspaces/);
  assert.match(api,/body.action==='select_workspace'/);
  assert.match(api,/clickupStorage\('colzo_clickup_connections\?business_id=eq/);
});
test('native workspace picker and pagination never bypass API checks',()=>{
  assert.match(native,/cnClickupWorkspaceForm/);
  assert.match(native,/data-clickup-page/);
  assert.match(native,/state.clickupPage/);
  assert.match(native,/view=tasks&page=/);
  assert.match(native,/page:state.clickupPage/);
});

