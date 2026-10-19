import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const html=readFileSync('index.html','utf8');
const helper=html.slice(html.indexOf('function colzoDashboardFailureLabel('),html.indexOf('\nasync function loadAll('));
const controller=readFileSync('assets/colzo-native.js','utf8');
function fixture(preview=true){
 const dom=new JSDOM('<body class="auth-ready"><section id="colzoOwner"><div id="cnContent"></div></section></body>',{runScripts:'outside-only',url:'https://qa.invalid'});
 const w=dom.window;
 w.matchMedia=()=>({matches:true});w.scrollTo=()=>{};
 w.colzoPreviewAuthTransportEnabled=preview;
 w.eval(helper+controller);
 return {dom,w,content:w.document.querySelector('#cnContent')};
}
test('native owner error displays the safe initial API diagnostic, including after retry',()=>{
 const f=fixture();
 const error={message:'PRIVATE PROVIDER BODY',colzoApiPath:'/api/pipeline',colzoApiStatus:401,colzoApiReason:'backend-session-unverified'};
 f.w.ColzoOwner.error(error);
 assert.match(f.content.textContent,/Diagnostic: \/api\/pipeline HTTP 401, backend-session-unverified/);
 assert.doesNotMatch(f.content.textContent,/PRIVATE PROVIDER BODY/);
 f.w.loadAll=()=>f.w.ColzoOwner.error({...error,colzoApiPath:'/api/settings',colzoApiStatus:503,colzoApiReason:'service-unavailable'});
 f.content.querySelector('[data-cn-refresh]').click();
 assert.match(f.content.textContent,/Diagnostic: \/api\/settings HTTP 503, service-unavailable/);
 f.w.close();
});
test('native owner error remains generic outside the approved Preview',()=>{
 const f=fixture(false);
 f.w.ColzoOwner.error({colzoApiPath:'/api/leads',colzoApiStatus:500,colzoApiReason:'server-error'});
 assert.match(f.content.textContent,/Unable to load your business records/);
 assert.doesNotMatch(f.content.textContent,/Diagnostic|\/api\//);
 f.w.close();
});
test('native owner error never renders arbitrary errors, routes, response bodies or markup',()=>{
 const f=fixture();
 f.w.ColzoOwner.error({message:'SECRET',colzoApiPath:'/api/leads?<img src=x>',colzoApiStatus:500,colzoApiReason:'server-error'});
 assert.doesNotMatch(f.content.textContent,/SECRET|Diagnostic|img/);
 assert.equal(f.content.querySelector('img'),null);
 f.w.ColzoOwner.error({colzoApiPath:'/api/leads',colzoApiStatus:500,colzoApiReason:'SECRET'});
 assert.doesNotMatch(f.content.textContent,/SECRET|Diagnostic/);
 f.w.close();
});
test('native owner error tolerates absent metadata and does not render signed-out records',()=>{
 const f=fixture();f.w.ColzoOwner.error();
 assert.match(f.content.textContent,/Unable to load your business records/);
 f.content.textContent='Signed out';f.w.document.body.classList.remove('auth-ready');
 f.w.ColzoOwner.error({colzoApiPath:'/api/leads',colzoApiStatus:401,colzoApiReason:'unclassified'});
 assert.equal(f.content.textContent,'Signed out');f.w.close();
});
