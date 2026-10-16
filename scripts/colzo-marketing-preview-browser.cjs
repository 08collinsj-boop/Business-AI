/* Colzo pre-launch marketing visual QA: local static files only; no real web/API calls. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const port=Number(process.env.COLZO_MARKETING_PREVIEW_QA_PORT||8927);
const base='http://127.0.0.1:'+port;
const output=process.env.COLZO_MARKETING_PREVIEW_SHOTS||'/tmp/colzo-marketing-preview-shots';
fs.mkdirSync(output,{recursive:true});
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await sleep(600);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[320,690],[375,812],[390,844],[430,932],[768,1024],[1366,768]]){
   const ctx=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});
   const page=await ctx.newPage(),errors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   page.on('request',r=>{const u=new URL(r.url());requests.push(u.pathname);if(u.hostname!=='127.0.0.1')errors.push('External request '+u.hostname)});
   const response=await page.goto(base+'/colzo-preview.html',{waitUntil:'load'});
   assert.equal(response.status(),200);
   await page.locator('h1').waitFor();
   assert.equal(await page.title(),'Colzo | Enquiries, organised');
   assert.equal(await page.locator('header nav a').count(),3);
   assert.equal(await page.locator('.plan').count(),3);
   assert.equal(await page.locator('.feature-card').count(),5);
   const dimensions=await page.evaluate(()=>{
     const root=document.documentElement,nav=document.querySelector('.site-header');
     return {page:root.scrollWidth,viewport:window.innerWidth,header:nav.getBoundingClientRect().width,hero:document.querySelector('.hero').getBoundingClientRect().width,footer:document.querySelector('.site-footer').getBoundingClientRect().width};
   });
   if(dimensions.page>dimensions.viewport+2){
    console.log('OVERFLOW_NODES',await page.evaluate(()=>[...document.querySelectorAll('*')].map(el=>({tag:el.tagName,cl:el.className?.baseVal||el.className||'',right:Math.round(el.getBoundingClientRect().right),left:Math.round(el.getBoundingClientRect().left),w:Math.round(el.getBoundingClientRect().width)})).filter(x=>x.right>innerWidth+8).sort((a,b)=>b.right-a.right).slice(0,16)));
   }
   assert.ok(dimensions.page<=dimensions.viewport+2,'Horizontal overflow '+width+': '+JSON.stringify(dimensions));
   assert.ok(await page.locator('.brand img').evaluate(el=>el.complete&&el.naturalWidth>0),'Brand icon must load');
   assert.ok((await page.locator('body').innerText()).includes('Not a checkout'));
   assert.ok(!(await page.locator('a[href*="getbusiness-ai"]').count()));
   const anchors=await page.locator('a[href^="#"]').evaluateAll(items=>items.map(a=>({href:a.getAttribute('href'),valid:Boolean(document.getElementById(a.getAttribute('href').slice(1)))})));
   assert.ok(anchors.every(a=>a.valid),'Broken internal anchor '+JSON.stringify(anchors.filter(a=>!a.valid)));
   await page.locator('.hero-links .button.primary').click();
   assert.equal(await page.evaluate(()=>window.location.hash),'#features');
   assert.ok((await page.locator('#features').boundingBox())!==null);
   assert.deepEqual(errors,[], 'No browser console or external network errors');
   const screenshot=path.join(output,'preview-'+width+'x'+height+'.png');
   await page.screenshot({path:screenshot,fullPage:true,animations:'disabled'});
   console.log('PASS '+width+'x'+height+' static Colzo preview, assets, on-page nav, no checkout, no overflow, requests '+requests.length+', screenshot '+screenshot);
   await ctx.close();
  }
 }finally{await browser.close();server.kill()}
})().catch(e=>{console.error(e.stack||String(e));server.kill();process.exitCode=1});
