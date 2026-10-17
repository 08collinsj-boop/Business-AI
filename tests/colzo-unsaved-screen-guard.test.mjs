import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/colzo-native.css',import.meta.url),'utf8');

test('editing customers, enquiries and bookings offers a real cancelable unsaved-changes dialog',()=>{
 assert.match(ui,/function confirmUnsaved\(/);
 assert.match(ui,/#cnColzoForm/);
 assert.match(ui,/#cnLeadForm/);
 assert.match(ui,/#cnWorkForm/);
 assert.match(ui,/role="dialog" aria-modal="true" aria-labelledby="cnUnsavedTitle"/);
 assert.match(ui,/Keep editing/);
 assert.match(ui,/Discard changes/);
});
test('navigation and explicit cancel routes check for unsaved forms',()=>{
 assert.match(ui,/function navigate\(screen\)\s*\{[\s\S]*?confirmUnsaved/);
 for(const route of ['data-colzo-cancel','data-cn-lead-cancel','data-cn-work-close','data-cn-back-settings']){
  const start=ui.indexOf("if(target.hasAttribute('"+route+"'))");
  assert.ok(start>0,route+' event handler missing');
  const snippet=ui.slice(start,start+370);
  assert.match(snippet,/confirmUnsaved/,route+' has no unsaved guard');
 }
});
test('mobile bottom sheet sits above root tabs and stays inside iPhone safe area',()=>{
 assert.match(css,/#colzoOwner \.cn-unsaved-overlay/);
 assert.match(css,/\.cn-unsaved-sheet/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/:focus-visible/);
});
test('draft tracking never implies a server save',()=>{
 assert.match(ui,/dataset\.cnDirty/);
 assert.match(ui,/addEventListener\('input'/);
 assert.match(ui,/addEventListener\('change'/);
});
test('the unsaved sheet blocks keyboard shortcuts from opening a second dialog',()=>{
 const start=ui.indexOf('const screenShortcuts=e=>');
 assert.ok(start>0);
 assert.match(ui.slice(start,start+260),/cn-unsaved-overlay/);
});
test('navigation between Settings subsections rerenders the new section rather than scrolling the old one',()=>{
 assert.match(ui,/if\(screen===state\.screen\)\{render\(\);return\}/);
});
test('enquiries display a true empty workspace rather than a misleading no-match error',()=>{
 assert.match(ui,/No enquiries yet\. Create an enquiry to begin/);
 assert.match(ui,/No enquiries match your search or filters/);
});
test('logout or session expiry removes an obsolete unsaved overlay',()=>{
 const start=ui.indexOf("const onAuthState=auth=>");
 assert.ok(start>0);
 assert.match(ui.slice(start,start+600),/cn-unsaved-overlay/);
});
test('multiline form inputs inherit visible keyboard focus styling',()=>{
 assert.match(css,/#colzoOwner textarea:focus-visible/);
});
