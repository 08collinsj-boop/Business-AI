import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const operations=readFileSync(new URL('../assets/colzo-desktop-operations.js',import.meta.url),'utf8');

async function waitFor(check){
  for(let i=0;i<80;i++){
    if(check())return;
    await new Promise(r=>setTimeout(r,10));
  }
  assert.fail('Expected async native UI state was not reached');
}

function fixture(handleApi) {
  const navStart=html.indexOf('<nav class="cn-nav"');
  const navEnd=html.indexOf('</nav>',navStart)+6;
  assert.ok(navStart>0&&navEnd>navStart);
  const navHtml=html.slice(navStart,navEnd);
  const dom=new JSDOM('<body class="auth-ready colzo-owner-enabled"><section id="colzoOwner"><header class="cn-header"></header><div id="cnContent"></div><div id="cnScreenAnnounce"></div>'+navHtml+'</section><button id="cnReturnToColzo" hidden></button></body>',{runScripts:'outside-only',url:'https://qa.invalid'});
  const w=dom.window;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.scrollTo=()=>{};
  w.api=handleApi;
  w.eval('var leads=[];var bookings=[];var businessActions=[];var settings={business_name:"Example Electrical"};var businessConfiguration={booking_preferences:{timezone:"Europe/London"}};');
  w.eval(operations);
  w.eval(script);
  w.ColzoOwner.dashboardLoaded();
  w.ColzoOwner.render();
  return {dom,w,content:w.document.querySelector('#cnContent')};
}

test('initial home does not imply a ClickUp connection before checking',()=>{
  const f=fixture(async()=>{throw Error('Should not call API until user requests refresh')});
  const text=f.content.querySelector('.cn-dash-connected').textContent;
  assert.match(text,/connection (has not been checked|not yet checked)/i);
  f.dom.window.close();
});
test('desktop Home refresh renders only provider-confirmed page counts with escaped titles',async()=>{
  const calls=[];
  const taskTitle='<img src=x onerror=alert(1)>';
  const f=fixture(async url=>{
    calls.push(url);
    if(url==='/api/clickup')return {configured:true,connected:true,provider:'clickup',workspace:{id:'123',name:'Example'},canManage:true};
    if(url==='/api/clickup?view=tasks&page=0')return {tasks:[{id:'one',title:taskTitle,status:'to do',dueAt:null}],summary:{total:1,overdue:1,dueSoon:0},hasMore:false};
    throw Error('Unexpected URL '+url);
  });
  assert.equal(calls.length,0,'no background provider data retrieval on Home');
  f.content.querySelector('[data-clickup-home-refresh]').click();
  await waitFor(()=>f.content.querySelector('.cn-dash-clickup-verified'));
  assert.deepEqual(calls,['/api/clickup','/api/clickup?view=tasks&page=0']);
  const briefing=f.content.querySelector('.cn-dash-clickup-verified');
  assert.ok(briefing);
  assert.match(briefing.textContent,/1 overdue/);
  assert.match(briefing.textContent,/current page 1 only/);
  assert.match(briefing.textContent,/img src=x onerror/);
  assert.equal(briefing.querySelector('img'),null);
  f.dom.window.close();
});
test('server failure is surfaced without fake success metrics',async()=>{
  const f=fixture(async()=>{throw Error('ClickUp is temporarily unavailable')});
  f.content.querySelector('[data-clickup-home-refresh]').click();
  await waitFor(()=>/temporarily unavailable/.test(f.content.querySelector('.cn-dash-connected')?.textContent||''));
  assert.match(f.content.querySelector('.cn-dash-connected').textContent,/temporarily unavailable/);
  assert.equal(f.content.querySelector('.cn-dash-clickup-verified'),null);
  f.dom.window.close();
});
test('logout prevents delayed ClickUp requests from rendering data into another session',async()=>{
  let finish;
  const pending=new Promise(resolve=>{finish=resolve});
  const f=fixture(async()=>pending);
  f.content.querySelector('[data-clickup-home-refresh]').click();
  f.w.ColzoOwner.onAuthState('signed-out');
  finish({configured:true,connected:true,workspace:{id:'123',name:'Should Not Leak'},canManage:true});
  await new Promise(r=>setTimeout(r,30));
  f.w.ColzoOwner.onAuthState('auth-ready');
  assert.equal(f.content.querySelector('.cn-dash-clickup-verified'),null);
  assert.match(f.content.querySelector('.cn-dash-connected').textContent,/connection (has not been checked|not yet checked)/i);
  f.dom.window.close();
});

