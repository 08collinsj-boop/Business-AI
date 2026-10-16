/* Offline Colzo sign-in/signup, business creation and onboarding smoke.
 * Opens the real app markup/CSS locally, never signs in, signs up or saves data.
 * External requests are blocked; no real customer records or keys are used. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const net=require('node:net');
const path=require('node:path');
const assert=require('node:assert/strict');
const getPort=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
(async()=>{
 const port=await getPort(),base='http://127.0.0.1:'+port;
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore',detached:process.platform!=='win32'});
 let browser;
 try{
  await new Promise(resolve=>setTimeout(resolve,400));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const [width,height] of [[375,812],[390,844],[430,932],[1366,768]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
   const outside=[];
   await page.route('**/*',route=>{
    if(route.request().url().startsWith(base+'/'))return route.continue();
    outside.push(route.request().url());
    return route.abort();
   });
   await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:30000});
   await page.evaluate(()=>{
    document.body.className='auth-required colzo-interface';
    document.body.classList.remove('app-loading');
    document.getElementById('appSplash')?.remove();
   });
   const getState=()=>page.evaluate(()=>{
    const visible=id=>{
      const el=document.getElementById(id);const rect=el.getBoundingClientRect();
      const c=getComputedStyle(el);
      return {display:c.display,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}};
    };
    return {overflow:document.documentElement.scrollWidth>innerWidth+2,signup:visible('signUpForm'),
      login:visible('sharedAuthShell'),business:visible('businessSetupForm'),
      bg:getComputedStyle(document.body).backgroundColor};
   });
   assert.equal((await getState()).overflow,false,'auth horizontal overflow '+width);
   await page.locator('#showSignUp').click();
   assert.equal((await page.locator('#signUpForm').isVisible()),true,'sign up navigation');
   assert.match(await page.locator('#signUpForm .cn-journey-track').innerText(),/Account setup\s+Step 1 of 3/i);
   assert.equal(await page.locator('#signUpForm .auth-mark img').getAttribute('src'),'/assets/icons/colzo-mark.svg');
   assert.equal((await getState()).overflow,false,'signup horizontal overflow '+width);
   await page.locator('#showLogin').click();
   assert.equal(await page.locator('#loginForm').isVisible(),true,'back to sign-in');
   await page.evaluate(()=>{document.body.className='onboarding-required colzo-interface';});
   assert.equal(await page.locator('#businessSetupForm').isVisible(),true);
   assert.match(await page.locator('#businessSetupForm .cn-journey-track').innerText(),/Step 2 of 3/i);
   assert.equal((await getState()).overflow,false,'business setup overflow '+width);
   await page.evaluate(()=>{
     document.body.className='configuration-onboarding-required colzo-interface';
     onboardingWizardIndex=4;
     renderOnboardingWizard();
   });
   assert.equal(await page.locator('#configurationOnboardingForm').isVisible(),true);
   assert.match(await page.locator('#onboardingStepCaption').innerText(),/Step 5 of 7 - AI receptionist/);
   assert.equal(await page.locator('#onboardingProgress').getAttribute('aria-valuenow'),'5');
   assert.equal(await page.locator('#configurationOnboardingForm .onboarding-progress i.active').count(),5);
   assert.equal((await getState()).overflow,false,'wizard overflow '+width);
   await page.locator('#onboardingBack').click();
   assert.match(await page.locator('#onboardingStepCaption').innerText(),/Step 4 of 7 - Opening hours/);
   assert.equal(await page.locator('#onboardingProgress').getAttribute('aria-valuenow'),'4');
   assert.ok(outside.every(u=>new URL(u).hostname==='cdn.jsdelivr.net'),'unexpected external asset requested');
   console.log('PASS '+width+'x'+height+' signup/signin, business setup, 7-step progress, no overflow, external CDN asset blocked');
   await page.close();
  }
 }finally{
  if(browser)await browser.close();
  try{if(process.platform==='win32')server.kill('SIGTERM');else process.kill(-server.pid,'SIGTERM');}catch(e){if(e.code!=='ESRCH')throw e;}
 }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
