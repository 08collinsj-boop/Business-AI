import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('verified original account can explicitly transition into the four-tab Colzo visual dashboard',async()=>{
 const [html,js,css]=await Promise.all(['colzo-readonly.html','assets/colzo-readonly.js','assets/colzo-readonly.css'].map(read));
 for(const id of ['openColzoExplore','colzoExplore','colzoExploreHome','colzoExploreEnquiries','colzoExploreProjects','colzoExploreMore','colzoExploreDetail','colzoExploreExit','colzoHomeEnquiries','colzoEnquiryCards','colzoEnquirySearch','colzoTrendLine','colzoDetailReturn'])assert.ok(html.includes(`id="${id}"`),id);
 for(const tab of ['Home','Enquiries','Projects','More'])assert.ok(html.includes(`data-colzo-screen="${tab}"`),tab);
 assert.match(js,/\$\('openColzoExplore'\)\.addEventListener\('click',openDashboard\)/);
 assert.match(js,/if\(!token\)return;\s*document\.querySelector\('\.screen'\)\.classList\.add\('colzo-preview-active'\)/);
 assert.match(js,/renderHome\(\);renderSearchList\(\);showScreen\('Home'\)/);
 assert.match(css,/\.colzo-explore-nav\{/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});

test('enquiry list, filters, and details use the original authorised records without copying private fields',async()=>{
 const js=await read('assets/colzo-readonly.js');
 assert.match(js,/verifiedEnquiries=Array\.isArray\(data\.items\)\?data\.items:\[\]/);
 assert.match(js,/const stage = value => value === 'Converted' \? 'Won' : value === 'Contacted' \? 'In Progress' : 'New'/);
 assert.match(js,/data-colzo-filter/);
 assert.match(js,/\$\('colzoEnquirySearch'\)\.addEventListener\('input',renderSearchList\)/);
 assert.match(js,/getEnquiry\(id\)/);
 assert.match(js,/\.textContent=String\(item\.id\)|dataset\.enquiryId=String\(item\.id\)/);
 assert.match(js,/create\('h1','',name\)/);
 assert.doesNotMatch(js,/innerHTML\s*=|insertAdjacentHTML|document\.write/);
});

test('dashboard never fabricates revenue or project counts',async()=>{
 const [html,js]=await Promise.all(['colzo-readonly.html','assets/colzo-readonly.js'].map(read));
 assert.match(html,/>Revenue<\/span><strong>—<\/strong><small>Not connected/);
 assert.match(html,/>Active projects<\/span><strong>—<\/strong><small>Not connected/);
 assert.match(html,/>Enquiries<\/span><strong id="colzoHomeEnquiries">0<\/strong><small>Verified records/);
 assert.match(js,/\$\('colzoHomeEnquiries'\)\.textContent=String\(verifiedEnquiries\.length\)/);
 assert.match(html,/Real enquiries, not revenue/);
 assert.match(html,/Project tracking is built in the Colzo development branch/);
 assert.match(js,/verifiedEnquiries\.filter\(row/);
});

test('full dashboard remains a read-only, in-memory view and clears on End Verification',async()=>{
 const [html,js,endpoint]=await Promise.all(['colzo-readonly.html','assets/colzo-readonly.js','lib/colzo-original-readonly.js'].map(read));
 assert.match(js,/token=null;verifiedEnquiries=\[\];client=null;activeFilter='All'/);
 assert.match(js,/\$\('colzoExploreExit'\)\.addEventListener\('click',endVerification\)/);
 assert.match(js,/\$\('colzoSafeSignOut'\)\.addEventListener\('click',endVerification\)/);
 assert.match(js,/persistSession:false,autoRefreshToken:false,detectSessionInUrl:false/);
 assert.match(endpoint,/if\s*\(\s*req\.method\s*!==\s*'GET'\)\s*return res\.status\(405\)/);
 assert.match(endpoint,/if\s*\(process\.env\.VERCEL_ENV\s*!==\s*'preview'\)\s*return res\.status\(404\)/);
 assert.match(html,/This preview cannot create quotes, update enquiries, access billing or alter your live data/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|\.insert\(|\.update\(|\.delete\(|method\s*:\s*['"](?:POST|PATCH|DELETE)['"]/);
});

test('reference-style page has accessible labelled sections and search/filter controls',async()=>{
 const html=await read('colzo-readonly.html');
 assert.match(html,/aria-label="Colzo dashboard navigation"/);
 assert.match(html,/role="group" aria-label="Filter enquiries"/);
 assert.match(html,/aria-pressed="true"/);
 assert.match(html,/label class="colzo-search-label" for="colzoEnquirySearch"/);
 assert.match(html,/aria-label="Exit dashboard and end verification"/);
 assert.match(html,/aria-label="Enquiries over the last six months"/);
});
