import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('quote composer must select a real authorised enquiry, not an assumed customer',async()=>{
 const [html,js]=await Promise.all(['colzo-readonly.html','assets/colzo-readonly.js'].map(read));
 for(const id of ['colzoOpenQuote','colzoQuoteForm','colzoQuoteLead','colzoQuoteDescription','colzoQuotePrice','colzoQuoteNotes','colzoQuoteResult','colzoQuoteOutput','colzoQuoteCopy'])assert.ok(html.includes(`id="${id}"`),id);
 assert.match(js,/for\(const enquiry of verifiedEnquiries\)/);
 assert.match(js,/const lead=getEnquiry\(\$\('colzoQuoteLead'\)\.value\)/);
 assert.match(js,/if\(!lead\|\|title\.length<3/);
 assert.doesNotMatch(js,/allLeads\(\)\[0\]|verifiedEnquiries\[0\]\.id/);
});
test('quote amount and description validation, honest VAT and unsent status',async()=>{
 const [html,js]=await Promise.all(['colzo-readonly.html','assets/colzo-readonly.js'].map(read));
 assert.match(html,/min="0\.01" max="99999999" step="0\.01"/);
 assert.match(html,/minlength="3"/);
 assert.match(js,/!Number\.isFinite\(amount\)\|\|amount<=0\|\|amount>99999999/);
 assert.match(js,/Math\.abs\(Math\.round\(amount\*100\)-amount\*100\)>0\.000001/);
 assert.match(js,/Intl\.NumberFormat\('en-GB',\{style:'currency',currency:'GBP'\}\)/);
 assert.match(js,/VAT, terms and quotation validity have not been confirmed/);
 assert.match(js,/DRAFT ONLY — NOT SENT OR ACCEPTED/);
 assert.match(html,/This draft is not saved, sent, accepted or billed by Colzo/);
});
test('quotations never auto-send, bill or persist, and copy requires a user click',async()=>{
 const [html,js]=await Promise.all(['colzo-readonly.html','assets/colzo-readonly.js'].map(read));
 assert.match(html,/id="colzoQuoteCopy" type="button"/);
 assert.match(js,/\$\('colzoQuoteCopy'\)\.addEventListener\('click',copyQuote\)/);
 assert.match(js,/await navigator\.clipboard\.writeText\(value\)/);
 assert.match(js,/\$\('colzoQuoteOutput'\)\.select\(\)/);
 assert.match(js,/\$\('colzoQuoteOutput'\)\.value=quote\.join\('\\n'\)/);
 assert.match(js,/\$\('colzoQuoteOutput'\)\.value='';\$\('colzoQuoteResult'\)\.hidden=true/);
 assert.doesNotMatch(js,/method:'POST'|method:'PATCH'|method:'DELETE'|localStorage|sessionStorage|sendEmail\(|stripe\.checkout/i);
});
test('quick actions open real preview functions, not misleading dummy buttons',async()=>{
 const js=await read('assets/colzo-readonly.js');
 assert.match(js,/\$\('colzoOpenQuote'\)\.addEventListener\('click',openQuoteDraft\)/);
 assert.match(js,/\$\('colzoOpenContacts'\)\.addEventListener\('click',\(\)=>openSettingsDetail\('clients'\)\)/);
 assert.match(js,/\$\('colzoOpenProjects'\)\.addEventListener\('click',\(\)=>showScreen\('Projects'\)\)/);
 assert.match(js,/\$\('colzoOpenEnquiries'\)\.addEventListener\('click',\(\)=>showScreen\('Enquiries'\)\)/);
});
