import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const controller=readFileSync('assets/colzo-native.js','utf8');
function fixture(){
 const dom=new JSDOM('<body class="auth-ready"><div id="securityHome"><section id="securityCenterShell"><button id="retainedSecurityButton">Existing security handler</button></section></div><section id="colzoOwner"><div class="cn-header"></div><div id="cnContent"></div><nav class="cn-nav">'+['home','enquiries','bookings','clients','more'].map(x=>`<button data-cn-screen="${x}">${x}</button>`).join('')+'</nav><span id="cnScreenAnnounce"></span></section><button id="cnReturnToColzo"></button>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://qa.invalid'});
 const w=dom.window;w.scrollTo=()=>{};w.matchMedia=()=>({matches:true,addEventListener(){}});
 w.securityClicks=0;w.document.querySelector('#retainedSecurityButton').onclick=()=>w.securityClicks++;
 w.colzoMountSecurityCenter=host=>{host.append(w.document.querySelector('#securityCenterShell'));return true};
 w.colzoParkSecurityCenter=()=>{w.document.querySelector('#securityHome').append(w.document.querySelector('#securityCenterShell'))};
 w.eval("let leads=[{id:1,name:'QA contact',status:'New'}],bookings=[],businessActions=[],settings={business_name:'QA'};async function api(){return []}"+controller);
 const click=s=>{const e=w.document.querySelector(s);assert.ok(e,s);e.click()};
 return{dom,w,click,content:()=>w.document.querySelector('#cnContent')};
}
test('enquiry contacts open their profile instead of silently remaining in the directory',()=>{
 const f=fixture();f.click('[data-cn-screen="clients"]');f.click('[data-cn-customer="1"]');
 assert.equal(f.w.ColzoOwner.getActiveScreen(),'customer');assert.match(f.content().textContent,/QA contact/);f.dom.window.close();
});
test('support feedback shortcut reaches the native form',()=>{
 const f=fixture();f.click('[data-cn-screen="more"]');f.click('[data-cn-setting="help"]');
 const button=[...f.content().querySelectorAll('button')].find(e=>e.textContent.includes('Send pilot feedback'));button.click();
 assert.ok(f.content().querySelector('#cnFeedbackForm'));f.dom.window.close();
});
test('security settings mount and preserve existing authenticated security controls on navigation',()=>{
 const f=fixture();f.click('[data-cn-screen="more"]');f.click('[data-cn-setting="security"]');
 const button=[...f.content().querySelectorAll('button')].find(e=>e.textContent.includes('Manage authenticator and devices'));button.click();
 assert.ok(f.content().querySelector('#cnSecurityCentreHost #retainedSecurityButton'));
 f.click('#retainedSecurityButton');assert.equal(f.w.securityClicks,1);
 f.click('[data-cn-screen="home"]');assert.ok(f.w.document.querySelector('#securityHome #retainedSecurityButton'));
 f.click('[data-cn-screen="more"]');f.click('[data-cn-setting="security"]');
 [...f.content().querySelectorAll('button')].find(e=>e.textContent.includes('Manage authenticator and devices')).click();
 f.click('#retainedSecurityButton');assert.equal(f.w.securityClicks,2);f.dom.window.close();
});
test('website integration gives an honest unavailable state instead of returning to Settings',()=>{
 const f=fixture();f.click('[data-cn-screen="more"]');f.click('[data-cn-setting="integrations"]');
 assert.match(f.content().textContent,/Website assistant/);
 assert.ok(![...f.content().querySelectorAll('button')].some(e=>e.textContent.includes('Website assistant')));
 assert.match(f.content().textContent,/not yet available in Colzo/);f.dom.window.close();
});
test('tool search does not duplicate destinations or describe saved quotes as copy-only',()=>{
 const f=fixture();const match=controller.match(/const commandItems=(\[[\s\S]*?\n \]);/);const items=f.w.eval('('+match[1]+')');
 const destinations=items.map(i=>i.screen||i.setting);assert.equal(new Set(destinations).size,destinations.length);
 assert.doesNotMatch(items.find(i=>i.screen==='quotes').detail,/copy-only/);f.dom.window.close();
});
test('customer portal and directory use Colzo product branding without changing business data',()=>{
 const dom=new JSDOM(readFileSync('index.html','utf8'));
 for(const selector of ['.customer-portal-brand','.public-directory-header','.public-directory-hero','.public-directory-footer','.public-profile-top-brand']){
  assert.match(dom.window.document.querySelector(selector).textContent,/Colzo/);
  assert.doesNotMatch(dom.window.document.querySelector(selector).textContent,/Business AI/);
 }
 dom.window.close();
});
test('security centre mounts the same controls, preserves listeners and refuses signed-out mounting',async()=>{
 const dom=new JSDOM('<body><div id="settingsView"><div class="settings-hub"></div></div><div id="cnSecurityCentreHost"></div></body>',{runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.HTMLElement.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:true});
 w.eval(readFileSync('assets/security-center.js','utf8'));
 const host=w.document.querySelector('#cnSecurityCentreHost');
 assert.equal(w.colzoMountSecurityCenter(host),false);w.document.body.classList.add('auth-ready');
 assert.equal(w.colzoMountSecurityCenter(host),true);const shell=host.querySelector('#securityCenterShell');
 let clicks=0;shell.addEventListener('click',()=>clicks++);
 w.colzoParkSecurityCenter();assert.equal(shell.parentElement.id,'settingsView');
 w.colzoMountSecurityCenter(host);assert.equal(host.firstElementChild,shell);shell.click();assert.equal(clicks,1);
 w.document.querySelector('#securityMfaSecret').value='synthetic-unused-key';
 w.document.body.classList.remove('auth-ready');await new Promise(r=>setTimeout(r,30));
 assert.equal(w.document.querySelector('#securityCenterShell'),null);
 w.document.body.classList.add('auth-ready');w.colzoMountSecurityCenter(host);
 assert.notEqual(host.firstElementChild,shell);assert.equal(w.document.querySelector('#securityMfaSecret').value,'');
 await new Promise(r=>setTimeout(r,30));w.close();
});
