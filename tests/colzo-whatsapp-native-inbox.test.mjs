import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const native=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const script=readFileSync(new URL('../assets/colzo-whatsapp-inbox-demo.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/colzo-whatsapp-inbox-demo.css',import.meta.url),'utf8');

function demo(){
 const context={window:{}};
 runInNewContext(script,context,{timeout:1000});
 return context.window.ColzoWhatsAppDemo;
}
const click=(controller,command)=>controller.handleClick({getAttribute:name=>name==='data-wa-action'?command:null});

test('native Colzo More screen and command palette navigate to isolated demo inbox',()=>{
 assert.match(native,/\['whatsappDemo'[^\n]*'WhatsApp inbox'/);
 assert.match(native,/whatsappDemo:\(\)=>window\.ColzoWhatsAppDemo/);
 assert.match(native,/if\(state\.screen==='whatsappDemo'/);
 assert.match(native,/state\.screen==='whatsappDemo'/);
 assert.match(native,/if\(target\.hasAttribute\('data-wa-action'\)\)/);
});
test('demo assets load before native shell without production credential or API dependencies',()=>{
 const scriptTag='/assets/colzo-whatsapp-inbox-demo.js';
 assert.ok(html.includes(scriptTag));
 assert.ok(html.indexOf(scriptTag)<html.indexOf('/assets/colzo-native.js'));
 assert.match(html,/\/assets\/colzo-whatsapp-inbox-demo\.css/);
 assert.doesNotMatch(script,/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|WebSocket|service_role|TWILIO_AUTH_TOKEN|\.messages\.create/);
 assert.doesNotMatch(css,/@import|url\s*\(\s*https?:/i);
});
test('demo renders fictional inbox with connection warning, Graphite cards and no send action',()=>{
 const controller=demo();
 const text=controller.render();
 assert.match(text,/WhatsApp inbox/);
 assert.match(text,/Not connected/);
 assert.match(text,/Demo only - fictional messages/);
 assert.match(text,/Sample customer A/);
 assert.match(text,/Sample customer B/);
 assert.match(text,/REVIEW ONLY/);
 assert.match(text,/Mark for human/);
 assert.doesNotMatch(text,/data-wa-action="send/);
 assert.match(css,/#colzoOwner \.cn-wa-layout/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css, /#c8ff2e/i);
 assert.match(css, /:focus-visible/);
});
test('all button events are local, filter controls and handover never send anything',()=>{
 const controller=demo();
 assert.equal(click(controller,'filter:human'),true);
 assert.match(controller.render(),/aria-pressed="true"/);
 assert.equal(click(controller,'open:demo-b'),true);
 assert.equal(click(controller,'open:demo-a'),false); // hidden by human filter
 assert.equal(click(controller,'filter:all'),true);
 assert.equal(click(controller,'handover:demo-a'),true);
 const marked=controller.render();
 assert.match(marked,/This fictional chat is assigned to a person/);
 assert.equal(click(controller,'reset'),true);
 assert.match(controller.render(),/Needs review<\/span><strong>2<\/strong>/);
 assert.equal(click(controller,'send:demo-a'),false);
});
test('injecting fictional untrusted message is HTML-escaped prior to DOM insertion',()=>{
 const source=readFileSync(new URL('../assets/colzo-whatsapp-inbox-demo.js',import.meta.url),'utf8');
 assert.match(source,/replace\(\/\[&<>"'\]\/g/);
 assert.match(source,/esc\(message\)/);
 assert.match(source,/esc\(t\.name\)/);
});
test('logout resets demo temporary memory and no records are persisted',()=>{
 const controller=demo();
 click(controller,'handover:demo-a');
 controller.reset();
 assert.match(controller.render(),/Needs review<\/span><strong>2<\/strong>/);
 assert.match(native,/window\.ColzoWhatsAppDemo\?\.reset\(\)/);
});
