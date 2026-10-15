/* Real Chromium acceptance of Colzo's app-like motion/navigation/shortcuts.
   All authentication and records are synthetic. No real data or API mutation. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const port=Number(process.env.COLZO_MOTION_QA_PORT||8799);
const origin=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const sleep=n=>new Promise(resolve=>setTimeout(resolve,n));
const dir=process.env.COLZO_MOTION_SHOTS||'/tmp/colzo-motion-qa';fs.mkdirSync(dir,{recursive:true});
const sdk='window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}}';
async function main(){await sleep(550);const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [width,height] of [[375,812],[390,844],[430,932],[1366,768],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('request',r=>{const host=new URL(r.url()).hostname;if(!['127.0.0.1','cdn.jsdelivr.net'].includes(host))errors.push(`Unexpected request ${host}`)});
  await page.route('**/supabase-js@2*',r=>r.fulfill({status:200,contentType:'application/javascript',body:sdk}));
  await page.route('**/colzo-backend/public-config',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frontendAuthEnabled:true,supabaseUrl:'https://fake-qa.supabase.invalid',supabaseAnonKey:'public-test-key'})}));
  await page.route('**/api/colzo-records*',async route=>{
    const resource=new URL(route.request().url()).searchParams.get('resource');
    const rows=resource==='projects'?[{id:'project-qa-1',title:'Inspection project',client_name:'Fixture Customer',status:'active',progress:35,created_at:'2026-10-12'},{id:'project-qa-2',title:'Maintenance project',client_name:'Second Fixture',status:'planned',progress:10,created_at:'2026-10-13'}]:[];
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows)});
  });
  await page.route('**/colzo-backend/**',r=>new URL(r.request().url()).pathname==='/api/colzo-records'?r.fallback():r.fulfill({status:401,contentType:'application/json',body:'{"error":"not real"}'}));
  await page.goto(origin+'/',{waitUntil:'networkidle'});
  await page.evaluate(()=>{
    const now=new Date().toISOString();
    leads=[{id:'fixture-1',name:'Fixture Customer',job_type:'Electrical installation',status:'New',created_at:now},{id:'fixture-2',name:'Second Fixture',job_type:'Maintenance',status:'Contacted',created_at:now},{id:'fixture-3',name:'Third Fixture',job_type:'Repairs',status:'Won',created_at:now}];
    bookings=[{id:'fixture-4',title:'Inspection appointment',status:'confirmed',created_at:now}];
    businessActions=[{id:'fixture-5',title:'Review enquiry',status:'pending',created_at:now}];
    settings={business_name:'Example Electrical'};
    document.body.className='colzo-safe-shell colzo-interface auth-ready';
    window.ColzoOwner.onAuthState('auth-ready');
  });
  if(width<920)await page.addStyleTag({content:'body.auth-ready{height:100dvh;overflow:hidden}body.colzo-owner-enabled.auth-ready:not(.colzo-legacy-mode) #colzoOwner{height:100dvh;overflow-y:auto;overflow-x:hidden}'});
  const nav=page.locator('.cn-nav'),root=page.locator('#colzoOwner'),panel=page.locator('#cnContent');
  assert.equal(await page.locator('.cn-navicon svg').count(),5,'Five crisp SVG navigation icons');
  assert.equal(await root.evaluate(el=>el.style.getPropertyValue('--cn-active-index')),'0');
  await page.screenshot({path:`${dir}/home-${width}.png`,fullPage:false});
  if(width<920){
    await root.evaluate(el=>el.scrollTo({top:160,behavior:'instant'}));
    assert.ok(await root.evaluate(el=>el.scrollTop)>=150,'Owner content scrolls independently');
  }
  await nav.locator('[data-cn-screen="enquiries"]').click();
  assert.equal(await root.evaluate(el=>el.style.getPropertyValue('--cn-active-index')),'1');
  assert.equal(await page.locator('.cf-lead-card').count(),3);
  await page.locator('.cf-tabs [data-cn-filter="New"]').click();
  assert.equal(await page.locator('.cf-lead-card').count(),1);
  await page.locator('#cnSearch').fill('Fixture');
  assert.equal(await page.locator('.cf-lead-card').count(),1);
  assert.equal(await page.locator('#cnSearch').inputValue(),'Fixture');
  await page.screenshot({path:`${dir}/enquiries-${width}.png`,fullPage:false,animations:'disabled'});
  await nav.locator('[data-cn-screen="more"]').click();
  await page.locator('.cn-more-links [data-cn-screen="projects"]').click();
  assert.equal(await root.evaluate(el=>el.style.getPropertyValue('--cn-active-index')),'4');
  assert.equal(await page.locator('.cf-project-card').count(),2);
  assert.equal(await page.locator('#cnProjectSearch').isVisible(),true,'Native project search is available');
  await page.locator('#cnProjectSearch').fill('Inspection');
  assert.equal(await page.locator('.cf-project-card').count(),1,'Project search filters only the local authenticated records');
  assert.match(await page.locator('.cf-project-card').first().innerText(),/Inspection/);
  await page.locator('#cnProjectSearch').fill('');
  assert.equal(await page.locator('.cf-project-card').count(),2);
  await page.screenshot({path:`${dir}/projects-${width}.png`,fullPage:false,animations:'disabled'});
  await nav.locator('[data-cn-screen="more"]').click();
  assert.equal(await root.evaluate(el=>el.style.getPropertyValue('--cn-active-index')),'4');
  assert.equal(await page.locator('.cf-settings-list button').count(),7);
  await page.screenshot({path:`${dir}/settings-${width}.png`,fullPage:false,animations:'disabled'});
  await nav.locator('[data-cn-screen="home"]').click();
  assert.equal(await root.evaluate(el=>el.style.getPropertyValue('--cn-active-index')),'0');
  if(width<920)assert.ok(await root.evaluate(el=>el.scrollTop)>90,'Home scroll position remembered when switching tabs');
  await page.keyboard.press('Control+k');
  assert.equal(await page.locator('#cnCommandSheet').isVisible(),true,'Command panel opens from Ctrl+K');
  assert.equal(await page.locator('#cnCommandSearch').evaluate(el=>document.activeElement===el),true,'Search field focused');
  // Command is a real accessible dialog, not just a decorative search box.
  assert.equal(await page.locator('#cnCommandSheet .cn-command-panel').getAttribute('aria-modal'),'true');
  assert.equal(await page.locator('#cnCommandTitle').innerText(),'Where would you like to go?');
  await page.locator('#cnCommandSearch').fill('marketing');
  assert.equal(await page.locator('#cnCommandResults button').count(),1);
  assert.match(await page.locator('#cnCommandResults').innerText(),/Marketing/);
  await page.screenshot({path:`${dir}/tool-finder-${width}.png`,fullPage:false,animations:'disabled'});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#cnCommandSheet').isVisible(),false,'Escape closes tool finder');
  await page.keyboard.press('Control+k');
  await page.locator('#cnCommandSearch').fill('clients');
  await page.locator('#cnCommandResults button').click();
  assert.equal(await page.locator('#cnCommandSheet').isVisible(),false);
  assert.equal(await page.locator('.cn-stitch-title h1').innerText(),'Customers');
  assert.equal(await root.evaluate(el=>el.style.getPropertyValue('--cn-active-index')),'3');
  await page.keyboard.press('Control+k');
  await page.locator('#cnCommandSearch').fill('actions');
  await page.locator('#cnCommandResults button[data-cn-screen="actions"]').click();
  assert.equal(await page.locator('.cn-work-title-row h1').innerText(),'Actions');
  assert.equal(await page.locator('#dashboardApp').isVisible(),false,'Native Actions never shows Business AI');
  await nav.locator('[data-cn-screen="more"]').click();
  await page.evaluate(()=>window.ColzoOwner.openLegacy('marketing'));
  assert.equal(await page.locator('#dashboardApp').isVisible(),true,'Advanced Marketing legacy tools still accessible');
  assert.equal(await page.locator('#cnCommandSheet').isVisible(),false);
  await page.locator('#cnReturnToColzo').click();
  assert.equal(await page.locator('#colzoOwner').isVisible(),true);
  // Required authenticator challenge must take precedence over all Colzo shortcuts.
  await page.evaluate(()=>document.body.classList.add('security-mfa-required'));
  await page.keyboard.press('Control+k');
  assert.equal(await page.locator('#cnCommandSheet').isVisible(),false,'Do not open tool finder over mandatory MFA');
  await page.evaluate(()=>document.body.classList.remove('security-mfa-required'));
  // Reduced-motion system preferences override all JS and CSS transitions.
  await page.emulateMedia({reducedMotion:'reduce'});
  await nav.locator('[data-cn-screen="enquiries"]').click();
  const motions=await page.evaluate(()=>({newAnimations:[...document.querySelector('#cnContent').getAnimations({subtree:true})].filter(a=>a.playState==='running'&&a.effect?.getTiming().duration!==0).length,navTransition:getComputedStyle(document.querySelector('.cn-nav'),'::before').transitionDuration}));
  assert.equal(motions.newAnimations,0,`Reduced motion must not run animations: ${JSON.stringify(motions)}`);
  assert.equal(motions.navTransition,'0s',`Moving nav plate must stop under reduced motion: ${JSON.stringify(motions)}`);
  await page.evaluate(()=>window.ColzoOwner.onAuthState('auth-required'));
  assert.equal(await page.locator('#colzoOwner').isVisible(),false);
  assert.equal(await page.locator('#cnScreenAnnounce').innerText(),'','Private screen announcements should be cleared at logout');
  await page.keyboard.press('Control+k');
  assert.equal(await page.locator('#cnCommandSheet').isVisible(),false,'No shortcut opens private screens after sign-out');
  assert.deepEqual(errors,[]);
  console.log(`${width}x${height}: PASS fluid nav, filters, real counts, scroll memory, tool finder, shortcuts, legacy return, reduced motion and logout`);
  await context.close();
 }
}finally{await browser.close()}}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1}).finally(()=>server.kill());
