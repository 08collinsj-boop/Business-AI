import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('legacy absolute auth labels must be neutralised by late Colzo grid overrides',async()=>{
 const css=await readFile(new URL('../assets/colzo-interface.css',import.meta.url),'utf8');
 const rule=css.slice(css.lastIndexOf('/* iOS auth grid correction'));
 assert.match(rule,/#authScreen \.auth-input>span,\s*body\.colzo-interface #authScreen \.auth-input>i\s*\{\s*position:static!important/);
 assert.match(rule,/grid-row:1\/3!important/);
 assert.match(rule,/grid-row:1!important/);
 assert.match(rule,/grid-row:2!important/);
 assert.match(rule,/#authScreen \.auth-input input\s*\{[\s\S]*?position:static!important/);
 assert.match(rule,/#authScreen \.auth-input \.auth-password-toggle/);
});
