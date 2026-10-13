/* Validate security-method picker with synthetic Supabase state and no real auth,
 * customer requests or paid messaging, including experimental passkey gating. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const port=Number(process.env.COLZO_SECURITY_QA_PORT||8797),origin=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const sleep=n=>new Promise(r=>setTimeout(r,n));
const out=process.env.COLZO_SECURITY_SHOTS||'/tmp/colzo-security-methods-qa';fs.mkdirSync(out,{recursive:true});
const fakeSdk=`(function(){
window.__securityCalls={passkeySignIn:0,register:0,enroll:0};
window.supabase={createClient:function(){return {
 auth:{
  getSession:async()=>({data:{session:null}}),
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  signInWithPasskey:async()=>{window.__securityCalls.passkeySignIn++;return {data:{},error:null}},
  registerPasskey:async()=>{window.__securityCalls.register++;return {data:{id:'mock-passkey'},error:null}},
  mfa:{
   getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'},error:null}),
   listFactors:async()=>({data:{totp:[]},error:null}),
   enroll:async()=>{window.__securityCalls.enroll++;return {data:{id:'mock-totp',totp:{qr_code:'',secret:'NOT-REAL-SECRET'}},error:null}}
  }
 }
}}};
})();`;
async function run(){await sleep(500);const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const enabled of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('request',r=>{const hostname=new URL(r.url()).hostname;if(!['127.0.0.1','cdn.jsdelivr.net'].includes(hostname))errors.push('unexpected '+hostname)});
  await page.route('**/supabase-js@2*',r=>r.fulfill({status:200,contentType:'application/javascript',body:fakeSdk}));
  await page.route('**/api/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{"error":"Fixture only"}'}));
  await page.route('**/api/public-config',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frontendAuthEnabled:true,supabaseUrl:'https://fixture.supabase.co',supabaseAnonKey:'public-fixture-not-real',colzoPasskeysEnabled:enabled})}));
  await page.goto(origin+'/',{waitUntil:'networkidle'});
  try{await page.waitForFunction(()=>typeof window.colzoPasskeysEnabled==='boolean'&&typeof supabaseClient!=='undefined'&&!!supabaseClient,{timeout:5000});}catch(e){const state=await page.evaluate(()=>({className:document.body.className,passkeys:window.colzoPasskeysEnabled,windowSupabase:!!window.supabase,errors:document.querySelector('#loginMessage')?.innerText}));throw Error(JSON.stringify({state,errors,original:e.message}))}
  assert.equal(await page.locator('#colzoPasskeyLogin').isVisible(),enabled,'passkey sign-in must be hidden until server-side opt-in');
  if(enabled){
   await page.locator('#colzoPasskeyLogin').click();
   assert.equal(await page.evaluate(()=>window.__securityCalls.passkeySignIn),1);
  }
  await page.evaluate(()=>{document.body.className='colzo-interface colzo-safe-shell auth-ready colzo-owner-enabled colzo-legacy-mode';document.querySelector('#settingsView').classList.add('active');document.querySelector('#dashboardApp').style.display='block';});
  await page.waitForFunction(()=>!!document.querySelector('#colzoSecurityChooseTotp')&&typeof window.colzoOfferSecuritySetup==='function',{timeout:9000});
  assert.equal(await page.locator('#colzoSecurityChooseTotp').isVisible(),true);
  assert.equal(await page.locator('#colzoSecurityChoosePasskey').isEnabled(),enabled);
  await page.evaluate(()=>window.colzoOfferSecuritySetup());
  assert.equal(await page.locator('#colzoNewAccountSecurity').isVisible(),true);
  assert.equal(await page.locator('#colzoSetupAuthenticator').isEnabled(),true);
  assert.equal(await page.locator('#colzoSetupPasskey').isEnabled(),enabled);
  await page.screenshot({path:`${out}/method-selection-${enabled?'enabled':'disabled'}.png`,fullPage:false});
  await page.locator('#colzoSetupLater').click();
  assert.equal(await page.locator('#colzoNewAccountSecurity').count(),0);
  if(enabled){
   await page.locator('#colzoSecurityChoosePasskey').click();
   await page.waitForFunction(()=>window.__securityCalls.register===1);
   assert.match(await page.locator('#colzoSecurityMethodNote').innerText(),/Passkey registered/);
  }else{
   await page.locator('#colzoSecurityChooseTotp').click();
   await page.waitForFunction(()=>window.__securityCalls.enroll===1);
   assert.equal(await page.locator('#securityMfaEnrollment').isVisible(),true);
  }
  assert.deepEqual(errors,[]);
  console.log(`390x844: PASS security choice, first-time setup, ${enabled?'simulated passkey registration':'working authenticator enrolment'}, no external auth or SMS`);
  await context.close();
 }
}finally{await browser.close()}}
run().catch(e=>{console.error(e.stack||String(e));process.exitCode=1}).finally(()=>server.kill());
