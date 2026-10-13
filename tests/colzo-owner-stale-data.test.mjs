import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('owner UI never presents cached Projects or Clients as current after their API reads fail',async()=>{
 const source=await readFile(new URL('../assets/colzo-workspace.js',import.meta.url),'utf8');
 assert.match(source,/catch\{state\.projectsLoaded=false;state\.projects=\[\];report\('colzoProjectsStatus','Projects are not available in this environment yet\.'\);renderProjects\(\);renderDashboardExtras\(\);\}/);
 assert.match(source,/catch\{state\.clientsLoaded=false;state\.clients=\[\];report\('colzoClientsStatus','Client directory unavailable in this environment\.'\);renderClients\(\);\}/);
 assert.match(source,/if\(!state\.projectsLoaded\)\{[\s\S]*?Active projects[\s\S]*?Projects are currently unavailable[\s\S]*?return;/);
 assert.doesNotMatch(source,/catch\{state\.projectsLoaded=false;report/);
});
