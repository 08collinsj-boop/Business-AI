/* Offline legal and recovery screen QA. No sign-in, email, API writes or real MFA. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const net=require('node:net');
const path=require('node:path');
const assert=require('node:assert/strict');
const freePort=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
(async()=>{
 const port=await freePort(),base='http://127.0.0.1:'+port;
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{
  cwd:path.resolve(__dirname,'..'),stdio:'ignore',detached:process.platform!=='win32'
 });
 let browser;
 try{
  await new Promise(r=>setTimeout(r,400));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const [width,height] of [[375,812],[390,844],[430,932],[1366,768]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
   const external=[];
   await page.route('**/*',route=>{
    if(route.request().url().startsWith(base+'/'))return route.continue();
    external.push(new URL(route.request().url()).hostname);
    return route.abort();
   });
   await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:30000});
   await page.evaluate(()=>{document.body.className='auth-required colzo-interface'; document.getElementById('appSplash')?.remove();});
   await page.locator('#showPasswordReset').click();
   assert.equal(await page.locator('#passwordResetRequestForm').isVisible(),true);
   assert.equal(await page.locator('#sharedAuthShell').isVisible(),false);
   await page.locator('#passwordResetRequestForm .show-login-link').click();
   assert.equal(await page.locator('#loginForm').isVisible(),true);
   await page.evaluate(()=>setAuthenticationMode('recovery','This reset link is invalid or expired.'));
   assert.equal(await page.locator('#passwordRecoveryForm').isVisible(),true);
   // These flows should never leave a customer on a dead-end recovery screen.
   assert.equal(await page.locator('#passwordRecoveryRequestAgain').isVisible(),true);
   // Simulate sign-out failure: never exit recovery while its session remains active.
   await page.evaluate(()=>{
    passwordRecoveryActive=true;
    supabaseClient={auth:{signOut:async()=>({error:new Error('synthetic sign-out failure')})}};
    document.getElementById('recoveryPassword').value='Fictional+Password-12345';
   });
   await page.locator('#passwordRecoveryRequestAgain').click();
   await page.locator('#passwordRecoveryMessage').getByText(/could not leave password recovery securely/i).waitFor();
   assert.equal(await page.locator('#passwordRecoveryForm').isVisible(),true);
   assert.equal(await page.evaluate(()=>passwordRecoveryActive),true);
   // After sign-out succeeds, clear sensitive fields and allow a fresh reset request.
   await page.evaluate(()=>{
    window.colzoQaSignOutCalls=0;
    supabaseClient={auth:{signOut:async()=>{window.colzoQaSignOutCalls++;return {error:null}}}};
   });
   await page.locator('#passwordRecoveryRequestAgain').click();
   assert.equal(await page.locator('#passwordResetRequestForm').isVisible(),true);
   assert.equal(await page.evaluate(()=>window.colzoQaSignOutCalls),1);
   assert.equal(await page.evaluate(()=>passwordRecoveryActive),false);
   assert.equal(await page.locator('#recoveryPassword').inputValue(),'');
   for(const [state,selector] of [['legal-acceptance-required','#legalAcceptanceForm'],['dpa-acceptance-required','#dpaAcceptanceForm']]){
    await page.evaluate(state=>document.body.className=state+' colzo-interface',state);
    const form=page.locator(selector);
    assert.equal(await form.isVisible(),true);
    assert.equal(await form.locator('img').first().getAttribute('src'),'/assets/icons/colzo-mark.svg');
    assert.equal(await form.locator('input[type=checkbox]').count(),1);
    assert.equal(await form.locator('button[type=submit]').count(),1);
    assert.ok((await form.locator('a[href^="/legal/"]').count())>=2);
    const view=await page.evaluate(sel=>{
      const el=document.querySelector(sel),rect=el.getBoundingClientRect();
      return {width:innerWidth,viewportHeight:innerHeight,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,
       rect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}};
    },selector);
    assert.equal(view.horizontalOverflow,false,state+' overflow at '+width);
    assert.ok(view.rect.left>=0 && view.rect.right<=width+1,state+' clipped at '+width);
    assert.ok(view.rect.top>=0,state+' positioned above viewport at '+width);
   }
   assert.ok(external.every(host=>host==='cdn.jsdelivr.net'),'unknown external host');
   console.log('PASS '+width+'x'+height+' local recovery, legal and DPA; external CDN blocked');
   await page.close();
  }
 }finally{
  if(browser)await browser.close();
  try{if(process.platform==='win32')server.kill('SIGTERM');else process.kill(-server.pid,'SIGTERM');}catch(e){if(e.code!=='ESRCH')throw e;}
 }
})().catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
