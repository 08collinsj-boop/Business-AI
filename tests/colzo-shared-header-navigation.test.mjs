import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const controller=readFileSync('assets/colzo-native.js','utf8');
const markup=readFileSync('index.html','utf8');
const css=readFileSync('assets/colzo-native.css','utf8');

function fixture(){
 const dom=new JSDOM('<body class="auth-ready"><section id="colzoOwner"><header class="cn-header"><button type="button" class="cn-wordmark" data-cn-screen="more" aria-label="Open Colzo tools">colzo.</button><button type="button" class="cn-command-trigger" data-cn-command aria-label="Find a Colzo tool">Search</button></header><div id="cnContent"></div><div id="cnCommandSheet" hidden><div class="cn-command-panel"><input id="cnCommandSearch"><div id="cnCommandResults"></div></div></div><nav class="cn-nav">'+['home','enquiries','bookings','clients','more'].map(x=>'<button type="button" data-cn-screen="'+x+'">'+x+'</button>').join('')+'</nav><div id="cnScreenAnnounce"></div></section>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://test.invalid'});
 const w=dom.window;w.scrollTo=()=>{};w.matchMedia=()=>({matches:true,addEventListener(){}});
 w.eval('let leads=[],bookings=[],businessActions=[],settings={business_name:"QA"};async function api(){return []};'+controller);
 const header=()=>w.document.querySelector('.cn-header .cn-wordmark');
 const navigate=screen=>{const button=w.document.querySelector('[data-cn-screen="'+screen+'"]');assert.ok(button,'navigation target '+screen);button.click()};
 return {dom,w,header,navigate};
}

