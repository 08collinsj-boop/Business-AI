import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const native=()=>read('assets/colzo-native.js');
const css=()=>read('assets/colzo-connected-workspace.css');
const html=()=>read('index.html');

test('QA-002: consistent Graphite/Volt secondary controls across Company, My Work and Work Hub',()=>{
 const styles=css();
 assert.match(styles,/\.cn-company-workspace,\.cn-my-work,\.cn-clickup-connect/);
 assert.match(styles,/button\.cn-secondary/);
 assert.match(styles,/background:#1c2530/);
 assert.match(styles,/border:1px solid #42505b/);
 assert.match(styles,/min-height:44px/);
 assert.match(styles,/:focus-visible/);
 assert.match(styles,/:disabled/);
});
test('QA-002: Company navigation indicators are stable SVG strokes instead of unsupported arrow glyphs',()=>{
 const js=native();
 assert.match(js,/function companyWorkspaceScreen\(\)/);
 assert.match(js,/cn-company-tool-arrow/);
 assert.match(js,/const companyToolIcon=\(name\)=>/);
 assert.match(js,/viewBox="0 0 24 24"/);
 const start=js.indexOf(' function companyWorkspaceScreen(){'),end=js.indexOf(' // ClickUp is a real external workspace:',start);
 assert.ok(start>0&&end>start);
 assert.doesNotMatch(js.slice(start,end),/<b aria-hidden="true">↗<\/b>/);
});
test('QA-003: desktop Home has functional quick create tasks and bookings in the greeting header',()=>{
 const js=native();
 assert.match(js,/data-cn-launch-work="actions"/);
 assert.match(js,/data-cn-launch-work="bookings"/);
 assert.match(js,/target\.hasAttribute\('data-cn-launch-work'\)/);
 assert.match(js,/openWorkModal\(kind\)/);
 assert.match(css(),/\.cn-dash-intro-actions/);
});
test('QA-003: desktop top bar exposes truthful search affordance; settings move into navigation footer',()=>{
 const styles=css();
 assert.match(styles,/\.cn-command-trigger:after/);
 assert.match(styles,/Search Colzo tools/);
 assert.match(styles,/\.cn-desktop-nav-extra\{flex:1/);
 assert.match(styles,/\.cn-desktop-nav-extra > button:last-child/);
});
test('QA-004: narrow header menu and search both have min 44x44 touch targets',()=>{
 const styles=css();
 assert.match(styles,/@media\s*\(max-width:919px\)/);
 assert.match(styles,/\.cn-header :is\(\.cn-wordmark,\.cn-command-trigger\)\{min-width:44px!important;min-height:44px!important/);
});
test('updated visual assets are cache-busted in protected Preview HTML',()=>{
 assert.match(html(),/colzo-connected-workspace\.css\?v=20261113-qa-visual-v1/);
 assert.match(html(),/colzo-native\.js\?v=20261113-qa-visual-v1/);
});
