import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const html = readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script = readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const desktopOps = readFileSync(new URL('../assets/colzo-desktop-operations.js',import.meta.url),'utf8');
const desktopCss = readFileSync(new URL('../assets/colzo-desktop-command-centre.css',import.meta.url),'utf8');

function fixture(data){
  const navStart=html.indexOf('<nav class="cn-nav"');
  const navEnd=html.indexOf('</nav>',navStart)+6;
  assert.ok(navStart>0 && navEnd>navStart,'native navigation markup exists');
  const navHtml=html.slice(navStart,navEnd);
  const dom=new JSDOM('<body class="auth-ready colzo-owner-enabled"><section id="colzoOwner"><header class="cn-header"></header><div id="cnContent"></div><div id="cnScreenAnnounce"></div>'+navHtml+'</section></body>',{runScripts:'outside-only',url:'https://qa.invalid'});
  const w=dom.window;
  w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
  w.scrollTo=()=>{};
  w.eval('var leads='+JSON.stringify(data.leads||[])+'; var bookings='+JSON.stringify(data.bookings||[])+'; var businessActions='+JSON.stringify(data.actions||[])+'; var settings='+JSON.stringify({business_name:'Example Electrical'})+'; var businessConfiguration='+JSON.stringify({booking_preferences:{timezone:'Europe/London'}})+';');
  w.eval(desktopOps);
  w.eval(script);
  w.ColzoOwner.dashboardLoaded();
  w.ColzoOwner.render();
  return {dom,w,root:w.document.querySelector('#cnContent')};
}

