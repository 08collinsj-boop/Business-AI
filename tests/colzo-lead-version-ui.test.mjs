import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync('assets/colzo-native.js','utf8');
const version='2026-10-19T16:00:00.123456+00:00';
function fixture({withVersion=true,preview=true}={}){
 const dom=new JSDOM('<body class="auth-ready"><section id="colzoOwner"><div id="cnContent"></div><nav class="cn-nav"><button data-cn-screen="enquiries">Enquiries</button></nav></section></body>',{runScripts:'outside-only',url:'https://fixture.vercel.app'});
 const w=dom.window;w.scrollTo=()=>{};w.matchMedia=()=>({matches:true});w.colzoPreviewAuthTransportEnabled=preview;
 w.calls=[];w.nextRequest=()=>new Promise((_resolve,reject)=>{w.rejectSave=reject});
 w.eval('var leads='+JSON.stringify([{id:17,name:'Synthetic QA',status:'New',notes:'Original',...(withVersion?{updated_at:version}:{})}])+',bookings=[],businessActions=[],settings={};const api=async(url,options)=>{window.calls.push(JSON.parse(options.body));return window.nextRequest()};'+source);
 const click=s=>{const e=w.document.querySelector(s);assert.ok(e,s);e.click()};
 click('[data-cn-screen="enquiries"]');click('[data-cn-lead="17"]');click('[data-cn-edit-lead="17"]');
 const form=w.document.querySelector('#cnLeadForm');
 const submit=()=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 return {w,form,submit};
}
test('enquiry editor sends the viewed version and retains its draft on conflict without duplicate saves',async()=>{
 const f=fixture();
 f.w.eval("leads=[{...leads[0],updated_at:'2026-10-19T16:01:00.123456+00:00'}]");
 f.form.elements.notes.value='My unsaved QA draft';f.submit();f.submit();
 assert.equal(f.w.calls.length,1,f.w.document.querySelector('#cnLeadFeedback')?.textContent);assert.equal(f.w.calls[0].expected_updated_at,version);
 f.w.rejectSave(new Error('This enquiry changed. Your draft has not been saved.'));
 await new Promise(r=>setTimeout(r,0));
 assert.equal(f.form.elements.notes.value,'My unsaved QA draft');
 assert.match(f.w.document.querySelector('#cnLeadFeedback').textContent,/changed.*not been saved/);
 assert.equal(f.form.querySelector('[type="submit"]').disabled,false);f.w.close();
});
test('a Preview enquiry without a loaded version fails closed and retains the draft',()=>{
 const f=fixture({withVersion:false});f.form.elements.notes.value='Unsaved QA draft';f.submit();
 assert.equal(f.w.calls.length,0);assert.equal(f.form.elements.notes.value,'Unsaved QA draft');
 assert.match(f.w.document.querySelector('#cnLeadFeedback').textContent,/Reload.*not been saved/);f.w.close();
});
test('outside the scoped Preview, the enquiry editor preserves the legacy request contract',async()=>{
 const f=fixture({preview:false});f.submit();assert.equal(f.w.calls.length,1,f.w.document.querySelector('#cnLeadFeedback')?.textContent);
 assert.equal(f.w.calls[0].expected_updated_at,undefined);f.w.rejectSave(new Error('Fixture stopped'));
 await new Promise(r=>setTimeout(r,0));f.w.close();
});
