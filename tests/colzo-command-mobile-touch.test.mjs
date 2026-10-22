import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync('assets/colzo-motion.css','utf8');
const html=readFileSync('index.html','utf8');
test('Colzo tool search close button has a comfortable 44px touch target',()=>{
 assert.match(css,/#colzoOwner \.cn-command-panel>header button\{[^}]*width:44px;height:44px/);
 assert.doesNotMatch(css,/#colzoOwner \.cn-command-panel>header button\{[^}]*width:34px;height:34px/);
 assert.match(html,/data-cn-close-command aria-label="Close search"/);
});
test('tool search overlay respects the bottom safe area of modern iPhones',()=>{
 assert.match(css,/#colzoOwner \.cn-command-sheet\{[^}]*padding-bottom:max\(16px,env\(safe-area-inset-bottom\)\)/);
});
