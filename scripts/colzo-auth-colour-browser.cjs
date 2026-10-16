/* Synthetic Chromium acceptance for Colzo authentication colours.
 * No real Supabase account, customer data, emails or external API writes.
 * Optional: COLZO_AUTH_SCREENSHOT_DIR=/tmp/colzo-auth-shots node scripts/colzo-auth-colour-browser.cjs
 */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const port=Number(process.env.COLZO_AUTH_COLOUR_QA_PORT||8821);
const base='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{
 cwd:path.resolve(__dirname,'..'),stdio:'ignore'
});
const sdk='window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}}';

async function main(){
 await new Promise(resolve=>setTimeout(resolve,600));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[390,844],[1366,768]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{
    const host=new URL(request.url()).hostname;
    if(!['127.0.0.1','cdn.jsdelivr.net'].includes(host))errors.push('Unexpected external host '+host);
   });
   await page.route('**/supabase-js@2*',route=>route.fulfill({status:200,contentType:'application/javascript',body:sdk}));
   await page.route('**/api/public-config',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({frontendAuthEnabled:true,supabaseUrl:'https://fixture.invalid',supabaseAnonKey:'synthetic-public-only'})
   }));
   await page.route('**/api/**',route=>new URL(route.request().url()).pathname==='/api/public-config'
    ?route.fallback()
    :route.fulfill({status:401,contentType:'application/json',body:'{"error":"Synthetic fixture only"}'}));
   await page.goto(base+'/',{waitUntil:'domcontentloaded'});
   await page.locator('#showSignUp').click({timeout:12000});
   assert.equal(await page.locator('#signUpForm').isVisible(),true);
   const got=await page.evaluate(()=>{
    const surface=selector=>{
     const style=getComputedStyle(document.querySelector(selector));
     return {background:style.backgroundColor,image:style.backgroundImage};
    };
    return {
     screen:surface('#authScreen'),
     card:surface('#signUpForm'),
     consent:surface('#signUpForm .legal-consent-row'),
     input:surface('#signUpEmail'),
     primary:surface('#signUpSubmit')
    };
   });
   assert.deepEqual(got.screen,{background:'rgb(13, 17, 21)',image:'none'});
   assert.deepEqual(got.card,{background:'rgb(32, 39, 45)',image:'none'});
   assert.deepEqual(got.consent,{background:'rgb(37, 45, 50)',image:'none'});
   assert.deepEqual(got.input,{background:'rgb(41, 49, 56)',image:'none'});
   assert.deepEqual(got.primary,{background:'rgb(200, 255, 46)',image:'none'});
   assert.deepEqual(errors,[]);
   if(process.env.COLZO_AUTH_SCREENSHOT_DIR){
    fs.mkdirSync(process.env.COLZO_AUTH_SCREENSHOT_DIR,{recursive:true});
    await page.screenshot({path:path.join(process.env.COLZO_AUTH_SCREENSHOT_DIR,'signup-'+width+'.png'),fullPage:true});
   }
   console.log(width+'x'+height+': PASS graphite page, registration card, terms panel, inputs and Volt button; no blue gradients or real network calls');
   await page.close();
  }
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error.stack||String(error));process.exitCode=1}).finally(()=>server.kill());
