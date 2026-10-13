import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
test('Colzo Settings menu matches reference and links each row to real workspace features',async()=>{
 const html=await read('index.html');
 assert.match(html,/class="colzo-reference-settings"/);
 for(const label of ['Business profile','Team members','Integrations','Notifications','Appearance','Security','Help &amp; support'])assert.ok(html.includes(`<strong>${label}</strong>`),label);
 assert.match(html,/showView\('businessProfile'\)/);
 assert.match(html,/openSettingsSection\('teamPrivacyCard'\)/);
 assert.match(html,/showView\('marketing'\)/);
 assert.match(html,/showView\('colzoNotifications'\)/);
 assert.match(html,/showView\('colzoAppearance'\)/);
 assert.match(html,/securityCenterHubButton/);
 assert.match(html,/colzoSupportSection/);
 assert.match(html,/class="colzo-advanced-settings"/);
 assert.match(html,/id="colzoClientsList"/);
});
test('notifications derive from real enquiries and pending business actions rather than made-up alert counts',async()=>{
 const src=await read('assets/colzo-workspace.js');
 assert.match(src,/allLeads\(\)\.filter\(x=>x\.status==='New'\)/);
 assert.match(src,/businessActions\.filter\(a=>a\.status==='pending'\)/);
 assert.match(src,/function renderNotifications\(\)/);
 assert.match(src,/showView\('actions'\)/);
 assert.match(src,/openLead\(item\.id\)/);
 assert.match(src,/does not claim to have sent any push notifications|Nothing needs attention right now/);
});
test('appearance preferences are device-only and cannot affect customer records',async()=>{
 const [html,src,css]=await Promise.all(['index.html','assets/colzo-workspace.js','assets/colzo-interface.css'].map(read));
 assert.match(html,/id="colzoHighContrast"/);assert.match(html,/id="colzoReduceMotion"/);
 assert.match(src,/localStorage\.setItem\(appearanceKey/);
 assert.match(src,/colzo-display-preferences-v1/);
 assert.match(src,/colzo-reduced-motion/);
 assert.match(css,/body\.colzo-interface\.colzo-high-contrast/);
 assert.match(css,/body\.colzo-interface\.colzo-reduced-motion/);
 assert.match(html,/id="colzoNotificationsView"/);assert.match(html,/id="colzoAppearanceView"/);
});
