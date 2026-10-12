import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
test('New enquiry buttons use their own real authenticated POST instead of a hidden legacy dialog',async()=>{
 const js=await read('assets/colzo-workspace.js');
 assert.match(js,/setup\(launches\[0\],'New enquiry','\+',\(\)=>openModal\('enquiry'\)\)/);
 assert.match(js,/\$\('colzoNewEnquiry'\)\?\.addEventListener\('click',\(\)=>openModal\('enquiry'\)\)/);
 assert.doesNotMatch(js,/\.mock-add-lead'\)\?\.click\(\)/);
 assert.match(js,/const url=enquiry\?'\/api\/leads'/);
 assert.match(js,/if\(enquiry&&!body\.name&&!body\.phone&&!body\.email\)/);
 assert.match(js,/await loadAll\(false\);showView\('leads'\);toast\('Enquiry created'\)/);
});
test('Quick quote action requires customer selection and opens the correct saved enquiry',async()=>{
 const js=await read('assets/colzo-workspace.js');
 assert.match(js,/setup\(launches\[1\],'Create quote','▤',[^\n]+openModal\('quote'\)/);
 assert.doesNotMatch(js,/openModal\('quote',null,allLeads\(\)\[0\]\.id\)/);
 assert.match(js,/Choose an enquiry/);
 assert.match(js,/select name="lead_id" \$\{project\?'':'required'\}/);
 assert.match(js,/saved\?\.item\?\.lead_id/);
 assert.match(js,/await openLead\(leadId\);toast\('Quote draft saved'\)/);
});
test('Colzo forms support Escape, keyboard focus containment and return focus to the opener',async()=>{
 const js=await read('assets/colzo-workspace.js');
 assert.match(js,/state\.lastModalFocus=document\.activeElement/);
 assert.match(js,/state\.lastModalFocus\?\.focus\?\.\(\)/);
 assert.match(js,/e\.key==='Escape'/);
 assert.match(js,/e\.key!=='Tab'/);
 assert.match(js,/last\.focus\(\)/);
 assert.match(js,/first\.focus\(\)/);
});
