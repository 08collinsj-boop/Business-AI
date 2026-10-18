import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const react=readFileSync('assets/colzo-react.js','utf8');
const controller=readFileSync('assets/colzo-native.js','utf8');
function fixture(){
 const dom=new JSDOM('<!doctype html><body class="auth-ready"><section id="colzoOwner"><div class="cn-header"></div><div id="cnContent"></div><nav class="cn-nav">'+['home','enquiries','bookings','clients','more'].map(x=>`<button data-cn-screen="${x}">${x}</button>`).join('')+'</nav><button data-cn-screen="projects">Projects</button><button data-cn-screen="quotes">Quotes</button><span id="cnScreenAnnounce"></span></section><button id="cnReturnToColzo"></button></body>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://fixture.invalid/'});
 const w=dom.window;w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};
 w.eval(react);
 w.calls=[];w.saved={clients:[{id:'qa',full_name:'First Tenant Customer',updated_at:'2026-10-17T10:00:00Z'}],projects:[],quotes:[]};
 w.eval(`let leads=[{id:1,name:'QA contact',status:'New'}],bookings=[],businessActions=[],settings={business_name:'QA'};async function api(url,options={}){window.calls.push({url,...options});const resource=new URL(url,location.origin).searchParams.get('resource');if(options.method==='POST'){window.saved[resource].push({...JSON.parse(options.body),id:'created',updated_at:'2026-10-17T11:00:00Z'});return{id:'created'}}return window.saved[resource]||[]};`+controller);
 const click=selector=>{const el=w.document.querySelector(selector);assert.ok(el,selector);el.click();};
 return {dom,w,click,settle:()=>new Promise(resolve=>setTimeout(resolve,5))};
}
test('React list hands customer create/save to the existing API and then reloads saved records',async()=>{
 const f=fixture();f.click('[data-cn-screen="clients"]');await f.settle();f.click('[data-colzo-create="clients"]');
 const form=f.w.document.querySelector('#cnColzoForm');form.querySelector('[name="full_name"]').value='Created QA customer';
 form.dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));await f.settle();
 const write=f.w.calls.find(x=>x.method==='POST');assert.equal(write.url,'/api/colzo-records?resource=clients');
 assert.equal(JSON.parse(write.body).full_name,'Created QA customer');assert.match(f.w.document.querySelector('#cnContent').textContent,/Created QA customer/);
 assert.ok(f.w.document.querySelector('#cnClientSearch').hasAttribute('data-react-field'));f.dom.window.close();
});
test('sign out clears cached private records before a second account opens Customers',async()=>{
 const f=fixture();f.click('[data-cn-screen="clients"]');await f.settle();assert.match(f.w.document.querySelector('#cnContent').textContent,/First Tenant Customer/);
 f.w.ColzoOwner.onAuthState('auth-required');f.w.saved.clients=[];f.w.ColzoOwner.onAuthState('auth-ready');f.click('[data-cn-screen="clients"]');await f.settle();
 assert.doesNotMatch(f.w.document.querySelector('#cnContent').textContent,/First Tenant Customer/);f.dom.window.close();
});
test('an old-account response arriving after sign out cannot repopulate the new workspace',async()=>{
 const f=fixture();const original=f.w.api;let finishOld;
 f.w.api=()=>new Promise(resolve=>{finishOld=resolve});f.click('[data-cn-screen="clients"]');
 f.w.ColzoOwner.onAuthState('auth-required');f.w.api=original;f.w.saved.clients=[];
 f.w.ColzoOwner.onAuthState('auth-ready');f.click('[data-cn-screen="clients"]');await f.settle();
 finishOld([{id:'stale',full_name:'Stale private customer'}]);await f.settle();
 assert.doesNotMatch(f.w.document.querySelector('#cnContent').textContent,/Stale private customer/);f.dom.window.close();
});

test('customer detail keeps Customers selected and Back restores the list position',async()=>{
 const f=fixture();let position=0;Object.defineProperty(f.w,'scrollY',{get:()=>position});f.w.scrollTo=({top})=>{position=top};
 f.click('[data-cn-screen="clients"]');await f.settle();position=420;
 f.click('[data-colzo-detail="clients"]');
 assert.equal(f.w.document.querySelector('.cn-nav [aria-current="page"]').dataset.cnScreen,'clients');
 assert.equal(position,0);
 f.click('#cnContent [data-cn-screen="clients"]');await f.settle();
 assert.equal(position,420);assert.equal(f.w.document.querySelector('.cn-nav [aria-current="page"]').dataset.cnScreen,'clients');f.dom.window.close();
});
test('Escape closes a record inspector and restores focus to its directory row',async()=>{
 const f=fixture();f.click('[data-cn-screen="clients"]');await f.settle();f.click('[data-colzo-detail="clients"]');
 const inspector=f.w.document.querySelector('.cn-record-inspector');assert.ok(inspector);
 inspector.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await f.settle();
 assert.equal(f.w.ColzoOwner.getActiveScreen(),'clients');assert.equal(f.w.document.activeElement.dataset.colzoId,'qa');f.dom.window.close();
});
test('editor swipe dismissal still requires the existing unsaved-change decision',async()=>{
 const f=fixture();f.w.innerWidth=390;f.click('[data-cn-screen="bookings"]');f.click('[data-cn-work-new]');
 const input=f.w.document.querySelector('#cnWorkForm [name="title"]');input.value='Unsaved synthetic draft';input.dispatchEvent(new f.w.Event('input',{bubbles:true}));
 const handle=f.w.document.querySelector('[data-cn-drag-handle]');assert.ok(handle);
 for(const [type,y] of [['pointerdown',100],['pointerup',230]])handle.dispatchEvent(Object.assign(new f.w.Event(type,{bubbles:true}),{pointerId:1,pointerType:'touch',isPrimary:true,clientX:150,clientY:y}));
 assert.ok(f.w.document.querySelector('.cn-unsaved-overlay'));assert.ok(f.w.document.querySelector('#cnWorkForm'));
 f.click('.cn-unsaved-keep');assert.ok(f.w.document.querySelector('#cnWorkForm'));assert.equal(f.w.calls.some(call=>call.method==='POST'||call.method==='PATCH'),false);f.dom.window.close();
});
test('authentication reset selects the visible Active bookings filter',async()=>{
 const f=fixture();f.w.ColzoOwner.onAuthState('auth-required');f.w.ColzoOwner.onAuthState('auth-ready');f.click('[data-cn-screen="bookings"]');
 assert.equal(f.w.document.querySelector('[data-cn-work-tab="Active"]').getAttribute('aria-pressed'),'true');
 assert.match(f.w.document.querySelector('#cnContent').textContent,/Active bookings/);f.dom.window.close();
});
test('an unsaved decision blocks any underlying form submission',async()=>{
 const f=fixture();f.click('[data-cn-screen="bookings"]');f.click('[data-cn-work-new]');
 const form=f.w.document.querySelector('#cnWorkForm'),input=form.querySelector('[name="title"]');input.value='Unsaved synthetic draft';input.dispatchEvent(new f.w.Event('input',{bubbles:true}));f.click('.cn-work-dialog-x');
 assert.ok(f.w.document.querySelector('.cn-unsaved-overlay'));
 form.dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));await f.settle();
 assert.equal(f.w.calls.some(call=>call.method==='POST'||call.method==='PATCH'),false);assert.equal(form.inert,true);
 f.click('.cn-unsaved-keep');assert.equal(form.inert,false);f.dom.window.close();
});
