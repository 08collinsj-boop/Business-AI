import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pack=readFileSync(new URL('../assets/colzo-flutter-motion.css',import.meta.url),'utf8');
const base=readFileSync(new URL('../assets/colzo-native.css',import.meta.url),'utf8');
const motion=readFileSync(new URL('../assets/colzo-motion.css',import.meta.url),'utf8');
const stitch=readFileSync(new URL('../assets/colzo-stitch-integration.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');

test('single sliding tab indicator overrides legacy duplicate highlight on phones',()=>{
 assert.match(stitch,/\.cn-nav button\[aria-current=page\]\{[^}]*background:rgba\(200,255,46,\.07\)!important/);
 assert.match(pack,/@media \(max-width:919px\)/);
 assert.match(pack,/#colzoOwner \.cn-nav::before\{[^}]*box-sizing:border-box/);
 assert.match(pack,/width:calc\(\(100% - 10px\) \/ 5\)/);
 assert.match(pack,/#colzoOwner \.cn-nav button\[aria-current="page"\]\{[^}]*background:transparent!important/);
 assert.match(pack,/#colzoOwner \.cn-nav button\[aria-current="page"\]\{[^}]*box-shadow:none!important/);
 assert.ok(html.indexOf('colzo-flutter-motion.css')>html.indexOf('colzo-stitch-integration.css'), 'override must load last');
});
test('tabs retain distinct accessible labels, active page state and correct animated indicator index',()=>{
 for(const tab of ['home','enquiries','bookings','clients','more'])assert.match(html,new RegExp('data-cn-screen="'+tab+'"'));
 assert.match(html,/aria-label="Colzo primary navigation"/);
 assert.match(js,/root\.style\.setProperty\('--cn-active-index',String\(navPosition\(state\.screen\)\)\)/);
 assert.match(js,/b\.setAttribute\('aria-current','page'\)/);
 assert.match(motion,/transition:transform \.22s var\(--cz-spring\)/);
 assert.match(motion,/pointer-events:none/);
});
test('desktop sidebar, mobile tap target, content safe area and reduced motion remain unchanged',()=>{
 assert.match(base,/#colzoOwner \.cn-nav\{[^}]*height:70px/);
 assert.match(base,/#colzoOwner \.cn-nav button\{[^}]*min-height:59px/);
 assert.match(base,/#colzoOwner\{min-height:100dvh;padding-bottom:105px/);
 assert.match(base,/#colzoOwner \.cn-content\{width:min\(100%,700px\);padding:16px 20px 110px/);
 assert.match(base,/@media\(min-width:920px\)/);
 assert.match(motion,/@media\(min-width:920px\)/);
 assert.match(motion,/#colzoOwner \.cn-nav::before\{display:none\}/);
 assert.match(pack,/@media \(prefers-reduced-motion:reduce\)/);
});
