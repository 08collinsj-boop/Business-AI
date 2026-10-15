/* Browser QA for Colzo owner sign-in, account setup and business creation.
 * All API responses and auth results are synthetic fixtures; no live account is used. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const path=require('node:path');
const port=Number(process.env.COLZO_AUTH_QA_PORT||8804),base=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sdk=`window.supabase={createClient(){return {auth:{
 getSession:async()=>({data:{session:null},error:null}),
 onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
 signInWithPassword:async()=>({data:{user:null,session:null},error:{message:'Invalid login credentials'}}),
 signUp:async()=>({data:{user:{id:'fixture-user'},session:null},error:null}),
 signOut:async()=>({error:null}),
 getUser:async()=>({data:{user:null},error:null})
}}}}`;
async function main(){
 await sleep(600);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[390,844],[1366,768]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600});
   const page=await context.newPage(),errors=[],calls=[];
   page.on('pageerror',e=>errors.push(e.stack||e.message));
   page.on('request',r=>{const host=new URL(r.url()).hostname;if(!['127.0.0.1','cdn.jsdelivr.net'].includes(host))errors.push('Unexpected external request '+host)});
   await page.route('**/supabase-js@2*',r=>r.fulfill({status:200,contentType:'application/javascript',body:sdk}));
   await page.route('**/api/public-config',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frontendAuthEnabled:true,supabaseUrl:'https://fixture.invalid',supabaseAnonKey:'public-fixture'})}));
   await page.route('**/api/business-onboarding',async r=>{
    const req=r.request(),method=req.method(),body=method==='POST'?req.postDataJSON():null;
    calls.push({path:'/api/business-onboarding',method,body});
    const business={id:'fixture-business',business_name:'Fixture Colzo',business_type:'Electrical services'};
    if(method==='POST')return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({business,public_path:'/enquire/fixture-colzo'})});
    return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({needs_business:false,business,public_slug:'fixture-colzo',role:'owner'})});
   });
   await page.route('**/api/business-configuration',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({configuration:{},onboarding:{state:'in_progress'}})}));
   await page.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({business_name:'Fixture Colzo',business_type:'Electrical services',phone:'',email:'',address:''})}));
   await page.route('**/api/**',r=>['/api/public-config','/api/business-onboarding','/api/business-configuration','/api/settings'].includes(new URL(r.request().url()).pathname)?r.fallback():r.fulfill({status:401,contentType:'application/json',body:'{"error":"Fixture only"}'}));
   await page.goto(base+'/',{waitUntil:'networkidle'});
   assert.equal(await page.locator('#loginForm').isVisible(),true);
   assert.equal(await page.locator('#loginSubmit').innerText().then(x=>x.includes('Sign in')),true);
   await page.locator('#loginEmail').fill('owner@example.invalid');
   await page.locator('#loginPassword').fill('FixturePassword123!');
   await page.locator('#loginSubmit').click();
   await page.waitForFunction(()=>document.querySelector('#loginMessage')?.textContent?.trim().length>0);
   assert.match(await page.locator('#loginMessage').innerText(),/sign in|credentials|try again/i);
   await page.locator('#showSignUp').click();
   assert.equal(await page.locator('#signUpForm').isVisible(),true);
   assert.match(await page.locator('#signUpForm').innerText(),/secure Colzo workspace/);
   assert.doesNotMatch(await page.locator('#signUpForm').innerText(),/Business AI workspace/);
   await page.locator('#signUpEmail').fill('new-owner@example.invalid');
   await page.locator('#signUpPassword').fill('FixturePassword123!');
   await page.locator('#signUpPasswordConfirm').fill('DifferentPassword123!');
   await page.locator('#signUpLegalAccept').check();
   await page.locator('#signUpSubmit').click();
   assert.equal(await page.locator('#signUpMessage').innerText(),'Passwords do not match.');
   await page.locator('#signUpPasswordConfirm').fill('FixturePassword123!');
   await page.locator('#signUpSubmit').click();
   await page.waitForFunction(()=>document.querySelector('#signUpMessage')?.textContent?.includes('check your inbox'));
   assert.equal(calls.filter(x=>x.path==='/api/business-onboarding'&&x.method==='POST').length,0,'Account signup must not create a business before email confirmation');
   // Simulate the authenticated, server-approved point at which a new owner is
   // asked to create their first business. Every write remains intercepted.
   await page.evaluate(()=>{
    supabaseClient={auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}},error:null}),getUser:async()=>({data:{user:{id:'fixture-owner'}},error:null})}};
    document.body.className='onboarding-required';
   });
   assert.equal(await page.locator('#businessSetupForm').isVisible(),true);
   assert.match(await page.locator('#businessSetupForm').innerText(),/secure Colzo workspace/);
   await page.locator('#newBusinessName').fill('Fixture Colzo');
   await page.locator('#newBusinessType').fill('Electrical services');
   await page.locator('#businessSetupSubmit').click();
   await page.waitForFunction(()=>document.body.classList.contains('configuration-onboarding-required')||document.querySelector('#businessSetupMessage')?.textContent?.includes('Business access is unavailable')||document.querySelector('#businessSetupMessage')?.textContent?.includes('Could not create the business.'));
   const create=calls.find(x=>x.path==='/api/business-onboarding'&&x.method==='POST');
   assert.ok(create,'business creation POST must be recorded');
   assert.equal(create.body.business_name,'Fixture Colzo');
   assert.equal(create.body.business_type,'Electrical services');
   assert.equal(await page.locator('#configurationOnboardingScreen').isVisible(),true,'successful creation advances to business configuration');
   assert.deepEqual(errors,[]);
   console.log(`${width}x${height}: PASS sign-in failure handling, account signup validation, email-confirmation boundary, Colzo branding and fixture business creation`);
   await context.close();
  }
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1}).finally(()=>server.kill());
