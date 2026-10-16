import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const owner=html.split('<section id="colzoOwner"')[1]?.split('</section>')[0]||'';
const js=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');

test('Colzo header has no account shortcut to the legacy Business AI dashboard',()=>{
 assert.ok(owner,'Colzo owner header must exist');
 assert.doesNotMatch(owner,/<button[^>]+data-cn-legacy="settings"/);
 assert.doesNotMatch(owner,/class="cn-account"/);
});
test('Colzo More navigation and secure settings remain available',()=>{
 assert.match(owner,/data-cn-screen="more"/);
 assert.match(js,/data-cn-setting/);
 assert.match(js,/security:\['Security'/);
 assert.match(js,/function nativeSetting\(/);
});
test('Do not remove the authenticated API bridge or required legacy fallback',()=>{
 assert.match(html,/colzo-backend-bridge\.js/);
 assert.match(js,/function original\(view\)/);
});
