import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const saved={...process.env},oldFetch=globalThis.fetch;
Object.assign(process.env,{SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-only',COLZO_SCOPED_PILOT_ACCESS:'true',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-preview-self-serve-pilot-20261102',TENANCY_AUTH_ENABLED:'true',FRONTEND_AUTH_ENABLED:'true',BILLING_ENABLED:'false',PILOT_FREE_STARTER_MARKETING:'false'});
delete process.env.OPENAI_API_KEY;delete process.env.OPENROUTER_API_KEY;
const {default:enquiry}=await import('../api/enquiry.js');
const res=()=>({statusCode:0,status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;},setHeader(){}});

test('scoped public intake rejects missing or non-boolean fictional acknowledgement before network activity',async()=>{
 for(const ack of [undefined,false,'true',null,0]){
  let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No external requests permitted before acknowledgement');};
  const result=res();
  await enquiry({method:'POST',headers:{},query:{business:'fictional-example'},body:{message:'Example fictional job',fictional_data_only_acknowledged:ack}},result);
  assert.equal(result.statusCode,400);
  assert.equal(result.body.code,'FICTIONAL_DATA_ONLY_ACK_REQUIRED');
  assert.equal(calls,0);
 }
});
test('fictional acknowledgement cannot bypass owner authentication for receptionist test mode',async()=>{
 const result=res();
 await enquiry({method:'POST',headers:{},body:{test_mode:true,message:'Example only',fictional_data_only_acknowledged:true}},result);
 assert.equal(result.statusCode,401);
});
test('acknowledged public intake still requires the current business DPA',async()=>{
 globalThis.fetch=async url=>({ok:true,status:200,text:async()=>JSON.stringify(String(url).includes('business_public_routes')?[{business_id:'business-a',route_type:'slug',route_value:'fictional-example',active:true}]:[])});
 const result=res();
 await enquiry({method:'POST',headers:{},query:{business:'fictional-example'},body:{message:'Fictional only',fictional_data_only_acknowledged:true}},result);
 assert.equal(result.statusCode,503);
 assert.equal(result.body.code,'LEGAL_SETUP_REQUIRED');
});

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function ui(){
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://qa.invalid/?business=fictional-example'});
 const w=dom.window;
 w.$=id=>w.document.getElementById(id);
 const a=html.indexOf('function applyPublicFictionalPolicy('),b=html.indexOf('\nfunction setPublicProfileImage(',a);
 assert.ok(a>=0&&b>a,'public entry point must apply the restricted policy');
 const c=html.indexOf('async function sendPublicEnquiry('),d=html.indexOf('\nfunction setPublicQuickActions(',c);
 w.requests=[];
 w.colzoBackendFetch=async(url,options)=>{w.requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({reply:'Fictional test response'})};};
 w.eval(`let publicFictionalDataOnly=false; const publicEnquiryMessages=[]; let publicEnquiryContinuation=null,publicEnquirySession=null; const publicEnquirySlug='fictional-example',publicAssistantAvailable=true; const publicEnquirySourceFromLocation=()=> 'direct'; const addPublicEnquiryMessage=()=>{}; ${html.slice(a,b)} ${html.slice(c,d)} window.policy=applyPublicFictionalPolicy; window.send=sendPublicEnquiry;`);
 return {dom,w};
}
test('public fictional restriction requires a fresh affirmative checkbox and preserves ordinary intake outside the pilot',()=>{
 const {dom,w}=ui();try{
  w.policy(true);
  assert.equal(w.$('publicFictionalOnlyNotice').hidden,false);
  assert.equal(w.$('publicFictionalOnlyConsent').required,true);
  assert.equal(w.$('publicFictionalOnlyConsent').checked,false);
  w.policy(false);
  assert.equal(w.$('publicFictionalOnlyNotice').hidden,true);
  assert.equal(w.$('publicFictionalOnlyConsent').required,false);
 }finally{dom.window.close();}
});
test('public send emits no request before fictional acknowledgement, then transmits boolean scope acknowledgement',async()=>{
 const {dom,w}=ui();try{
  w.policy(true);w.$('publicChatInput').value='Made-up example job';
  const event={preventDefault(){},currentTarget:w.$('publicEnquiryForm')};
  await w.send(event);assert.equal(w.requests.length,0);
  assert.equal(w.$('publicChatInput').value,'Made-up example job');
  w.$('publicFictionalOnlyConsent').checked=true;
  await w.send(event);assert.equal(w.requests.length,1);
  assert.equal(w.requests[0].fictional_data_only_acknowledged,true);
 }finally{dom.window.close();}
});
test.after(()=>{globalThis.fetch=oldFetch;for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);});
