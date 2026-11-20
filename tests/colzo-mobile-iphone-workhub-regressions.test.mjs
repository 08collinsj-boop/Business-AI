import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const js=read('assets/colzo-native.js');
const css=read('assets/colzo-connected-workspace.css');
const html=read('index.html');

test('Work Hub identity is not tied to a single integration provider',()=>{
  assert.doesNotMatch(js,/Work Hub \/ ClickUp/);
  assert.doesNotMatch(js,/starting with ClickUp/);
  assert.doesNotMatch(js,/ClickUp is the first supported work integration/);
  assert.match(js,/<h1>Work Hub<\/h1>/);
  assert.match(js,/WORK_HUB_PROVIDERS/); // Existing provider functionality stays intact.
});

test('mobile enquiry form actions are stacked and cannot overflow',()=>{
  assert.match(css,/Mobile enquiry action containment:[\s\S]*?\.cn-colzo-record-form \.cn-form-actions\s*\{\s*display:grid;grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/\.cn-colzo-record-form \.cn-form-actions :is\(\.cn-primary,\.cn-secondary\)[\s\S]*?max-width:100%/);
});

test('booking modal follows visual viewport, avoids mobile autofocus keyboard and offers single column date fields',()=>{
  assert.match(js,/function syncWorkDialogViewport\(\)/);
  assert.match(js,/window\.visualViewport\?\.addEventListener\('resize',syncWorkDialogViewport\)/);
  assert.match(js,/window\.visualViewport\?\.addEventListener\('scroll',syncWorkDialogViewport\)/);
  assert.match(js,/window\.matchMedia\?\.\('\(max-width: 700px\) and \(pointer: coarse\)'\)\?\.matches/);
  assert.match(css,/\.cn-work-form-pair\s*\{\s*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/\.cn-work-dialog-backdrop\s*\{[\s\S]*?--cn-work-visible-height/);
  assert.match(css,/\.cn-work-form\s*\{[\s\S]*?overflow-y:auto/);
});

test('mobile bottom navigation is scroll-clear and cards wrap',()=>{
  assert.match(css,/Mobile navigation clearance:[\s\S]*?padding-bottom:calc\(150px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css,/-webkit-line-clamp:2/);
});

test('modified assets have new immutable cache keys',()=>{
  assert.match(html,/colzo-native\.js\?v=20261120-mobile-qa-v1/);
  assert.match(html,/colzo-connected-workspace\.css\?v=20261120-mobile-qa-v1/);
});
