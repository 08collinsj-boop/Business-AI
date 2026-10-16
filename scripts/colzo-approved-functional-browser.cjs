/* Browser QA for accepted Colzo customer profile / add/edit, quotes, projects.
 * Synthetic auth and API only. Real customer data and network never accessed.
 */
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const assert=require('node:assert/strict');
const net=require('node:net');
const path=require('node:path');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const port=()=>new Promise((ok,bad)=>{let s=net.createServer();s.once('error',bad);s.listen(0,'127.0.0.1',()=>{let p=s.address().port;s.close(()=>ok(p))})});
const id='11111111-1111-4111-8111-111111111111';
const lead='101';
const updates=[];
(async()=>{
 const p=await port();const base='http://127.0.0.1:'+p;
 const server=spawn('python3',['-m','http.server',String(p),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore',detached:true});
 let browser;
 try{
  await wait(600);browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const [w,h] of [[375,812],[390,844],[430,932],[1366,768]]){
   const ctx=await browser.newContext({viewport:{width:w,height:h},isMobile:w<600,hasTouch:w<600,serviceWorkers:'block'});
   const page=await ctx.newPage();const errors=[];
   let records={clients:[{id,full_name:'Alex Example',email:'alex@example.test',phone:'07700900111',notes:'Follow up about plans.',created_at:'2026-10-11T12:00:00Z',updated_at:'2026-10-12T12:00:00Z'}],quotes:[{id:'22222222-2222-4222-8222-222222222222',title:'Example quote',lead_id:lead,amount_gbp:950,notes:'Site visit estimate',status:'draft',created_at:'2026-10-12T12:00:00Z'}],projects:[{id:'33333333-3333-4333-8333-333333333333',title:'Example project',client_name:'Alex Example',status:'active',progress:35,notes:'Initial scope approved',created_at:'2026-10-12T12:00:00Z'}]};
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{const host=new URL(r.url()).hostname;if(!['127.0.0.1','cdn.jsdelivr.net'].includes(host))errors.push('Unexpected host '+host)});
   const sdk='window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}}';
   await page.route('**/supabase-js@2*',r=>r.fulfill({status:200,contentType:'application/javascript',body:sdk}));
   await page.route('**/api/public-config',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frontendAuthEnabled:true,supabaseUrl:'https://fake-fixture.invalid',supabaseAnonKey:'fake-only'})}));
   await page.route('**/api/colzo-records*',async r=>{
    const u=new URL(r.request().url());const res=u.searchParams.get('resource');
    if(!Object.hasOwn(records,res))return r.fulfill({status:400,contentType:'application/json',body:'{}'});
    if(r.request().method()==='GET')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(records[res])});
    let data=JSON.parse(r.request().postData());
    updates.push({resource:res,method:r.request().method(),body:data});
    if(r.request().method()==='PATCH'){
     let original=records[res].find(x=>x.id===u.searchParams.get('id'));assert.ok(original,'Fixture edit ID');
     Object.assign(original,data,{updated_at:'2026-10-16T12:00:00Z'});
     return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(original)});
    }
    const created={...data,id:'44444444-4444-4444-8444-444444444444',created_at:'2026-10-16T12:00:00Z',updated_at:'2026-10-16T12:00:00Z'};
    records[res].push(created);
    return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(created)});
   });
   await page.route('**/api/**',r=>new URL(r.request().url()).pathname==='/api/colzo-records'?r.fallback():r.fulfill({status:401,contentType:'application/json',body:'{"error":"synthetic only"}'}));
   await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:20000});
   await page.evaluate(()=>{
    leads=[{id:101,name:'Alex Example',email:'alex@example.test',phone:'07700900111',job_type:'Site inspection',created_at:'2026-10-11T09:00:00Z',description:'Please quote for a visit',status:'New'}];
    bookings=[];businessActions=[];settings={business_name:'Local QA Business'};
    document.body.className='auth-ready colzo-interface colzo-safe-shell';
    window.ColzoOwner.onAuthState('auth-ready');
    window.ColzoOwner.render();
   });
   await page.locator('#colzoOwner button[data-cn-screen="clients"]').first().click();
   await page.locator('.cn-stitch-customer[data-colzo-detail="clients"]').first().waitFor({timeout:9000});
   await page.locator('.cn-stitch-customer[data-colzo-detail="clients"]').first().click();
   await page.locator('.cn-approved-profile').waitFor();
   assert.equal(await page.locator('.cn-approved-profile h1').innerText(),'Alex Example');
   assert.match(await page.locator('.cn-approved-info-card').nth(1).innerText(),/Site inspection/);
   await page.locator('[data-cn-client-profile-tab="activity"]').click();
   assert.match(await page.locator('.cn-approved-info-card').innerText(),/RECORDED ACTIVITY/);
   await page.locator('[data-cn-client-profile-tab="overview"]').click();
   await page.locator('.cn-approved-text-action[data-colzo-edit="clients"]').click();
   await page.locator('.cn-approved-client-form').waitFor();
   await page.locator('#cnColzoForm [name="notes"]').fill('Updated internal note');
   await page.locator('#cnColzoForm button[type=submit]').click();
   await page.locator('#colzoOwner .cn-work-message', {hasText:'Changes saved.'}).waitFor({timeout:10000});
   assert.equal(updates.at(-1).method,'PATCH');
   assert.equal(updates.at(-1).body.expected_updated_at,'2026-10-12T12:00:00Z');
   await page.locator('[data-colzo-create="clients"]').first().click();
   await page.locator('#cnColzoForm [name="full_name"]').fill('Taylor Sample');
   await page.locator('#cnColzoForm [name="email"]').fill('taylor@example.test');
   await page.locator('#cnColzoForm button[type=submit]').click();
   await page.locator('.cn-stitch-customer', {hasText:'Taylor Sample'}).waitFor({timeout:10000});
   assert.equal(updates.at(-1).method,'POST');
   await page.locator('#colzoOwner .cn-nav button[data-cn-screen="more"]').click();
   await page.locator('#colzoOwner [data-cn-screen="quotes"]').first().click();
   await page.locator('.cn-approved-quotes .cn-record').first().waitFor({timeout:9000});
   assert.match(await page.locator('.cn-approved-quotes').innerText(),/Sending remains a separate workflow/);
   await page.locator('#colzoOwner .cn-nav button[data-cn-screen="more"]').click();
   await page.locator('#colzoOwner [data-cn-screen="projects"]').first().click();
   await page.locator('.cn-approved-projects .cf-project-card').first().waitFor({timeout:9000});
   const visual=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewWidth:innerWidth,card:getComputedStyle(document.querySelector('.cn-approved-projects .cf-project-card')).backgroundColor}));
   assert.ok(visual.scrollWidth<=visual.viewWidth+2,'Horizontal overflow '+w+' '+JSON.stringify(visual));
   assert.equal(visual.card,'rgb(23, 32, 41)');
   assert.deepEqual(errors,[]);
   console.log('PASS '+w+'x'+h+' saved customer profile/activity+PATCH/POST, quotes/projects, scoped graphite, no overflow');
   await ctx.close();
  }
 }finally{if(browser)await browser.close();try{process.kill(-server.pid,'SIGTERM')}catch{server.kill()}}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
