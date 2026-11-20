import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const save=source.slice(source.indexOf(' async function saveNativeBusiness(form){'),source.indexOf(' async function inviteNativeMember(form){'));
function fixture(api){
 const dom=new JSDOM('<main><form id="cnBusinessSettings" data-cn-dirty="true"><input name="business_name" value="Fictional revised name"><input name="business_type" value="QA"><input name="phone"><input name="email"><input name="address"><button type="submit">Save</button><p id="cnBusinessFeedback"></p></form></main>',{runScripts:'outside-only'});
 const w=dom.window;
 w.api=api;w.eval('var content=document.querySelector("main"),state={settingsBusy:false},settings={};'+save+';window.save=saveNativeBusiness;');
 return {dom,w,form:w.document.querySelector('form')};
}
test('confirmed settings save clears the saved draft navigation guard',async()=>{
 const f=fixture(async()=>({business_name:'Fictional revised name'}));
 await f.w.save(f.form);
 assert.notEqual(f.form.dataset.cnDirty,'true');
 assert.match(f.w.document.querySelector('#cnBusinessFeedback').textContent,/saved successfully/);
 f.dom.window.close();
});
test('failed settings save preserves the unsaved draft',async()=>{
 const f=fixture(async()=>{throw Error('Fixture write rejected');});
 await f.w.save(f.form);
 assert.equal(f.form.dataset.cnDirty,'true');
 assert.equal(f.form.elements.business_name.value,'Fictional revised name');
 f.dom.window.close();
});
test('edits made while a settings save is pending retain the navigation guard',async()=>{
 let finish;
 const f=fixture(()=>new Promise(resolve=>{finish=resolve;}));
 const pending=f.w.save(f.form);
 f.form.elements.business_name.value='Fictional later edit';
 finish({business_name:'Fictional revised name'});await pending;
 assert.equal(f.form.dataset.cnDirty,'true');
 assert.equal(f.form.elements.business_name.value,'Fictional later edit');
 f.dom.window.close();
});
