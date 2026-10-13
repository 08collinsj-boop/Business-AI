import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');

test('Colzo owner UI uses the existing first-party Business AI APIs, not an external duplicate backend',async()=>{
 const [html,owner,routes]=await Promise.all(['index.html','assets/colzo-workspace.js','vercel.json'].map(read));
 const established=['marketing','billing','knowledge','business-profile','team','customer-portal'];
 for(const name of established){
  assert.match(routes,new RegExp(`"source": "/api/${name}"`),name+' same-origin route is present');
 }
 for(const name of ['projects','clients','quotes'])assert.match(routes,new RegExp(`"source": "/api/colzo/${name}"`));
 for(const fragment of ['/api/leads','/api/colzo/projects','/api/colzo/clients','/api/colzo/quotes'])assert.ok(owner.includes(fragment));
 assert.match(owner,/const request=\(url,init\)=>api\(url,init\)/);
 assert.match(html,/async function loadAll\(/);
 assert.match(html,/const handleSession=async \(session\)=>/);
 assert.doesNotMatch(owner,/(https?:\/\/)[a-z0-9.-]+\.(supabase\.co|vercel\.app|com)/i);
});

test('Colzo More retains accessible shortcuts to the working first-party AI, bookings, actions, marketing, knowledge and billing',async()=>{
 const html=await read('index.html');
 for(const [key,dest] of Object.entries({
  receptionist:"openSettingsSection('aiReceptionistSettingsCard')",
  bookings:"showView('bookings')",
  actions:"showView('actions')",
  marketing:"showView('marketing')",
  knowledge:"openSettingsSection('businessKnowledgeCard')",
  billing:"openSettingsSection('billingCard')"
 })){
  const button=html.match(new RegExp(`<button[^>]+data-colzo-backend="${key}"[^>]*>`))?.[0];
  assert.ok(button,`Missing ${key} shortcut`);
  assert.ok(button.includes(`onclick="${dest}"`),`${key} must open the original view`);
 }
 assert.match(html,/id="colzoExistingFeatures"/);
 assert.match(html,/data-colzo-backend="billing" data-owner-only/);
 assert.match(html,/id="colzoProjectsView"/);
 assert.match(html,/id="colzoLeadDetailView"/);
});

test('advanced sections are expanded rather than silently swallowed and hidden owner-only panels remain hidden',async()=>{
 const html=await read('index.html');
 const section=html.slice(html.indexOf('function openSettingsSection(id){'),html.indexOf('function positionBottomNavIndicator'));
 assert.ok(section.length>550);
 assert.match(section,/parent\?\.id==='settingsView'&&!parent\.classList\.contains\('active'\)\)showView\('settings'\)/);
 assert.match(section,/ancestor\.tagName==='DETAILS'\)ancestor\.open=true/);
 assert.match(section,/if\(!target\.getClientRects\(\)\.length\)/);
 assert.match(section,/target\.focus\(\{preventScroll:true\}\)/);
 assert.match(section,/target\.scrollIntoView/);
});

test('existing original application endpoints and auth gate are retained for a one-backend rebrand',async()=>{
 const [html,manifest,config]=await Promise.all(['index.html','manifest.webmanifest','lib/public-config-handler.js'].map(read));
 assert.match(html,/api\('\/api\/business-configuration'\)/);
 assert.match(html,/api\('\/api\/business-onboarding'\)/);
 assert.match(html,/if\(accountLegal\?\.needs_user_acceptance\)/);
 assert.match(config,/process\.env\.SUPABASE_URL/);
 assert.match(config,/process\.env\.SUPABASE_PUBLISHABLE_KEY \|\| process\.env\.SUPABASE_ANON_KEY/);
 assert.match(config,/process\.env\.FRONTEND_AUTH_ENABLED/);
 assert.match(manifest,/"name": "Colzo"/);
});
