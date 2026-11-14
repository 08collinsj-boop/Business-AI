import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {JSDOM} from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/colzo-desktop-command-centre.css', import.meta.url), 'utf8');
function getOverview() {
  const script = readFileSync(new URL('../assets/colzo-desktop-operations.js', import.meta.url), 'utf8');
  const sandbox = {window:{},Date,Intl};
  runInNewContext(script,sandbox);
  return sandbox.window.ColzoDesktopOperations;
}
const on = '2026-11-11T12:00:00Z';

test('desktop attention and schedule are accessible additions but hidden in mobile layouts', () => {
  assert.match(html, /id="colzoDesktopAttention"[^>]*aria-label="Needs attention"/);
  assert.match(html, /id="colzoDesktopSchedule"[^>]*aria-label="Today's schedule"/);
  assert.match(html, /id="colzoAttentionList"[^>]*aria-live="polite"/);
  assert.match(html, /id="colzoScheduleList"[^>]*aria-live="polite"/);
  assert.match(html, /assets\/colzo-desktop-operations\.js/);
  assert.match(css, /#colzoDesktopAttention,#colzoDesktopSchedule\{display:none!important\}/);
  assert.match(css, /grid-area:attention/);
  assert.match(css, /grid-area:schedule/);
  assert.ok(html.indexOf('assets/colzo-desktop-operations.js') < html.indexOf('function renderDashboard()'));
});

test('attention prioritises overdue work, booking requests, due work, new enquiries without changing records', () => {
  const api = getOverview();
  const data = {
    leads:[{id:2,name:'New Customer',status:'New'}, {id:3,name:'Completed',status:'Converted'}],
    actions:[{id:7,title:'Overdue quote',status:'pending',due_at:'2026-11-10T12:00:00Z'},
      {id:8,title:'Due today',status:'pending',due_at:on},
      {id:9,title:'Finished',status:'completed',due_at:'2026-11-09T12:00:00Z'},
      {id:10,title:'Not due',status:'pending',due_at:'2026-11-12T12:00:00Z'}],
    bookings:[{id:4,title:'New request',status:'requested'},{id:5,title:'Confirmed appointment',status:'confirmed'}]
  };
  const before = JSON.stringify(data);
  const result = api.attention(data,{now:on,timezone:'Europe/London'});
  assert.equal(JSON.stringify(result.map(x=>x.route)),JSON.stringify(['actions','bookings','actions','leads']));
  assert.equal(JSON.stringify(result.map(x=>x.title)),JSON.stringify(['Overdue quote','New request','Due today','New Customer']));
  assert.equal(JSON.stringify(data),before,'dashboard must not mutate stored workspace records');
});

test('schedule only lists confirmed appointments on the business-local calendar day, sorted by time', () => {
  const api = getOverview();
  const data=[
    {id:2,title:'Later appointment',status:'confirmed',starts_at:'2026-11-11T16:00:00Z'},
    {id:3,title:'Requested, not confirmed',status:'requested',starts_at:'2026-11-11T09:00:00Z'},
    {id:1,title:'Earlier appointment',status:'confirmed',starts_at:'2026-11-11T09:30:00Z'},
    {id:5,title:'Yesterday',status:'confirmed',starts_at:'2026-11-10T09:00:00Z'},
    {id:6,title:'Completed',status:'completed',starts_at:'2026-11-11T11:00:00Z'},
    {id:7,title:'Unscheduled',status:'confirmed',starts_at:null},
  ];
  const result=api.schedule(data,{now:on,timezone:'Europe/London'});
  assert.equal(JSON.stringify(result.map(x=>x.title)),JSON.stringify(['Earlier appointment','Later appointment']));
  assert.equal(JSON.stringify(result.map(x=>x.time)),JSON.stringify(['09:30','16:00']));
});

test('schedule respects daylight saving and falls back safely for invalid workspace timezones', () => {
  const api = getOverview();
  const summer='2026-07-01T08:30:00Z';
  assert.equal(api.schedule([{title:'Summer booking',status:'confirmed',starts_at:summer}],{now:'2026-07-01T12:00:00Z',timezone:'Europe/London'})[0].time,'09:30');
  assert.equal(api.schedule([{title:'Fallback booking',status:'confirmed',starts_at:on}],{now:on,timezone:'Invalid/Zone'})[0].time,'12:00');
  assert.equal(api.schedule([{title:'Bad booking',status:'confirmed',starts_at:'nope'}],{now:on,timezone:'Europe/London'}).length,0);
});

test('render uses text nodes for customer-provided titles and navigates only to established app views', () => {
  const api = getOverview();
  const dom=new JSDOM('<main><div id="colzoAttentionList"></div><div id="colzoScheduleList"></div><span id="colzoAttentionCount"></span><span id="colzoScheduleCount"></span></main>');
  const routes=[];
  api.render(dom.window.document,{
    leads:[{id:1,status:'New',name:'<img src=x onerror=alert(1)>'}],
    bookings:[{id:1,status:'confirmed',title:'<script>bad()</script>',starts_at:'2026-11-11T10:30:00Z'}],
    actions:[],now:on,timezone:'Europe/London',navigate:route=>routes.push(route)
  });
  assert.equal(dom.window.document.querySelector('script'),null);
  assert.equal(dom.window.document.querySelector('img'),null);
  assert.match(dom.window.document.querySelector('#colzoAttentionList').textContent,/img src/);
  const buttons=dom.window.document.querySelectorAll('.colzo-ops-row');
  assert.equal(buttons.length,2);
  assert.ok([...buttons].every(button=>button.type==='button'));
  buttons[0].click(); buttons[1].click();
  assert.equal(JSON.stringify(routes),JSON.stringify(['leads','bookings']));
  dom.window.close();
});

test('empty attention and schedule show truthful messages rather than fabricated work',()=>{
 const api=getOverview();
 const dom=new JSDOM('<main><div id="colzoAttentionList"></div><div id="colzoScheduleList"></div><span id="colzoAttentionCount"></span><span id="colzoScheduleCount"></span></main>');
 api.render(dom.window.document,{leads:[],bookings:[],actions:[],now:on,timezone:'Europe/London',navigate:()=>{}});
 assert.match(dom.window.document.querySelector('#colzoAttentionList').textContent,/No items currently need attention/);
 assert.match(dom.window.document.querySelector('#colzoScheduleList').textContent,/No confirmed appointments today/);
 assert.doesNotMatch(dom.window.document.body.textContent,/\b0 booked\b|£/);
 dom.window.close();
});
test('due counts match the business-local action date, including daylight-saving boundaries',()=>{
  const api=getOverview();
  const actions=[{status:'pending',due_at:'2026-07-01T23:30:00Z'},
                 {status:'completed',due_at:'2026-07-01T22:00:00Z'},
                 {status:'pending',due_at:'invalid'}];
  assert.equal(api.dueCount(actions,{now:'2026-07-01T22:30:00Z',timezone:'Europe/London'}),0,
    '23:30 UTC is tomorrow in British Summer Time');
  assert.equal(api.dueCount(actions,{now:'2026-07-02T00:30:00Z',timezone:'Europe/London'}),1);
  assert.equal(api.attention({actions},{now:'2026-07-02T00:30:00Z',timezone:'Europe/London'}).length,1);
  assert.match(html, /ColzoDesktopOperations\?\.dueCount\(/);
});
test('operations stay hidden on phone but stack on tablet, above the lower dashboard cards',()=>{
 const panels = css.match(/@media \(min-width:760px\)\{[\s\S]*?\.colzo-desktop-operations\{/);
 assert.ok(panels,'tablet should show the operational panels without changing compact mobile');
 const list = html.indexOf('id="colzoDesktopAttention"');
 const schedule = html.indexOf('id="colzoDesktopSchedule"');
 const ai = html.indexOf('class="dashboard-ai-strip');
 assert.ok(list > 0 && schedule > list && ai > schedule, 'tablet document order should be attention, then schedule, then optional features');
});

test('workspace date label uses the booking timezone, not the viewing device timezone',()=>{
 const api=getOverview();
 assert.match(api.dateLabel({now:'2026-07-01T23:30:00Z',timezone:'Europe/London'}),/2 Jul/);
 assert.match(api.dateLabel({now:'2026-07-01T23:30:00Z',timezone:'Invalid/Zone'}),/2 Jul/);
 assert.equal(api.dateLabel({now:'not-a-date',timezone:'Europe/London'}),'');
});

test('DATE-only deadlines retain their local calendar date, including western timezones',()=>{
 const api=getOverview();
 const actions=[
   {title:'July first deadline',status:'pending',due_at:'2026-07-01'},
   {title:'Malformed date',status:'pending',due_at:'2026-02-30'},
   {title:'Tomorrow deadline',status:'pending',due_at:'2026-07-02'}];
 const options={now:'2026-07-01T17:30:00Z',timezone:'America/Los_Angeles'};
 assert.equal(api.dueCount(actions,options),1);
 assert.equal(api.attention({actions},options)[0].meta,'Due today');
 assert.equal(api.dueCount(actions,{now:'2026-06-30T18:00:00Z',timezone:'America/Los_Angeles'}),0);
});

test('desktop primary action reviews highest-priority genuine record instead of always enquiries',()=>{
 const dom=new JSDOM('<body class="auth-ready colzo-owner-enabled"><section id="colzoOwner"><header class="cn-header"></header><div id="cnContent"></div><div id="cnScreenAnnounce"></div><nav class="cn-nav"><button data-cn-screen="home">Home</button><button data-cn-screen="enquiries">Enquiries</button><button data-cn-screen="bookings">Bookings</button><button data-cn-screen="clients">Customers</button><button data-cn-screen="more">More</button></nav></section></body>',{runScripts:'outside-only',url:'https://qa.invalid'});
 const past=new Date(Date.now()-86400000).toISOString();
 dom.window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 dom.window.scrollTo=()=>{};
 dom.window.eval('var leads=[{name:"New customer",status:"New"}];var bookings=[{title:"Confirm visit",status:"requested"}];var businessActions='+JSON.stringify([{title:'Overdue action',status:'pending',due_at:past}])+';var settings={business_name:"Example"};var businessConfiguration={booking_preferences:{timezone:"Europe/London"}};');
 dom.window.eval(readFileSync(new URL('../assets/colzo-desktop-operations.js',import.meta.url),'utf8'));
 dom.window.eval(readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8'));
 dom.window.ColzoOwner.dashboardLoaded();dom.window.ColzoOwner.render();
 const button=dom.window.document.querySelector('.cn-home-desktop .cn-dash-briefing > button');
 assert.equal(button?.dataset.cnScreen,'actions');
 assert.match(button.textContent,/Review actions/);
 dom.window.close();
});

test('attention list includes supported New, Open, Pending and Unread enquiry statuses',()=>{
 const api=getOverview();
 const leads=[
  {name:'New enquiry',status:'New'},{name:'Still open',status:'open'},
  {name:'Awaiting review',status:'pending'},{name:'Unread request',status:'unread'},
  {name:'Already contacted',status:'Contacted'},{name:'Converted enquiry',status:'Converted'},
  {name:'Closed item',status:'closed'}];
 const result=api.attention({leads},{now:on,timezone:'Europe/London'}).filter(item=>item.route==='leads');
 assert.equal(result.length,4);
 assert.ok(result.some(item=>item.title==='Still open'));
 assert.ok(!result.some(item=>item.title==='Closed item'));
});


test('QA D01: attention exposes only real booking/customer/time and enquiry details',()=>{
 const api=getOverview();
 const result=api.attention({
   bookings:[{title:'Site survey',status:'requested',customer_name:'Fictional Buyer',starts_at:'2026-11-16T15:00:00Z'}],
   leads:[{name:'Lead marker',status:'New',job_type:'Solar inspection'}]
 },{now:'2026-11-13T11:00:00Z',timezone:'Europe/London'});
 const booking=result.find(row=>row.route==='bookings');
 assert.match(booking.context,/Fictional Buyer/);
 assert.match(booking.context,/16 Nov/);
 assert.match(booking.context,/15:00/);
 assert.match(result.find(row=>row.route==='leads').context,/Solar inspection/);
 const missing=api.attention({bookings:[{title:'No date',status:'requested'}]},{now:'2026-11-13T11:00:00Z',timezone:'Europe/London'});
 assert.equal(missing[0].context,'','never fabricate unavailable context');
});
