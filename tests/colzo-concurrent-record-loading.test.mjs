import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const source=readFileSync('assets/colzo-native.js','utf8');
function fixture(){
 const dom=new JSDOM('<body class="auth-ready"><section id="colzoOwner"><header class="cn-header"><button class="cn-wordmark" data-cn-screen="more"></button></header><div id="cnContent"></div><nav class="cn-nav">'+['home','enquiries','bookings','clients','more'].map(x=>'<button data-cn-screen="'+x+'">'+x+'</button>').join('')+'</nav><div id="cnScreenAnnounce"></div></section>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://preview.invalid'});
 const w=dom.window;
 w.scrollTo=()=>{};w.matchMedia=()=>({matches:true,addEventListener(){}});
 w.eval('let leads=[],bookings=[],businessActions=[],settings={business_name:"Fixture"}; const waiters={};const requests={};async function api(path){const resource=path.includes("projects")?"projects":path.includes("quotes")?"quotes":"clients";requests[resource]=(requests[resource]||0)+1;return new Promise((resolve,reject)=>{waiters[resource]={resolve,reject}})};window.finish=(name,rows=[])=>waiters[name].resolve(rows);window.requests=requests;'+source);
 const root=w.document.querySelector('#colzoOwner');
 const click=s=>{const button=root.querySelector(s);assert.ok(button,s);button.click()};
 const show=screen=>{if(!root.querySelector('[data-cn-screen="'+screen+'"]'))click('[data-cn-screen="more"]');click('[data-cn-screen="'+screen+'"]')};
 const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
 const txt=()=>root.querySelector('#cnContent').textContent;
 return {dom,w,root,click,show,tick,txt};
}
test('quotes retain their own loading indicator when an earlier project request completes',async()=>{
 const f=fixture();
 f.show('projects');f.show('quotes');await f.tick();
 assert.match(f.txt(),/Loading saved quotes/);
 assert.doesNotMatch(f.txt(),/No saved quotes yet/);
 f.w.finish('projects');await f.tick();
 const input=f.root.querySelector('#cnQuoteSearch');input.value='draft';input.dispatchEvent(new f.w.Event('input',{bubbles:true}));
 assert.match(f.txt(),/Loading saved quotes/);
 assert.doesNotMatch(f.txt(),/No saved quotes yet/);
 f.w.finish('quotes',[{id:'44444444-4444-4444-8444-444444444444',title:'Actual draft',status:'draft',amount_gbp:10}]);await f.tick();
 assert.match(f.txt(),/Actual draft/);
 assert.doesNotMatch(f.txt(),/Loading saved quotes/);
 f.dom.window.close();
});
test('revisiting a pending project does not duplicate a GET and remains visibly loading',async()=>{
 const f=fixture();f.show('projects');f.show('quotes');f.show('projects');await f.tick();
 assert.equal(f.w.requests.projects,1);
 assert.match(f.txt(),/Loading saved projects/);
 f.w.finish('quotes');await f.tick();
 assert.match(f.txt(),/Loading saved projects/);
 f.w.finish('projects');await f.tick();
 assert.doesNotMatch(f.txt(),/Loading saved projects/);
 f.dom.window.close();
});
