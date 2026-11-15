import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const native=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/colzo-connected-workspace.css',import.meta.url),'utf8');
test('desktop owner home shows an explicitly loaded, page-scoped ClickUp task summary',()=>{
 assert.match(native,/function nativeDesktopHome/);
 assert.match(native,/clickupHomeSummary/);
 assert.match(native,/state\.clickupStatus\?\.connected===true/);
 assert.match(native,/Array\.isArray\(state\.clickupTasks\?\.tasks\)/);
 assert.match(native,/state\.clickupTasks\?\.summary/);
 assert.match(native,/current page/i);
});
test('home never fetches provider tasks in the background and instead uses an explicit refresh action',()=>{
 assert.match(native,/data-clickup-home-refresh/);
 assert.match(native,/target\.hasAttribute\('data-clickup-home-refresh'\)/);
 assert.match(native,/loadClickup\(\)/);
 assert.match(native,/state\.screen==='home'/);
});
test('workspace summary displays escaped task titles and distinguishes unavailable from empty',()=>{
 assert.match(native,/safe\(task\.title\)/);
 assert.match(native,/ClickUp is not connected|Open ClickUp workspace/);
 assert.match(native,/No open ClickUp tasks on this page/);
 assert.match(css,/cn-dash-clickup/);
});

