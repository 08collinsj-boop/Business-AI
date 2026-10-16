import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/colzo-approved-functional.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('approved customer profile uses real saved tenant data and no fabricated customer history',()=>{
 assert.match(code,/if\(resource==='clients'\)\{\s*\/\/ Approved customer profile/);
 assert.match(code,/cn-approved-profile/);
 assert.match(code,/records\(\)\.enquiries\.filter/);
 assert.match(code,/data-cn-client-profile-tab="overview"/);
 assert.match(code,/data-cn-client-profile-tab="activity"/);
 assert.match(code,/No related enquiries match these saved contact details/);
 assert.match(code,/state\.customerProfileTab='overview'/);
 assert.match(code,/state\.colzoDetail\?\.resource==='clients'/);
 assert.match(code,/data-colzo-edit="clients"/);
 assert.match(code,/data-cn-lead=/);
});
test('approved Add/Edit Customer form never offers unsavable customer fields',()=>{
 const start=code.indexOf("if(resource==='clients'){\n    // Dedicated approved Add/Edit");
 const end=code.indexOf("  let fields='';",start);
 assert.ok(start>0&&end>start);
 const customerForm=code.slice(start,end);
 for(const name of ['full_name','email','phone','notes']){
  assert.ok(customerForm.includes("'"+name+"'"),'Missing persisted field '+name);
 }
 assert.match(customerForm,/id="cnColzoForm"/);
 assert.match(customerForm,/data-resource="clients"/);
 assert.match(customerForm,/data-colzo-cancel/);
 assert.match(customerForm,/type="submit"/);
 assert.match(customerForm,/Company and location fields are not yet stored/);
 assert.doesNotMatch(customerForm,/name="(?:company|location|client_type|business_category)"/);
});
test('owner client create/update still use verified, tenant-scoped server API with conflict handling',()=>{
 assert.match(code,/async function saveColzoRecord\(form\)/);
 assert.match(code,/method:id\?'PATCH':'POST'/);
 assert.match(code,/expected_updated_at=original\.updated_at/);
 assert.match(code,/api\(\x60\/api\/colzo-records\?resource=\$\{resource\}/);
 assert.match(code,/The server did not confirm the saved record/);
});
test('accepted quote/project styles are scoped, and key send/approval behaviours stay unchanged',()=>{
 assert.match(code,/class="cn-approved-quotes"/);
 assert.match(code,/class="cn-approved-projects"/);
 assert.match(code,/Sending remains a separate workflow/);
 assert.match(code,/Quote terms are locked after issuing/);
 assert.match(code,/data-colzo-detail="quotes"/);
 assert.match(code,/data-colzo-detail="projects"/);
 assert.match(css,/#colzoOwner \.cn-approved-quotes/);
 assert.match(css,/#colzoOwner \.cn-approved-projects/);
 assert.match(css,/#c8ff2e/i);
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(max-width:600px\)/);
});
test('approved screen CSS remains inside owner app and does not alter original locked screen source',()=>{
 assert.match(html,/colzo-approved-functional\.css/);
 assert.match(css,/#colzoOwner \.cn-approved-profile/);
 assert.doesNotMatch(css,/(^|\n)\s*(?:body|html|\*)\s*\{/);
 assert.doesNotMatch(css,/\.bottom-nav|#dashboardApp|\.cf-home/);
 assert.doesNotMatch(code,/sendQuoteToCustomer|publishQuoteToStripe/);
});
