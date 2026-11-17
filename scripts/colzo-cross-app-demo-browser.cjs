/* Colzo fictional cross-app demonstration. Browser-only QA: NO real provider
 * requests, credentials, customer data, pilot flags or authenticated sessions. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const port=Number(process.env.COLZO_CROSS_APP_DEMO_PORT||8816);
const base='http://127.0.0.1:'+port;
const dir=process.env.COLZO_CROSS_APP_DEMO_SHOTS||'/tmp/colzo-cross-app-demo';
fs.mkdirSync(dir,{recursive:true});
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{
  cwd:path.resolve(__dirname,'..'),stdio:'ignore'
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function main(){
  await sleep(550);
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const [width,height] of [[375,812],[390,844],[1366,768],[1440,900]]){
      const context=await browser.newContext({
        viewport:{width,height},isMobile:width<600,hasTouch:width<600
      });
      const page=await context.newPage();
      const errors=[],requests=[];
      page.on('pageerror',e=>errors.push(e.stack||e.message));
      page.on('request',r=>{
        requests.push({url:r.url(),method:r.method()});
        const url=new URL(r.url());
        if(url.hostname!=='127.0.0.1' || !['GET','HEAD'].includes(r.method()))
          errors.push('Unexpected nonlocal/write request: '+r.method()+' '+url.origin);
      });
      await page.goto(base+'/demo/connected-workflow/index.html',{waitUntil:'networkidle'});
      assert.match(await page.title(),/Work Hub — fictional connected workflow/);
      assert.equal(await page.locator('#colzoOwner .cn-header').count(),1,
        'Use Colzo real native topbar rather than a custom concept header');
      assert.equal(await page.locator('#colzoOwner .cn-nav').count(),1,
        'Reuse Colzo existing sidebar and mobile navigation');
      assert.equal(await page.locator('#colzoOwner .cn-desktop-workspace-context').count(),1);
      assert.equal(await page.locator('#colzoOwner .cn-nav button[data-cn-screen="clickup"]').getAttribute('aria-current'),'page');
      if(width>=1100) {
        assert.equal(await page.locator('#colzoOwner .cn-desktop-nav-extra').isVisible(),true,
          'Desktop must show real Colzo business tools navigation');
        assert.equal(await page.locator('#colzoOwner .cn-header .cn-command-trigger').isVisible(),true,
          'Desktop must include the native command-centre top search');
      } else {
        assert.equal(await page.locator('#colzoOwner .cn-nav').isVisible(),true,
          'Mobile must retain the original bottom navigation');
      }

      assert.match(await page.locator('.cn-demo-disclaimer').innerText(),/Fictional demonstration/);
      assert.match(await page.locator('.cn-demo-disclaimer').innerText(),/not connected/i);
      assert.equal(await page.locator('#taskOutcomeTitle').innerText(),'No task created');
      assert.equal(await page.locator('#activityList li').count(),2);

      await page.locator('#reviewAction').click();
      assert.equal(await page.locator('#handoffDialog').isVisible(),true);
      assert.equal(await page.locator('#taskOutcomeTitle').innerText(),'No task created',
        'Review must not create even a simulated task');
      await page.locator('#approveSimulated').click();
      assert.equal(await page.locator('#handoffDialog').isVisible(),false);
      assert.equal(await page.locator('#taskOutcomeTitle').innerText(),'Simulated task prepared');
      assert.match(await page.locator('#taskOutcomeDescription').innerText(),/No ClickUp task/);
      assert.match(await page.locator('#activityList').innerText(),/no API request/i);
      assert.equal(await page.locator('#reviewAction').isDisabled(),true,
        'Repeated approval should not duplicate simulated tasks');
      await page.screenshot({
        path:dir+'/approved-'+width+'.png',
        fullPage:true,animations:'disabled'
      });

      await page.locator('#resetDemo').click();
      assert.equal(await page.locator('#taskOutcomeTitle').innerText(),'No task created');
      await page.locator('#providerScenario').selectOption('unavailable');
      await page.locator('#reviewAction').click();
      assert.equal(await page.locator('#handoffDialog').isVisible(),false);
      assert.equal(await page.locator('#taskOutcomeTitle').innerText(),'Mock provider unavailable');
      assert.match(await page.locator('#workflowStatus').innerText(),/No simulated task/i);

      await page.locator('#providerScenario').selectOption('available');
      await page.locator('#reviewAction').click();
      await page.locator('#declineSimulated').click();
      assert.equal(await page.locator('#taskOutcomeTitle').innerText(),'Handoff declined');
      assert.equal(await page.locator('#activityList li').count(),2);
      const overflow=await page.evaluate(()=>({
        scrollWidth:document.documentElement.scrollWidth,
        viewport:document.documentElement.clientWidth
      }));
      assert.ok(overflow.scrollWidth<=overflow.viewport+1,
        'Horizontal overflow at '+width+': '+JSON.stringify(overflow));
      assert.equal(errors.length,0,errors.join('\n'));
      assert.ok(requests.length>=3,'Only static local HTML/CSS/JS should be loaded');
      console.log('PASS fictional cross-app demo '+width+'x'+height+
        ': review/approve/decline/outage/reset, zero provider writes, no overflow');
      await context.close();
    }
  } finally {await browser.close();}
}
main().then(()=>{server.kill();}).catch(e=>{console.error(e);server.kill();process.exitCode=1;});
