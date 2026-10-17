import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
test('static output contains the actual Colzo app, bundle, legal pages and enquiry widget',()=>{
 for(const file of ['index.html','marketing.html','widget.js','manifest.webmanifest','sw.js','assets/colzo-react.js','legal/privacy.html'])assert.ok(existsSync('public/'+file),file);
 assert.match(readFileSync('public/index.html','utf8'),/assets\/colzo-react.js/);
});
test('static output never includes backend, dependencies, tests or credentials',()=>{
 for(const path of ['api','lib','node_modules','tests','.env','.git','src'])assert.equal(existsSync('public/'+path),false,path);
});
