/* Colzo owner shell layout: actual static app, fake local auth-ready DOM only.
   No real sign-ins, cookies, Supabase requests, billing or customer records. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const port=Number(process.env.COLZO_OWNER_VISUAL_PORT||8793),base=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const sleep=x=>new Promise(r=>setTimeout(r,x));
const sdk='window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}}';
const out=process.env.COLZO_OWNER_SCREENSHOT_DIR||'/tmp/colzo-owner-visual';fs.mkdirSync(out,{recursive:true});
async function main(){await sleep(600);const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h] of [[375,812],[390,844],[430,932],[1366,768],[1440,900]]){
  const ctx=await browser.newContext({viewport:{width:w,height:h},isMobile:w<500,hasTouch:w<500});const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{const host=new URL(r.url()).hostname;if(!['127.0.0.1','cdn.jsdelivr.net'].includes(host))errors.push('External request '+host)});
  await page.route('**/supabase-js@2*',r=>r.fulfill({status:200,contentType:'application/javascript',body:sdk}));
  await page.route('**/api/public-config',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frontendAuthEnabled:false})}));
  await page.route('**/api/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{"error":"fixture only"}'}));
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   document.body.className='colzo-safe-shell colzo-interface auth-ready final-showcase-ui';
   const dashboard=document.querySelector('#dashboardApp');dashboard.style.display='block';
   document.querySelectorAll('#dashboardApp .view').forEach(x=>x.classList.toggle('active',x.id==='dashboardView'));
   document.querySelector('#stats').innerHTML=`<div class="stat"><div class="stat-top"><span>Enquiries</span></div><div class="stat-value">3</div><div class="stat-sub">Example only</div></div><div class="stat"><div class="stat-top"><span>Needs attention</span></div><div class="stat-value">1</div><div class="stat-sub">Example only</div></div><div class="stat"><div class="stat-top"><span>Actions</span></div><div class="stat-value">2</div><div class="stat-sub">Example only</div></div><div class="stat"><div class="stat-top"><span>Bookings</span></div><div class="stat-value">1</div><div class="stat-sub">Example only</div></div>`;
   document.querySelector('#dashboardBusinessLabel').textContent='Example Test Business';
   document.querySelector('#dashboardGreeting').textContent='Good afternoon.';
   document.querySelector('#appSplash').style.display='none';
  });
  const view=await page.evaluate(()=>{
   const bounds=q=>{const e=document.querySelector(q),r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,display:getComputedStyle(e).display}};
   return {hero:bounds('#dashboardView .colzo-command-hero'),nav:bounds('.bottom-nav'),topbar:bounds('#dashboardApp .topbar'),bodyWidth:document.documentElement.scrollWidth,windowWidth:innerWidth,hasHeroEyebrow:document.querySelector('.colzo-hero-eyebrow').textContent.includes('YOUR WORKSPACE'),navButtons:document.querySelectorAll('.bottom-nav .nav-btn').length};
  });
  assert.ok(view.hero.w>200&&view.hero.h>160,`Hero not visible: ${JSON.stringify(view)}`);
  assert.ok(view.hasHeroEyebrow);assert.equal(view.navButtons,5);
  assert.ok(view.bodyWidth<=w+1,`Horizontal overflow ${w}: ${JSON.stringify(view)}`);
  if(w<1040){assert.ok(view.nav.w<w&&view.nav.x>=0&&view.nav.right<=w+2,`Mobile dock out of view ${JSON.stringify(view)}`);assert.ok(view.nav.bottom<=h+2&&view.nav.y>=h-125)}
  else assert.ok(view.nav.w>160&&view.nav.w<265&&view.hero.x>230,`Desktop rail failed ${JSON.stringify(view)}`);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:`${out}/home-${w}.png`,fullPage:false});
  // The native application routes remain accessible; only the visual shell
  // changes. Fake records exercise layout without touching a real tenant.
  await page.evaluate(()=>{
    document.querySelectorAll('#dashboardApp .view').forEach(el=>el.classList.toggle('active',el.id==='leadsView'));
    document.querySelector('#leadList').innerHTML='<article class="lead-card"><h3>Mock customer</h3><p>Example enquiry only</p></article>';
  });
  const enquiry=await page.evaluate(()=>{
    const el=document.querySelector('#leadsView .page-title h2');const lead=document.querySelector('#leadList .lead-card');return{title:el.textContent.trim(),visible:lead.getBoundingClientRect().height>0,width:document.documentElement.scrollWidth,color:getComputedStyle(el).color,filterCount:document.querySelectorAll('#leadsView .filter').length};
  });
  assert.equal(enquiry.title,'Enquiries');assert.ok(enquiry.filterCount>=4);assert.ok(enquiry.visible);assert.ok(enquiry.width<=w+1);
  await page.screenshot({path:`${out}/enquiries-${w}.png`,fullPage:false});
  await page.evaluate(()=>document.querySelectorAll('#dashboardApp .view').forEach(el=>el.classList.toggle('active',el.id==='settingsView')));
  const settings=await page.evaluate(()=>{const hub=document.querySelector('#settingsView .settings-hub'),first=hub.querySelector('button');return{title:document.querySelector('#settingsView .page-title h2').textContent.trim(),buttons:hub.querySelectorAll('button').length,cols:getComputedStyle(hub).gridTemplateColumns,firstVisible:first.getBoundingClientRect().height>0,width:document.documentElement.scrollWidth}});
  assert.equal(settings.title,'Settings');assert.ok(settings.buttons>=6);assert.ok(settings.firstVisible);assert.ok(settings.width<=w+1);
  await page.screenshot({path:`${out}/settings-${w}.png`,fullPage:false});
  console.log(`${w}x${h}: PASS Colzo command hero, metrics, Enquiries and Settings, 5-tab layout`);
  await ctx.close();
 }
}finally{await browser.close()}}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1}).finally(()=>server.kill());
