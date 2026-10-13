import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
const get=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('Colzo read-only Settings matches seven reference sections plus a real exit action',async()=>{
 const [html,js]=await Promise.all([get('colzo-readonly.html'),get('assets/colzo-readonly.js')]);
 const rows=['Business profile','Team members','Integrations','Notifications','Appearance','Security','Help &amp; support'];
 for(const label of rows)assert.ok(html.includes(`<strong>${label}</strong>`),label);
 for(const kind of ['profile','team','integrations','notifications','appearance','security','support']){
   assert.match(html,new RegExp(`data-colzo-setting="${kind}"`));
   assert.match(js,new RegExp(`${kind}: \\{ title:`));
 }
 assert.match(html,/id="colzoExploreSettingsDetail"/);
 assert.match(html,/id="colzoSettingsDetailContents"/);
 assert.match(html,/id="colzoSettingsDetailBack"/);
 assert.match(js,/function openSettingsDetail\(kind\)/);
 assert.match(js,/showScreen\('SettingsDetail'\)/);
 assert.match(js,/\$\('colzoSettingsDetailBack'\)\.addEventListener\('click',\(\)=>showScreen\('More'\)\)/);
 assert.match(html,/id="colzoSafeSignOut"/);
});

test('Settings notifications are genuine read-only enquiry activity, not invented push notifications',async()=>{
 const js=await get('assets/colzo-readonly.js');
 assert.match(js,/verifiedEnquiries\.slice\(\)\.sort\(/);
 assert.match(js,/const rows=verifiedEnquiries\.slice\(\)\.sort\([\s\S]*?\.slice\(0,20\)/);
 assert.match(js,/These are records, not push notifications/);
 assert.match(js,/btn\.addEventListener\('click',\(\)=>openDetail\(row\.id\)\)/);
 assert.doesNotMatch(js,/pushManager|Notification\.requestPermission|sendNotification/);
});

test('Appearance controls change only current preview presentation, not business records',async()=>{
 const [html,js,css]=await Promise.all([get('colzo-readonly.html'),get('assets/colzo-readonly.js'),get('assets/colzo-readonly.css')]);
 assert.match(html,/id="colzoExploreSettingsDetail"/);
 for(const cls of ['colzo-more-contrast','colzo-less-motion']){
   assert.ok(js.includes(`'${cls}'`));assert.ok(css.includes(`.${cls}`));
 }
 assert.match(js,/checkbox\.addEventListener\('change',\(\)=>\{\$\('colzoExplore'\)\.classList\.toggle\(cls,checkbox\.checked\);\}\)/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|setItem\(/);
});

test('Mobile styles provide scroll clearance under fixed bottom nav and browser toolbar',async()=>{
 const css=await get('assets/colzo-readonly.css');
 assert.match(css,/\.colzo-explore\{padding-bottom:calc\(102px \+ env\(safe-area-inset-bottom\)\)!important/);
 assert.match(css,/\.colzo-explore-nav\{bottom:max\(18px,env\(safe-area-inset-bottom\)\)!important/);
 assert.match(css,/\.colzo-explore-panel\{min-height:calc\(100svh - 210px\);padding-bottom:22px!important\}/);
 assert.match(css,/\.colzo-explore-panel \.colzo-safe-note\{margin-bottom:35px!important\}/);
 assert.doesNotMatch(css,/padding-bottom:calc\(205px/);
});

test('Read-only Settings uses explicit original-app links rather than fake operational integrations',async()=>{
 const [html,js]=await Promise.all([get('colzo-readonly.html'),get('assets/colzo-readonly.js')]);
 assert.match(js,/link\.href='https:\/\/app\.getbusiness-ai\.com\/'/);
 assert.match(js,/link\.rel='noopener noreferrer'/);
 assert.match(js,/Your connected services remain on the original application/);
 assert.match(html,/Read-only preview/);
 assert.match(js,/function endVerification\(\)/);
 assert.match(js,/token=null;verifiedEnquiries=\[\];verifiedBookings=\[\];verifiedActions=\[\];workLoadState=\{bookings:'waiting',actions:'waiting'\};client=null/);
 assert.doesNotMatch(js,/innerHTML\s*=|insertAdjacentHTML|document\.write/);
});
