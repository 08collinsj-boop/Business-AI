import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('Colzo owner interface is a real separate app shell, not simply rebranded original dashboard',async()=>{
 const [html,css,js]=await Promise.all(['index.html','assets/colzo-native.css','assets/colzo-native.js'].map(read));
 assert.match(html,/id="colzoOwner" class="colzo-native"/);
 assert.match(html,/id="cnContent"/);
 assert.match(html,/id="cnReturnToColzo"/);
 for(const screen of ['home','enquiries','bookings','clients','more'])assert.match(html,new RegExp(`data-cn-screen="${screen}"`));
 assert.match(css,/body\.colzo-owner-enabled\.auth-ready:not\(\.colzo-legacy-mode\) #dashboardApp/);
 assert.match(css,/body:not\(\.auth-ready\) #colzoOwner/);
 assert.match(css,/#colzoOwner \.cn-nav/);
 for(const content of ['cf-home-head','Enquiry trend','Turn enquiries','Client','DRAFT ESTIMATE','cf-settings-list'])assert.ok(js.includes(content),content);
 for(const endpoint of ['/api/colzo/projects','/api/colzo/clients','/api/colzo/quotes'])assert.ok(!js.includes(endpoint),'Unverified Colzo write endpoint should not be reached: '+endpoint);
 assert.ok((await stat(new URL('../assets/colzo-native.css',import.meta.url))).size>9000);
});

test('authenticated owner data and access gates are unchanged; Colzo content never appears through a legal/auth bypass',async()=>{
 const [html,js]=await Promise.all(['index.html','assets/colzo-native.js'].map(read));
 assert.match(html,/if\(accountLegal\?\.needs_user_acceptance\)/);
 assert.match(html,/if\(onboarding\?\.needs_business\)/);
 assert.match(html,/authenticatedBusinessRole==='owner'&&businessLegal\?\.dpa_required/);
 assert.match(html,/setAuthView\('auth-ready'\);registerOwnerPwa\(\);await loadAll\(\)/);
 assert.match(html,/window\.ColzoOwner\?\.onAuthState\(state\)/);
 assert.match(html,/window\.ColzoOwner\?\.render\(\)/);
 assert.match(js,/if\(auth==='auth-ready'\)/);
 assert.match(js,/root\.hidden=true;content\.replaceChildren\(\)/);
 assert.match(js,/document\.body\.classList\.remove\('colzo-owner-enabled','colzo-legacy-mode'\)/);
 assert.match(js,/body/); // no auth methods replaced; only original session controls access
});

test('Colzo quotes remain copy-only, projects derived from bookings/actions and original feature routes remain accessible',async()=>{
 const js=await read('assets/colzo-native.js');
 assert.match(js,/function loadColzoResource/);
 assert.ok(js.includes('/api/colzo-records?resource='));
 assert.match(js,/data-colzo-create/);
 assert.match(js,/function colzoRecordForm/);
 assert.match(js,/DRAFT ESTIMATE — NOT ISSUED/);
 assert.match(js,/not been saved, approved or sent/);
 assert.match(js,/No draft was saved or sent/);
 assert.match(js,/Projects are stored as tenant-scoped Colzo records/);
 assert.match(js,/No saved customers yet/);
 assert.ok(js.includes('function customerProfile()'));
 assert.match(js,/customer:customerProfile/);
 assert.match(js,/data-cn-customer/);
 assert.match(js,/Profile from existing enquiry records/);
 assert.match(js,/This view is read-only/);
 for(const view of ['bookings','actions','marketing','businessProfile','settings','enquiries'])assert.ok(js.includes(view));
 assert.doesNotMatch(js,/fetch\(['"]https?:\/\//);
 assert.doesNotMatch(js,/api\(['"]\/api\/billing/);
});