test('all primary More tool destinations share menu and search on mobile',()=>{
 const f=fixture();
 const menu=['projects','quotes','marketing','receptionist','knowledge','analytics','billing','automations','publicProfile','feedback','actions','bookings','clients','enquiries'];
 for(const screen of menu){
   f.navigate('more');
   f.navigate(screen);
   assert.equal(f.w.ColzoOwner.getActiveScreen(),screen,screen);
   assert.equal(f.header().getAttribute('data-cn-screen'),'more',screen);
   assert.equal(f.header().getAttribute('aria-label'),'Open Colzo tools',screen);
   assert.equal(f.header().classList.contains('cn-header-back'),false,screen);
   assert.ok(f.w.document.querySelector('.cn-header [data-cn-command]'),screen+' search');
 }
 f.dom.window.close();
});
test('More screen header has back arrow to Home and retains search',()=>{
 const f=fixture();
 f.navigate('more');
 assert.equal(f.header().getAttribute('data-cn-header-back'),'home');
 assert.equal(f.header().getAttribute('aria-label'),'Back to Home');
 f.header().click();
 assert.equal(f.w.ColzoOwner.getActiveScreen(),'home');
 f.dom.window.close();
});
test('nested settings use back arrow to More and search stays available',()=>{
 const f=fixture();
 f.navigate('more');
 f.w.document.querySelector('[data-cn-setting="security"]').click();
 assert.equal(f.w.ColzoOwner.getActiveScreen(),'setting');
 assert.equal(f.header().getAttribute('data-cn-header-back'),'more');
 assert.equal(f.header().getAttribute('aria-label'),'Back to More');
 f.w.document.querySelector('.cn-header [data-cn-command]').click();
 assert.equal(f.w.document.querySelector('#cnCommandSheet').hidden,false);
 f.w.document.querySelector('[data-cn-close-command]')?.click();
 f.header().click();
 assert.equal(f.w.ColzoOwner.getActiveScreen(),'more');
 f.dom.window.close();
});
test('record detail and enquiry detail top arrows return to proper parent',()=>{
 const f=fixture();
 f.w.eval("leads=[{id:19,name:'Synthetic lead',status:'New'}]");
 f.navigate('enquiries');
 const link=f.w.document.createElement('button');link.type='button';link.dataset.cnScreen='lead';f.w.document.querySelector('#colzoOwner').append(link);link.click();
 assert.equal(f.w.ColzoOwner.getActiveScreen(),'lead');
 assert.equal(f.header().getAttribute('data-cn-header-back'),'enquiries');
 f.header().click();
 assert.equal(f.w.ColzoOwner.getActiveScreen(),'enquiries');
 f.dom.window.close();
});
test('record creation uses contextual back control and retains draft protection',async()=>{
 const f=fixture();
 f.navigate('more');f.navigate('projects');
 const create=f.w.document.createElement('button');
 create.type='button';create.dataset.colzoCreate='projects';
 f.w.document.querySelector('#colzoOwner').append(create);create.click();
 assert.equal(f.header().getAttribute('aria-label'),'Back to Projects');
 assert.equal(f.header().getAttribute('data-cn-header-dismiss'),'colzo-form');
 const form=f.w.document.createElement('form');
 form.id='cnColzoForm';form.dataset.cnDirty='true';
 f.w.document.querySelector('#colzoOwner').append(form);
 f.header().click();
 assert.ok(f.w.document.querySelector('#cnUnsavedTitle'),'confirm draft before going back');
 assert.equal(f.header().getAttribute('data-cn-header-dismiss'),'colzo-form');
 f.w.document.querySelector('.cn-unsaved-keep').click();
 await new Promise(resolve=>setTimeout(resolve,20));
 f.dom.window.close();
});
test('nested Marketing editor has back to Marketing and does not lead to the More menu',async()=>{
 const f=fixture();
 f.navigate('marketing');
 const create=f.w.document.createElement('button');
 create.type='button';create.dataset.marketingCreate='';
 f.w.document.querySelector('#colzoOwner').append(create);create.click();
 assert.equal(f.header().getAttribute('data-cn-header-dismiss'),'marketing-form');
 assert.equal(f.header().getAttribute('aria-label'),'Back to Marketing');
 f.header().click();
 assert.equal(f.w.ColzoOwner.getActiveScreen(),'marketing');
 assert.equal(f.header().getAttribute('data-cn-screen'),'more');
 await new Promise(resolve=>setTimeout(resolve,20));
 f.dom.window.close();
});
test('shared header remains visible on non-Home pages in the mobile CSS',()=>{
 assert.doesNotMatch(css, /#colzoOwner:not\(\[data-screen='home'\]\) \.cn-header\{[^}]*visibility:hidden/);
 assert.match(css, /#colzoOwner:not\(\[data-screen='home'\]\) \.cn-header\{[^}]*visibility:visible/);
 assert.match(css, /#colzoOwner \.cn-wordmark\.cn-header-back:before\{content:'←'/);
});
test('global search opens the command palette from a tool selected under More',async()=>{
 const f=fixture();
 f.navigate('more');f.navigate('marketing');
 f.w.document.querySelector('.cn-header [data-cn-command]').click();
 assert.equal(f.w.document.querySelector('#cnCommandSheet').hidden,false);
 assert.equal(f.w.document.activeElement?.id,'cnCommandSearch');
 await new Promise(resolve=>setTimeout(resolve,20));
 f.dom.window.close();
});
test('every settings submenu retains a back arrow to More',async()=>{
 const f=fixture();
 for(const setting of ['profile','team','integrations','notifications','appearance','security','help']){
   f.navigate('more');
   const entry=f.w.document.querySelector('[data-cn-setting="'+setting+'"]');
   assert.ok(entry,setting);
   entry.click();
   assert.equal(f.w.ColzoOwner.getActiveScreen(),'setting',setting);
   assert.equal(f.header().getAttribute('data-cn-header-back'),'more',setting);
   f.header().click();
   assert.equal(f.w.ColzoOwner.getActiveScreen(),'more',setting);
 }
 await new Promise(resolve=>setTimeout(resolve,20));
 f.dom.window.close();
});
test('global header markup contains unique menu and command controls',()=>{
 const dom=new JSDOM(markup);
 assert.equal(dom.window.document.querySelectorAll('#colzoOwner .cn-header .cn-wordmark').length,1);
 assert.equal(dom.window.document.querySelectorAll('#colzoOwner .cn-header [data-cn-command]').length,1);
 dom.window.close();
});
