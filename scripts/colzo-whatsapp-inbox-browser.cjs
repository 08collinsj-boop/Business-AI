/* Standalone synthetic Colzo WhatsApp inbox mobile acceptance.
 * Uses only local assets and fake messages. No credentials, Twilio or API.
 */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const net=require('node:net');
const path=require('node:path');
const assert=require('node:assert/strict');

const freePort=()=>new Promise((resolve,reject)=>{
 const s=net.createServer();
 s.once('error',reject);
 s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const port=await freePort(),base='http://127.0.0.1:'+port;
 const child=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{
  cwd:path.resolve(__dirname,'..'),stdio:'ignore',detached:process.platform!=='win32'
 });
 let browser;
 try{
  await sleep(380);
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const [width,height] of [[375,812],[390,844],[430,932],[1366,768]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
   const requested=[];
   page.on('request',req=>requested.push(req.url()));
   await page.goto(base+'/tests/fixtures/colzo-whatsapp-inbox-demo.html',{waitUntil:'networkidle',timeout:15000});
   assert.equal(await page.locator('.cn-wa-head h1').innerText(),'WhatsApp inbox');
   assert.equal(await page.locator('.cn-wa-status').innerText(),'Not connected');
   assert.match(await page.locator('.cn-wa-demo-notice').innerText(),/Demo only/);
   assert.equal(await page.locator('.cn-wa-thread').count(),3);
   const visual=await page.evaluate(()=>{
    const card=getComputedStyle(document.querySelector('.cn-wa-list-wrap'));
    const focus=getComputedStyle(document.querySelector('.cn-wa-filter'));
    return {overflow:document.documentElement.scrollWidth>window.innerWidth+2,
      bg:card.backgroundColor,columns:getComputedStyle(document.querySelector('.cn-wa-layout')).gridTemplateColumns,focus:focus.outlineColor};
   });
   assert.equal(visual.overflow,false,'horizontal overflow at '+width);
   assert.equal(visual.bg,'rgb(32, 39, 45)');
   await page.getByRole('button',{name:'Human',exact:true}).click();
   assert.equal(await page.locator('.cn-wa-thread').count(),1);
   await page.getByRole('button',{name:'All',exact:true}).click();
   assert.equal(await page.locator('.cn-wa-thread').count(),3);
   await page.getByRole('button',{name:/Sample customer A/}).click();
   await page.getByRole('button',{name:'Mark for human'}).click();
   assert.match(await page.locator('.cn-wa-conversation').innerText(),/assigned to a person/);
   await page.getByRole('button',{name:'Reset demo'}).click();
   assert.equal(await page.locator('.cn-wa-metrics article').nth(1).locator('strong').innerText(),'2');
   assert.equal(await page.locator('[data-wa-action^="send"]').count(),0);
   assert.equal(requested.some(url=>/\/api\/|twilio\.com|supabase\.co|https:\/\//.test(url)),false,'network request beyond local assets');
   console.log('PASS inbox '+width+'x'+height+' graphite '+visual.bg+' mobile filters + handover + reset, zero API calls');
   await page.close();
  }
 }finally{
  if(browser)await browser.close();
  try{
   if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');
  }catch(e){if(e.code!=='ESRCH')throw e}
 }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
