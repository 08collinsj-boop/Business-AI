import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const source=readFileSync('assets/colzo-native.js','utf8');
function fixture(){
 const dom=new JSDOM('<body class="auth-ready"><section id="colzoOwner"><header class="cn-header"><button class="cn-wordmark" data-cn-screen="more"></button></header><div id="cnContent"></div><nav class="cn-nav">'+['home','enquiries','bookings','clients','more'].map(x=>'<button data-cn-screen="'+x+'">'+x+'</button>').join('')+'</nav><div id="cnScreenAnnounce"></div></section>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://preview.invalid'});
 const w=dom.window;w.scrollTo=()=>{};w.matchMedia=()=>({matches:true,addEventListener(){}});
 w.eval('let leads=[],bookings=[],businessActions=[],settings={business_name:"Synthetic"};async function api(path){if(path.includes("projects"))throw new Error("Projects temporarily unavailable");if(path.includes("quotes"))return [{id:"44444444-4444-4444-8444-444444444444",title:"Example quote",lead_id:"51",status:"draft",amount_gbp:250}];return []};'+source);
 const root=w.document.querySelector('#colzoOwner');
 const click=s=>{const x=root.querySelector(s);assert.ok(x,s);x.click()};
 const show=async screen=>{if(!root.querySelector('[data-cn-screen="'+screen+'"]'))click('[data-cn-screen="more"]');click('[data-cn-screen="'+screen+'"]');await new Promise(resolve=>setTimeout(resolve,30))};
 return {dom,w,root,click,show};
}
test('a Projects load failure does not appear on a cached Quotes screen',async()=>{
 const f=fixture();await f.show('quotes');assert.match(f.root.querySelector('#cnContent').textContent,/Example quote/);
 await f.show('projects');assert.match(f.root.querySelector('#cnContent').textContent,/Projects temporarily unavailable/);
 await f.show('quotes');
 const text=f.root.querySelector('#cnContent').textContent;
 assert.match(text,/Example quote/);
 assert.doesNotMatch(text,/Projects temporarily unavailable/);
 f.dom.window.close();
});
test('switching away during a pending Projects request does not leak its later error into Quotes',async()=>{
 const f=fixture();
 f.w.eval('let rejectProjects; api=async function(path){if(path.includes("projects"))return new Promise((resolve,reject)=>{rejectProjects=reject});if(path.includes("quotes"))return [{id:"44444444-4444-4444-8444-444444444444",title:"Existing quote",status:"draft",amount_gbp:100}];return []};window.rejectProjects=()=>rejectProjects(new Error("Stale project error"));');
 await f.show('projects');
 await f.show('quotes');
 f.w.rejectProjects();
 await new Promise(resolve=>setTimeout(resolve,20));
 const text=f.root.querySelector('#cnContent').textContent;
 assert.match(text,/Existing quote/);
 assert.doesNotMatch(text,/Stale project error/);
 f.dom.window.close();
});
test('new quote status is visually clear but cannot be changed to unsupported sent or accepted',async()=>{
 const f=fixture();
 f.w.eval('leads=[{id:51,name:"Fixture customer",job_type:"Service"}]');
 await f.show('quotes');f.click('[data-colzo-create="quotes"]');
 const form=f.root.querySelector('#cnColzoForm');assert.ok(form);
 const status=form.querySelector('[name="status"]');
 assert.equal(status?.value,'draft');
 assert.equal(status?.type,'hidden');
 assert.equal(form.querySelector('select[name="status"]'),null);
 assert.match(form.textContent,/Draft/);
 assert.match(form.textContent,/not (?:sent|issued) automatically|sending.*separate/i);
 f.dom.window.close();
});
test('quote editor preserves a saved status without offering unsupported transitions',async()=>{
 const f=fixture();
 f.w.eval('leads=[{id:51,name:"Fixture customer",job_type:"Service"}]');
 await f.show('quotes');
 f.click('[data-colzo-detail="quotes"]');
 f.click('[data-colzo-edit="quotes"]');
 const form=f.root.querySelector('#cnColzoForm');assert.ok(form);
 assert.equal(form.querySelector('[name="status"]').value,'draft');
 assert.equal(form.querySelector('select[name="status"]'),null);
 f.dom.window.close();
});
test('quote form with no enquiries explains the prerequisite and links to Enquiries',async()=>{
 const f=fixture();
 await f.show('quotes');f.click('[data-colzo-create="quotes"]');
 const form=f.root.querySelector('#cnColzoForm');assert.ok(form);
 assert.equal(form.querySelectorAll('select[name="lead_id"] option').length,1);
 assert.match(form.textContent,/create an enquiry before saving/i);
 assert.ok(form.querySelector('[data-cn-screen="enquiries"]'),'the prerequisite has a navigation action');
 f.dom.window.close();
});
test('quote lifecycle guidance uses real markup and never impersonates a send action',async()=>{
 const f=fixture();await f.show('quotes');f.click('[data-colzo-create="quotes"]');
 const form=f.root.querySelector('#cnColzoForm');
 assert.ok(form.querySelector('.cn-quote-draft-hint'));
 assert.equal(form.querySelectorAll('button[data-cn-send-quote]').length,0);
 f.dom.window.close();
});
