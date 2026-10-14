/* Chromium end-to-end create/edit QA for Colzo's saved customer, project and quote records.
 * Synthetic tenant fixtures only. All API calls are intercepted; no real records are touched. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const path=require('node:path');
const port=Number(process.env.COLZO_RECORDS_QA_PORT||8807),base=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sdk='window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}}';
async function main(){await sleep(600);const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),calls=[],errors=[];
 const db={clients:[],projects:[],quotes:[]};let nextId=100;
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 page.on('request',r=>{const host=new URL(r.url()).hostname;if(!['127.0.0.1','cdn.jsdelivr.net'].includes(host))errors.push('Unexpected external request '+host)});
 await page.route('**/supabase-js@2*',r=>r.fulfill({status:200,contentType:'application/javascript',body:sdk}));
 await page.route('**/colzo-backend/public-config',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frontendAuthEnabled:true,supabaseUrl:'https://fixture.invalid',supabaseAnonKey:'fixture'})}));
 await page.route('**/colzo-backend/colzo-records*',async route=>{
  const req=route.request(),url=new URL(req.url()),resource=url.searchParams.get('resource'),id=url.searchParams.get('id'),method=req.method(),body=['POST','PATCH'].includes(method)?req.postDataJSON():null;
  calls.push({resource,method,id,body});
  if(!Object.hasOwn(db,resource))return route.fulfill({status:400,contentType:'application/json',body:'{"error":"Unknown fixture resource"}'});
  if(method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(db[resource])});
  if(method==='POST'){
   if(body?.business_id||body?.id)return route.fulfill({status:400,contentType:'application/json',body:'{"error":"Tenant fields are server-controlled"}'});
   const record={...body,id:++nextId,created_at:'2026-10-14T10:00:00.000Z'};
   db[resource].push(record);return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(record)});
  }
  if(method==='PATCH'){
   const record=db[resource].find(row=>String(row.id)===String(id||body?.id));
   if(!record)return route.fulfill({status:404,contentType:'application/json',body:'{"error":"Fixture record not found"}'});
   if(body?.business_id)return route.fulfill({status:400,contentType:'application/json',body:'{"error":"Tenant fields are server-controlled"}'});
   Object.assign(record,body);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(record)});
  }
  return route.fulfill({status:405,body:'Unsupported method'});
 });
 await page.route('**/colzo-backend/**',r=>['/colzo-backend/public-config','/colzo-backend/colzo-records'].includes(new URL(r.request().url()).pathname)?r.fallback():r.fulfill({status:401,contentType:'application/json',body:'{"error":"Fixture only"}'}));
 await page.goto(base+'/',{waitUntil:'networkidle'});
 await page.evaluate(()=>{
  settings={business_name:'Fixture Colzo'};leads=[{id:41,name:'Existing Fixture',job_type:'Inspection',status:'New',created_at:'2026-10-13T10:00:00Z',email:'existing@example.invalid'}];bookings=[];businessActions=[];
  authenticatedBusinessRole='owner';
  supabaseClient={auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}}}),getUser:async()=>({data:{user:{id:'fixture-owner'}}})}};
  document.body.className='colzo-safe-shell colzo-interface auth-ready';window.ColzoOwner.onAuthState('auth-ready');
 });
 // Customers: create -> server-confirmed list -> detail -> edit -> server-confirmed update.
 await page.locator('.cn-nav [data-cn-screen="more"]').click();
 await page.locator('.cn-more-links [data-cn-screen="clients"]').click();
 await page.locator('[data-colzo-create="clients"]').click();
 await page.locator('#cnColzoForm [name=full_name]').fill('Fixture Saved Customer');
 await page.locator('#cnColzoForm [name=email]').fill('saved@example.invalid');
 await page.locator('#cnColzoForm [name=phone]').fill('07000000001');
 await page.locator('#cnColzoForm [type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('#cnColzoForm'));
 assert.equal(db.clients.length,1);assert.equal(db.clients[0].full_name,'Fixture Saved Customer');
 assert.equal(calls.filter(x=>x.resource==='clients'&&x.method==='POST').length,1);
 await page.locator('[data-colzo-detail="clients"]').click();
 await page.locator('[data-colzo-edit="clients"]').click();
 await page.locator('#cnColzoForm [name=phone]').fill('07000000002');
 await page.locator('#cnColzoForm [type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('#cnColzoForm'));
 assert.equal(db.clients[0].phone,'07000000002');assert.equal(calls.filter(x=>x.resource==='clients'&&x.method==='PATCH').length,1);
 // Projects: create, verify list, open detail and update progress/status.
 await page.locator('.cn-nav [data-cn-screen="more"]').click();
 await page.locator('.cn-more-links [data-cn-screen="projects"]').click();
 await page.locator('[data-colzo-create="projects"]').click();
 await page.locator('#cnColzoForm [name=title]').fill('Fixture Electrical Project');
 await page.locator('#cnColzoForm [name=client_name]').fill('Fixture Saved Customer');
 await page.locator('#cnColzoForm [name=status]').selectOption('active');
 await page.locator('#cnColzoForm [name=progress]').fill('35');
 await page.locator('#cnColzoForm [type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('#cnColzoForm'));
 assert.equal(db.projects.length,1);assert.equal(db.projects[0].title,'Fixture Electrical Project');
 assert.equal(calls.filter(x=>x.resource==='projects'&&x.method==='POST').length,1);
 await page.locator('[data-colzo-detail="projects"]').click();
 await page.locator('[data-colzo-edit="projects"]').click();
 await page.locator('#cnColzoForm [name=status]').selectOption('completed');
 await page.locator('#cnColzoForm [name=progress]').fill('100');
 await page.locator('#cnColzoForm [type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('#cnColzoForm'));
 assert.equal(db.projects[0].status,'completed');assert.equal(db.projects[0].progress,100);
 assert.equal(calls.filter(x=>x.resource==='projects'&&x.method==='PATCH').length,1);
 // Quotes: create against an existing enquiry, then edit without sending or issuing it.
 await page.locator('.cn-nav [data-cn-screen="more"]').click();
 await page.locator('.cn-more-links [data-cn-screen="quotes"]').click();
 await page.locator('[data-colzo-create="quotes"]').click();
 await page.locator('#cnColzoForm [name=lead_id]').selectOption('41');
 await page.locator('#cnColzoForm [name=title]').fill('Fixture estimate');
 await page.locator('#cnColzoForm [name=amount_gbp]').fill('199.50');
 await page.locator('#cnColzoForm [name=status]').selectOption('draft');
 await page.locator('#cnColzoForm [type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('#cnColzoForm'));
 assert.equal(db.quotes.length,1);assert.equal(db.quotes[0].title,'Fixture estimate');
 assert.equal(calls.filter(x=>x.resource==='quotes'&&x.method==='POST').length,1);
 await page.locator('[data-colzo-detail="quotes"]').click();
 await page.locator('[data-colzo-edit="quotes"]').click();
 await page.locator('#cnColzoForm [name=amount_gbp]').fill('225');
 await page.locator('#cnColzoForm [name=notes]').fill('Fixture note');
 await page.locator('#cnColzoForm [type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('#cnColzoForm'));
 assert.equal(db.quotes[0].amount_gbp,'225');assert.equal(db.quotes[0].notes,'Fixture note');
 assert.equal(calls.filter(x=>x.resource==='quotes'&&x.method==='PATCH').length,1);
 for(const call of calls.filter(x=>['POST','PATCH'].includes(x.method)))assert.equal(call.body.business_id,undefined,'tenant ownership is server-derived');
 assert.deepEqual(errors,[]);
 console.log('390x844: PASS saved customer, project and quote create/edit flows, server-confirmed fixture records, tenant fields never client-supplied, no external API calls');
}finally{await browser.close()}}main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1}).finally(()=>server.kill());
