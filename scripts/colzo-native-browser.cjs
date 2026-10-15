/* End-to-end Chromium QA for the actual, separately structured Colzo owner
 * interface, using entirely fake local auth and dummy records (no live API). */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const port=Number(process.env.COLZO_NATIVE_QA_PORT||8794);
const base=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sdk='window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}}';
const shots=process.env.COLZO_NATIVE_SHOTS||'/tmp/colzo-native-qa';fs.mkdirSync(shots,{recursive:true});
// Chromium does not support Safari's -webkit-touch-callout media query, so
// execute the *actual source rule* with the same body lock in the mobile QA.
const nativeCss=fs.readFileSync(path.resolve(__dirname,'../assets/colzo-native.css'),'utf8');
const scrollRule=nativeCss.match(/@supports\s*\(-webkit-touch-callout:\s*none\)\s*\{\s*body\.colzo-owner-enabled\.auth-ready:not\(\.colzo-legacy-mode\) #colzoOwner\s*\{([^}]+)\}/);
assert.ok(scrollRule,'Missing iOS WebKit Colzo scrolling fix in CSS');
assert.match(scrollRule[1],/height:\s*100dvh/);
assert.match(scrollRule[1],/overflow-y:\s*auto/);
assert.match(scrollRule[1],/-webkit-overflow-scrolling:\s*touch/);

async function run(){await sleep(650);const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h] of [[375,812],[390,844],[430,932],[1366,768],[1440,900]]){
  const ctx=await browser.newContext({viewport:{width:w,height:h},isMobile:w<600,hasTouch:w<600});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('request',r=>{const host=new URL(r.url()).hostname;if(!['127.0.0.1','cdn.jsdelivr.net'].includes(host))errors.push('Unexpected network destination '+host)});
  await page.route('**/supabase-js@2*',r=>r.fulfill({status:200,contentType:'application/javascript',body:sdk}));
  await page.route('**/api/public-config',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frontendAuthEnabled:true,supabaseUrl:'https://fake-fixture.supabase.co',supabaseAnonKey:'fake-public-publishable-key-no-real-account-data'})}));
  await page.route('**/api/colzo-records*',async route=>{
    const url=new URL(route.request().url()),resource=url.searchParams.get('resource');
    const fixtures={projects:[{id:51,title:'Fixture project',client_name:'Fixture Client',status:'active',progress:35,created_at:'2026-10-12',notes:'Fixture only'},{id:52,title:'Sample confirmed visit',client_name:'Fixture Customer',status:'planned',progress:10,created_at:'2026-10-13',notes:'Fixture only'}],clients:[],quotes:[]};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures[resource]||[])});
  });
  await page.route('**/api/**',r=>new URL(r.request().url()).pathname==='/api/colzo-records'?r.fallback():r.fulfill({status:401,contentType:'application/json',body:'{"error":"fixture only"}'}));
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   leads=[{id:'qa-01',name:'Mock Jones',job_type:'Electrical repair',status:'New',created_at:'2026-10-12T08:40:00Z',phone:'07000000000',email:'mock@example.invalid',description:'Sample issue for local UI testing only',priority:'Normal',location:'Sample town'},{id:'qa-02',name:'Test Customer',job_type:'Lighting inspection',status:'Contacted',created_at:'2026-09-28T11:00:00Z'}];
   bookings=[{id:'qa-03',title:'Sample confirmed visit',status:'confirmed',due_at:'2026-10-20T09:00:00Z'}];
   businessActions=[{id:'qa-04',title:'Sample customer follow-up',status:'pending',due_at:'2026-10-18T09:00:00Z'}];
   settings={business_name:'QA Electrical Services'};
   document.body.className='auth-ready colzo-interface colzo-safe-shell';
   window.ColzoOwner.onAuthState('auth-ready');
   window.ColzoOwner.render();
  });
  assert.equal(await page.locator('#colzoOwner').isVisible(),true,'new owner shell should be visible');
  assert.equal(await page.locator('#dashboardApp').isVisible(),false,'legacy original must not be rendered on primary Colzo screen');
  assert.equal(await page.locator('.bottom-nav').isVisible(),false,'old five-tab bottom navigation must not appear');
  assert.equal(await page.locator('.cn-nav button').count(),5);
  assert.match(await page.locator('#colzoOwner .cf-home-head h1').innerText(),/Good|Welcome/);
  assert.match(await page.locator('.cf-kpis').innerText(),/Enquiries[\s\S]*2/);
  assert.equal(await page.locator('.cf-kpi').count(),3);
  assert.equal(await page.locator('.cf-quick-grid button').count(),4);
  assert.equal(await page.locator('.cf-trend').count(),1);
  // Safari locks body scrolling to keep Business AI's old navigation fixed.
  // Apply that same contract explicitly in Chromium: Colzo must scroll itself.
  if(w<920){
   await page.addStyleTag({content:`body.auth-ready{height:100dvh;min-height:100dvh;padding-bottom:0;overflow:hidden}body.colzo-owner-enabled.auth-ready:not(.colzo-legacy-mode) #colzoOwner{${scrollRule[1]}}`});
   const start=await page.evaluate(()=>{const el=document.querySelector('#colzoOwner');return{scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,scrollTop:el.scrollTop,bodyOverflow:getComputedStyle(document.body).overflowY,ownerOverflow:getComputedStyle(el).overflowY}});
   assert.ok(start.scrollHeight>start.clientHeight+80,`Colzo home must have content below viewport: ${JSON.stringify(start)}`);
   assert.equal(start.bodyOverflow,'hidden','iPhone / PWA body should remain locked for legacy navigation');
   assert.equal(start.ownerOverflow,'auto','Colzo must be its own touch-scroll surface');
   await page.evaluate(()=>document.querySelector('#colzoOwner').scrollTo({top:99999,behavior:'instant'}));
   const reached=await page.evaluate(()=>{const el=document.querySelector('#colzoOwner');return{top:el.scrollTop,end:el.scrollHeight-el.clientHeight,button:el.querySelector('.cf-below-fold .cn-duo button')?.getBoundingClientRect().bottom}});
   assert.ok(reached.top>80&&Math.abs(reached.top-reached.end)<=2,`Colzo must scroll to bottom: ${JSON.stringify(reached)}`);
   assert.ok(reached.button<h+10,`Colzo's lower actions must be reachable above viewport bottom: ${JSON.stringify(reached)}`);
   await page.evaluate(()=>document.querySelector('#colzoOwner').scrollTo({top:0,behavior:'instant'}));
  }
  await page.screenshot({path:`${shots}/native-home-${w}.png`,fullPage:false});
  await page.locator('.cn-nav [data-cn-screen="enquiries"]').click();
  assert.equal(await page.locator('.cf-screen-top h1').innerText(),'Enquiries');
  assert.deepEqual(await page.locator('.cf-tabs button').allTextContents(),['All','New (1)','In Progress (1)','Won (0)']);
  assert.equal(await page.locator('.cn-record').count(),2);
  await page.locator('#cnSearch').fill('Jones');
  assert.equal(await page.locator('.cn-record').count(),1);
  await page.locator('.cn-record').click();
  assert.equal(await page.locator('.cf-detail-contact h1').innerText(),'Mock Jones');
  assert.match(await page.locator('.cn-detail-panel').last().innerText(),/Sample issue for local UI/);
  await page.locator('button[data-cn-screen="enquiries"]').first().click();
  await page.locator('#cnSearch').blur();
  await page.screenshot({path:`${shots}/native-enquiries-${w}.png`,fullPage:false});
  await page.locator('.cn-nav [data-cn-screen="more"]').click();
  await page.locator('.cn-more-links [data-cn-screen="projects"]').click();
  assert.equal(await page.locator('.cf-screen-top h1').innerText(),'Projects');
  assert.equal(await page.locator('.cn-nav [data-cn-screen="more"]').getAttribute('aria-current'),'page','More navigation should be highlighted for Projects');
  assert.equal(await page.locator('.cn-nav [data-cn-screen="enquiries"]').getAttribute('aria-current'),null);
  assert.equal(await page.locator('.cf-project-card').count(),2);
  assert.match((await page.locator('.cf-project-card').allTextContents()).join(' '),/Sample confirmed visit/);
  assert.match(await page.locator('.cn-stack').innerText(),/Sample confirmed visit/);
  await page.waitForTimeout(120);
  await page.screenshot({path:`${shots}/native-projects-${w}.png`,fullPage:false});
  await page.locator('.cn-nav [data-cn-screen="more"]').click();
  assert.equal(await page.locator('.cf-screen-top h1').innerText(),'Settings');
  assert.equal(await page.locator('.cf-settings-list button').count(),7);
  await page.locator('.cn-more-links [data-cn-screen="clients"]').click();
  assert.equal(await page.locator('.cn-stitch-title h1').innerText(),'Customers');
  assert.equal(await page.locator('.cn-stitch-customer').count(),2);
  await page.locator('.cn-nav [data-cn-screen="more"]').click();
  await page.locator('.cn-more-links [data-cn-screen="quotes"]').click();
  assert.equal(await page.locator('.cn-screen-heading h1').innerText(),'Quotes');
  assert.equal(await page.locator('.cn-record').count(),0,'Empty quotes directory should not fabricate saved quotes');
  assert.match((await page.locator('.cn-caption').allTextContents()).join(' '),/Sending remains a separate workflow/);
  await page.screenshot({path:`${shots}/native-quotes-${w}.png`,fullPage:false});
  await page.locator('.cn-nav [data-cn-screen="more"]').click();
  if(w<920){
   await page.evaluate(()=>document.querySelector('#colzoOwner').scrollTo({top:99999,behavior:'instant'}));
   const lower=await page.evaluate(()=>{const el=document.querySelector('#colzoOwner');return{top:el.scrollTop,max:el.scrollHeight-el.clientHeight,moreHeading:el.querySelector('.cf-tools-extra h2')?.getBoundingClientRect().top,signout:el.querySelector('.cf-signout')?.getBoundingClientRect().bottom}});
   assert.ok(lower.top>80&&Math.abs(lower.max-lower.top)<=2,`More must scroll fully: ${JSON.stringify(lower)}`);
   assert.ok(lower.moreHeading<h,`Bottom settings / tools should be reachable: ${JSON.stringify(lower)}`);
   await page.evaluate(()=>document.querySelector('#colzoOwner').scrollTo({top:0,behavior:'instant'}));
  }
  await page.screenshot({path:`${shots}/native-more-${w}.png`,fullPage:false});
  await page.locator('.cn-more-links [data-cn-screen="bookings"]').click();
  assert.equal(await page.locator('.cn-work-title-row h1').innerText(),'Bookings');
  assert.equal(await page.locator('#dashboardApp').isVisible(),false,'native Bookings never opens original UI');
  await page.locator('.cn-nav [data-cn-screen="more"]').click();
  await page.evaluate(()=>window.ColzoOwner.openLegacy('marketing'));
  assert.equal(await page.locator('#dashboardApp').isVisible(),true,'advanced Marketing remains accessible');
  assert.equal(await page.locator('#colzoOwner').isVisible(),false,'Colzo is hidden while editing legacy');
  assert.equal(await page.locator('#cnReturnToColzo').isVisible(),true);
  // The old owner features are still needed for billing, Marketing, AI and
  // integrations. Test the actual CSS bridge rather than only button navigation.
  const legacy=await page.evaluate(()=>{
   const css=e=>getComputedStyle(document.querySelector(e));
   const rect=e=>document.querySelector(e).getBoundingClientRect();
   const nav=rect('.bottom-nav'),back=rect('#cnReturnToColzo');
   return {bodyBg:css('body').backgroundColor,appBg:css('#dashboardApp').backgroundColor,
    cardBg:css('#dashboardApp .card').backgroundColor,cardBorder:css('#dashboardApp .card').borderTopColor,
    fieldBg:css('#dashboardApp .field input').backgroundColor,
    themeRule:[...document.styleSheets].some(x=>x.href?.includes('colzo-legacy-theme.css')),
    legacyVisible:css('#dashboardApp').display!=='none',
    backBottom:back.bottom,navTop:nav.top,backTop:back.top,
    scrollWidth:document.documentElement.scrollWidth,
    navVisible:css('.bottom-nav').display!=='none'};
  });
  assert.equal(legacy.bodyBg,'rgb(13, 17, 21)',JSON.stringify(legacy));
  assert.equal(legacy.appBg,'rgb(13, 17, 21)',JSON.stringify(legacy));
  assert.equal(legacy.cardBg,'rgb(32, 39, 45)',JSON.stringify(legacy));
  assert.equal(legacy.cardBorder,'rgb(54, 64, 71)',JSON.stringify(legacy));
  assert.equal(legacy.fieldBg,'rgb(36, 44, 51)',JSON.stringify(legacy));
  assert.equal(legacy.themeRule,true);
  assert.equal(legacy.legacyVisible,true);
  assert.ok(legacy.scrollWidth<=w+1,'Legacy screen overflows iPhone viewport');
  if(w<920&&legacy.navVisible)assert.ok(legacy.backBottom<=legacy.navTop-2,`Back button overlaps legacy navigation: ${JSON.stringify(legacy)}`);
  for(const view of ['marketing','settings','businessProfile']){
   await page.evaluate(view=>showView(view),view);
   assert.equal(await page.locator('#'+view+'View').isVisible(),true,`${view} must remain available in Colzo theme`);
   assert.equal(await page.locator('#colzoOwner').isVisible(),false);
   const style=await page.locator('#'+view+'View .card').first().evaluate(el=>({bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopColor})).catch(()=>null);
   if(style){assert.equal(style.bg,'rgb(32, 39, 45)');assert.equal(style.border,'rgb(54, 64, 71)');}
   if((view==='marketing'||view==='settings')&&(w===390||w===1366)){
    await page.screenshot({path:`${shots}/legacy-${view}-${w}.png`,fullPage:false});
   }
  }
  await page.locator('#cnReturnToColzo').click();
  assert.equal(await page.locator('#colzoOwner').isVisible(),true);
  const metrics=await page.evaluate(()=>{const r=document.querySelector('#colzoOwner').getBoundingClientRect();const nav=document.querySelector('.cn-nav').getBoundingClientRect();return{viewport:innerWidth,scroll:document.documentElement.scrollWidth,nav:{x:nav.x,y:nav.y,right:nav.right,bottom:nav.bottom,w:nav.width},rootW:r.width}});
  assert.ok(metrics.scroll<=w+1,`overflow ${w}: ${JSON.stringify(metrics)}`);
  if(w<920){assert.ok(metrics.nav.x>=0&&metrics.nav.right<=w+2&&metrics.nav.bottom<=h+2)}else assert.ok(metrics.nav.w>=190&&metrics.nav.w<=235);
  await page.evaluate(()=>window.ColzoOwner.onAuthState('auth-required'));
  assert.equal(await page.locator('#colzoOwner').isVisible(),false,'owner content hidden immediately at logout');
  assert.deepEqual(errors,[]);
  console.log(`${w}x${h}: PASS separate native Home, Enquiries/detail, Projects, Clients, Quotes, More, legacy switch, logout and viewport`);
  await ctx.close();
 }
}finally{await browser.close()}}
run().catch(e=>{console.error(e.stack||String(e));process.exitCode=1}).finally(()=>server.kill());
