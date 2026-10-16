/* Test real Colzo MFA overlay renderer and blocking AAL2 flow, with synthetic
 * factor/authorisation state. Never transmit authenticator codes or log in. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const port=Number(process.env.COLZO_MFA_QA_PORT||8796);
const base=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const shots=process.env.COLZO_MFA_SHOTS||'/tmp/colzo-mfa-qa';fs.mkdirSync(shots,{recursive:true});
const sdk=`window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}}`;
async function main(){await sleep(600);const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [width,height] of [[375,812],[390,844],[430,932],[1366,768]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500});const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('request',r=>{const hostname=new URL(r.url()).hostname;if(!['127.0.0.1','cdn.jsdelivr.net'].includes(hostname))errors.push('unexpected external '+hostname)});
  await page.route('**/supabase-js@2*',r=>r.fulfill({status:200,contentType:'application/javascript',body:sdk}));
  await page.route('**/api/public-config',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frontendAuthEnabled:true,supabaseUrl:'https://fake-qa.example.invalid',supabaseAnonKey:'public-fixture'})}));
  await page.route('**/api/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{"error":"fixture only"}'}));
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>typeof window.businessAiVerifyProtectedAction==='function',{timeout:8000});
  await page.evaluate(()=>{
   supabaseClient={auth:{mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal2'},error:null}),listFactors:async()=>({data:{totp:[{id:'fake-factor',status:'verified'}]},error:null})},getSession:async()=>({data:{session:null}})}};
   authenticatedBusinessRole='owner';
   document.body.className='colzo-safe-shell colzo-interface auth-ready';
  });
  const dialog=page.locator('#securityMfaGate .security-mfa-dialog');await dialog.waitFor({state:'visible',timeout:10000});
  await page.waitForFunction(()=>document.querySelector('#securityMfaGateCopy')?.textContent?.includes('open Colzo'),{timeout:9000});
  const content=await dialog.innerText();assert.match(content,/Verify it’s you/);assert.match(content,/open Colzo/);assert.doesNotMatch(content,/open Business AI/);
  assert.equal(await page.locator('#securityMfaGateCancel').isVisible(),false,'blocking MFA cannot be dismissed');
  assert.equal(await page.locator('#securityMfaGateVerify').isVisible(),true);
  assert.equal(await page.locator('#securityMfaGateLogout').isVisible(),true);
  assert.equal(await page.locator('#colzoOwner').evaluate(el=>el.inert),true,'Native Colzo owner workspace must be inert during mandatory AAL2 challenge');
  assert.equal(await page.locator('#dashboardApp').evaluate(el=>el.inert),true,'Original owner app must be inert during mandatory AAL2 challenge');
  assert.equal(await page.locator('#colzoNewAccountSecurity').count(),0,'No alternate setup dialog can cover the required second-factor challenge');
  const rendered=await page.evaluate(()=>{
   const s=q=>getComputedStyle(document.querySelector(q)),r=q=>document.querySelector(q).getBoundingClientRect();
   return {border:s('#securityMfaGate .security-mfa-dialog').borderTopColor,background:s('#securityMfaGate .security-mfa-dialog').backgroundImage,verifyBg:s('#securityMfaGateVerify').backgroundColor,verifyText:s('#securityMfaGateVerify').color,codeBg:s('#securityMfaGateCode').backgroundColor,copy:s('#securityMfaGateCopy').color,dialog:r('#securityMfaGate .security-mfa-dialog').toJSON(),vw:innerWidth,vh:innerHeight,scrollWidth:document.documentElement.scrollWidth};
  });
  assert.equal(rendered.border,'rgb(78, 95, 62)');assert.equal(rendered.verifyBg,'rgb(200, 255, 46)');assert.equal(rendered.codeBg,'rgb(37, 46, 53)');
  assert.ok(rendered.dialog.left>=0&&rendered.dialog.right<=width+1&&rendered.dialog.bottom<=height+1,JSON.stringify(rendered));
  assert.ok(rendered.scrollWidth<=width+1,`Unexpected horizontal scroll ${JSON.stringify(rendered)}`);
  await page.screenshot({path:`${shots}/mfa-${width}.png`,fullPage:false});
  // Closing an authenticated session still hides protected MFA content.
  await page.evaluate(()=>document.body.classList.remove('auth-ready'));
  await page.waitForFunction(()=>document.querySelector('#securityMfaGate')?.hidden===true,{timeout:6000});
  assert.equal(await page.locator('#colzoOwner').evaluate(el=>el.inert),false,'Native owner workspace should reset inert when session ends');
  assert.deepEqual(errors,[]);
  console.log(`${width}x${height}: PASS actual protected Colzo MFA dialog, AAL2 gate, Graphite & Volt CSS and logout-safe exit`);
  await context.close();
 }
}finally{await browser.close()}}
main().catch(error=>{console.error(error.stack||String(error));process.exitCode=1}).finally(()=>server.kill());
