/* Synthetic, no-auth Colzo onboarding theme acceptance in Chromium.
 * Forces wizard's AI step using DOM class toggles; no backend writes or account access.
 */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const path=require('node:path');
const port=Number(process.env.COLZO_ONBOARDING_THEME_QA_PORT||8929);
const base='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const sdk='window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}}';
(async()=>{
 await new Promise(resolve=>setTimeout(resolve,450));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[375,812],[390,844],[1366,768]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
   await page.route('**/supabase-js@2*',route=>route.fulfill({status:200,contentType:'application/javascript',body:sdk}));
   await page.route('**/api/public-config',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frontendAuthEnabled:true,supabaseUrl:'https://fixture.invalid',supabaseAnonKey:'synthetic-only'})}));
   await page.route('**/api/**',route=>new URL(route.request().url()).pathname==='/api/public-config'?route.fallback():route.fulfill({status:401,contentType:'application/json',body:'{"error":"Synthetic fixture only"}'}));
   await page.goto(base+'/',{waitUntil:'domcontentloaded'});
   await page.evaluate(()=>{
    document.body.className='colzo-interface configuration-onboarding-required';
    document.querySelectorAll('#configurationOnboardingScreen .wizard-step').forEach(step=>{
     step.classList.toggle('active',step.getAttribute('data-wizard-step')==='ai');
    });
    document.querySelectorAll('#configurationOnboardingScreen .onboarding-progress i').forEach((el,i)=>el.classList.toggle('active',i<5));
   });
   const options=page.locator('#configurationOnboardingScreen .onboarding-ai-option');
   assert.equal(await options.count(),3);
   assert.equal(await options.nth(1).locator('input').isChecked(),true);
   const surfaces=await page.evaluate(()=>{
    const surface=(selector)=>{
     const style=getComputedStyle(document.querySelector(selector));
     return {bg:style.backgroundColor,border:style.borderTopColor,shadow:style.boxShadow,text:style.color,bgImage:style.backgroundImage};
    };
    return {
     card:surface('#configurationOnboardingScreen .onboarding-ai-option'),
     selected:surface('#configurationOnboardingScreen .onboarding-ai-option.recommended'),
     dot:surface('#configurationOnboardingScreen .onboarding-ai-option.recommended .onboarding-ai-dot'),
     badge:surface('#configurationOnboardingScreen .onboarding-ai-option.recommended small'),
     panel:surface('#configurationOnboardingScreen .auth-card'),
     progress:surface('#configurationOnboardingScreen .onboarding-progress i.active'),
     scrollWidth:document.documentElement.scrollWidth,
     viewport:window.innerWidth
    };
   });
   assert.equal(surfaces.card.bg,'rgb(37, 46, 51)');
   assert.equal(surfaces.selected.bg,'rgb(42, 53, 46)');
   assert.equal(surfaces.selected.border,'rgb(200, 255, 46)');
   assert.equal(surfaces.selected.bgImage,'none');
   assert.equal(surfaces.badge.bg,'rgb(53, 65, 45)');
   assert.equal(surfaces.dot.border,'rgb(200, 255, 46)');
   assert.equal(surfaces.progress.bg,'rgb(200, 255, 46)');
   assert.ok(surfaces.scrollWidth<=surfaces.viewport+2,'Horizontal overflow on '+width);
   await options.nth(2).click();
   assert.equal(await options.nth(2).locator('input').isChecked(),true);
   assert.equal(await options.nth(1).locator('input').isChecked(),false);
   // CSS transitions interpolate border colour for 180 ms; observe its
   // final selected style instead of asserting against an animation frame.
   await page.waitForFunction(()=>getComputedStyle(
     document.querySelectorAll('#configurationOnboardingScreen .onboarding-ai-option')[2]
   ).borderTopColor==='rgb(200, 255, 46)');
   const newBorder=await options.nth(2).evaluate(el=>getComputedStyle(el).borderTopColor);
   assert.equal(newBorder,'rgb(200, 255, 46)');
   await page.locator('#onboardingNext').scrollIntoViewIfNeeded();
   assert.equal(await page.locator('#onboardingNext').isVisible(),true);
   console.log(width+'x'+height+' PASS graphite options + Volt selected border/dot/badge + radio switch + visible Continue');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1}).finally(()=>server.kill());
