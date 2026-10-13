/* In-browser owner Projects/Clients/Quotes acceptance with stubbed API and fake users.
   No Supabase keys, real sign-in, customer records or live network are used.
   Optional: install Playwright chromium to run this command locally. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const port=Number(process.env.COLZO_OWNER_QA_PORT||8791);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const root=`http://127.0.0.1:${port}`;
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="auth-ready">
<input id="search" placeholder="Search enquiries"><div id="colzoEnquiriesList"></div>
<div id="colzoPreviewAuthNotice" hidden></div><div id="colzoOriginalReadOnlyLink" hidden></div>
<div id="stats"></div><div id="colzoLiveTrend"></div>
<section id="dashboardView"><button class="dashboard-launch"><strong>New enquiry</strong><i>+</i></button><button class="dashboard-launch"><strong>Quote</strong><i>▤</i></button><button class="dashboard-launch"><strong>Client</strong><i>♧</i></button><button class="dashboard-launch"><strong>Reports</strong><i>▥</i></button></section>
<div id="colzoLeadDetailContent"></div><div id="colzoLeadDetailStatus" role="status"></div>
<button id="colzoDetailBack">Back</button><button id="colzoNewEnquiry">New enquiry</button>
<button id="colzoNewProject">New project</button><div id="colzoProjectsStatus"></div><div id="colzoProjectsList"></div><button id="colzoProjectsToLeads">View enquiries</button>
<button id="colzoAddClient">Add client</button><div id="colzoClientsStatus"></div><div id="colzoClientsList"></div>
<div id="colzoNotificationsList"></div>
<label><input id="colzoHighContrast" type="checkbox">Contrast</label><label><input id="colzoReduceMotion" type="checkbox">Motion</label>
<div id="colzoWorkspaceDialog" hidden><div role="dialog" aria-modal="true"><h3 id="colzoWorkspaceDialogTitle">Edit</h3><button type="button" id="colzoDialogClose">Close</button><form id="colzoWorkspaceForm"><div id="colzoWorkspaceFields"></div><p id="colzoWorkspaceFormMessage" role="status"></p><button type="submit">Save</button></form></div></div>
<style>body{font:16px system-ui;background:#171b1f;color:#f5f7fa;padding:12px}button,input,select,textarea{font:16px system-ui;padding:7px;margin:5px}button{background:#c8ff2e;color:#171b1f;border-radius:8px}form label{display:block;margin:8px}form input,form select{display:block}#colzoProjectsList,#colzoClientsList{display:grid;gap:6px}#colzoWorkspaceDialog:not([hidden]){position:fixed;inset:2%;background:#262b30;border:1px solid #c8ff2e;overflow:auto;z-index:9;padding:18px}#colzoWorkspaceDialog[hidden]{display:none}</style>
</body></html>`;
const backend=`
var leads=[{id:101,name:'Mock Customer A',job_type:'Electrical repair',status:'New',created_at:'2026-10-12T10:00:00Z',phone:'07000000000',email:'customer@example.invalid',description:'Mock fixture only',location:'Test city',estimated_value:120}];
var businessActions=[];
window.__fixture={projects:[],clients:[],quotes:[],writes:[],views:[],notifications:[],version:0,conflictNext:false,failProjectsGet:false,failClientsGet:false};
window.showView=(name)=>{window.__fixture.views.push(name)};
window.toast=message=>{window.__fixture.notifications.push(message)};
window.loadAll=async()=>{};
window.updateLead=async(id,fields)=>{Object.assign(leads.find(l=>l.id===Number(id)),fields)};
window.toggleWorkForm=()=>{};
window.api=async(url,opts={})=>{
 const f=window.__fixture,method=opts.method||'GET';
 const name=url.startsWith('/api/colzo/projects')?'projects':url.startsWith('/api/colzo/clients')?'clients':url.startsWith('/api/colzo/quotes')?'quotes':url==='/api/leads'?'enquiries':'unknown';
 if(name==='unknown')throw Error('Unexpected API endpoint '+url);
 if(method==='GET'){
  if(name==='projects'&&f.failProjectsGet||name==='clients'&&f.failClientsGet)throw Error('Mocked service temporarily unavailable');
  const rows=(f[name]||[]).filter(row=>!url.includes('lead_id=')||String(row.lead_id)===url.split('lead_id=')[1]);
  return name==='clients'?{clients:structuredClone(rows)}:{items:structuredClone(rows)};
 }
 const body=JSON.parse(opts.body||'{}');f.writes.push({name,method,body:structuredClone(body)});
 if(f.conflictNext){f.conflictNext=false;throw Error('409 Record changed. Refresh and try again.');}
 if(method==='PATCH'){
  const old=f[name].find(row=>row.id===body.id);if(!old)throw Error('Record not found');
  if(body.expected_updated_at!==old.updated_at)throw Error('409 Record changed. Refresh and try again.');
  if(name==='quotes'&&old.status!=='draft'&&Object.keys(body).some(k=>!['id','expected_updated_at','status'].includes(k)))throw Error('Sent quote locked');
  Object.assign(old,body,{updated_at:'2026-10-14T10:00:'+String(++f.version).padStart(2,'0')+'.000Z'});
  if(name==='projects'&&old.progress===100)old.status='completed';
  return name==='clients'?{client:structuredClone(old)}:{item:structuredClone(old)};
 }
 if(method!=='POST')throw Error('Unsupported method '+method);
 const record={...body,id:'77777777-7777-4777-8777-'+String(++f.version).padStart(12,'0'),updated_at:'2026-10-13T12:00:00.000Z',created_at:'2026-10-13T12:00:00.000Z',status:body.status||(name==='quotes'?'draft':'planned'),progress:body.progress??0};
 f[name].push(record);return name==='clients'?{client:structuredClone(record)}:{item:structuredClone(record)};
};
`;
async function main(){
  await wait(600);
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const [width,height] of [[375,812],[390,844],[430,932],[1366,768],[1440,900]]){
      const ctx=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500});
      const page=await ctx.newPage();const errors=[];
      page.on('pageerror',err=>errors.push(err.message));
      page.on('request',req=>{if(!req.url().startsWith(root))errors.push('External request '+req.url());});
      await page.goto(root+'/assets/colzo-workspace.js',{waitUntil:'domcontentloaded'});
      await page.setContent(html,{waitUntil:'domcontentloaded'});
      await page.addScriptTag({content:backend});
      await page.addScriptTag({url:root+'/assets/colzo-workspace.js'});
      await page.click('#colzoNewProject');
      await page.locator('#colzoWorkspaceFields input[name="title"]').fill('Mock client workshop');
      await page.locator('#colzoWorkspaceFields input[name="client_name"]').fill('Mock Customer A');
      await page.locator('#colzoWorkspaceFields select[name="lead_id"]').selectOption('101');
      await page.locator('#colzoWorkspaceFields select[name="status"]').selectOption('active');
      await page.locator('#colzoWorkspaceFields input[name="progress"]').fill('20');
      await page.locator('#colzoWorkspaceForm button[type="submit"]').click();
      await page.waitForFunction(()=>document.querySelector('#colzoWorkspaceDialog').hidden);
      await page.waitForFunction(()=>document.querySelector('#colzoProjectsList').textContent.includes('Mock client workshop'));
      if(!await page.locator('#colzoProjectsList button').first().isVisible())errors.push('Project list missing after creation');
      await page.locator('#colzoProjectsList button').first().click();
      await page.locator('#colzoWorkspaceFields input[name="progress"]').fill('60');
      await page.locator('#colzoWorkspaceForm button[type="submit"]').click();
      await page.waitForFunction(()=>document.querySelector('#colzoWorkspaceDialog').hidden);
      const createdProjects=await page.evaluate(()=>window.__fixture.projects);
      if(createdProjects.length!==1||createdProjects[0].progress!==60)errors.push('Project create/edit incorrect');
      await page.click('#colzoAddClient');
      await page.locator('#colzoWorkspaceFields input[name="full_name"]').fill('Mock Smith');
      await page.locator('#colzoWorkspaceFields input[name="email"]').fill('mock-smith@example.invalid');
      await page.locator('#colzoWorkspaceForm button[type="submit"]').click();
      await page.waitForFunction(()=>document.querySelector('#colzoWorkspaceDialog').hidden);
      await page.waitForFunction(()=>document.querySelector('#colzoClientsList').textContent.includes('Mock Smith'));
      await page.locator('#colzoClientsList button').first().click();
      await page.locator('#colzoWorkspaceFields input[name="phone"]').fill('07700900000');
      await page.evaluate(()=>window.__fixture.conflictNext=true);
      await page.locator('#colzoWorkspaceForm button[type="submit"]').click();
      await page.waitForFunction(()=>document.querySelector('#colzoWorkspaceFormMessage').textContent.includes('409'));
      if(await page.locator('#colzoWorkspaceDialog').isHidden())errors.push('Stale-edit dialog closed and lost unsaved input');
      await page.locator('#colzoWorkspaceForm button[type="submit"]').click();
      await page.waitForFunction(()=>document.querySelector('#colzoWorkspaceDialog').hidden);
      await page.evaluate(()=>window.ColzoWorkspace.openLead(101));
      await page.waitForSelector('#colzoDetailQuote');
      await page.click('#colzoDetailQuote');
      await page.locator('#colzoWorkspaceFields select[name="lead_id"]').selectOption('101');
      await page.locator('#colzoWorkspaceFields input[name="title"]').fill('Mock electrical quote');
      await page.locator('#colzoWorkspaceFields input[name="amount_gbp"]').fill('249.99');
      await page.locator('#colzoWorkspaceForm button[type="submit"]').click();
      await page.waitForFunction(()=>document.querySelector('#colzoWorkspaceDialog').hidden);
      await page.waitForFunction(()=>document.querySelector('#colzoLeadDetailContent').textContent.includes('Mock electrical quote'));
      const hasQuote=await page.evaluate(()=>window.__fixture.quotes.length===1&&window.__fixture.quotes[0].status==='draft');
      if(!hasQuote)errors.push('Quote did not save as a draft');
      page.once('dialog',dialog=>dialog.accept());
      await page.locator('[data-colzo-quote-next="sent"]').click();
      await page.waitForFunction(()=>window.__fixture.quotes[0]?.status==='sent');
      await page.locator('[data-colzo-quote-next="accepted"]').click();
      await page.waitForFunction(()=>window.__fixture.quotes[0]?.status==='accepted');
      // Project and client data must remain distinct from the quote's state and
      // no update can omit a loaded version or send personal data externally.
      // Previously loaded records must disappear on a failed refresh to
      // prevent displaying one business's records in a later auth context.
      await page.evaluate(()=>{window.__fixture.failProjectsGet=true;window.__fixture.failClientsGet=true;});
      await page.evaluate(async()=>{await window.ColzoWorkspace.refreshProjects();await window.ColzoWorkspace.refreshClients();});
      if(await page.locator('#colzoProjectsList').getByText('Mock client workshop').count())errors.push('Stale project shown after failed read');
      if(await page.locator('#colzoClientsList').getByText('Mock Smith').count())errors.push('Stale client shown after failed read');
      if(!await page.locator('#colzoProjectsStatus').getByText('not available',{exact:false}).count())errors.push('Projects connection failure not shown');
      if(!await page.locator('#colzoClientsStatus').getByText('unavailable',{exact:false}).count())errors.push('Clients connection failure not shown');
      if(await page.locator('#stats').getByText('Projects are currently unavailable',{exact:true}).count()!==1)errors.push('Stale project metric not cleared');
      await page.evaluate(async()=>{window.__fixture.failProjectsGet=false;window.__fixture.failClientsGet=false;await window.ColzoWorkspace.refreshProjects();await window.ColzoWorkspace.refreshClients();});
      if(!await page.locator('#colzoProjectsList').getByText('Mock client workshop').count())errors.push('Projects did not recover after connection restored');
      if(!await page.locator('#colzoClientsList').getByText('Mock Smith').count())errors.push('Clients did not recover after connection restored');
      const writes=await page.evaluate(()=>window.__fixture.writes);
      if(writes.filter(w=>w.method==='PATCH').some(w=>!w.body.expected_updated_at))errors.push('PATCH omitted optimistic version');
      if(writes.filter(w=>w.name==='quotes'&&w.method==='POST').some(w=>w.body.status==='accepted'||w.body.status==='sent'))errors.push('Quote created with improper final status');
      if(errors.length)throw Error(`${width}×${height} ${JSON.stringify(errors)}`);
      console.log(`${width}x${height}: PASS project create/edit, client create/conflict/edit, quote draft/sent/accepted, unavailable/recovery states, no external requests`);
      await ctx.close();
    }
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1}).finally(()=>server.kill());
