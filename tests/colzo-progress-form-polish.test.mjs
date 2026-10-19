import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const source=readFileSync('assets/colzo-native.js','utf8');
function fixture(){
 const dom=new JSDOM('<body class="auth-ready"><section id="colzoOwner"><header class="cn-header"><button class="cn-wordmark" data-cn-screen="more"></button></header><div id="cnContent"></div><nav class="cn-nav">'+['home','enquiries','bookings','clients','more'].map(x=>'<button data-cn-screen="'+x+'">'+x+'</button>').join('')+'</nav><div id="cnScreenAnnounce"></div></section>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://preview.invalid'});
 const w=dom.window;
 w.scrollTo=()=>{};w.matchMedia=()=>({matches:true,addEventListener(){}});
 w.eval('let leads=[],bookings=[],businessActions=[],settings={business_name:"Synthetic"};async function api(path){if(path.includes("projects"))return [{id:"33333333-3333-4333-8333-333333333333",title:"Boiler service",client_name:"Example",status:"active",progress:25}];if(path.includes("quotes"))return [{id:"44444444-4444-4444-8444-444444444444",title:"Roof quote",status:"draft",amount_gbp:250}];return []};'+source);
 const root=w.document.querySelector('#colzoOwner');
 const click=selector=>{const el=root.querySelector(selector);assert.ok(el,selector);el.click()};
 const show=async screen=>{if(!root.querySelector('[data-cn-screen="'+screen+'"]'))click('[data-cn-screen="more"]');click('[data-cn-screen="'+screen+'"]');await new Promise(resolve=>setTimeout(resolve,30))};
 return {dom,w,root,click,show};
}
test('project progress percentage updates immediately while the slider moves without losing form data',async()=>{
 const f=fixture();await f.show('projects');f.click('[data-colzo-create="projects"]');
 const form=f.root.querySelector('#cnColzoForm');assert.ok(form);
 const slider=form.querySelector('input[name="progress"]'),output=slider.closest('label').querySelector('output');
 assert.equal(output.textContent,'0%');
 const title=form.querySelector('input[name="title"]');title.value='My draft';
 slider.value='65';slider.dispatchEvent(new f.w.Event('input',{bubbles:true}));
 assert.equal(output.textContent,'65%');
 assert.equal(title.value,'My draft');
 assert.equal(form.dataset.cnDirty,'true');
 f.dom.window.close();
});
test('resetting a project search returns visible existing records',async()=>{
 const f=fixture();await f.show('projects');
 const input=f.root.querySelector('#cnProjectSearch');input.value='not-a-project';
 input.dispatchEvent(new f.w.Event('input',{bubbles:true}));
 assert.match(f.root.querySelector('#cnContent').textContent,/No projects match/);
 f.click('[data-cn-reset-projects]');
 assert.equal(f.root.querySelector('#cnProjectSearch').value,'');
 assert.match(f.root.querySelector('#cnContent').textContent,/Boiler service/);
 f.dom.window.close();
});
test('resetting a quote search restores existing quote records',async()=>{
 const f=fixture();await f.show('quotes');
 const input=f.root.querySelector('#cnQuoteSearch');input.value='no-match';
 input.dispatchEvent(new f.w.Event('input',{bubbles:true}));
 assert.match(f.root.querySelector('#cnContent').textContent,/No quotes match/);
 f.click('[data-cn-reset-quotes]');
 assert.equal(f.root.querySelector('#cnQuoteSearch').value,'');
 assert.match(f.root.querySelector('#cnContent').textContent,/Roof quote/);
 f.dom.window.close();
});
test('a failed record save keeps the draft, announces the error and restores its Save button',async()=>{
 const f=fixture();await f.show('projects');f.click('[data-colzo-create="projects"]');
 const form=f.root.querySelector('#cnColzoForm'),title=form.querySelector('[name="title"]'),button=form.querySelector('[type="submit"]');
 title.value='Kitchen electrics';
 f.w.eval('api=async function(){throw new Error("Fixture save unavailable")}');
 form.dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
 await new Promise(resolve=>setTimeout(resolve,25));
 assert.equal(f.root.querySelector('#cnColzoForm'),form,'draft remains mounted');
 assert.equal(title.value,'Kitchen electrics','entered draft is preserved');
 const feedback=form.querySelector('#cnColzoFeedback');
 assert.match(feedback.textContent,/Fixture save unavailable/);
 assert.equal(feedback.getAttribute('role'),'alert');
 assert.equal(button.disabled,false);
 assert.equal(button.textContent,'Create project');
 assert.equal(form.getAttribute('aria-busy'),'false');
 f.dom.window.close();
});
test('saving a project clearly marks the pending form and button',async()=>{
 const f=fixture();await f.show('projects');f.click('[data-colzo-create="projects"]');
 const form=f.root.querySelector('#cnColzoForm'),button=form.querySelector('[type="submit"]');
 form.querySelector('[name="title"]').value='New draft';
 f.w.eval('api=async function(){return new Promise(()=>{})}');
 form.dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(button.disabled,true);
 assert.equal(button.textContent,'Saving…');
 assert.equal(form.getAttribute('aria-busy'),'true');
 f.dom.window.close();
});
