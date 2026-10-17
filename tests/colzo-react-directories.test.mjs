import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
const buildResult=await build({entryPoints:['src/colzo/entry.jsx'],bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"production"'}});
function fixture(){
 const dom=new JSDOM('<!doctype html><div id="view"></div>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://fixture.invalid/'});
 dom.window.eval(buildResult.outputFiles[0].text);
 const view=dom.window.document.querySelector('#view');
 const model={screen:'projects',colzoRecords:{clients:[],projects:[],quotes:[]},enquiries:[],projectFilter:'All',projectSearch:'',clientSearch:'',search:'',filter:'All',colzoLoading:'',colzoError:'',colzoFeedback:'',onSearch:()=>{}};
 return{dom,view,model,render:()=>dom.window.ColzoReact.renderScreen(view,model)};
}
test('React directory loading never claims no saved records',()=>{
 const f=fixture();f.model.colzoLoading='projects';f.render();
 assert.equal(f.view.querySelector('[aria-busy="true"]')!==null,true);
 assert.doesNotMatch(f.view.textContent,/No saved projects/);f.dom.window.close();
});
test('React project search distinguishes no matches and clamps untrusted progress',()=>{
 const f=fixture();f.model.colzoRecords.projects=[{id:'a',title:'<img src=x onerror=alert(1)>',status:'active',progress:150}];f.render();
 assert.equal(f.view.querySelector('img'),null);
 assert.equal(f.view.querySelector('.cf-progress i').style.width,'100%');
 f.model.projectSearch='missing';f.render();assert.match(f.view.textContent,/No projects match/);f.dom.window.close();
});
test('React error state provides existing retry event contract without an empty success state',()=>{
 const f=fixture();f.model.colzoError='Service unavailable';f.render();
 assert.equal(f.view.querySelector('[data-colzo-refresh="projects"]')!==null,true);
 assert.doesNotMatch(f.view.textContent,/No saved projects yet/);f.dom.window.close();
});
test('React search keeps the same input node on refresh',()=>{
 const f=fixture();f.render();const original=f.view.querySelector('input');original.focus();f.model.projectSearch='x';f.render();
 assert.equal(f.view.querySelector('input'),original);assert.equal(original.value,'x');f.dom.window.close();
});
test('React customers preserve add/detail contracts and true multiword initials',()=>{
 const f=fixture();f.model.screen='clients';f.model.colzoRecords.clients=[{id:'qa',full_name:'Sarah Mitchell'}];f.render();
 assert.equal(f.view.querySelector('.cn-avatar').textContent,'SM');
 assert.ok(f.view.querySelector('[data-colzo-create="clients"]'));assert.ok(f.view.querySelector('[data-colzo-detail="clients"][data-colzo-id="qa"]'));f.dom.window.close();
});
test('React enquiry reset clears both search and filter',()=>{
 const f=fixture();f.model.screen='enquiries';f.model.search='missing';f.model.filter='Won';f.model.enquiries=[{id:1,name:'Customer',status:'New'}];let reset=false;f.model.onResetEnquiry=()=>reset=true;f.render();
 f.view.querySelector('[data-react-reset]').click();assert.equal(reset,true);f.dom.window.close();
});
test('React unmount removes private screen data on sign out',()=>{
 const f=fixture();f.model.colzoRecords.projects=[{id:1,title:'Private record'}];f.render();
 f.dom.window.ColzoReact.unmount(f.view);assert.equal(f.view.textContent,'');f.dom.window.close();
});
test('React customer form preserves supported fields and the secure save contract',()=>{
 const f=fixture();f.model.screen='clients';f.model.colzoForm={resource:'clients',record:{id:'qa',full_name:'Saved customer',email:'owner@example.invalid',notes:'<b>Private note</b>'}};f.render();
 const form=f.view.querySelector('#cnColzoForm');assert.ok(form);assert.equal(form.dataset.recordId,'qa');
 assert.equal(form.querySelector('[name="full_name"]').value,'Saved customer');assert.equal(form.querySelector('[name="company"]'),null);
 assert.equal(form.querySelector('textarea').value,'<b>Private note</b>');assert.equal(form.querySelector('b'),null);f.dom.window.close();
});
test('React issued-quote edit form cannot enable unsupported term edits',()=>{
 const f=fixture();f.model.screen='quotes';f.model.colzoForm={resource:'quotes',record:{id:'issued',status:'sent',title:'Locked quote'}};f.render();
 assert.match(f.view.textContent,/Quote terms are locked/);assert.equal(f.view.querySelector('form'),null);f.dom.window.close();
});
test('React quote details use saved amounts, actual links and issued-term locks',()=>{
 const f=fixture();f.model.screen='colzoDetail';f.model.colzoDetail={resource:'quotes',id:'q'};f.model.colzoRecords.quotes=[{id:'q',title:'QA quote',amount_gbp:12.5,status:'sent',lead_id:42,notes:'<script>unsafe</script>'}];f.model.enquiries=[{id:42,name:'QA contact'}];f.render();
 assert.match(f.view.textContent,/£12.50/);assert.equal(f.view.querySelector('script'),null);assert.ok(f.view.querySelector('[data-cn-lead="42"]'));assert.equal(f.view.querySelector('[data-colzo-edit]'),null);f.dom.window.close();
});
test('React customer activity never joins unrelated records without contact identity',()=>{
 const f=fixture();f.model.screen='colzoDetail';f.model.customerProfileTab='activity';f.model.colzoDetail={resource:'clients',id:'c'};f.model.colzoRecords.clients=[{id:'c',full_name:'Same Name'}];f.model.enquiries=[{id:42,name:'Same Name',job_type:'Unrelated sensitive work'}];f.render();
 assert.doesNotMatch(f.view.textContent,/Unrelated sensitive work/);f.dom.window.close();
});
