import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('All seven Colzo settings open real native detail pages without redirecting to the old owner interface',async()=>{
 const [js,html,css]=await Promise.all(['assets/colzo-native.js','index.html','assets/colzo-settings.css'].map(read));
 assert.match(html,/colzo-settings\.css\?v=/);
 for(const key of ['profile','team','integrations','notifications','appearance','security','help']){
   assert.match(js,new RegExp(`\\b${key}:\\s*\\[`));
 }
 assert.match(js,/function nativeSetting\(\)/);
 assert.match(js,/setting:nativeSetting/);
 assert.match(js,/navigate\('setting'\)/);
 assert.match(js,/data-cn-back-settings/);
 assert.match(js,/data-cn-copy-invite/);
 assert.doesNotMatch(js,/const choices=\[[^;]*data-cn-legacy=/);
 assert.match(css,/#colzoOwner \.cn-settings-panel/);
});

test('Profile patch sends only supported settings fields and team invitations require a deliberate form submit',async()=>{
 const js=await read('assets/colzo-native.js');
 assert.match(js,/await api\('\/api\/settings',\{method:'PATCH'/);
 assert.match(js,/\['business_name','business_type','phone','email','address'\]/);
 assert.match(js,/await api\('\/api\/team',\{method:'POST'/);
 assert.match(js,/new URL\(result\.accept_path,window\.location\.origin\)/);
 assert.match(js,/url\.origin!==window\.location\.origin/);
 assert.match(js,/state\.inviteFeedback='Invitation created/);
 assert.match(js,/state\.inviteUrl=''/);
 assert.match(js,/if\(e\.target\.id==='cnInviteTeam'\)/);
});

test('Security and visual preferences remain accurately gated and reset on sign-out',async()=>{
 const [js,css]=await Promise.all(['assets/colzo-native.js','assets/colzo-settings.css'].map(read));
 assert.match(js,/Passkey sign-in using your device remains in testing/);
 assert.match(js,/does not bypass an existing second-factor requirement/);
 assert.match(js,/state\.quietMotion=false/);
 assert.match(js,/state\.compactCards=false/);
 assert.match(css,/cn-quiet-motion/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(js,/localStorage\.|sessionStorage\./);
});

test('Enabled Colzo switches use a Volt green thumb on a contrasting graphite track',async()=>{
 const [css,html]=await Promise.all(['assets/colzo-settings.css','index.html'].map(read));
 assert.match(css,/#colzoOwner \.cn-settings-toggle input:checked\{background:#253326;border-color:#8fb92a\}/);
 assert.match(css,/#colzoOwner \.cn-settings-toggle input:checked::before\{transform:translateX\(19px\);background:#c8ff2e\}/);
 assert.match(css,/body#colzoApp \.switch:checked\{background:#253326;box-shadow:inset 0 0 0 1px #8fb92a\}/);
 assert.match(css,/body#colzoApp \.switch:checked::before\{background:#c8ff2e\}/);
 assert.match(html,/\.switch:checked:before/);
 assert.match(css,/\.cn-settings-toggle input::before\{[^}]*background:#e8eced/);
});

test('More page groups business tools with settings and keeps sign out at the bottom',async()=>{
 const [js,css]=await Promise.all(['assets/colzo-native.js','assets/colzo-native.css'].map(read));
 const start=js.indexOf(' function more(){');
 const end=js.indexOf(' const nativeSettingMeta=',start);
 assert.ok(start>=0&&end>start,'More page source is present');
 const more=js.slice(start,end);
 const tools=more.indexOf('<section class="cf-tools-extra" aria-labelledby="cnBusinessToolsHeading">');
 const signout=more.indexOf('<button class="cf-signout" type="button" data-cn-signout>Sign out</button>');
 assert.ok(tools>=0&&signout>tools,'Business tools appear before the single sign-out action');
 assert.equal((more.match(/data-cn-signout/g)||[]).length,1);
 assert.match(more,/<h2 id="cnBusinessToolsHeading">Business tools<\/h2>/);
 for(const id of ['analytics','publicProfile','feedback','automations','billing','receptionist','projects','clients','quotes','enquiries','bookings','actions','marketing','growth'])
   assert.ok(more.includes(`['${id}',`),'Business tool remains available: '+id);
 assert.match(css,/#colzoOwner \.cf-tools-extra\{margin:24px 0 0\}/);
 assert.match(css,/#colzoOwner \.cf-tools-extra \.cn-more-links button\{[^}]*background:#20272d[^}]*border-radius:12px/);
 assert.match(css,/#colzoOwner \.cf-tools-extra \.cn-more-icon\{[^}]*background:transparent/);
 assert.doesNotMatch(css,/#colzoOwner \.cf-tools-extra\{margin:70px/);
});
