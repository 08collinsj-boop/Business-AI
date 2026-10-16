/* Signed-out auth, registration and wizard a11y QA against local synthetic page. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const path=require('node:path');
const port=Number(process.env.COLZO_A11Y_PORT||8974);
const origin='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
(async()=>{
 await new Promise(done=>setTimeout(done,650));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[320,700],[390,844],[1366,768]]){
   const ctx=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block',reducedMotion:'reduce'});
   const page=await ctx.newPage();
   const out=[];
   await page.route('**/*',route=>{
    if(route.request().url().startsWith(origin+'/'))return route.continue();
    out.push(route.request().url());
    return route.abort();
   });
   await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
   await page.evaluate(()=>{
     document.body.className='auth-required colzo-interface';
     document.body.classList.remove('app-loading');
     document.getElementById('appSplash')?.remove();
   });
   const noOverflow=async stage=>{
    const w=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);
    assert.ok(w[0]<=w[1]+2,stage+' overflows '+JSON.stringify(w));
   };
   await noOverflow('sign-in');
   for(const id of ['loginEmail','loginPassword']){
    const label=await page.locator('#'+id).evaluate(el=>[...el.labels||[]].map(x=>x.innerText.trim()).join(' '));
    assert.ok(label.length>2,id+' has no accessible label');
   }
   await page.locator('#showSignUp').click();
   assert.equal(await page.locator('#signUpForm').isVisible(),true);
   for(const id of ['signUpEmail','signUpPassword','signUpPasswordConfirm']){
    const label=await page.locator('#'+id).evaluate(el=>[...el.labels||[]].map(x=>x.innerText.trim()).join(' '));
    assert.ok(label.length>2,id+' has no accessible label');
   }
   await page.locator('#signUpEmail').focus();
   assert.equal(await page.evaluate(()=>document.activeElement.id),'signUpEmail');
   assert.equal(await page.locator('#signUpLegalAccept').isVisible(),true);
   await noOverflow('sign-up');
   await page.evaluate(()=>{document.body.className='configuration-onboarding-required colzo-interface';onboardingWizardIndex=4;renderOnboardingWizard();});
   assert.equal(await page.locator('#configurationOnboardingForm').isVisible(),true);
   assert.equal(await page.locator('#onboardingProgress').getAttribute('aria-valuenow'),'5');
   await noOverflow('wizard');
   assert.ok(out.every(url=>new URL(url).hostname==='cdn.jsdelivr.net'),'unexpected third-party traffic');
   console.log('PASS '+width+'x'+height+' registration labels, keyboard focus, live progress, no overflow, no real API');
   await ctx.close();
  }
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||String(e));server.kill();process.exitCode=1});
