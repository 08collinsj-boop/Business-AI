import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const deletion=readFileSync(new URL('../legal/data-deletion.html',import.meta.url),'utf8');
const op=readFileSync(new URL('../legal/operator.js',import.meta.url),'utf8');
const privacy=readFileSync(new URL('../legal/privacy.html',import.meta.url),'utf8');
const terms=readFileSync(new URL('../legal/terms.html',import.meta.url),'utf8');
const dpa=readFileSync(new URL('../legal/dpa.html',import.meta.url),'utf8');
const versions=readFileSync(new URL('../lib/legal.js',import.meta.url),'utf8');

test('data deletion retains same legal continuity without hard-coded personal identity',()=>{
 assert.match(deletion,/continues the former Business AI service under the sole-trader trading name Colzo/);
 assert.doesNotMatch(deletion,/James David Lewis Collins/);
 assert.match(deletion,/data-legal-identity/);
 assert.match(deletion,/data-legal-contact-email/);
 assert.match(deletion,/mailto:support@getbusiness-ai\.com/);
 assert.match(deletion,/previously published Business AI privacy contact/);
 assert.match(deletion,/legacy Business-AI Pages/);
 assert.match(deletion,/\/legal\/privacy\.html/);
 assert.match(deletion,/\/legal\/dpa\.html/);
 assert.match(deletion,/Last updated 20 October 2026/);
});
test('contact replacement requires complete legal identity rather than exposing unapproved details',()=>{
 assert.match(op,/fetch\('\/api\/legal-public'/);
 assert.match(op,/if \(legal\.identity_configured && email/);
 assert.match(op,/data-legal-contact-email/);
 assert.match(op,/link\.textContent = email/);
 assert.match(op,/link\.setAttribute\('href', 'mailto:' \+ email\)/);
 assert.match(op,/if \(!legal\.identity_configured\) return/);
 assert.doesNotMatch(op,/localStorage|sessionStorage|LEGAL_OPERATOR_ADDRESS_PUBLIC_CONFIRMED/);
});
test('previous Business AI processor clauses and versioned approvals remain unchanged',()=>{
 assert.match(terms,/Version 1\.2/);
 assert.match(privacy,/Version 1\.1/);
 assert.match(dpa,/Version 1\.1/);
 assert.match(versions,/terms: '1\.2'/);
 assert.match(versions,/dpa: '1\.1'/);
 assert.match(dpa,/Processor/);
 assert.match(dpa,/Controller/);
});
