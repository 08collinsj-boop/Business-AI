/* Colzo Bookings/Actions native owner browser UAT. Never touches customer data.
 * All GET, POST, PATCH requests are intercepted and stored in local fixtures. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const port=Number(process.env.COLZO_WORKFLOWS_QA_PORT||8802),base=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const sleep=n=>new Promise(r=>setTimeout(r,n));
const shots=process.env.COLZO_WORKFLOWS_SHOTS||'/tmp/colzo-workflows-qa';fs.mkdirSync(shots,{recursive:true});
const sdk='window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}}';
async function main(){await sleep(550);const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [width,height] of [[375,812],[390,844],[430,932],[1366,768],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500});
  const page=await context.newPage(),errors=[],calls=[];
  const db={bookings:[{id:21,title:'Customer survey',status:'confirmed',customer_name:'Test User',starts_at:'2026-10-16T09:00:00.000Z',ends_at:'2026-10-16T10:00:00.000Z',location:'Fixture Road',notes:'Test only',lead_id:null}],actions:[{id:31,title:'Call customer',status:'pending',action_type:'call_customer',priority:'high',due_at:'2026-10-18T11:00:00.000Z',description:'Review sample request',lead_id:null}],settings:{business_name:'Fixture Works'}};
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('request',r=>{const host=new URL(r.url()).hostname;if(!['127.0.0.1','cdn.jsdelivr.net'].includes(host))errors.push('Unexpected external request '+host)});
  await page.route('**/supabase-js@2*',r=>r.fulfill({status:200,contentType:'application/javascript',body:sdk}));
  await page.route('**/api/public-config',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frontendAuthEnabled:true,supabaseUrl:'https://fixture.invalid',supabaseAnonKey:'public-fixture'})}));
  for(const resource of ['bookings','actions'])await page.route(`**/api/${resource}`,async route=>{
    const req=route.request(),method=req.method();
    const body=['POST','PATCH'].includes(method)?req.postDataJSON():null;
    calls.push({resource,method,body});
    if(method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(db[resource])});
    if(method==='POST'){
      if(body?.title==='Reject fixture')return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Temporary fixture rejection"}'});
      if(!body?.title||body.id||body.business_id||body.status==='bad')return route.fulfill({status:400,contentType:'application/json',body:'{"error":"Invalid creation"}'});
      const newRecord={...body,id:resource==='bookings'?22:32,created_at:'2026-10-13T11:00:00.000Z'};db[resource].push(newRecord);
      return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(newRecord)});
    }
    if(method==='PATCH'){
      const found=db[resource].find(i=>String(i.id)===String(body.id));
      if(!found)return route.fulfill({status:404,contentType:'application/json',body:'{"error":"Missing record"}'});
      Object.assign(found,body);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(found)});
    }
    return route.fulfill({status:405,body:'Unsupported method'});
  });
  await page.route('**/api/**',r=>['/api/bookings','/api/actions','/api/public-config'].includes(new URL(r.request().url()).pathname)?r.fallback():r.fulfill({status:401,contentType:'application/json',body:'{"error":"Fixture only"}'}));
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.evaluate((fixture)=>{
    settings=fixture.settings;
    leads=[{id:41,name:'Prospective Client',job_type:'Repairs',status:'new',created_at:new Date().toISOString()}];
    bookings=[...fixture.bookings];businessActions=[...fixture.actions];
    supabaseClient={auth:{getSession:async()=>({data:{session:{access_token:'not-a-token'}}}),getUser:async()=>({data:{user:{id:'fixture-owner'}}})}};
    document.body.className='colzo-safe-shell colzo-interface auth-ready';window.ColzoOwner.onAuthState('auth-ready');
  },db);
  const owner=page.locator('#colzoOwner'),old=page.locator('#dashboardApp');
  // Home booking entry and More Bookings entry must be native.
  await page.locator('.cn-duo [data-cn-screen="bookings"]').click();
  assert.equal(await page.locator('.cn-work-title-row h1').innerText(),'Bookings');
  assert.equal(await owner.isVisible(),true);assert.equal(await old.isVisible(),false);
  assert.equal(await page.locator('.cn-work-record').count(),1);
  assert.equal(await page.locator('.cn-work-calendar .calendar-day').count(),31);
  if(width===390)await page.screenshot({path:`${shots}/bookings-${width}.png`,fullPage:false,animations:'disabled'});
  await page.locator('[data-cn-work-tab="Completed"]').click();assert.equal(await page.locator('.cn-work-record').count(),0);
  await page.locator('[data-cn-work-tab="All"]').click();assert.equal(await page.locator('.cn-work-record').count(),1);
  await page.locator('.cn-work-record [data-cn-work-edit],.cn-work-record[data-cn-work-edit]').first().click();
  assert.equal(await page.locator('#cnWorkDialogTitle').innerText(),'Edit booking');
  assert.equal(await page.locator('#cnWorkForm [name=title]').inputValue(),'Customer survey');
  await page.locator('#cnWorkForm [name=title]').fill('Updated site survey');
  await page.locator('#cnWorkForm [type=submit]').click();
  await page.waitForFunction(()=>!document.querySelector('#cnWorkForm'));
  assert.equal(calls.filter(c=>c.resource==='bookings'&&c.method==='PATCH').length,1);
  const changed=calls.find(c=>c.resource==='bookings'&&c.method==='PATCH').body;
  assert.equal(changed.id,21);assert.equal(changed.title,'Updated site survey');assert.equal(changed.business_id,undefined);
  await page.locator('[data-cn-work-new]').first().click();
  await page.locator('#cnWorkForm [name=title]').fill('New sample booking');
  await page.locator('#cnWorkForm [name=customer_name]').fill('Customer A');
  await page.locator('#cnWorkForm [name=starts_at]').fill('2026-10-20T09:00');
  await page.locator('#cnWorkForm [name=ends_at]').fill('2026-10-20T08:00');
  await page.locator('#cnWorkForm [type=submit]').click();
  assert.match(await page.locator('#cnWorkFormError').innerText(),/end time must be after/);
  assert.equal(await page.locator('#cnWorkForm [name=title]').inputValue(),'New sample booking','Invalid dates must not erase entered fields');
  assert.equal(calls.filter(c=>c.resource==='bookings'&&c.method==='POST').length,0,'Invalid dates must not trigger backend writes');
  await page.locator('#cnWorkForm [name=ends_at]').fill('2026-10-20T10:00');
  if(width===390){
    await page.locator('#cnWorkForm [name=title]').fill('Reject fixture');
    await page.locator('#cnWorkForm [type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('#cnWorkFormError')?.textContent?.includes('Temporary fixture rejection'));
    assert.equal(await page.locator('#cnWorkForm [name=title]').inputValue(),'Reject fixture','Failed API must preserve input');
    await page.locator('#cnWorkForm [name=title]').fill('New sample booking');
  }
  await page.keyboard.press('Control+k');
  assert.equal(await page.locator('#cnCommandSheet').isVisible(),false,'Tool finder cannot interrupt a live edit');
  await page.locator('#cnWorkForm [type=submit]').click();
  await page.waitForFunction(()=>!document.querySelector('#cnWorkForm'));
  assert.equal(calls.filter(c=>c.resource==='bookings'&&c.method==='POST'&&c.body?.title!=='Reject fixture').length,1);
  assert.equal(db.bookings.length,2);
  await page.locator('[data-cn-work-refresh]').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.cn-work-record')].some(el=>el.textContent.includes('sample booking')));
  // Native operations should remain accessible from Projects/More.
  await page.locator('.cn-nav [data-cn-screen="projects"]').click();
  await page.locator('.cf-project-card').first().click();
  assert.ok(['Bookings','Actions'].includes(await page.locator('.cn-work-title-row h1').innerText()));
  await page.locator('.cn-nav [data-cn-screen="more"]').click();
  await page.locator('[data-cn-screen="actions"]').first().click();
  assert.equal(await page.locator('.cn-work-title-row h1').innerText(),'Actions');
  assert.equal(await owner.isVisible(),true);assert.equal(await old.isVisible(),false);
  assert.equal(await page.locator('.cn-work-record').count(),1);
  if(width===390)await page.screenshot({path:`${shots}/actions-${width}.png`,fullPage:false,animations:'disabled'});
  await page.locator('[data-cn-work-new]').first().click();
  await page.locator('#cnWorkForm [name=title]').fill('Respond to fixture');
  await page.locator('#cnWorkForm [name=priority]').selectOption('high');
  await page.locator('#cnWorkForm [type=submit]').click();
  await page.waitForFunction(()=>!document.querySelector('#cnWorkForm'));
  assert.equal(calls.filter(c=>c.resource==='actions'&&c.method==='POST').length,1);
  await page.locator('[data-cn-work-tab="All"]').click();
  assert.equal(await page.locator('.cn-work-record').count(),2);
  await page.locator('.cn-work-record[data-cn-work-edit="31"]').click();
  const dialogFocused=await page.locator('#cnWorkForm [name=title]').evaluate(el=>document.activeElement===el);
  assert.equal(dialogFocused,true,'Dialog focuses first editable field');
  await page.locator('#cnWorkForm [name=status]').selectOption('completed');
  await page.locator('#cnWorkForm [type=submit]').click();
  await page.waitForFunction(()=>!document.querySelector('#cnWorkForm'));
  const actionPatch=calls.find(c=>c.resource==='actions'&&c.method==='PATCH');
  assert.equal(actionPatch.body.id,31);assert.equal(actionPatch.body.status,'completed');
  assert.equal(actionPatch.body.business_id,undefined);
  await page.locator('.cn-nav [data-cn-screen="more"]').click();
  await page.locator('#cnContent [data-cn-command]').first().click();
  await page.locator('#cnCommandSearch').fill('Bookings');
  await page.locator('#cnCommandResults [data-cn-screen=bookings]').click();
  assert.equal(await page.locator('.cn-work-title-row h1').innerText(),'Bookings');
  assert.equal(await old.isVisible(),false);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth);
  assert.ok(overflow<=width+1,`Unexpected horizontal overflow ${overflow} > ${width}`);
  assert.deepEqual(errors,[]);
  console.log(`${width}x${height}: PASS native Bookings/Actions lists, calendar, create/edit/status, Projects/Home/More/command navigation, 0 legacy redirects, 0 live API calls`);
  await context.close();
 }
}finally{await browser.close()}}
main().catch(err=>{console.error(err.stack||String(err));process.exitCode=1}).finally(()=>server.kill());
