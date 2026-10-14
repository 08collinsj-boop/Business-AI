/* Frontend-only release smoke with fake Supabase auth and zero live API traffic. */
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');
const port=Number(process.env.COLZO_SAFE_QA_PORT||8792),origin=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const publicConfig={frontendAuthEnabled:true,supabaseUrl:'https://fake-safe-fixture.supabase.co',supabaseAnonKey:'public-fixture-not-a-production-secret-key-long-enough'};
const fakeSupabase='window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithPassword:async()=>({error:{message:"Mock sign-in disabled"}})}}}}';
async function main(){
 await sleep(700);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [w,h] of [[375,812],[390,844],[430,932],[1366,768],[1440,900]]){
   const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:w<500,hasTouch:w<500});
   const page=await ctx.newPage(),unexpected=[];
   page.on('request',request=>{const host=new URL(request.url()).hostname;if(host!=='127.0.0.1'&&host!=='cdn.jsdelivr.net')unexpected.push(`Unexpected destination: ${host}`)});
   await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',r=>r.fulfill({status:200,contentType:'application/javascript',body:fakeSupabase}));
   await page.route('**/colzo-backend/public-config',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(publicConfig)}));
   await page.route('**/colzo-backend/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{"error":"Unauthorised fixture"}'}));
   await page.goto(origin+'/',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>document.querySelector('#appSplash')&&document.body.classList.contains('auth-required'),{timeout:11000}).catch(()=>{});
   const data=await page.evaluate(async()=>({
    title:document.title,
    splashBrand:document.querySelector('.app-splash-brand')?.textContent,
    authBrand:document.querySelector('.auth-shared-brand h1')?.textContent,
    ownerBrand:document.querySelector('#brandName')?.textContent,
    nav:[...document.querySelectorAll('.bottom-nav .nav-btn')].map(b=>({view:b.dataset.view,label:b.textContent.trim()})),
    stylesheet:[...document.styleSheets].some(s=>s.href?.includes('/assets/colzo-safe-shell.css')),
    background:getComputedStyle(document.body).backgroundColor,
    classes:document.body.className,
    ruleCount:[...document.styleSheets].find(s=>s.href?.includes('colzo-safe-shell.css'))?.cssRules?.length,
    manifest:(await (await fetch('/manifest.webmanifest')).json()).name,
    scrollWidth:document.documentElement.scrollWidth,
    viewport:window.innerWidth
   }));
   assert.equal(data.title,'Colzo | Business workspace');
   assert.equal(data.splashBrand,'Colzo');
   assert.equal(data.authBrand,'Colzo');
   assert.equal(data.ownerBrand,'Colzo');
   assert.equal(data.manifest,'Colzo');
   assert.ok(data.stylesheet);
   assert.equal(data.background,'rgb(21, 24, 29)',JSON.stringify(data));
   assert.deepEqual(data.nav.map(n=>n.view),['dashboard','leads','actions','bookings','settings']);
   assert.deepEqual(data.nav.map(n=>n.label),['Home','Enquiries','Actions','Bookings','More']);
   assert.ok(data.scrollWidth<=data.viewport+1,`${w}: horizontal overflow`);
   assert.deepEqual(unexpected,[]);
   console.log(`${w}x${h}: PASS Colzo splash/login/PWA, legacy navigation IDs, Graphite & Volt, no external customer requests`);
   await ctx.close();
  }
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1}).finally(()=>server.kill());
