/* Colzo More-to-existing-Business-AI navigation test: real button HTML and
 * real inline openSettingsSection function, fake views, NO real API requests. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const section=html.match(/<section id="colzoExistingFeatures"[\s\S]*?<\/section>/)?.[0];
const logic=html.match(/function openSettingsSection\(id\)\{[\s\S]*?\n\}\n\nfunction positionBottomNavIndicator/)?.[0].replace(/\n\nfunction positionBottomNavIndicator$/,'');
assert.ok(section&&logic,'Actual owner navigation markup and handler are present');
const mockHtml=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
 <section id="bookingsView" class="view"></section><section id="actionsView" class="view"></section><section id="marketingView" class="view"></section>
 <section id="settingsView" class="view active"><div id="colzoNavWrapper">${section}</div>
  <details id="collapsedLegacy"><summary>Advanced settings</summary><div id="aiReceptionistSettingsCard">AI receptionist settings from existing backend</div><div id="businessKnowledgeCard">Business knowledge</div></details>
  <div id="billingCard" style="display:none">Owner billing</div>
 </section>
 <script>
  window.viewLog=[];window.toastLog=[];
  window.showView=view=>{viewLog.push(view);document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id===view+'View'));};
  window.toast=message=>toastLog.push(message);
 </script></body></html>`;
async function main(){
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const [w,h] of [[375,812],[390,844],[430,932],[1366,768]]){
      const context=await browser.newContext({viewport:{width:w,height:h},isMobile:w<500,hasTouch:w<500});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('request',req=>errors.push('Unexpected network '+req.url()));
      await page.setContent(mockHtml,{waitUntil:'domcontentloaded'});
      await page.addScriptTag({content:logic});
      for(const [key,destination] of [['bookings','bookings'],['actions','actions'],['marketing','marketing']]){
        await page.locator(`[data-colzo-backend="${key}"]`).click();
        const value=await page.evaluate(()=>viewLog.at(-1));
        assert.equal(value,destination);
        await page.evaluate(()=>showView('settings'));
      }
      await page.locator('[data-colzo-backend="receptionist"]').click();
      await page.waitForFunction(()=>document.querySelector('#collapsedLegacy').open);
      assert.equal(await page.locator('#collapsedLegacy').evaluate(el=>el.open),true);
      await page.waitForFunction(()=>document.querySelector('#aiReceptionistSettingsCard')?.getAttribute('tabindex')==='-1');
      await page.locator('[data-colzo-backend="knowledge"]').click();
      await page.waitForFunction(()=>document.querySelector('#businessKnowledgeCard')?.getAttribute('tabindex')==='-1');
      await page.locator('[data-colzo-backend="billing"]').click();
      await page.waitForFunction(()=>window.toastLog.length>0);
      assert.match((await page.evaluate(()=>window.toastLog)).at(-1),/not available/);
      if(errors.length)throw Error(`${w}×${h}: ${errors.join('; ')}`);
      console.log(`${w}x${h}: PASS all existing-backend shortcuts, advanced expansion, role-hidden billing`);
      await context.close();
    }
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error.stack||String(error));process.exitCode=1});
