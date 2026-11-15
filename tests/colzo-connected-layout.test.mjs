import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../assets/colzo-connected-workspace.css',import.meta.url),'utf8');
test('connected workspace reserves a readable text column and wraps controls in the desktop grid',()=>{
 // A 672px dashboard grid cell previously allocated 0px to the explanation.
 const panel=css.match(/\.cn-dash-connected\s*\{[^}]*display:flex[^}]*\}/)?.[0]||'';
 assert.match(panel,/grid-column:\s*1\s*\/\s*-1/,'panel must span both dashboard columns');
 assert.match(panel,/flex-wrap:\s*wrap/,'controls must wrap instead of consuming the text column');
 const copy=css.match(/\.cn-dash-connected \.cn-dash-clickup\s*\{([^}]+)\}/)?.[1]||'';
 assert.match(copy,/flex:\s*1\s+1\s+280px/,'reserve a readable preferred width before wrapping');
});
