/* Optional screenshot + DOM geometry test. Run with Playwright installed.
   Requires Python 3 for static localhost fixture server. No real account or password. */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const repo = path.resolve(__dirname,'..');
const port = Number(process.env.COLZO_QA_PORT||8787);
const screenshots=process.env.COLZO_QA_SCREENSHOTS||'/tmp/colzo-browserqa';
require('fs').mkdirSync(screenshots,{recursive:true});
const server = spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:repo,stdio:'ignore'});
const wait = ms=>new Promise(r=>setTimeout(r,ms));
// All sign-in and API responses are intercepted locally; never contact real customer systems.
const mockSDK = `window.supabase={createClient(){return {auth:{signInWithPassword:async()=>({data:{session:{access_token:'mock.header.signature'}},error:null}),signOut:async()=>({error:null})}};}};`;
const fixtures={
  config:{supabaseUrl:'https://mvwseobgkexzpmmkgcxe.supabase.co',supabaseAnonKey:'public-mocked'},
  enquiries:{items:[
    {id:'1',name:'James Example',job_type:'Table booking',status:'Contacted',created_at:'2026-09-17T12:00:00Z'},
    {id:'2',name:'Leyton Example',job_type:'Electrical repair',status:'Converted',created_at:'2026-09-17T13:00:00Z'},
    {id:'3',name:'Test Customer',job_type:'Socket and kitchen',status:'Contacted',created_at:'2026-10-11T14:00:00Z'}
  ],truncated:false},
  bookings:{items:[{id:'17',lead_id:'3',title:'Test appointment',customer_name:'Test Customer',starts_at:'2026-10-15T10:00:00Z',status:'confirmed'}],count:1,truncated:false},
  actions:{items:[{id:'51',lead_id:'2',title:'Call customer',status:'pending',priority:'high',due_at:'2026-10-14T09:00:00Z',action_type:'followup'}],count:1,truncated:false}
};
async function main(){
  await wait(850);
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const [width,height] of [[375,812],[390,844],[430,932],[1366,768],[1440,900]]){
      const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500});
      const page=await ctx.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('request',request=>{
        const hostname=new URL(request.url()).hostname;
        if(hostname!=='127.0.0.1'&&hostname!=='cdn.jsdelivr.net')errors.push('Unexpected external network request: '+hostname);
      });
      await page.route('**/supabase-js@2*',route=>route.fulfill({status:200,contentType:'application/javascript',body:mockSDK}));
      await page.route('**/api/colzo-original-readonly?*',route=>{
        const kind=new URL(route.request().url()).searchParams.get('kind');
        // Deliberate same-name, different-enquiry fixture at 390px:
        // the Contacts view must not silently merge customer identities.
        const payload=JSON.parse(JSON.stringify(fixtures[kind]||{error:'Unsupported'}));
        if(width===390&&kind==='enquiries')payload.items[2].name='Leyton Example';
        route.fulfill({status:fixtures[kind]?200:404,contentType:'application/json',body:JSON.stringify(payload)});
      });
      await page.goto(`http://127.0.0.1:${port}/colzo-readonly.html`,{waitUntil:'networkidle'});
      await page.fill('#originalEmail','browser-qa@example.invalid');
      await page.fill('#originalPassword','mocked-value-only');
      await page.click('#verifyButton');
      await page.waitForSelector('#openColzoExplore:visible',{timeout:10000});
      await page.click('#openColzoExplore');
      await page.waitForSelector('#colzoExploreHome:visible');
      const geometry=await page.evaluate(()=>{
        const get=s=>document.querySelector(s).getBoundingClientRect();
        const rect=r=>({x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height),bottom:Math.round(r.bottom)});
        return {body:rect(get('.colzo-explore-body')),dock:rect(get('.colzo-explore-nav')),header:rect(get('.colzo-explore-header')),scrollWidth:document.documentElement.scrollWidth,viewportWidth:window.innerWidth};
      });
      if(geometry.body.bottom>geometry.dock.y+2)errors.push('Body overlaps bottom dock');
      if(geometry.dock.bottom>height+1)errors.push('Navigation dock extends below viewport');
      if(geometry.scrollWidth>width+1)errors.push('Horizontal overflow');
      await page.screenshot({path:`${screenshots}/home-${width}.png`});
      await page.click('[data-colzo-screen="Enquiries"]');
      await page.waitForSelector('#colzoExploreEnquiries:visible');
      const cnt=await page.locator('.colzo-lead-card').count();
      if(cnt!==3)errors.push(`Expected 3 verified enquiries, got ${cnt}`);
      await page.locator('.colzo-explore-body').evaluate(el=>el.scrollTop=el.scrollHeight);
      if(!await page.locator('.colzo-lead-card').last().isVisible())errors.push('Last enquiry invisible after scrolling');
      await page.screenshot({path:`${screenshots}/enquiries-${width}.png`});
      await page.click('[data-colzo-screen="Projects"]');
      await page.waitForSelector('#colzoExploreProjects:visible');
      if(!await page.locator('#colzoWorkRecords').getByText('Test appointment',{exact:true}).isVisible())errors.push('Booking missing from Projects');
      await page.click('[data-colzo-work="actions"]');
      if(!await page.locator('#colzoWorkRecords').getByText('Call customer',{exact:true}).isVisible())errors.push('Action missing from Projects');
      await page.screenshot({path:`${screenshots}/work-${width}.png`});
      await page.click('[data-colzo-screen="More"]');
      await page.locator('.colzo-explore-body').evaluate(el=>el.scrollTop=el.scrollHeight);
      if(!await page.getByText('Help & support',{exact:true}).isVisible())errors.push('Last settings entry invisible');
      await page.screenshot({path:`${screenshots}/settings-${width}.png`});
      await page.locator('[data-colzo-setting="security"]').click();
      if(!await page.getByText('Keep account security settings in the original application.').isVisible())errors.push('Security details missing');
      await page.click('#colzoSettingsDetailBack');
      await page.locator('[data-colzo-setting="appearance"]').click();
      await page.locator('#colzoContrastSwitch').check();
      if(!await page.locator('#colzoExplore').evaluate(el=>el.classList.contains('colzo-more-contrast')))errors.push('Contrast setting did not apply');
      await page.click('[data-colzo-screen="Home"]');
      await page.click('#colzoOpenContacts');
      const contactEntries=await page.locator('#colzoSettingsDetailContents .colzo-setting-activity').count();
      if(contactEntries!==3)errors.push(`Contacts merged records unexpectedly: ${contactEntries} of 3`);
      await page.click('[data-colzo-screen="Home"]');
      await page.click('#colzoOpenQuote');
      await page.selectOption('#colzoQuoteLead','2');
      await page.fill('#colzoQuoteDescription','Socket replacement');
      await page.fill('#colzoQuotePrice','125');
      await page.locator('#colzoQuoteForm button[type=submit]').click();
      const quote=await page.locator('#colzoQuoteOutput').inputValue();
      if(!quote.includes('£125.00')||!quote.includes('NOT SENT'))errors.push('Quote composer incorrect');
      await page.click('[data-colzo-screen="Home"]');
      await page.click('#colzoRefreshData');
      await page.waitForFunction(()=>document.querySelector('#colzoRefreshStatus')?.textContent?.includes('refreshed'),{timeout:10000}).catch(()=>errors.push('Refresh did not complete'));
      if(width===390){
        // Deliberately keep a refresh in flight after exit; it must not
        // repopulate data or the results panel when its delayed GET finishes.
        await page.route('**/api/colzo-original-readonly?kind=enquiries',async route=>{
          await wait(550);
          await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures.enquiries)});
        });
        await page.click('#colzoRefreshData');
        await page.click('#colzoExploreExit');
        await wait(680);
        if(await page.locator('#results').isVisible())errors.push('Stale refresh repopulated results after exit');
        if(await page.locator('#colzoExplore').isVisible())errors.push('Stale refresh restored the dashboard');
      }else{
        await page.click('#colzoExploreExit');
      }
      if(await page.locator('#colzoExplore').isVisible())errors.push('Dashboard not cleared on exit');
      if(errors.length)throw Error(`${width}x${height} FAILED: ${JSON.stringify({errors,geometry})}`);
      console.log(`${width}x${height}: PASS; 3 enquiries; booking/action; settings; quote; refresh; exit; viewport=${JSON.stringify(geometry)}`);
      await ctx.close();
    }
  }finally{await browser.close();}
}
main().catch(err=>{console.error(err.stack||err.message);process.exitCode=1}).finally(()=>server.kill());
