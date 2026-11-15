import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const extract=(a,b)=>{const start=html.indexOf(a),end=html.indexOf(b,start);assert.ok(start>=0&&end>start,`${a} source available`);return html.slice(start,end);};
const clearSource=extract('const clearPrivateState=()=>{','const applyBusinessRole=()=>{');

function environment(){
 const secret='QA 20261104 Enquiry Example · Fictional lamp inspection';
 const formSelect=id=>({id,innerHTML:`<option value="">No related lead</option><option value="fictional">${secret}</option>`,value:'fictional'});
 const nodes={bookingLead:formSelect('bookingLead'),actionLead:formSelect('actionLead'),bookingsSummary:{innerHTML:`<strong>${secret}</strong>`,replaceChildren(){this.innerHTML=''}},actionsSummary:{innerHTML:'3',replaceChildren(){this.innerHTML=''}},leadCount:{textContent:'7 leads'},dashboardBusinessLabel:{textContent:'Fictional business'},settingsProfileName:{textContent:'Fictional business'},settingsProfileMeta:{textContent:'Fictional job description'}};
 // Browser QA E02/E04/E05/E07: these remain mounted while auth-required.
 const retained=id=>({id,innerHTML:`<article>${secret}</article>`,textContent:secret,replaceChildren(){this.innerHTML='';this.textContent='';}});
 nodes.colzoAttentionList=retained('colzoAttentionList');
 nodes.handoverList=retained('handoverList');
 nodes.colzoScheduleList=retained('colzoScheduleList');
 nodes.teamList=retained('teamList');
 nodes.pilotFeedbackList=retained('pilotFeedbackList');
 const unlistedPrivateList=retained('otherLegacyPrivateList');
 const selectors=[];const input={value:secret,removeAttribute(){}},textarea={value:secret,removeAttribute(){}};
 const context={
  document:{querySelectorAll(selector){selectors.push(selector);if(selector.includes('#dashboardApp')&&selector.includes('.work-list'))return [unlistedPrivateList];if(selector.includes('#dashboardApp')&&selector.includes('input'))return[input,textarea];return[]}},
  $:id=>nodes[id]||null,
  window:{marketingWorkspace:{reset(){}},ColzoOwner:{resetPrivateState(){}},},
  sessionStorage:{removeItem(){}},enquiryStorageKey:slug=>'key'+slug,
  updateInstallAppCard:()=>{},
  leads:[{name:secret}],bookings:[{title:secret}],businessActions:[],settings:{business_name:secret},
  businessConfiguration:null,configurationTemplates:[],pipeline:null,
  authenticatedPublicBusinessSlug:'fictional-business',authenticatedBusinessRole:'owner',handovers:[],teamState:null,lifecyclePolicy:null,
  ownerAssistantAvailable:null,publicBusinessPhoneNumber:'',referralState:null,valueDashboardState:null,
  knowledgeSources:[],knowledgeCanManage:false,knowledgeCanUpload:false,knowledgeReviewSource:null,knowledgeReplaceSourceId:null,
  legalState:null,pilotFeedbackItems:[],pilotMarketingDraftCount:0,pilotMarketingAvailable:null,enquiryMessages:[],
  receptionistTestContinuation:null,receptionistTestSession:null,receptionistTestLastPreview:null,
  businessProfileState:{profile:{business_name:secret}},billingState:{status:secret},
  privateDataEpoch:0,console
 };
 vm.createContext(context);
 vm.runInContext(clearSource+'\nthis.clear=clearPrivateState;',context);
 return {context,nodes,input,textarea,secret,selectors,unlistedPrivateList};
}

