import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const ownerMarkup=readFileSync('index.html','utf8');

const js=readFileSync('assets/colzo-native.js','utf8');
function fixture(){
 const dom=new JSDOM('<body class="auth-ready"><section id="colzoOwner"><header class="cn-header"><button type="button" class="cn-wordmark" data-cn-screen="more"></button><button type="button" id="openTools" data-cn-command>Find tools</button></header><div id="cnContent"></div><nav class="cn-nav">'+['home','enquiries','bookings','clients','more'].map(s=>'<button data-cn-screen="'+s+'">'+s+'</button>').join('')+'</nav><div id="cnScreenAnnounce"></div><div id="cnCommandSheet" hidden><div class="cn-command-panel"><button data-cn-close-command>Close</button><input id="cnCommandSearch"><div id="cnCommandStatus" role="status" aria-live="polite"></div><div id="cnCommandResults"></div></div></div></section></body>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://preview.example'});
 const w=dom.window;w.scrollTo=()=>{};w.matchMedia=()=>({matches:true,addEventListener(){}});w.getComputedStyle=()=>({overflowY:'visible'});
 w.eval('let leads=[],bookings=[],businessActions=[],settings={business_name:"Fixture"};async function api(){return []};'+js);
 const key=(name,extras={})=>(w.document.activeElement||w.document).dispatchEvent(new w.KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true,...extras}));
 const search=w.document.querySelector('#cnCommandSearch');
 const buttons=()=>[...w.document.querySelectorAll('#cnCommandResults button')];
 const open=()=>{w.document.querySelector('#openTools').focus();key('k',{ctrlKey:true});assert.equal(w.document.querySelector('#cnCommandSheet').hidden,false)};
 const filter=text=>{search.value=text;search.dispatchEvent(new w.Event('input',{bubbles:true}))};
 return {dom,w,key,search,buttons,open,filter};
}
test('tool search supports Down, Up, wrapping and retains accessible search focus',()=>{
 const f=fixture();f.open();
 assert.equal(f.w.document.activeElement,f.search);
 f.key('ArrowDown');assert.equal(f.w.document.activeElement,f.buttons()[0]);
 f.key('ArrowDown');assert.equal(f.w.document.activeElement,f.buttons()[1]);
 f.key('ArrowUp');assert.equal(f.w.document.activeElement,f.buttons()[0]);
 f.key('ArrowUp');assert.equal(f.w.document.activeElement,f.search);
 f.key('ArrowUp');assert.equal(f.w.document.activeElement,f.buttons().at(-1));
 f.key('ArrowDown');assert.equal(f.w.document.activeElement,f.buttons()[0]);
 f.dom.window.close();
});
test('Enter from search opens the first matching tool and closes the sheet',async()=>{
 const f=fixture();f.open();f.filter('Quotes');
 assert.equal(f.buttons().length,1);
 f.key('Enter');
 assert.equal(f.w.ColzoOwner.getActiveScreen(),'quotes');
 assert.equal(f.w.document.querySelector('#cnCommandSheet').hidden,true);
 await new Promise(resolve=>setTimeout(resolve,30));
 f.dom.window.close();
});
test('Enter from a focused result activates that result, not the first',async()=>{
 const f=fixture();f.open();
 f.key('ArrowDown');f.key('ArrowDown');f.key('Enter');
 assert.equal(f.w.ColzoOwner.getActiveScreen(),'enquiries');
 await new Promise(resolve=>setTimeout(resolve,30));
 f.dom.window.close();
});
test('no matching tools never navigates or changes focus on Enter/Down',()=>{
 const f=fixture();f.open();f.filter('no matching imaginary destination');
 assert.equal(f.buttons().length,0);
 f.key('ArrowDown');f.key('Enter');
 assert.equal(f.w.ColzoOwner.getActiveScreen(),'home');
 assert.equal(f.w.document.activeElement,f.search);
 f.dom.window.close();
});
test('Escape restores the opener and clears the overlay',()=>{
 const f=fixture();f.open();f.key('Escape');
 assert.equal(f.w.document.querySelector('#cnCommandSheet').hidden,true);
 assert.equal(f.w.document.activeElement?.id,'openTools');
 f.dom.window.close();
});
test('filtered tool search reports a concise live result count and an empty state',()=>{
 const f=fixture();f.open();
 const status=f.w.document.querySelector('#cnCommandStatus');
 assert.ok(status,'result count must be present for screen reader announcements');
 assert.equal(status.getAttribute('role'),'status');
 f.filter('Quotes');
 assert.equal(status.textContent,'1 matching tool');
 f.filter('not-a-real-screen-anywhere');
 assert.equal(status.textContent,'No matching tools');
 assert.match(f.w.document.querySelector('#cnCommandResults').textContent,/No matching tools/);
 f.filter('');
 assert.match(status.textContent,/available tools/);
 f.dom.window.close();
});

test('approved owner markup provides a labelled result status without changing screen layouts',()=>{
 assert.match(ownerMarkup,/id="cnCommandStatus" class="sr-only" role="status" aria-live="polite"/);
 assert.match(ownerMarkup,/aria-describedby="cnCommandHelp cnCommandStatus"/);
});
