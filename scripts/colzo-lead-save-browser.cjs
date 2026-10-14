/* Browser QA for authenticated native enquiry create/edit save workflows.
 * Synthetic tenant fixtures only. All backend calls are intercepted locally. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const path=require('node:path');
const port=Number(process.env.COLZO_LEADS_QA_PORT||8806),base=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sdk='window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}}';
async function main(){await sleep(600);const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),calls=[],errors=[];
 const db={leads:[{id:41,name:'Existing Fixture',job_type:'Repairs',status:'New',created_at:'2026-10-13T10:00:00Z'}],settings:{business_name:'Fixture Colzo'}};
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 page.on('request',r=>{const host=new URL(r.url()).hostname;if(!['127.0.0.1','cdn.jsdelivr.net'].includes(host))errors.push('Unexpected network host '+host)});
 await page.route('**/supabase-js@2*',r=>r.fulfill({status:200,contentType:'application/javascript',body:sdk}));
 await page.route('**/colzo-backend/public-config',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frontendAuthEnabled:true,supabaseUrl:'https://fixture.invalid',supabaseAnonKey:'fixture'})}));
 await page.route('**/colzo-backend/leads',async route=>{
  const req=route.request(),method=req.method(),body=['POST','PATCH'].includes(method)?req.postDataJSON():null;
  calls.push({path:'/api/leads',method,body});
  if(method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(db.leads)});
  if(method==='POST'){
   if(!body?.name||body.business_id||body.id)return route.fulfill({status:400,contentType:'application/json',body:'{"error":"Invalid fixture lead"}'});
   const record={...body,id:42,status:'New',created_at:'2026-10-14T09:00:00Z'};db.leads.push(record);
   return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(record)});
  }
  if(method==='PATCH'){
   const row=db.leads.find(x=>String(x.id)===String(body.id));if(!row)return route.fulfill({status:404,contentType:'application/json',body:'{"error":"Missing fixture lead"}'});
   Object.assign(row,body);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(row)});
  }
  return route.fulfill({status:405,body:'Unsupported method'});
 });
 await page.route('**/colzo-backend/pipeline',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
 await page.route('**/colzo-backend/settings',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(db.settings)}));
 await page.route('**/colzo-backend/bookings',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.route('**/colzo-backend/actions',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.route('**/colzo-backend/business-configuration',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({configuration:{},onboarding:{state:'completed'}})}));
 await page.route('**/colzo-backend/**',r=>['/colzo-backend/public-config','/colzo-backend/leads','/colzo-backend/pipeline','/colzo-backend/settings','/colzo-backend/bookings','/colzo-backend/actions','/colzo-backend/business-configuration'].includes(new URL(r.request().url()).pathname)?r.fallback():r.fulfill({status:401,contentType:'application/json',body:'{"error":"Fixture only"}'}));
 await page.goto(base+'/',{waitUntil:'networkidle'});
 await page.evaluate(()=>{
  settings={business_name:'Fixture Colzo'};leads=[{id:41,name:'Existing Fixture',job_type:'Repairs',status:'New',created_at:'2026-10-13T10:00:00Z'}];bookings=[];businessActions=[];
  supabaseClient={auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}}}),getUser:async()=>({data:{user:{id:'fixture-owner'}}})}};
  document.body.className='colzo-safe-shell colzo-interface auth-ready';window.ColzoOwner.onAuthState('auth-ready');
 });
 await page.locator('.cn-nav [data-cn-screen="enquiries"]').click();
 await page.locator('[data-cn-create-lead]').first().click();
 assert.equal(await page.locator('#cnLeadForm').isVisible(),true);
 await page.locator('#cnLeadForm [name=name]').fill('New Fixture Customer');
 await page.locator('#cnLeadForm [name=email]').fill('customer@example.invalid');
 await page.locator('#cnLeadForm [name=job_type]').fill('Electrical inspection');
 await page.locator('#cnLeadForm [name=estimated_value]').fill('249.50');
 await page.locator('#cnLeadForm [type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('#cnLeadForm'));
 const create=calls.find(x=>x.method==='POST');assert.ok(create,'POST /api/leads must be confirmed');
 assert.equal(create.body.name,'New Fixture Customer');assert.equal(create.body.estimated_value,249.5);assert.equal(create.body.business_id,undefined);
 assert.equal(await page.locator('.cf-lead-card').filter({hasText:'New Fixture Customer'}).count(),1);
 await page.locator('.cf-lead-card').filter({hasText:'New Fixture Customer'}).click();
 await page.locator('[data-cn-edit-lead="42"]').first().click();
 assert.equal(await page.locator('#cnLeadForm').getAttribute('data-mode'),'edit');
 await page.locator('#cnLeadForm [name=status]').selectOption('Contacted');
 await page.locator('#cnLeadForm [name=estimated_value]').fill('300');
 await page.locator('#cnLeadForm [name=priority]').selectOption('High');
 await page.locator('#cnLeadForm [name=notes]').fill('QA note only');
 await page.locator('#cnLeadForm [type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('#cnLeadForm'));
 const patch=calls.find(x=>x.method==='PATCH');assert.ok(patch,'PATCH /api/leads must be confirmed');
 assert.equal(patch.body.id,'42');assert.equal(patch.body.status,'Contacted');assert.equal(patch.body.estimated_value,300);assert.equal(patch.body.priority,'High');assert.equal(patch.body.notes,'QA note only');assert.equal(patch.body.business_id,undefined);
 assert.equal(await page.locator('.cf-lead-card').filter({hasText:'New Fixture Customer'}).count(),1);
 assert.deepEqual(errors,[]);
 console.log('390x844: PASS native enquiry create and edit, server-confirmed fixture saves, tenant ID never client-supplied, no external API calls');
}finally{await browser.close()}}main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1}).finally(()=>server.kill());