test('QA-001 P1: logout cleanup removes hidden booking and action lead OPTION labels from DOM, not just arrays',()=>{
 const {context,nodes,secret}=environment();context.clear();
 assert.doesNotMatch(nodes.bookingLead.innerHTML, new RegExp(secret.replaceAll(' · ',' \\· ')));
 assert.doesNotMatch(nodes.actionLead.innerHTML, /QA 20261104 Enquiry Example/);
 assert.match(nodes.bookingLead.innerHTML,/No related lead/);
 assert.match(nodes.actionLead.innerHTML,/No related lead/);
 assert.equal(nodes.bookingLead.value,'');
 assert.equal(nodes.actionLead.value,'');
});
test('QA-001 P1: cleanup wipes tenant-derived summary, profile and editable legacy form data even if screens are hidden',()=>{
 const {context,nodes,input,textarea}=environment();context.clear();
 assert.doesNotMatch(JSON.stringify(nodes),/Fictional lamp inspection|Fictional job description/);
 assert.equal(input.value,'');assert.equal(textarea.value,'');
 assert.equal(context.businessProfileState,null);
 assert.equal(context.billingState,null);
});
test('QA-001 P1: cleanup advances session data generation so in-flight reads are invalidated',()=>{
 const{context}=environment();const before=context.privateDataEpoch;context.clear();assert.equal(context.privateDataEpoch,before+1);
});
test('QA-001 P1: sign-out listener purges private DOM synchronously, not only in a scheduled bootstrap',()=>{
 const callback=extract('supabaseClient.auth.onAuthStateChange((event,nextSession)=>{','const {data:{session}}=await supabaseClient.auth.getSession();');
 assert.match(callback,/event==='SIGNED_OUT'\)\{\s*clearPrivateState\(\)/);
});
test('QA-001 P1: sign-out button scrubs before awaiting the asynchronous Supabase sign-out call',()=>{
 const handler=extract("$('logoutButton').addEventListener('click',async()=>{",'let publicDirectoryBusinesses=[];');
 const clear=handler.indexOf('clearPrivateState()'),logout=handler.indexOf('await supabaseClient.auth.signOut()');
 assert.ok(clear>0&&logout>clear,'client DOM is purged immediately on logout');
});
test('QA-001 P1: legacy in-flight lead/booking response cannot rehydrate hidden DOM after logout',()=>{
 const loadAll=extract('async function loadAll(showFeedback=false){','async function initializeApp(){');
 assert.match(loadAll,/const dataEpoch=privateDataEpoch/);
 assert.match(loadAll,/if\(dataEpoch!==privateDataEpoch\)return/);
 const work=extract('async function loadWorkItems(){','const formDate=');
 assert.match(work,/const dataEpoch=privateDataEpoch/);
 assert.match(work,/if\(dataEpoch!==privateDataEpoch\)return/);
});
test('QA-001 P1: even delayed successful protected API responses cannot update the page after sign-out',()=>{
 const api=extract('const api=async(url,options={},mfaRetried=false)=>{','function renderDashboard(){');
 assert.match(api,/const dataEpoch=privateDataEpoch/);
 assert.match(api,/if\(dataEpoch!==privateDataEpoch\)throw new Error\('Session changed'/);
});
test('QA-001 P1: tenant-specific configuration options and branded business name are removed from hidden legacy DOM',()=>{
 const{context,nodes}=environment();
 nodes.c_industry_template_id={innerHTML:'<option value="private">QA DEMO 20261027 Lighting request</option>',value:'private'};
 nodes.brandBusinessName={textContent:'QA DEMO 20261027 Lighting request'};
 context.clear();
 assert.doesNotMatch(nodes.c_industry_template_id.innerHTML,/Lighting request/);
 assert.doesNotMatch(nodes.brandBusinessName.textContent,/Lighting request/);
});
test('QA-001 P1: clicking Sign out clears private DOM before an unresolved Supabase promise completes',async()=>{
 const section=extract("$('logoutButton').addEventListener('click',async()=>{",'let publicDirectoryBusinesses=[];');
 let handle,finish,clears=0,view='auth-ready';
 const signOutPromise=new Promise(resolve=>{finish=resolve});
 const fake={
  $:()=>({addEventListener:(_name,cb)=>{handle=cb}}),
  supabaseClient:{auth:{signOut:()=>signOutPromise}},
  clearPrivateState:()=>{clears++},setAppLoading:()=>{},setAuthView:state=>{view=state},handleSession:async()=>{}
 };
 vm.createContext(fake);vm.runInContext(section,fake);
 const pending=handle();
 assert.equal(clears,1);
 assert.equal(view,'auth-pending');
 finish({error:null});await pending;
 assert.equal(view,'auth-pending');
});

test('QA-001 E02/E07: logout scrubs attention and handover HTML/text in hidden dashboard DOM',()=>{
 const {context,nodes,secret}=environment();
 assert.match(nodes.colzoAttentionList.textContent,/QA 20261104/);
 assert.match(nodes.handoverList.innerHTML,/QA 20261104/);
 context.clear();
 for(const id of ['colzoAttentionList','handoverList']){
  assert.equal(nodes[id].innerHTML,'',`${id} private HTML removed`);
  assert.equal(nodes[id].textContent,'',`${id} private text removed`);
 }
 assert.doesNotMatch(JSON.stringify({attention:nodes.colzoAttentionList,handover:nodes.handoverList}),new RegExp(secret));
});
test('QA-001 whole-document prevention: all authenticated legacy work-list/operations-list elements are scrubbed even if a new ID is added',()=>{
 const {context,nodes,unlistedPrivateList,selectors}=environment();
 context.clear();
 for(const id of ['colzoScheduleList','teamList','pilotFeedbackList']){
  assert.equal(nodes[id].innerHTML,'',`${id} cleared`);
 }
 assert.equal(unlistedPrivateList.innerHTML,'','other legacy private list is included by selector');
 assert.ok(selectors.some(selector=>selector.includes('#dashboardApp')&&selector.includes('.work-list')),'scoped dynamic list sweep is run');
});