test('native owner home has a dedicated desktop workspace, not only the hidden legacy dashboard',()=>{
  const f=fixture({});
  assert.ok(f.root.querySelector('.cf-home-head'),'current mobile home must remain available');
  assert.ok(f.root.querySelector('.cn-home-desktop'),'desktop must be implemented in the active native owner shell');
  assert.match(f.root.querySelector('.cn-home-desktop').textContent,/Needs attention|Today's schedule|Workspace briefing/);
  f.dom.window.close();
});

test('native desktop KPIs distinguish confirmed today from requested bookings and use real data',()=>{
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
 const iso=parts.year+'-'+parts.month+'-'+parts.day+'T12:00:00Z';
 const f=fixture({leads:[{id:1,name:'Test customer',status:'New'}],bookings:[
 {id:1,title:'Confirmed test',status:'confirmed',starts_at:iso},
 {id:2,title:'Requested test',status:'requested',starts_at:iso}
 ],actions:[]});
 const desktop=f.root.querySelector('.cn-home-desktop');
 assert.ok(desktop);
 const text=desktop.textContent;
 assert.match(text,/New enquiries\s*1/);
 assert.match(text,/Confirmed today\s*1/);
 assert.match(text,/Requested test/,'request should appear as needing review');
 assert.match(text,/Confirmed test/,'confirmed booking should appear in schedule');
 assert.doesNotMatch(text,/£\d+ booked|estimated revenue/i);
 f.dom.window.close();
});

test('native desktop escapes customer names and routes through existing native navigation',()=>{
  const f=fixture({leads:[{id:1,name:'<img src=x onerror=alert(1)>',status:'New'}]});
  const dashboard=f.root.querySelector('.cn-home-desktop');
  assert.ok(dashboard);
  assert.equal(dashboard.querySelector('img'),null,'customer content must not create markup');
  assert.match(dashboard.textContent,/img src/);
  const action=dashboard.querySelector('button[data-cn-screen="enquiries"]');
  assert.ok(action,'dashboard links must navigate to implemented screens');
  action.click();
  assert.equal(f.w.document.querySelector('#colzoOwner').dataset.screen,'enquiries');
  f.dom.window.close();
});

test('native desktop is strictly desktop-only and retains the 5-tab mobile owner navigation',()=>{
  assert.match(desktopCss, /#colzoOwner \.cn-home-desktop\{display:none!important\}/);
  assert.match(desktopCss, /@media \(min-width:1100px\)\{[\s\S]*?#colzoOwner \.cn-content > :is\(\.cf-home-head/);
  assert.match(html,/data-cn-screen="home"/);
  assert.match(html,/data-cn-screen="clients"/);
  assert.match(desktopCss,/colzo-mark\.svg/,'native desktop must use the actual Colzo brand mark');
});

test('desktop owner sidebar adds direct links to existing work tools without replacing the five mobile tabs',()=>{
 const f=fixture({});
 const nav=f.w.document.querySelector('#colzoOwner .cn-nav');
 assert.equal(nav.querySelectorAll(':scope > button').length,5,'mobile tabs stay exactly as implemented');
 const extra=nav.querySelector('.cn-desktop-nav-extra');
 assert.ok(extra,'native sidebar must expose additional desktop work tools');
 for(const screen of ['actions','quotes','projects','marketing','receptionist','more']){
   assert.ok(extra.querySelector('button[data-cn-screen="'+screen+'"]'),'missing desktop route '+screen);
 }
 assert.match(desktopCss, /#colzoOwner \.cn-desktop-nav-extra\{display:none!important\}/);
 assert.match(desktopCss, /#colzoOwner \.cn-desktop-nav-extra\{\s*display:flex!important/);
 extra.querySelector('[data-cn-screen="actions"]').click();
 assert.equal(f.w.document.querySelector('#colzoOwner').dataset.screen,'actions');
 assert.equal(extra.querySelector('[data-cn-screen="actions"]').getAttribute('aria-current'),'page');
 f.dom.window.close();
});

test('desktop extra links use only existing routed native tools and avoid claims of ClickUp connection',()=>{
 const nav=html.slice(html.indexOf('<nav class="cn-nav"'),html.indexOf('</nav>',html.indexOf('<nav class="cn-nav"')));
 assert.doesNotMatch(nav,/Connect ClickUp|ClickUp connected|Phone connected/i);
 assert.doesNotMatch(nav,/data-cn-screen="integrations"/,'integrations remain settings concept, not an enabled separate route');
});

test('desktop keeps the native header back control available on detail and settings screens',()=>{
 const bad='#colzoOwner .cn-header .cn-wordmark{display:none!important}';
 assert.ok(!desktopCss.includes(bad),'do not globally hide the repurposed native Back control');
 assert.ok(desktopCss.includes('#colzoOwner[data-screen="home"] .cn-header .cn-wordmark{display:none!important}'),
   'only the home screen should suppress the duplicate wordmark');
});

test('desktop and preserved mobile trend charts do not reuse the same SVG gradient identifier',()=>{
 const f=fixture({leads:[{id:1,status:'New',created_at:'2026-11-11T12:00:00Z'}]});
 assert.equal(f.root.querySelectorAll('#cnTrendFill').length,1);
 assert.equal(f.root.querySelectorAll('#cnDesktopTrendFill').length,1);
 assert.ok(f.root.querySelector('#cnDesktopTrend [fill="url(#cnDesktopTrendFill)"]'));
 f.dom.window.close();
});

test('compact laptop widths retain the desktop overview with a narrow accessible workspace rail',()=>{
 assert.match(desktopCss, /@media \(min-width:920px\)\{[\s\S]*?#colzoOwner \.cn-home-desktop\{display:block!important\}/);
 assert.match(desktopCss, /@media \(min-width:920px\) and \(max-width:1099px\)\{/);
 assert.match(desktopCss, /width:72px!important/);
 assert.match(desktopCss, /grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(desktopCss, /#colzoOwner \.cn-nav button\{[\s\S]*?font-size:0!important/);
});

test('native desktop brand pseudo-element resets inherited moving tab-indicator geometry',()=>{
 assert.match(desktopCss,/background:url\('\/assets\/icons\/colzo-mark\.svg'\)/);
 assert.match(desktopCss,/bottom:auto!important;right:auto!important/);
 assert.match(desktopCss,/height:40px!important;width:200px!important/);
});
