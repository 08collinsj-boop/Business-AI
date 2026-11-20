/* Actual Colzo DOM/CSS in Chromium with fictional local API fixtures only.
 * VisualViewport changes simulate keyboard geometry, never physical iPhone QA. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sourceRoot=path.resolve(process.env.COLZO_MOBILE_SOURCE_ROOT||path.join(__dirname,'..'));
const port=Number(process.env.COLZO_IPHONE_QA_PORT||8812),base=`http://127.0.0.1:${port}`;
const shots=process.env.COLZO_IPHONE_SHOTS||'/tmp/colzo-iphone-layout';
fs.mkdirSync(shots,{recursive:true});
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:sourceRoot,stdio:'ignore'});
const sdk='window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}}';
async function main(){
 await new Promise(r=>setTimeout(r,500));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[375,812],[390,844],[430,932],[1366,768],[1440,900]]){
   const mobile=width<500;
   const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
   const page=await context.newPage(),errors=[],writes=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const req=route.request(),u=new URL(req.url());
    if(u.hostname==='cdn.jsdelivr.net'&&u.pathname.includes('supabase-js'))return route.fulfill({status:200,contentType:'text/javascript',body:sdk});
    if(u.hostname!=='127.0.0.1'){errors.push('Unexpected external destination');return route.abort();}
    if(!u.pathname.startsWith('/api/'))return route.continue();
    if(req.method()!=='GET'){writes.push(u.pathname);return route.fulfill({status:403,contentType:'application/json',body:'{"error":"Read-only fixture"}'});}
    let data=[];
    if(u.pathname==='/api/public-config')data={frontendAuthEnabled:true,supabaseUrl:'https://fixture.invalid',supabaseAnonKey:'fictional-public'};
    if(u.pathname==='/api/clickup')data={configured:false,connected:false,provider:'clickup',workspace:null};
    if(u.pathname==='/api/team')data={members:[{role:'owner'}],invitations:[]};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   });
   await page.goto(base,{waitUntil:'networkidle'});
   await page.evaluate(()=>{
    settings={business_name:'Fictional mobile QA'};
    leads=[{id:41,name:'Fictional unusually long customer name '.repeat(5),job_type:'Synthetic inspection',status:'New',created_at:new Date().toISOString()}];
    bookings=[];businessActions=[];
    supabaseClient={auth:{getSession:async()=>({data:{session:{access_token:'fictional-not-issued-token'}}}),getUser:async()=>({data:{user:{id:'fictional-owner'}}})}};
    document.body.className='colzo-safe-shell colzo-interface auth-ready';
    window.ColzoOwner.dashboardLoaded();window.ColzoOwner.onAuthState('auth-ready');
   });
   const nav=screen=>page.locator('.cn-nav > button[data-cn-screen="'+screen+'"]');
   const noOverflow=async label=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' horizontal overflow');
   await noOverflow('Overview');
   if(mobile){
    // Exercise the existing Safari-only source scroll rule in Chromium, as in
    // the native suite. Chromium does not match -webkit-touch-callout itself.
    const nativeCss=fs.readFileSync(path.join(sourceRoot,'assets/colzo-native.css'),'utf8');
    const safariRule=nativeCss.match(/@supports\s*\(-webkit-touch-callout:\s*none\)\s*\{\s*body\.colzo-owner-enabled\.auth-ready:not\(\.colzo-legacy-mode\) #colzoOwner\s*\{([^}]+)\}/);
    assert.ok(safariRule);
    await page.addStyleTag({content:`body.auth-ready{height:100dvh;min-height:100dvh;padding-bottom:0;overflow:hidden}body.colzo-owner-enabled.auth-ready:not(.colzo-legacy-mode) #colzoOwner{${safariRule[1]}}`});
    await page.evaluate(()=>document.querySelector('#colzoOwner').scrollTo(0,99999));
    const clearance=await page.evaluate(()=>({last:document.querySelector('.cn-duo button:last-child').getBoundingClientRect().bottom,nav:document.querySelector('.cn-nav').getBoundingClientRect().top}));
    assert.ok(clearance.last<=clearance.nav,`Last shortcut must scroll clear of bottom navigation: ${JSON.stringify(clearance)}`);
   }
   await page.screenshot({path:path.join(shots,`home-${width}.png`),fullPage:false});
   await nav('enquiries').click();
   await page.locator('[data-cn-create-lead]').first().click();
   const buttons=await page.locator('#cnLeadForm .cn-form-actions button').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,right:r.right,top:r.top,bottom:r.bottom,height:r.height};}));
   assert.equal(buttons.length,2);
   for(const b of buttons)assert.ok(b.x>=0&&b.right<=width+1,'Enquiry action must fit width');
   if(mobile){assert.ok(buttons[1].top>=buttons[0].bottom,'Enquiry actions must stack');assert.ok(buttons.every(b=>b.height>=44));}
   await page.locator('#cnLeadForm .cn-form-actions button:last-child').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(shots,`enquiry-${width}.png`),fullPage:false});
   await page.locator('[data-cn-lead-cancel]').click();
   await nav('bookings').click();await page.locator('[data-cn-work-new]').first().click();
   const focus=mobile?'#cnWorkDialogTitle':'#cnWorkForm [name=title]';
   assert.ok(await page.locator(focus).evaluate(e=>e===document.activeElement),'Initial modal focus');
   const dateBoxes=await page.locator('#cnWorkForm [name=starts_at],#cnWorkForm [name=ends_at]').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,top:r.top,bottom:r.bottom,right:r.right};}));
   if(mobile)assert.ok(dateBoxes[1].top>=dateBoxes[0].bottom,'Phone date fields must be single column');
   await page.screenshot({path:path.join(shots,`booking-closed-keyboard-${width}.png`),fullPage:false});
   if(mobile){
    // Keep the layout viewport unchanged, like iOS. Only the visual viewport shrinks.
    await page.evaluate(()=>{
     const vv=new EventTarget();vv.height=360;vv.offsetTop=35;
     Object.defineProperty(window,'visualViewport',{configurable:true,value:vv});
     vv.dispatchEvent(new Event('resize'));
    });
    await page.locator('#cnWorkForm [name=title]').focus();
    await page.waitForFunction(()=>document.querySelector('.cn-work-dialog-backdrop').style.getPropertyValue('--cn-work-visible-height')==='360px');
    const fit=await page.locator('.cn-work-dialog').evaluate(e=>{const r=e.getBoundingClientRect();const f=e.querySelector('form');return{top:r.top,bottom:r.bottom,scroll:f.scrollHeight,client:f.clientHeight};});
    assert.ok(fit.top>=34&&fit.bottom<=396,`Sheet must fit visual viewport: ${JSON.stringify(fit)}`);
    assert.ok(fit.scroll>fit.client+100&&fit.client>0,'Booking form must independently scroll');
    await page.locator('#cnWorkForm').evaluate(f=>f.scrollTop=f.scrollHeight);
    const submit=await page.locator('#cnWorkForm [type=submit]').boundingBox();
    assert.ok(submit.y>=35&&submit.y+submit.height<=396,'Submit reachable above simulated keyboard');
    await page.screenshot({path:path.join(shots,`booking-simulated-keyboard-${width}.png`),fullPage:false});
    await page.evaluate(h=>{visualViewport.height=h;visualViewport.offsetTop=0;visualViewport.dispatchEvent(new Event('resize'));},height);
   }
   await page.locator('#cnWorkForm [name=title]').press('Escape');
   await page.waitForSelector('.cn-work-dialog',{state:'detached'});
   assert.ok(await page.locator('[data-cn-work-new]').first().evaluate(e=>e===document.activeElement),'Close restores opener focus');
   if(mobile){await nav('more').click();await page.locator('#cnContent [data-cn-screen="clickup"]').click();}
   else await page.locator('.cn-desktop-nav-extra [data-cn-screen="clickup"]').click();
   await page.waitForFunction(()=>document.querySelector('.cn-workhub-provider-status')?.textContent==='Setup unavailable');
   assert.equal(await page.locator('.cn-clickup-heading h1').innerText(),'Work Hub');
   assert.doesNotMatch(await page.locator('.cn-clickup-heading').innerText(),/first supported|starting with ClickUp/);
   assert.equal(await page.locator('.cn-workhub-provider').count(),1);
   assert.equal(await page.locator('[data-clickup-connect]').isEnabled(),false);
   await noOverflow('Work Hub');
   await page.screenshot({path:path.join(shots,`workhub-${width}.png`),fullPage:false});
   assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
   console.log(`${width}x${height}: PASS real rendered forms, navigation clearance, neutral hub, focus and ${mobile?'SIMULATED keyboard geometry':'desktop regression'}; fictional fixtures only`);
   await context.close();
  }
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(()=>server.kill());
