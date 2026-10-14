/* Real Chromium QA for all seven Colzo native Settings sections. API uses
 * synthetic session and fixture response handlers. No actual account writes. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const port=Number(process.env.COLZO_SETTINGS_QA_PORT||8801);
const base=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const sleep=n=>new Promise(r=>setTimeout(r,n));
const dir=process.env.COLZO_SETTINGS_SHOTS||'/tmp/colzo-settings-qa';fs.mkdirSync(dir,{recursive:true});
const sdk='window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}}';
async function main(){await sleep(650);const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [width,height] of [[375,812],[390,844],[430,932],[1366,768],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500});const page=await context.newPage();const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('request',r=>{const h=new URL(r.url()).hostname;if(!['127.0.0.1','cdn.jsdelivr.net'].includes(h))errors.push('External request '+h)});
  await page.route('**/supabase-js@2*',r=>r.fulfill({status:200,contentType:'application/javascript',body:sdk}));
  await page.route('**/colzo-backend/public-config',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frontendAuthEnabled:true,supabaseUrl:'https://synthetic-qa.invalid',supabaseAnonKey:'mock-public'})}));
  const dbSettings={business_name:'Fixture Electrical',business_type:'Electrician',phone:'01642111222',email:'fixture@example.invalid',address:'Fixture Lane'};
  await page.route('**/colzo-backend/settings',async route=>{const req=route.request();requests.push({path:'/api/settings',method:req.method(),body:req.postDataJSON?.()});if(req.method()==='PATCH')Object.assign(dbSettings,req.postDataJSON?.()||{});await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(dbSettings)})});
  await page.route('**/colzo-backend/team',async route=>{const req=route.request();requests.push({path:'/api/team',method:req.method(),body:req.postDataJSON?.()});const body=req.method()==='POST'?{accept_path:'/invite?token=fixture-only'}:{members:[{role:'owner',created_at:'2026-10-01'}],invitations:[]};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})});
  await page.route('**/colzo-backend/**',r=>{if(['/colzo-backend/settings','/colzo-backend/team','/colzo-backend/public-config'].includes(new URL(r.request().url()).pathname))return r.fallback();return r.fulfill({status:401,contentType:'application/json',body:'{"error":"Not real"}'})});
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   settings={business_name:'Fixture Electrical',business_type:'Electrician',phone:'01642111222',email:'fixture@example.invalid',address:'Fixture Lane'};
   leads=[{id:'fixture1',name:'Example Customer',status:'new'}];bookings=[];businessActions=[];
   supabaseClient={auth:{getSession:async()=>({data:{session:{access_token:'not-a-real-token'}}}),getUser:async()=>({data:{user:{id:'fixture-owner'}}})}};
   document.body.className='colzo-safe-shell colzo-interface auth-ready';window.ColzoOwner.onAuthState('auth-ready');
  });
  const names={profile:'Business profile',team:'Team members',integrations:'Integrations',notifications:'Notifications',appearance:'Appearance',security:'Security',help:'Help & support'};
  await page.locator('.cn-nav [data-cn-screen="more"]').click();
  assert.equal(await page.locator('.cf-settings-list button').count(),7);
  for(const [key,heading] of Object.entries(names)){
   await page.locator(`.cf-settings-list [data-cn-setting="${key}"]`).click();
   assert.equal(await page.locator('.cn-settings-detail-head h1').innerText(),heading);
   assert.equal(await page.locator('#colzoOwner').isVisible(),true,`${heading}: must remain inside Colzo`);
   assert.equal(await page.locator('#dashboardApp').isVisible(),false,`${heading}: original Business AI workspace must remain hidden`);
   assert.equal(await page.locator('#cnReturnToColzo').isVisible(),false,`${heading}: no redirect back button should appear`);
   assert.equal(await page.locator('.cn-nav [data-cn-screen="more"]').getAttribute('aria-current'),'page');
   if(key==='profile'){
    assert.equal(await page.locator('#cn-setting-business_name').inputValue(),'Fixture Electrical');
    if(width===390){
     await page.locator('#cn-setting-business_name').fill('Updated Fixtures');
     await page.locator('#cnBusinessSettings button[type="submit"]').click();
     await page.waitForFunction(()=>document.querySelector('#cnBusinessFeedback')?.textContent?.includes('saved successfully'));
     assert.equal(requests.filter(r=>r.path==='/api/settings'&&r.method==='PATCH').length,1);
     const patch=requests.find(r=>r.path==='/api/settings'&&r.method==='PATCH').body;
     assert.equal(patch.business_name,'Updated Fixtures');
     assert.deepEqual(Object.keys(patch).sort(),['address','business_name','business_type','email','phone'].sort(),'Native save must patch only explicitly edited fields');
    }
   }
   if(key==='team'){
    await page.waitForFunction(()=>document.querySelector('.cn-settings-member')!==null||document.querySelector('.cn-settings-error')!==null);
    assert.match(await page.locator('.cn-settings-panels').innerText(),/team/i);
    if(width===390){
     await page.locator('#cnInviteEmail').fill('teammate@example.invalid');
     await page.locator('#cnInviteRole').selectOption('member');
     await page.locator('#cnInviteTeam button[type="submit"]').click();
     await page.waitForFunction(()=>document.querySelector('#cnInviteFeedback')?.textContent?.includes('Invitation created'));
     assert.equal(requests.filter(r=>r.path==='/api/team'&&r.method==='POST').length,1);
     assert.equal(requests.find(r=>r.path==='/api/team'&&r.method==='POST').body.email,'teammate@example.invalid');
    }
   }
   if(key==='appearance'){
    await page.locator('#cnCompactCards').check();
    assert.equal(await page.locator('#colzoOwner').evaluate(el=>el.classList.contains('cn-compact-cards')),true);
    await page.locator('#cnQuietMotion').check();
    assert.equal(await page.locator('#colzoOwner').evaluate(el=>el.classList.contains('cn-quiet-motion')),true);
   }
   if(key==='security')assert.match(await page.locator('.cn-settings-panel').last().innerText(),/Account security centre/);
   if(width===390)await page.screenshot({path:`${dir}/${key}-390.png`,fullPage:false,animations:'disabled'});
   await page.locator('[data-cn-back-settings]').click();
   assert.equal(await page.locator('.cf-settings-title h1').innerText(),'Settings');
  }
  if(width===390){
   await page.locator('.cf-settings-list [data-cn-setting="profile"]').click();
   assert.equal(await page.locator('#cn-setting-business_name').inputValue(),'Updated Fixtures','Saved business details should still be returned when the profile screen is reopened');
   await page.locator('[data-cn-back-settings]').click();
  }
  const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,nav:document.querySelector('.cn-nav').getBoundingClientRect().toJSON()}));
  assert.ok(layout.scrollWidth<=width+1,`No horizontal overflow: ${JSON.stringify(layout)}`);
  await page.evaluate(()=>window.ColzoOwner.onAuthState('auth-required'));
  assert.equal(await page.locator('#colzoOwner').isVisible(),false);
  assert.equal(await page.locator('#colzoOwner').evaluate(el=>el.classList.contains('cn-compact-cards')),false,'UI preferences reset at sign-out');
  assert.deepEqual(errors,[]);
  console.log(`${width}x${height}: PASS all seven native settings, back navigation, auth isolation, ${width===390?'explicit authenticated API fixture writes, ':''}appearance and logout`);
  await context.close();
 }
}finally{await browser.close()}}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1}).finally(()=>server.kill());
