/* Colzo's native owner interface. Same authenticated Colzo account, same
 * existing authenticated APIs plus a tenant-scoped Colzo records API; no silent mutations.
 * The original feature-rich owner app remains one click away. */
(()=>{
 'use strict';
 const root=document.getElementById('colzoOwner');
 const content=document.getElementById('cnContent');
 if(!root||!content)return;
 const initialState=()=>({screen:'home',setting:'',settingsBusy:false,teamData:null,teamLoading:false,teamError:'',inviteFeedback:'',inviteUrl:'',compactCards:false,quietMotion:false,filter:'All',clientSearch:'',clientFilter:'All',projectFilter:'All',projectSearch:'',showProjectSearch:false,search:'',recordsReady:false,activeLead:null,notification:'',draftLead:'',draftTitle:'',draftAmount:'',scrollByScreen:new Map(),workFilter:{bookings:'Active',actions:'Open'},workSearch:{bookings:'',actions:''},workDate:new Date().toISOString().slice(0,7),workModal:null,workBusy:false,workFeedback:'',colzoRecords:{clients:null,projects:null,quotes:null},colzoLoading:'',colzoPending:{clients:false,projects:false,quotes:false},colzoError:'',colzoErrorResource:'',colzoForm:null,colzoBusy:false,colzoFeedback:'',activeCustomerId:null,leadForm:null,leadFeedback:'',leadBusy:false,colzoDetail:null,marketingImageDraft:null,marketingImageResult:null,marketingImageLoading:false,marketingImageError:'',marketingDrafts:null,marketingCanApprove:false,marketingManualOnly:false,marketingApprovalDraft:null,marketingApprovalPreview:null,marketingApprovalLoading:false,marketingApprovalError:'',marketingLoading:false,marketingError:'',marketingBusy:false,marketingForm:false,marketingEditing:null,marketingFeedback:'',marketingView:'drafts',marketingSchedules:null,marketingSchedulesLoading:false,marketingScheduleError:'',marketingSchedulingDraft:null,marketingScheduleBusy:false,voiceStatus:null,voiceLoading:false,voiceError:'',receptionConfig:null,receptionCanManage:false,receptionLoading:false,receptionError:'',receptionEditing:false,receptionDraft:null,receptionBusy:false,receptionFeedback:'',handoverRows:null,handoverLoading:false,handoverError:'',handoverBusy:false,billingData:null,billingLoading:false,billingError:'',knowledgeSources:null,knowledgeLoading:false,knowledgeError:'',knowledgeDetail:null,knowledgeForm:false,knowledgeBusy:false,knowledgeFeedback:'',knowledgeIncludes:{},knowledgeCanManage:false,knowledgeCanUpload:false,knowledgeCanAddManual:false,knowledgeLimits:null,knowledgeFilter:'all',knowledgeReplaceId:null,analyticsData:null,analyticsLoading:false,analyticsError:'',feedbackBusy:false,feedbackError:'',feedbackSuccess:'',automationData:null,automationEditing:false,automationPlanningBusy:false,automationLoading:false,automationBusy:false,automationFeedback:'',automationError:'',publicProfileData:null,publicProfileLoading:false,publicProfileError:'',publicProfileFeedback:'',publicProfileBusy:false,publicMediaSlot:null,publicMediaBusy:false,publicMediaFeedback:'',growthSettings:null,growthProfile:null,growthReferral:null,growthLoading:false,growthError:'',growthCanManage:false,growthBusy:false,growthFeedback:''});
 const state=initialState();
 let dashboardFailure=null;
 let sessionEpoch=0;
 const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const dateValue=v=>{if(v===null||v===undefined||v==='')return null;const d=new Date(v);return Number.isFinite(d.getTime())?d:null};
 const day=v=>{const d=dateValue(v);return d?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(d):'No date'};
 const records=()=>({
  enquiries:typeof leads!=='undefined'&&Array.isArray(leads)?leads:[],
  bookings:typeof bookings!=='undefined'&&Array.isArray(bookings)?bookings:[],
  actions:typeof businessActions!=='undefined'&&Array.isArray(businessActions)?businessActions:[]
 });
 const greeting=()=>{const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening'};
 const title=(name,kicker,description)=>`<header class="cn-screen-heading"><span class="cn-kicker">${safe(kicker)}</span><h1>${safe(name)}</h1>${description?`<p>${safe(description)}</p>`:''}</header>`;
 const stat=(number,label,details,icon)=>`<article class="cn-stat"><div class="cn-stat-top"><span>${safe(label)}</span><span class="cn-stat-icon" aria-hidden="true">${safe(icon)}</span></div><strong>${safe(number)}</strong><small>${safe(details)}</small></article>`;
 const empty=(message,action='')=>`<div class="cn-empty"><span class="cn-empty-symbol" aria-hidden="true">◇</span><p>${safe(message)}</p>${action}</div>`;
 const contact=(lead)=>String(lead.name||lead.email||lead.phone||'Customer');
 const initial=(name)=>safe(String(name||'?').trim().slice(0,1).toUpperCase());
 const totalToday=()=>new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(new Date());
 const leadStage=l=>{
  const raw=String(l.status||'New').trim().toLowerCase();
  if(/won|completed|converted|closed|resolved/.test(raw))return 'Won';
  if(/new|pending|unread|open/.test(raw))return 'New';
  return 'In Progress';
 };
 const leadCount=(list,group)=>group==='All'?list.length:list.filter(l=>leadStage(l)===group).length;
 const sourceLabel=l=>String(l?.source_label || 'Not recorded');
 const status=(v)=>{const label=String(v||'New');const group=leadStage({status:label});return `<span class="cn-pill ${group==='Won'?'success':group==='New'?'attention':'progress'}">${safe(group)}</span>`};
 const greetingLine=()=>`${greeting()},`;
 function home(){
  if(!state.recordsReady)return '<section class="cn-empty" role="status" aria-busy="true"><p>Loading business overview…</p></section>';
  const {enquiries,bookings,actions}=records();
  const pending=actions.filter(a=>!/done|completed|cancelled/i.test(String(a.status||''))).length;
  const business=typeof settings!=='undefined'?String(settings?.business_name||'').trim():'';
  return `<section class="cf-home-head"><h1>${safe(greeting())}.</h1><p>Here's what's happening with<br>your business today.</p></section>
  <div class="cf-kpis" aria-label="Business overview">
    ${figmaStat('Enquiries',enquiries.length,'All recorded','▤')}
    ${figmaStat('Bookings',bookings.length,'Existing appointments','▱')}
    ${figmaStat('Open actions',pending,'Pending follow-ups','↗')}
  </div>
  ${figmaTrend(enquiries)}
  <section class="cf-quick"><h2>Quick actions</h2><div class="cf-quick-grid">
    <button type="button" data-cn-create-lead><span class="cf-quick-icon primary">+</span><small>New enquiry</small></button>
    <button type="button" data-cn-screen="quotes"><span class="cf-quick-icon">▤</span><small>Draft quote</small></button>
    <button type="button" data-cn-screen="clients"><span class="cf-quick-icon">♧</span><small>View clients</small></button>
    <button type="button" data-cn-insights><span class="cf-quick-icon">▥</span><small>View reports</small></button>
  </div></section>
  <section class="cf-below-fold"><div class="cn-section-bar"><div><span class="cn-kicker">YOUR DAY</span><h2>Recent enquiries</h2></div><button data-cn-screen="enquiries" class="cn-text-action" type="button">View all ↗</button></div>
    <div class="cn-stack">${enquiries.length?enquiries.slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,3).map(leadRow).join(''):empty('No enquiries recorded yet.')}</div>
    <div class="cn-duo"><button data-cn-screen="bookings" type="button"><b>▣</b><strong>Bookings</strong><small>Open calendar →</small></button><button data-cn-screen="marketing" type="button"><b>✧</b><strong>AI marketing</strong><small>Open drafts →</small></button></div>
  </section>`;
 }
 function figmaStat(label,n,details,icon){return `<article class="cf-kpi"><span class="cf-kpi-label">${safe(label)}</span><strong data-cn-kpi="${safe(label)}">${safe(n)}</strong><span class="cf-kpi-sub">${safe(details)}</span></article>`}
 function figmaTrend(list){
  const months=Array.from({length:6},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-(5-i));return{k:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:new Intl.DateTimeFormat('en-GB',{month:'short'}).format(d),count:0}});
  const map=new Map(months.map(m=>[m.k,m]));
  for(const e of list){const d=dateValue(e.created_at);if(!d)continue;const record=map.get(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);if(record)record.count++}
  const max=Math.max(1,...months.map(m=>m.count));const points=months.map((m,i)=>`${14+i*56},${122-(m.count/max)*88}`).join(' ');
  const coords=months.map((m,i)=>[14+i*56,122-(m.count/max)*88]);const area='M'+coords.map(([x,y])=>`${x},${y}`).join(' L')+' L294,122 L14,122 Z';
  return `<section class="cf-trend" id="cnTrend"><header><h2>Enquiry trend</h2><span>Last 6 months⌄</span></header><svg viewBox="0 0 310 160" role="img" aria-label="Recorded enquiries per month"> <defs><linearGradient id="cnTrendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#c8ff2e" stop-opacity=".23"/><stop offset="100%" stop-color="#c8ff2e" stop-opacity="0"/></linearGradient></defs><path d="M14 34H294 M14 64H294 M14 93H294 M14 122H294" stroke="#354044" stroke-width="1"/><path d="${area}" fill="url(#cnTrendFill)"/><polyline points="${points}" fill="none" stroke="#c8ff2e" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>${months.map((m,i)=>`<circle cx="${14+i*56}" cy="${122-(m.count/max)*88}" r="3.1" fill="#c8ff2e"><title>${safe(m.label)}: ${m.count} enquiries</title></circle>`).join('')}</svg><div class="cf-months">${months.map(m=>`<span>${safe(m.label)}</span>`).join('')}</div><p>Based on recorded enquiries, not revenue.</p></section>`;
 }
 function leadRow(l){return `<button class="cn-record cf-lead-card" type="button" data-cn-lead="${safe(l.id)}"><span class="cn-avatar">${safe(contact(l).split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase().slice(0,2))}</span><span class="cn-record-main"><strong>${safe(contact(l))}</strong><small>${safe(l.job_type||'General enquiry')}</small><small>Source: ${safe(sourceLabel(l))}</small>${status(l.status)}</span><span class="cn-record-end"><time>${safe(day(l.created_at))}</time><span>›</span></span></button>`}
 function enquiry(){
  if(!state.recordsReady)return '<section class="cn-empty" role="status" aria-busy="true"><p>Loading enquiries…</p></section>';
  const all=records().enquiries;
  const filtered=all.filter(l=>(state.filter==='All'||leadStage(l)===state.filter)&&[l.name,l.job_type,l.description,l.location,l.email,l.phone].join(' ').toLowerCase().includes(state.search.toLowerCase()));
  const tabs=['All','New','In Progress','Won'];
  return `<div class="cf-screen-top"><h1>Enquiries</h1><div class="cf-top-actions"><button type="button" class="cf-icon-button" data-cn-focus-search aria-label="Focus enquiry search">⌕</button><button type="button" class="cf-icon-button volt" data-cn-create-lead aria-label="Create enquiry">+</button></div></div>
  <div class="cn-tabs cf-tabs" role="group" aria-label="Filter enquiries">${tabs.map(t=>`<button type="button" data-cn-filter="${t}" aria-pressed="${state.filter===t}">${t}${t!=='All'?` (${leadCount(all,t)})`:''}</button>`).join('')}</div>
  <div class="cn-search cf-search"><span aria-hidden="true">⌕</span><input id="cnSearch" type="search" placeholder="Search enquiries..." value="${safe(state.search)}" aria-label="Search enquiries"></div>
  <div class="cn-stack cf-lead-list">${filtered.length?filtered.map(leadRow).join(''):empty(!all.length?'No enquiries yet. Create an enquiry to begin.':'No enquiries match your search or filters.',!all.length?'<button type="button" data-cn-create-lead>Create enquiry</button>':'<button type="button" data-cn-filter="All">Show all</button>')}</div>
  <div class="cf-list-footer"><span>${filtered.length} ${filtered.length===1?'enquiry':'enquiries'}</span><button type="button" data-cn-refresh>Refresh ↻</button></div>`;
 }
 function leadDetails(){
  const lead=records().enquiries.find(l=>String(l.id)===String(state.activeLead));
  if(!lead)return `<button class="cn-back" data-cn-screen="enquiries" type="button">‹ Enquiries</button>${empty('This enquiry is no longer available.')}`;
  const phone=String(lead.phone||'').replace(/[^+\d]/g,'');
  const email=String(lead.email||'');
  return `<header class="cf-detail-top"><button class="cn-back" data-cn-screen="enquiries" type="button" aria-label="Back to enquiries">‹</button><button class="cf-more-button" data-cn-edit-lead="${safe(lead.id)}" type="button" aria-label="Edit enquiry">Edit</button></header>
  <section class="cf-detail-contact"><span class="cn-avatar large">${initial(contact(lead))}</span><div><h1>${safe(contact(lead))}</h1><p>${safe(lead.job_type||'General enquiry')}</p>${status(lead.status)}</div></section>
  <div class="cf-contact-row">${phone?`<a href="tel:${safe(phone)}"><b>☎</b><span>Call</span></a>`:''}${email?`<a href="mailto:${safe(email)}"><b>✉</b><span>Email</span></a>`:''}<button data-cn-screen="bookings" type="button"><b>▣</b><span>Schedule</span></button><button data-cn-edit-lead="${safe(lead.id)}" type="button"><b>✎</b><span>Edit</span></button></div>
  <section class="cn-detail-panel cf-detail-panel"><h2>Details</h2><dl><div><dt>▣　Enquiry source</dt><dd>${safe(sourceLabel(lead))}</dd></div><div><dt>▤　Submitted</dt><dd>${safe(day(lead.created_at))}</dd></div><div><dt>◇　Budget</dt><dd>${safe(lead.budget||'Not supplied')}</dd></div><div><dt>♧　Location</dt><dd>${safe(lead.location||'Not supplied')}</dd></div></dl></section>
  <section class="cn-detail-panel cf-detail-panel"><h2>Description</h2><p>${safe(lead.description||'No message has been recorded.')}</p></section>
  <div class="cf-detail-buttons"><button class="cf-button-muted" type="button" data-cn-screen="quotes">Create quote</button><button class="cf-button-volt" type="button" data-cn-edit-lead="${safe(lead.id)}">Edit enquiry</button></div>
  <p class="cn-caption">Draft quotes are saved to this business and are not sent automatically.</p>`;
 }
 function leadForm(){
  const current=state.leadForm?.lead||null,editing=state.leadForm?.mode==='edit'&&current;
  const heading=editing?'Edit enquiry':'New enquiry';
  const back='<button class="cn-back" type="button" data-cn-screen="'+(editing?'lead':'enquiries')+'">← '+(editing?'Back to enquiry':'Back to enquiries')+'</button>';
  const fields=editing
   ? '<label>Status<select name="status">'+['New','Contacted','Converted'].map(v=>'<option value="'+v+'" '+(String(current.status||'New').toLowerCase()===v.toLowerCase()?'selected':((v==='Contacted'&&String(current.status||'').toLowerCase()==='in progress')||(v==='Converted'&&String(current.status||'').toLowerCase()==='won')?'selected':''))+'>'+(v==='Contacted'?'In Progress':v==='Converted'?'Won':v)+'</option>').join('')+'</select></label><label>Estimated value (£)<input name="estimated_value" type="number" min="0" max="10000000" step="0.01" value="'+safe(current.estimated_value??0)+'"></label><label>Priority<select name="priority"><option value="Normal" '+(current.priority==='High'?'':'selected')+'>Normal</option><option value="High" '+(current.priority==='High'?'selected':'')+'>High</option></select></label><label>Follow-up date<input name="follow_up_date" type="date" value="'+safe(current.follow_up_date||'')+'"></label><label>Internal notes<textarea name="notes" rows="4" maxlength="5000">'+safe(current.notes||'')+'</textarea></label>'
   : '<label>Customer name<input name="name" maxlength="200" autocomplete="name" value="" placeholder="Customer or contact name"></label><label>Phone number<input name="phone" type="tel" maxlength="80" autocomplete="tel" placeholder="Phone number"></label><label>Email address<input name="email" type="email" maxlength="320" autocomplete="email" placeholder="name@example.com"></label><label>Location<input name="location" maxlength="300" placeholder="Town or service address"></label><label>Enquiry type<input name="job_type" maxlength="200" placeholder="e.g. Boiler service"></label><label>Estimated value (£)<input name="estimated_value" type="number" min="0" max="10000000" step="0.01" value="0"></label><label>Priority<select name="priority"><option value="Normal">Normal</option><option value="High">High</option></select></label><label>Message / work required<textarea name="description" rows="4" maxlength="5000" placeholder="What does the customer need?"></textarea></label>';
  return '<div class="cf-screen-top">'+back+'</div><header class="cn-screen-heading"><span class="cn-kicker">ENQUIRIES</span><h1>'+heading+'</h1><p>'+(editing?'Update status, value, priority and internal follow-up notes.':'Add a real enquiry to your existing business records.')+'</p></header><section class="cn-detail-panel cn-colzo-record-form"><form id="cnLeadForm" data-mode="'+(editing?'edit':'create')+'" data-lead-id="'+safe(current?.id||'')+'">'+fields+'<p class="cn-caption" id="cnLeadFeedback" role="status">'+safe(state.leadFeedback||'')+'</p><div class="cn-form-actions"><button class="cn-primary" type="submit" '+(state.leadBusy?'disabled':'')+'>'+(state.leadBusy?'Saving…':editing?'Save enquiry changes':'Create enquiry')+'</button><button class="cn-secondary" type="button" data-cn-lead-cancel>Cancel</button></div></form></section>';
 }
 async function saveNativeLead(form){
  if(state.leadBusy)return;
  const editing=form.dataset.mode==='edit',fd=new FormData(form);
  const body=Object.fromEntries(fd.entries());
  if(editing){body.id=String(form.dataset.leadId||'');body.estimated_value=Number(body.estimated_value||0);if(!body.id||!Number.isFinite(body.estimated_value)||body.estimated_value<0){const f=content.querySelector('#cnLeadFeedback');if(f)f.textContent='Check the enquiry and estimated value.';return}}
  else{body.estimated_value=Number(body.estimated_value||0);if(!body.name?.trim()&&!body.phone?.trim()&&!body.email?.trim()){const f=content.querySelector('#cnLeadFeedback');if(f)f.textContent='Add a name, phone number or email address.';return}if(!Number.isFinite(body.estimated_value)||body.estimated_value<0){const f=content.querySelector('#cnLeadFeedback');if(f)f.textContent='Enter a valid estimated value.';return}}
  if(editing&&(window.colzoRecordVersionsEnabled===true||window.colzoPreviewAuthTransportEnabled===true)){body.expected_updated_at=state.leadForm?.lead?.updated_at;if(typeof body.expected_updated_at!=='string'||!body.expected_updated_at){const f=content.querySelector('#cnLeadFeedback');if(f)f.textContent='Reload the enquiry before saving. Your draft has not been saved.';return}}
  state.leadBusy=true;const button=form.querySelector('[type=submit]');if(button)button.disabled=true;const feedback=content.querySelector('#cnLeadFeedback');if(feedback)feedback.textContent='Saving securely…';
  try{const result=await api('/api/leads',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!result||result.error)throw new Error(result?.error||'The server did not confirm the enquiry save.');state.leadFeedback=editing?'Enquiry changes saved.':'Enquiry created.';state.leadForm=null;if(typeof loadAll==='function')await loadAll(false);state.screen=editing?'enquiries':'enquiries';state.activeLead=editing?body.id:result.id||null;render({motion:'page'});}
  catch(error){if(feedback)feedback.textContent=error?.message||'The enquiry could not be saved. No successful save was confirmed.'}
  finally{state.leadBusy=false;if(button)button.disabled=false}
 }
 function projects(){
  const saved=Array.isArray(state.colzoRecords.projects)?state.colzoRecords.projects:[];
  const loading=Boolean(state.colzoPending?.['projects'] || state.colzoLoading==='projects');
  const loadError=state.colzoError && (!state.colzoErrorResource || state.colzoErrorResource==='projects') ? state.colzoError : '';
  const filtered=saved.filter(p=>[p.title,p.client_name,p.status,p.notes].join(' ').toLowerCase().includes(state.projectSearch.toLowerCase())&&(state.projectFilter==='All'||(state.projectFilter==='Completed'?p.status==='completed':p.status!=='completed')));
  const projectEmpty=loading&&!Array.isArray(state.colzoRecords.projects)
    ?'<div class="cn-empty" role="status" aria-live="polite">Loading saved projects…</div>'
    :loadError&&!Array.isArray(state.colzoRecords.projects)?''
    :saved.length?empty('No projects match your search or filter.','<button type="button" data-cn-reset-projects>Clear filters</button>')
    :empty('No saved projects yet. Create a project to start tracking work.');
  return `<div class="cn-approved-projects"><div class="cf-screen-top"><h1>Projects</h1><button type="button" class="cf-icon-button volt" data-colzo-create="projects" aria-label="Create project">+</button></div>
  <p class="cn-caption">${loading?'Loading saved projects…':`${saved.length} saved projects`}</p>
  ${state.colzoFeedback?`<p class="cn-work-message" role="status">${safe(state.colzoFeedback)}</p>`:''}
  <label class="cn-search cf-search"><span aria-hidden="true">⌕</span><input id="cnProjectSearch" type="search" placeholder="Search saved projects…" aria-label="Search projects" value="${safe(state.projectSearch)}"></label>
  <div class="cf-tabs cf-project-tabs" role="group" aria-label="Filter projects">${['All','Active','Completed'].map(t=>`<button type="button" data-cn-project-filter="${t}" aria-pressed="${(state.projectFilter||'All')===t}">${t}</button>`).join('')}</div>
  ${state.colzoForm?.resource==='projects'?colzoRecordForm('projects',state.colzoForm.record):''}
  ${loadError?empty(loadError,'<button type="button" data-colzo-refresh="projects">Try again</button>'):''}
  <div class="cn-stack cf-project-list">${filtered.length?filtered.map(p=>`<button class="cf-project-card" type="button" data-colzo-detail="projects" data-colzo-id="${safe(p.id)}"><span class="cn-avatar">${safe(String(p.title||'?').slice(0,1).toUpperCase())}</span><span class="cf-project-text"><strong>${safe(p.title)}</strong><small>${safe(p.client_name||'Customer not recorded')} · ${safe(day(p.created_at))}</small><span class="cf-progress"><i style="width:${Number(p.progress)||0}%"></i></span><span class="cf-project-status">${safe(p.status)} · ${Number(p.progress)||0}%</span></span><span>›</span></button>`).join(''):projectEmpty}</div>
  <p class="cn-caption cn-approved-honesty">Projects and progress are saved to your business workspace.</p></div>`;
 }
 function clients(){
  const saved=Array.isArray(state.colzoRecords.clients)?state.colzoRecords.clients:[];
  const loading=Boolean(state.colzoPending?.['clients'] || state.colzoLoading==='clients');
  const loadError=state.colzoError && (!state.colzoErrorResource || state.colzoErrorResource==='clients') ? state.colzoError : '';
  const entries=records().enquiries.filter(l=>l.name||l.email||l.phone).slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const unique=new Map();for(const l of entries){const k=String(l.email||l.phone||l.name||'').trim().toLowerCase();if(k&&!unique.has(k))unique.set(k,l)}
  const contacts=[...unique.values()];
  const filtered=saved.filter(c=>[c.full_name,c.email,c.phone].join(' ').toLowerCase().includes(state.clientSearch.toLowerCase())).sort((a,b)=>String(a.full_name).localeCompare(String(b.full_name)));
  const row=c=>`<button class="cn-stitch-customer" type="button" data-colzo-detail="clients" data-colzo-id="${safe(c.id)}"><span class="cn-avatar">${safe(String(c.full_name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())}</span><span class="cn-stitch-customer-copy"><strong>${safe(c.full_name)}</strong><small>${safe(c.email||c.phone||'No contact details')}</small><small>Saved customer · ${safe(day(c.created_at))}</small></span><span aria-hidden="true">›</span></button>`;
  return `<div class="cn-stitch-title"><div><h1>Customers</h1><p>${loading?'Loading saved customers…':`${saved.length} saved customer${saved.length===1?'':'s'}`}</p></div><button class="cn-stitch-add" data-colzo-create="clients" type="button" aria-label="Add customer">+</button></div>
  ${state.colzoFeedback?`<p class="cn-work-message" role="status">${safe(state.colzoFeedback)}</p>`:''}
  <label class="cn-stitch-search"><span aria-hidden="true">⌕</span><input id="cnClientSearch" type="search" aria-label="Search saved customers" value="${safe(state.clientSearch)}" placeholder="Search saved customers…"></label>
  ${state.colzoForm?.resource==='clients'?colzoRecordForm('clients',state.colzoForm.record):''}
  ${loadError?empty(loadError,'<button type="button" data-colzo-refresh="clients">Try again</button>'):''}
  <div class="cn-stitch-directory-label"><b>SAVED CUSTOMERS</b><span>${filtered.length} record${filtered.length===1?'':'s'}</span></div><div class="cn-stitch-customer-list">${filtered.length?filtered.map(row).join(''):loadError&&!Array.isArray(state.colzoRecords.clients)?'':empty(loading?'Loading saved customers…':saved.length?'No customers match your search. Try a different name, email or phone number.':'No saved customers yet. Add a customer to create a persistent profile.')}</div>
  <section class="cn-detail-panel"><h2>Enquiry contacts</h2><p class="cn-caption">These contacts are derived from existing enquiries and are not saved customer profiles.</p><div class="cn-stitch-customer-list">${contacts.filter(l=>[l.name,l.email,l.phone].join(' ').toLowerCase().includes(state.clientSearch.toLowerCase())).slice(0,8).map(l=>`<button class="cn-stitch-customer" type="button" data-cn-customer="${safe(l.id)}"><span class="cn-avatar">${safe(contact(l).slice(0,1).toUpperCase())}</span><span class="cn-stitch-customer-copy"><strong>${safe(contact(l))}</strong><small>${safe(l.email||l.phone||'Enquiry contact')}</small></span><span>›</span></button>`).join('')||empty('No matching enquiry contacts.')}</div></section>`;
 }
 function customerProfile(){
  const lead=records().enquiries.find(l=>String(l.id)===String(state.activeLead));
  if(!lead)return `<button class="cn-back" data-cn-screen="clients" type="button">‹ Customers</button>${empty('This customer is no longer available in the current enquiry records.')}`;
  const key=v=>String(v||'').trim().toLowerCase();
  const email=key(lead.email),phone=String(lead.phone||'').replace(/\\D/g,''),name=key(lead.name);
  const related=records().enquiries.filter(l=>(email&&key(l.email)===email)||(phone&&String(l.phone||'').replace(/\\D/g,'')===phone)||(!email&&!phone&&name&&key(l.name)===name));
  const tel=String(lead.phone||'').replace(/[^+\\d]/g,'');
  return `<header class="cf-detail-top"><button class="cn-back" data-cn-screen="clients" type="button" aria-label="Back to customers">‹</button><button class="cf-more-button" data-cn-screen="enquiries" type="button" aria-label="View enquiries">Enquiries</button></header>
  <section class="cf-detail-contact"><span class="cn-avatar large">${initial(contact(lead))}</span><div><h1>${safe(contact(lead))}</h1><p>${safe(lead.company||lead.business_name||'Customer contact')}</p><span class="cn-caption">Profile from existing enquiry records</span></div></section>
  <div class="cf-contact-row">${tel?`<a href="tel:${safe(tel)}"><b>☎</b><span>Call</span></a>`:''}${lead.email?`<a href="mailto:${safe(lead.email)}"><b>✉</b><span>Email</span></a>`:''}<button data-cn-screen="enquiries" type="button"><b>▤</b><span>Enquiries</span></button></div>
  <section class="cn-detail-panel cf-detail-panel"><h2>Contact details</h2><dl><div><dt>Email address</dt><dd>${safe(lead.email||'Not recorded')}</dd></div><div><dt>Phone number</dt><dd>${safe(lead.phone||'Not recorded')}</dd></div><div><dt>Business</dt><dd>${safe(lead.company||lead.business_name||'Not recorded')}</dd></div><div><dt>Last recorded enquiry</dt><dd>${safe(day(lead.created_at))}</dd></div></dl></section>
  <section class="cn-detail-panel cf-detail-panel"><h2>Enquiries (${related.length})</h2>${related.length?related.map(l=>`<button class="cn-record cf-lead-card" type="button" data-cn-lead="${safe(l.id)}"><span class="cn-record-main"><strong>${safe(l.job_type||'General enquiry')}</strong><small>${safe(day(l.created_at))} · ${safe(leadStage(l))}</small></span><span>›</span></button>`).join(''):empty('No related enquiries found.')}</section>
  <p class="cn-caption">This view is read-only. Colzo currently derives customer contacts from existing enquiries; it does not create a separate customer record.</p>`;
 }
 function quotes(){
  const saved=Array.isArray(state.colzoRecords.quotes)?state.colzoRecords.quotes:[];
  const loading=Boolean(state.colzoPending?.['quotes'] || state.colzoLoading==='quotes');
  const loadError=state.colzoError && (!state.colzoErrorResource || state.colzoErrorResource==='quotes') ? state.colzoError : '';
  const filtered=saved.filter(q=>[q.title,q.status,q.notes].join(' ').toLowerCase().includes(state.search.toLowerCase()));
  const quoteEmpty=loading&&!Array.isArray(state.colzoRecords.quotes)
    ?'<div class="cn-empty" role="status" aria-live="polite">Loading saved quotes…</div>'
    :loadError&&!Array.isArray(state.colzoRecords.quotes)?''
    :saved.length?empty('No quotes match your search.','<button type="button" data-cn-reset-quotes>Clear search</button>')
    :empty('No saved quotes yet. Create a draft quote linked to an existing enquiry.');
  return `<div class="cn-approved-quotes">${title('Quotes','ESTIMATES / QUOTES','Create and manage saved quote records.')}
  ${state.colzoFeedback?`<p class="cn-work-message" role="status">${safe(state.colzoFeedback)}</p>`:''}
  <div class="cn-section-bar"><span class="cn-caption">${loading?'Loading saved quotes…':`${saved.length} saved quotes`}</span><button class="cn-primary" type="button" data-colzo-create="quotes">+ New quote</button></div>
  ${state.colzoForm?.resource==='quotes'?colzoRecordForm('quotes',state.colzoForm.record):''}
  ${loadError?empty(loadError,'<button type="button" data-colzo-refresh="quotes">Try again</button>'):''}
  <label class="cn-search cf-search"><span aria-hidden="true">⌕</span><input id="cnQuoteSearch" type="search" aria-label="Search quotes" placeholder="Search saved quotes…" value="${safe(state.search)}"></label>
  <div class="cn-stack">${filtered.length?filtered.map(q=>{const lead=records().enquiries.find(l=>String(l.id)===String(q.lead_id));return `<button class="cn-record cf-lead-card" type="button" data-colzo-detail="quotes" data-colzo-id="${safe(q.id)}"><span class="cn-avatar">£</span><span class="cn-record-main"><strong>${safe(q.title)}</strong><small>${safe(lead?contact(lead):'Related enquiry')} · ${safe(day(q.created_at))}</small><span class="cn-pill ${q.status==='accepted'?'success':'attention'}">${safe(q.status)}</span></span><span class="cn-record-end"><strong>£${Number(q.amount_gbp||0).toFixed(2)}</strong><span>›</span></span></button>`}).join(''):quoteEmpty}</div>
  <p class="cn-caption cn-approved-honesty">A saved quote is not the same as an issued or emailed quote. Sending remains a separate workflow.</p></div>`;
 }

 function colzoRecordDetail(){
  const detail=state.colzoDetail;
  if(!detail||!['clients','projects','quotes'].includes(detail.resource))return '<button class="cn-back" data-cn-screen="more" type="button">← Back</button>'+empty('This record is no longer available.');
  const {resource,id}=detail,record=(state.colzoRecords[resource]||[]).find(item=>String(item.id)===String(id));
  if(!record)return '<button class="cn-back" data-cn-screen="'+resource+'" type="button">← Back</button>'+empty('This record is no longer available in this workspace.');
  const back='<button class="cn-back" data-cn-screen="'+resource+'" type="button" aria-label="Back to '+(resource==='clients'?'customers':resource)+'">← '+(resource==='clients'?'Customers':resource==='projects'?'Projects':'Quotes')+'</button>';
  const edit=resource==='quotes'&&['sent','accepted'].includes(record.status)?'<p class="cn-caption">Quote terms are locked after issuing. Editing is unavailable here.</p>':'<button class="cn-primary" type="button" data-colzo-edit="'+resource+'" data-colzo-id="'+safe(record.id)+'">Edit details</button>';
  if(resource==='quotes'){
    // Accepted Stitch #008: estimate, linked records, notes and explicit draft boundary.
    const lead=records().enquiries.find(item=>String(item.id)===String(record.lead_id));
    return `<section class="cn-approved-quote-detail" aria-label="Saved quote details">
      <header class="cn-approved-detail-top">${back}<h1>Quote details</h1></header>
      <section class="cn-approved-estimate" aria-label="Saved quote estimate">
        <div class="cn-approved-estimate-meta"><span>${safe(day(record.created_at))}</span><span class="cn-pill">${safe(record.status||'draft')}</span></div>
        <h2>${safe(record.title||'Untitled quote')}</h2><p>Price estimate</p><strong>£${Number(record.amount_gbp||0).toFixed(2)} <small>GBP</small></strong>
      </section>
      <section class="cn-approved-info-card"><h2>LINKED RECORDS</h2>${lead?`<button type="button" class="cn-approved-related" data-cn-lead="${safe(lead.id)}"><span><small>Customer</small><strong>${safe(contact(lead))}</strong><small>Linked enquiry · ${safe(lead.job_type||'General enquiry')}</small></span><span aria-hidden="true">›</span></button>`:'<p class="cn-caption">No matching enquiry is available in this workspace.</p>'}</section>
      <section class="cn-approved-info-card"><h2>WORK DESCRIPTION / NOTES</h2><p class="cn-approved-note">${safe(record.notes||'No quote notes recorded.')}</p></section>
      <p class="cn-approved-quote-boundary">This is a saved quote record. Sending quotes and collecting customer payments are unavailable here. A saved status does not confirm delivery.</p>
      <div class="cn-approved-quote-actions">${edit}</div>
    </section>`;
  }
  if(resource==='clients'){
    // Approved customer profile using actual tenant-scoped saved customer data.
    const norm=v=>String(v||'').trim().toLowerCase();
    const email=norm(record.email),phone=String(record.phone||'').replace(/\D/g,'');
    const related=records().enquiries.filter(item=>(email&&norm(item.email)===email)||(phone&&String(item.phone||'').replace(/\D/g,'')===phone));
    const tab=state.customerProfileTab==='activity'?'activity':'overview';
    const tel=String(record.phone||'').replace(/[^+\d]/g,'');
    const name=String(record.full_name||'Customer').trim();
    const initials=name.split(/\s+/).slice(0,2).map(item=>item[0]||'').join('').toUpperCase();
    return `<section class="cn-approved-profile" aria-label="Saved customer profile">
      <header class="cn-approved-detail-top">${back}<button class="cn-approved-text-action" type="button" data-colzo-edit="clients" data-colzo-id="${safe(record.id)}">Edit</button></header>
      <div class="cn-approved-contact-head"><span class="cn-approved-avatar">${safe(initials)}</span><h1>${safe(name)}</h1><p>Saved customer profile</p></div>
      <div class="cn-approved-contact-actions">
        ${tel?`<a href="tel:${safe(tel)}" aria-label="Call ${safe(name)}"><span aria-hidden="true">☎</span>Call</a>`:'<span class="cn-approved-disabled-action">Call unavailable</span>'}
        ${email?`<a href="mailto:${safe(record.email)}" aria-label="Email ${safe(name)}"><span aria-hidden="true">✉</span>Email</a>`:'<span class="cn-approved-disabled-action">Email unavailable</span>'}
        <button type="button" data-cn-screen="bookings"><span aria-hidden="true">▣</span>Bookings</button>
      </div>
      <div class="cn-approved-tabs" role="group" aria-label="Customer profile sections"><button type="button" data-cn-client-profile-tab="overview" aria-pressed="${tab==='overview'}">Overview</button><button type="button" data-cn-client-profile-tab="activity" aria-pressed="${tab==='activity'}">Activity</button></div>
      ${tab==='overview'?`<section class="cn-approved-info-card"><h2>CONTACT DETAILS</h2>
        <dl><div><dt>Email</dt><dd>${email?safe(record.email):'Not provided'}</dd></div><div><dt>Phone</dt><dd>${phone?safe(record.phone):'Not provided'}</dd></div><div><dt>Created</dt><dd>${safe(day(record.created_at))}</dd></div></dl></section>
        <section class="cn-approved-info-card"><h2>RELATED ENQUIRIES <span>${related.length}</span></h2>${related.length?related.slice(0,12).map(item=>`<button class="cn-approved-related" type="button" data-cn-lead="${safe(item.id)}"><span><strong>${safe(item.job_type||'Customer enquiry')}</strong><small>${safe(day(item.created_at))} · ${safe(leadStage(item))}</small></span><span aria-hidden="true">›</span></button>`).join(''):'<p class="cn-caption">No related enquiries match these saved contact details.</p>'}</section>
        <section class="cn-approved-info-card"><h2>NOTES</h2><p class="cn-approved-note">${safe(record.notes||'No internal notes added.')}</p><button class="cn-approved-outline" type="button" data-colzo-edit="clients" data-colzo-id="${safe(record.id)}">${record.notes?'Edit note':'Add note'}</button></section>`:
        `<section class="cn-approved-info-card"><h2>RECORDED ACTIVITY</h2><p class="cn-caption">Enquiries matched by saved email or phone. No activity is invented.</p>${related.length?related.slice(0,20).map(item=>`<button class="cn-approved-related" type="button" data-cn-lead="${safe(item.id)}"><span><strong>${safe(item.job_type||'General enquiry')}</strong><small>${safe(day(item.created_at))} · ${safe(leadStage(item))}</small></span><span aria-hidden="true">›</span></button>`).join(''):'<p class="cn-caption">No matching activity yet.</p>'}</section>`}
      <p class="cn-approved-boundary">Call and Email open your device apps. Colzo does not send messages automatically.</p>
    </section>`;
  }
  let body='';
  if(resource==='clients')body='<section class="cn-detail-panel cf-detail-panel"><h2>Contact details</h2><dl><div><dt>Full name</dt><dd>'+safe(record.full_name||'Not recorded')+'</dd></div><div><dt>Email</dt><dd>'+safe(record.email||'Not recorded')+'</dd></div><div><dt>Phone</dt><dd>'+safe(record.phone||'Not recorded')+'</dd></div><div><dt>Created</dt><dd>'+safe(day(record.created_at))+'</dd></div></dl></section><section class="cn-detail-panel cf-detail-panel"><h2>Notes</h2><p>'+safe(record.notes||'No notes recorded.')+'</p></section>';
  if(resource==='projects')body='<section class="cn-detail-panel cf-detail-panel"><h2>Project overview</h2><dl><div><dt>Customer</dt><dd>'+safe(record.client_name||'Not recorded')+'</dd></div><div><dt>Status</dt><dd>'+safe(record.status||'planned')+'</dd></div><div><dt>Progress</dt><dd>'+Number(record.progress||0)+'%</dd></div><div><dt>Created</dt><dd>'+safe(day(record.created_at))+'</dd></div></dl><div class="cf-progress"><i style="width:'+Math.max(0,Math.min(100,Number(record.progress)||0))+'%"></i></div></section><section class="cn-detail-panel cf-detail-panel"><h2>Project notes</h2><p>'+safe(record.notes||'No project notes recorded.')+'</p></section>';
  if(resource==='quotes'){const lead=records().enquiries.find(item=>String(item.id)===String(record.lead_id));body='<section class="cn-detail-panel cf-detail-panel"><h2>Quote overview</h2><dl><div><dt>Related enquiry</dt><dd>'+safe(lead?contact(lead):'No matching enquiry')+'</dd></div><div><dt>Amount</dt><dd>£'+Number(record.amount_gbp||0).toFixed(2)+'</dd></div><div><dt>Status</dt><dd>'+safe(record.status||'draft')+'</dd></div><div><dt>Created</dt><dd>'+safe(day(record.created_at))+'</dd></div></dl></section><section class="cn-detail-panel cf-detail-panel"><h2>Notes</h2><p>'+safe(record.notes||'No quote notes recorded.')+'</p></section><p class="cn-caption">This is a saved quote record, not an issued or emailed quote.</p>';}
  const heading=resource==='clients'?record.full_name:record.title;
  return '<div class="cf-screen-top">'+back+'</div><header class="cf-detail-contact"><span class="cn-avatar large">'+(resource==='quotes'?'£':safe(String(heading||'?').slice(0,1).toUpperCase()))+'</span><div><span class="cn-kicker">'+(resource==='clients'?'CUSTOMER PROFILE':resource==='projects'?'PROJECT DETAILS':'QUOTE DETAILS')+'</span><h1>'+safe(heading||'Untitled record')+'</h1><p>'+safe(resource==='clients'?'Saved customer':resource==='projects'?'Project record':'Saved quote')+'</p></div></header>'+body+'<div class="cf-detail-buttons">'+edit+'</div>';
 }
 async function loadMarketingDrafts(force=false){
  const requestEpoch=sessionEpoch;
  if(state.marketingLoading||(!force&&Array.isArray(state.marketingDrafts)))return;
  state.marketingLoading=true;state.marketingError='';
  if(state.screen==='marketing')render();
  try{if(typeof api!=='function')throw new Error('Marketing is unavailable in this preview.');const result=await api('/api/marketing?limit=50');if(requestEpoch!==sessionEpoch)return;if(!Array.isArray(result?.generations))throw new Error('Unexpected marketing response.');state.marketingDrafts=result.generations;state.marketingCanApprove=result.can_approve===true;state.marketingManualOnly=result.manual_only===true;if(state.marketingManualOnly){state.marketingView='drafts';state.marketingSchedulingDraft=null;}}
  catch(error){if(requestEpoch!==sessionEpoch)return;state.marketingError=error?.message||'Saved marketing drafts could not be loaded.'}
  finally{if(requestEpoch!==sessionEpoch)return;state.marketingLoading=false;if(state.screen==='marketing')render()}
 }
 async function loadMarketingSchedules(force=false){
  const requestEpoch=sessionEpoch;
  if(state.marketingSchedulesLoading||(!force&&Array.isArray(state.marketingSchedules)))return;
  state.marketingSchedulesLoading=true;state.marketingScheduleError='';if(state.screen==='marketing')render();
  try{const result=await api('/api/marketing-schedules');if(requestEpoch!==sessionEpoch)return;if(!Array.isArray(result?.schedules))throw new Error('Unexpected schedule response.');state.marketingSchedules=result.schedules}
  catch(error){if(requestEpoch!==sessionEpoch)return;state.marketingScheduleError=error?.message||'Scheduled posts could not be loaded.'}
  finally{if(requestEpoch!==sessionEpoch)return;state.marketingSchedulesLoading=false;if(state.screen==='marketing')render()}
 }
 async function saveMarketingSchedule(form){
  if(state.marketingScheduleBusy)return;
  const fd=new FormData(form),draftId=String(fd.get('generation_id')||''),localTime=String(fd.get('scheduled_for')||'');
  const draft=state.marketingDrafts?.find(item=>String(item.id)===draftId);
  const scheduled=new Date(localTime);
  const feedback=content.querySelector('#cnMarketingScheduleFeedback');
  if(!draft||draft.approval_status!=='approved'){if(feedback)feedback.textContent='Only an approved saved draft can be scheduled.';return}
  if(!localTime||!Number.isFinite(scheduled.getTime())||scheduled.getTime()<=Date.now()){if(feedback)feedback.textContent='Choose a future date and time.';return}
  state.marketingScheduleBusy=true;const button=form.querySelector('[type=submit]');if(button)button.disabled=true;if(feedback)feedback.textContent='Checking approval, connected publishing access and schedule limits…';
  try{const result=await api('/api/marketing-schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',generation_id:draftId,platform:'facebook',scheduled_for:scheduled.toISOString()})});if(!result?.schedule?.id)throw new Error('The server did not confirm the schedule.');state.marketingSchedulingDraft=null;state.marketingView='schedule';state.marketingFeedback='Scheduled item saved. Check its status below.';await loadMarketingSchedules(true)}
  catch(error){if(feedback)feedback.textContent=error?.message||'The schedule was not confirmed.'}
  finally{state.marketingScheduleBusy=false;if(state.screen==='marketing')render()}
 }
 async function cancelMarketingSchedule(id){
  if(state.marketingScheduleBusy||!id||!window.confirm('Cancel this scheduled post?'))return;
  state.marketingScheduleBusy=true;
  try{const result=await api('/api/marketing-schedules',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cancel',schedule_id:id})});if(result?.cancelled!==true)throw new Error('The server did not confirm cancellation.');state.marketingFeedback='Scheduled post cancelled.';await loadMarketingSchedules(true)}
  catch(error){state.marketingScheduleError=error?.message||'Cancellation was not confirmed.'}
  finally{state.marketingScheduleBusy=false;if(state.screen==='marketing')render()}
 }
 async function saveManualMarketingDraft(form){
  if(state.marketingBusy||!state.marketingManualOnly)return;
  const fd=new FormData(form),hashtags=String(fd.get('hashtags')||'').split(/\s+/).filter(Boolean).map(x=>x.startsWith('#')?x:'#'+x);
  const body={action:'create_manual',content_type:String(fd.get('content_type')||''),platform:String(fd.get('platform')||''),tone:String(fd.get('tone')||''),prompt:String(fd.get('prompt')||'').trim(),extra_instructions:'',output:{main_copy:String(fd.get('main_copy')||'').trim(),short_alternative:String(fd.get('short_alternative')||'').trim(),call_to_action:String(fd.get('call_to_action')||'').trim(),hashtags,missing_information:[]}};
  const feedback=content.querySelector('#cnMarketingFeedback'),button=form.querySelector('[type=submit]');
  if(!body.prompt||body.prompt.length>2000||!body.output.main_copy||body.output.main_copy.length>900||body.output.short_alternative.length>260||body.output.call_to_action.length>160||hashtags.length>6||hashtags.some(x=>x.length>300)){
   if(feedback)feedback.textContent='Check the required topic, post text and six-hashtag limit.';return;
  }
  state.marketingBusy=true;if(button)button.disabled=true;if(feedback)feedback.textContent='Saving your manual draft without an AI provider or publishing…';
  try{
   const result=await api('/api/marketing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(!result?.manual||!result?.id||result?.approval_status!=='draft')throw new Error('The manual draft save was not confirmed.');
   state.marketingForm=false;state.marketingFeedback='Manual draft saved for review. No AI generation, scheduling or publishing occurred.';
   await loadMarketingDrafts(true);
  }catch(error){if(feedback)feedback.textContent=error?.message||'The manual draft could not be confirmed.';state.marketingFeedback='';}
  finally{state.marketingBusy=false;if(state.screen==='marketing')render()}
 }
 async function generateMarketingDraft(form){
  if(state.marketingBusy)return;
  const data=new FormData(form),body={content_type:String(data.get('content_type')||''),platform:String(data.get('platform')||''),tone:String(data.get('tone')||''),prompt:String(data.get('prompt')||'').trim(),extra_instructions:String(data.get('extra_instructions')||'').trim()};
  const feedback=content.querySelector('#cnMarketingFeedback'),button=form.querySelector('[type=submit]');
  if(!body.prompt||body.prompt.length>2000){if(feedback)feedback.textContent='Describe what the post should cover (up to 2,000 characters).';return}
  state.marketingBusy=true;if(button)button.disabled=true;if(feedback)feedback.textContent='Generating a draft using your existing AI Marketing allowance…';
  try{const result=await api('/api/marketing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!result?.id||!result?.output)throw new Error('The server did not confirm the generated draft.');state.marketingForm=false;state.marketingFeedback='Draft generated and saved. It has not been approved or published.';await loadMarketingDrafts(true)}
  catch(error){if(feedback)feedback.textContent=error?.message||'Draft generation failed. No successful save was confirmed.';state.marketingFeedback=''}
  finally{state.marketingBusy=false;if(state.screen==='marketing')render()}
 }
 async function saveMarketingEdit(form){
  if(state.marketingBusy||!state.marketingEditing)return;
  const fd=new FormData(form),current=state.marketingEditing,old=current.output||{};
  const output={main_copy:String(fd.get('main_copy')||'').trim(),short_alternative:String(fd.get('short_alternative')||'').trim(),call_to_action:String(fd.get('call_to_action')||'').trim(),hashtags:String(fd.get('hashtags')||'').split(/\\s+/).filter(Boolean).map(x=>x.startsWith('#')?x:'#'+x),missing_information:Array.isArray(old.missing_information)?old.missing_information:[]};
  const feedback=content.querySelector('#cnMarketingEditFeedback');
  if(!output.main_copy){if(feedback)feedback.textContent='Main post text is required.';return}
  state.marketingBusy=true;
  try{await api('/api/marketing',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'edit',generation_id:current.id,output})});state.marketingEditing=null;state.marketingFeedback='Draft changes saved. Approval was reset; nothing was published.';await loadMarketingDrafts(true)}
  catch(error){if(feedback)feedback.textContent=error?.message||'Draft edits could not be saved.'}
  finally{state.marketingBusy=false;if(state.screen==='marketing')render()}
 }
 async function deleteMarketingDraft(id){
  if(state.marketingBusy||!id||!window.confirm('Delete this saved marketing draft?'))return;
  state.marketingBusy=true;
  try{await api('/api/marketing',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',generation_id:id})});state.marketingFeedback='Draft deleted.';state.marketingEditing=null;await loadMarketingDrafts(true)}
  catch(error){state.marketingError=error?.message||'Draft could not be deleted.'}
  finally{state.marketingBusy=false;if(state.screen==='marketing')render()}
 }
 async function prepareMarketingApproval(id){
  if(!state.marketingCanApprove||state.marketingBusy)return;
  const draft=state.marketingDrafts?.find(item=>String(item.id)===String(id)&&item.approval_status!=='approved');
  if(!draft||!draft.output)return;
  state.marketingApprovalDraft=draft;state.marketingApprovalPreview=null;state.marketingApprovalError='';state.marketingApprovalLoading=draft.platform==='facebook';
  render({motion:'detail'});
  if(draft.platform!=='facebook'){
   // Non-Facebook channels have no caption review hash in the existing backend.
   // Display exactly the saved text and ask for separate explicit approval.
   state.marketingApprovalPreview={caption:String(draft.output.main_copy||draft.output.text||''),caption_sha256:null};
   state.marketingApprovalLoading=false;render();return;
  }
  const epoch=sessionEpoch;
  try{
   const output=draft.output||{};
   const response=await api('/api/marketing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    action:'preview',generation_id:draft.id,output:{
     main_copy:String(output.main_copy||''),
     call_to_action:String(output.call_to_action||''),
     hashtags:Array.isArray(output.hashtags)?output.hashtags:[]
    }
   })});
   if(epoch!==sessionEpoch||state.marketingApprovalDraft?.id!==draft.id)return;
   if(typeof response?.caption!=='string'||!/^[0-9a-f]{64}$/i.test(response.caption_sha256||''))throw new Error('The reviewed Facebook caption was not verified.');
   state.marketingApprovalPreview=response;
  }catch(error){if(epoch===sessionEpoch)state.marketingApprovalError=error?.message||'Could not verify this Facebook preview.'}
  finally{if(epoch===sessionEpoch){state.marketingApprovalLoading=false;if(state.screen==='marketing')render()}}
 }
 async function approveMarketingDraft(){
  const draft=state.marketingApprovalDraft,preview=state.marketingApprovalPreview;
  if(!state.marketingCanApprove||state.marketingBusy||!draft||!preview)return;
  if(draft.platform==='facebook'&&!/^[0-9a-f]{64}$/i.test(preview.caption_sha256||''))return;
  if(!window.confirm('Approve this exact saved draft? This does not schedule or publish a post.'))return;
  state.marketingBusy=true;state.marketingApprovalError='';
  const epoch=sessionEpoch;
  try{
   const body={action:'approve',generation_id:draft.id};
   if(draft.platform==='facebook')body.preview_sha256=preview.caption_sha256;
   const result=await api('/api/marketing',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(epoch!==sessionEpoch)return;
   if(result?.generation?.id!==draft.id||result?.generation?.approval_status!=='approved')throw new Error('The approval was not confirmed by the server.');
   state.marketingApprovalDraft=null;state.marketingApprovalPreview=null;
   state.marketingFeedback='Draft approved. It is not scheduled or published.';
   await loadMarketingDrafts(true);
  }catch(error){if(epoch===sessionEpoch)state.marketingApprovalError=error?.message||'Approval could not be confirmed. The draft remains unapproved.'}
  finally{if(epoch===sessionEpoch){state.marketingBusy=false;if(state.screen==='marketing')render()}}
 }
 async function inspectMarketingMedia(id){
  if(state.marketingImageLoading||state.marketingBusy)return;
  const draft=state.marketingDrafts?.find(item=>String(item.id)===String(id));
  if(!draft)return;
  state.marketingImageDraft=draft;state.marketingImageResult=null;state.marketingImageError='';
  state.marketingImageLoading=true;render({motion:'detail'});
  const epoch=sessionEpoch;
  try{
   // An authenticated read only: never calls image generation or upload.
   const result=await api('/api/marketing-images?generation_id='+encodeURIComponent(draft.id));
   if(epoch!==sessionEpoch||state.marketingImageDraft?.id!==draft.id)return;
   if(!result||typeof result!=='object'||!('image' in result))throw new Error('Unexpected marketing image response.');
   if(result.image&&String(result.image.generation_id)!==String(draft.id))throw new Error('Media belongs to a different draft.');
   state.marketingImageResult=result;
  }catch(error){
   if(epoch===sessionEpoch)state.marketingImageError=error?.message||'Could not load the saved media status.';
  }finally{
   if(epoch===sessionEpoch){state.marketingImageLoading=false;if(state.screen==='marketing')render({motion:'detail'});}
  }
 }
 function marketing(){
  const drafts=Array.isArray(state.marketingDrafts)?state.marketingDrafts:[];
  const schedules=Array.isArray(state.marketingSchedules)?state.marketingSchedules:[];
  const scheduleForm=state.marketingSchedulingDraft?'<section class="cn-detail-panel cn-colzo-record-form"><form id="cnMarketingScheduleForm"><h2>Schedule approved draft</h2><p class="cn-caption">'+safe(state.marketingSchedulingDraft.request_text||'Approved marketing draft')+'</p><label>Facebook publish date and time<input name="scheduled_for" type="datetime-local" required></label><input type="hidden" name="generation_id" value="'+safe(state.marketingSchedulingDraft.id)+'"><p class="cn-caption">Scheduling can publish this approved content on Facebook at the chosen time. The server will verify connection, approval and daily limits before saving.</p><p id="cnMarketingScheduleFeedback" class="cn-caption" role="status"></p><div class="cn-form-actions"><button class="cn-primary" type="submit">Schedule post</button><button class="cn-secondary" type="button" data-marketing-cancel-schedule>Cancel</button></div></form></section>':'';
  const manualCreate="<section class=\"cn-detail-panel cn-colzo-record-form\"><form id=\"cnMarketingManualForm\"><h2>Write a Marketing draft</h2><p class=\"cn-caption\">Free pilot: save and review your own text. AI generation and publishing are disabled.</p><label>Content type<select name=\"content_type\"><option value=\"social_post\">Social post</option><option value=\"caption\">Caption</option><option value=\"promotional_post\">Promotional post</option><option value=\"announcement\">Announcement</option><option value=\"offer\">Offer</option><option value=\"event\">Event</option><option value=\"update\">Update</option></select></label><label>Platform<select name=\"platform\"><option value=\"facebook\">Facebook</option><option value=\"instagram\">Instagram</option><option value=\"linkedin\">LinkedIn</option><option value=\"general\">General</option></select></label><label>Tone<select name=\"tone\"><option value=\"friendly\">Friendly</option><option value=\"professional\">Professional</option><option value=\"casual\">Casual</option><option value=\"promotional\">Promotional</option></select></label><label>Draft topic<textarea name=\"prompt\" rows=\"2\" maxlength=\"2000\" required></textarea></label><label>Post text<textarea name=\"main_copy\" rows=\"6\" maxlength=\"900\" required></textarea></label><label>Short alternative (optional)<textarea name=\"short_alternative\" rows=\"2\" maxlength=\"260\"></textarea></label><label>Call to action (optional)<input name=\"call_to_action\" maxlength=\"160\"></label><label>Hashtags (optional, up to six)<textarea name=\"hashtags\" rows=\"2\" maxlength=\"600\"></textarea></label><p id=\"cnMarketingFeedback\" class=\"cn-caption\" role=\"status\">Saved as a draft only. Review before use.</p><div class=\"cn-form-actions\"><button class=\"cn-primary\" type=\"submit\">Save manual draft</button><button class=\"cn-secondary\" type=\"button\" data-marketing-cancel>Cancel</button></div></form></section>";
  const create=state.marketingForm?(state.marketingManualOnly?manualCreate:'<section class="cn-detail-panel cn-colzo-record-form"><form id="cnMarketingForm"><h2>Create a marketing draft</h2><label>Content type<select name="content_type"><option value="social_post">Social post</option><option value="caption">Caption</option><option value="promotional_post">Promotional post</option><option value="announcement">Announcement</option><option value="offer">Offer</option><option value="event">Event</option><option value="update">Update</option></select></label><label>Platform<select name="platform"><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="linkedin">LinkedIn</option><option value="general">General</option></select></label><label>Tone<select name="tone"><option value="friendly">Friendly</option><option value="professional">Professional</option><option value="casual">Casual</option><option value="promotional">Promotional</option></select></label><label>What should the post cover?<textarea name="prompt" rows="4" maxlength="2000" required placeholder="Describe the service, update or offer. Avoid unverified claims."></textarea></label><label>Extra instructions (optional)<textarea name="extra_instructions" rows="2" maxlength="1000"></textarea></label><p id="cnMarketingFeedback" class="cn-caption" role="status">Generation uses your existing AI Marketing allowance. Nothing publishes automatically.</p><div class="cn-form-actions"><button class="cn-primary" type="submit">Generate and save draft</button><button class="cn-secondary" type="button" data-marketing-cancel>Cancel</button></div></form></section>'):'';
  const editor=state.marketingEditing?'<section class="cn-detail-panel cn-colzo-record-form"><form id="cnMarketingEditForm"><h2>Edit saved draft</h2><label>Main post text<textarea name="main_copy" rows="6" maxlength="5000" required>'+safe(state.marketingEditing.output?.main_copy||'')+'</textarea></label><label>Short alternative<textarea name="short_alternative" rows="3" maxlength="2000">'+safe(state.marketingEditing.output?.short_alternative||'')+'</textarea></label><label>Call to action<input name="call_to_action" maxlength="500" value="'+safe(state.marketingEditing.output?.call_to_action||'')+'"></label><label>Hashtags<textarea name="hashtags" rows="2" maxlength="1000">'+safe((state.marketingEditing.output?.hashtags||[]).join(' '))+'</textarea></label><p id="cnMarketingEditFeedback" class="cn-caption" role="status">Saving edits resets approval. This will not publish the post.</p><div class="cn-form-actions"><button class="cn-primary" type="submit">Save edits</button><button class="cn-secondary" type="button" data-marketing-cancel>Cancel</button></div></form></section>':'';
  const review=state.marketingApprovalDraft?(()=>{
    const draft=state.marketingApprovalDraft,p=state.marketingApprovalPreview;
    return '<section class="cn-detail-panel cn-marketing-approval" aria-label="Review saved marketing draft">'+
     '<div class="cn-section-bar"><h2>Review before approving</h2><span class="cn-pill attention">Not published</span></div>'+
     '<p class="cn-caption">Platform: '+safe(draft.platform||'general')+'. Approval does not publish or schedule the post.</p>'+
     (state.marketingApprovalLoading?'<p class="cn-caption" role="status">Verifying the saved caption…</p>':'')+
     (state.marketingApprovalError?'<p class="cn-settings-error" role="alert">'+safe(state.marketingApprovalError)+'</p>':'')+
     (p?'<div class="cn-marketing-caption"><p>'+safe(p.caption||'').replace(/\n/g,'<br>')+'</p></div>'+
        '<p class="cn-caption">'+(draft.platform==='facebook'?'This is the verified Facebook caption, including the saved call to action and hashtags.':'This is the saved content for review. Platform publication remains separately configured.')+'</p>':'')+
     '<div class="cn-form-actions"><button type="button" class="cn-primary" data-marketing-approve '+(!p||state.marketingBusy?'disabled':'')+'>Approve draft</button><button type="button" class="cn-secondary" data-marketing-cancel-review>Close review</button></div></section>';
   })():'';
  const approvalQueue=state.marketingCanApprove?drafts.filter(d=>d.approval_status!=='approved'&&d.output).map(d=>
   '<button type="button" class="cn-marketing-review-link" data-marketing-review="'+safe(d.id)+'"><span><strong>'+safe(d.request_text||'Saved marketing draft')+'</strong><small>'+safe(d.platform||'general')+' · Needs approval</small></span><span aria-hidden="true">Review ›</span></button>').join(''):'';
  const reviewQueue=approvalQueue?'<section class="cn-detail-panel"><div class="cn-section-bar"><h2>Awaiting approval</h2><span class="cn-pill attention">Owner review</span></div><p class="cn-caption">Review the exact saved draft before it may be scheduled. Nothing publishes automatically.</p>'+approvalQueue+'</section>':'';
  const media=state.marketingImageDraft?(()=>{
   const draft=state.marketingImageDraft,r=state.marketingImageResult,img=r?.image;
   let secureImage='';
   if(img?.status==='completed'&&typeof img?.image_url==='string'&&/^https:\/\//i.test(img.image_url)&&
      ['image/png','image/jpeg','image/webp'].includes(img.mime_type)){
    try{const url=new URL(img.image_url);if(!url.username&&!url.password&&!url.port)secureImage=url.toString()}catch{}
   }
   return '<section class="cn-detail-panel cn-marketing-media" aria-label="Saved marketing image status"><div class="cn-section-bar"><h2>Saved image</h2><span class="cn-pill progress">Read-only</span></div>'+
     '<p class="cn-caption">'+safe(draft.request_text||'Saved marketing draft')+'</p>'+
     (state.marketingImageLoading?'<p class="cn-caption" role="status">Checking saved media…</p>':'')+
     (state.marketingImageError?'<p class="cn-settings-error" role="alert">'+safe(state.marketingImageError)+'</p>':'')+
     (img?'<dl><div><dt>Status</dt><dd>'+safe(img.status||'Unknown')+'</dd></div><div><dt>Source</dt><dd>'+safe(img.provider||'Not recorded')+'</dd></div><div><dt>Size</dt><dd>'+safe(img.width&&img.height?img.width+' × '+img.height:'Not recorded')+'</dd></div></dl>'+
        (secureImage?'<img class="cn-marketing-media-preview" src="'+safe(secureImage)+'" alt="Previously saved marketing image for this business" loading="lazy" referrerpolicy="no-referrer">':
        '<p class="cn-caption">'+safe(img.status==='simulated'?'Simulation only - no actual image was created.':img.status==='completed'?'A valid saved-image preview is currently unavailable.':'No completed image available.')+'</p>')+
        (img.failure_message?'<p class="cn-settings-error" role="status">'+safe(img.failure_message)+'</p>':''):
        (!state.marketingImageLoading&&!state.marketingImageError?'<p class="cn-caption">No media has been saved for this draft.</p>':''))+
     '<p class="cn-caption">Checking this image does not generate, edit, approve or publish content.</p>'+
     '<button type="button" class="cn-secondary" data-marketing-media-close>Close media details</button></section>';
  })():'';
  const list=drafts.map(d=>'<article class="cn-detail-panel cn-marketing-card"><div class="cn-section-bar"><span class="cn-kicker">'+safe(d.platform||'general')+' · '+safe(d.content_type||'post')+'</span><span class="cn-pill '+(d.approval_status==='approved'?'success':'attention')+'">'+safe(d.approval_status||'draft')+'</span></div><h2>'+safe(d.request_text||'Marketing draft')+'</h2><p>'+safe(d.output?.main_copy||d.output?.text||'Draft content unavailable.')+'</p><small class="cn-caption">Created '+safe(day(d.created_at))+' · Not published by this screen</small><div class="cn-form-actions">'+(state.marketingManualOnly?'':'<button class="cn-secondary" type="button" data-marketing-media="'+safe(d.id)+'">View image</button>')+'<button class="cn-secondary" type="button" data-marketing-edit="'+safe(d.id)+'">Edit draft</button><button class="cn-secondary" type="button" data-marketing-delete="'+safe(d.id)+'">Delete</button>'+(d.approval_status==='approved'&&!state.marketingManualOnly?'<button class="cn-primary" type="button" data-marketing-schedule="'+safe(d.id)+'">Schedule</button>':'')+'</div></article>').join('');
  const scheduleList=schedules.map(item=>'<article class="cn-detail-panel"><div class="cn-section-bar"><span class="cn-kicker">'+safe(item.platform||'facebook')+' · '+safe(item.status||'scheduled')+'</span><span class="cn-pill '+(item.status==='posted'?'success':item.status==='failed'?'attention':'progress')+'">'+safe(item.status||'scheduled')+'</span></div><h2>'+safe(item.generation?.request_text||'Scheduled post')+'</h2><p>'+safe(item.generation?.main_copy||'Saved content unavailable.')+'</p><p class="cn-caption">'+safe(item.scheduled_for?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.scheduled_for)):'Time not recorded')+'</p>'+(item.status==='scheduled'?'<button type="button" class="cn-secondary" data-marketing-cancel-item="'+safe(item.id)+'">Cancel schedule</button>':'')+(item.failure_message?'<p class="cn-caption" role="status">'+safe(item.failure_message)+'</p>':'')+'</article>').join('');
  const nav=state.marketingManualOnly?'':'<div class="cf-tabs cf-project-tabs" role="group" aria-label="Marketing sections"><button type="button" data-marketing-view="drafts" aria-pressed="'+(state.marketingView==='drafts')+'">Draft library</button><button type="button" data-marketing-view="schedule" aria-pressed="'+(state.marketingView==='schedule')+'">Schedule</button></div>';
  const listBody=state.marketingView==='drafts'?(state.marketingLoading?empty('Loading saved drafts…'):state.marketingError?empty(state.marketingError,'<button type="button" data-marketing-refresh>Try again</button>'):(list||empty('No saved marketing drafts yet. Create one when you are ready.'))):(state.marketingSchedulesLoading?empty('Loading scheduled posts…'):state.marketingScheduleError?empty(state.marketingScheduleError,'<button type="button" data-marketing-refresh-schedules>Try again</button>'):(scheduleList||empty('No scheduled posts found.')));
  return '<header class="cf-screen-top"><div><span class="cn-kicker">CONTENT STUDIO</span><h1>Marketing</h1></div><button type="button" class="cf-icon-button volt" data-marketing-create aria-label="Create marketing draft">+</button></header><p class="cn-caption">'+(state.marketingManualOnly?'Free pilot: write and review manual drafts. AI generation and publishing are disabled.':'Create, review and manage saved drafts and scheduled posts.')+'</p>'+nav+(state.marketingFeedback?'<p class="cn-work-message" role="status">'+safe(state.marketingFeedback)+'</p>':'')+create+editor+scheduleForm+review+media+reviewQueue+listBody+'<p class="cn-caption"><div class="cn-knowledge-related"><span>'+(state.marketingManualOnly?'Review your statements before using them.':'AI drafts rely on approved business facts.')+'</span><button class="cn-secondary" type="button" data-cn-screen="knowledge">Manage Business Knowledge →</button></div>'+(state.marketingManualOnly?'Manual drafts are not generated, scheduled or published by Colzo during this pilot.':'Draft generation never auto-publishes. Scheduling is explicit and only permitted for approved drafts.')+'</p>';
 }
 async function loadPublicProfile(force=false){
  const requestEpoch=sessionEpoch;
  if(state.publicProfileLoading||(!force&&state.publicProfileData))return;
  state.publicProfileLoading=true;state.publicProfileError='';if(state.screen==='publicProfile')render();
  try{const result=await api('/api/business-profile');if(requestEpoch!==sessionEpoch)return;if(!result?.profile)throw new Error('Unexpected public profile response.');state.publicProfileData=result}
  catch(error){if(requestEpoch!==sessionEpoch)return;state.publicProfileError=error?.message||'Public profile could not be loaded.'}
  finally{if(requestEpoch!==sessionEpoch)return;state.publicProfileLoading=false;if(state.screen==='publicProfile')render()}
 }
 async function savePublicProfile(form){
  if(state.publicProfileBusy)return;
  const current=state.publicProfileData,fd=new FormData(form),body={};
  for(const key of ['business_name','business_type','phone','email','opening_hours','services','description','website','service_areas'])body[key]=String(fd.get(key)||'').trim();
  if(!body.business_name){const f=content.querySelector('#cnPublicProfileFeedback');if(f)f.textContent='Business name is required.';return}
  state.publicProfileBusy=true;const button=form.querySelector('[type=submit]');if(button)button.disabled=true;const feedback=content.querySelector('#cnPublicProfileFeedback');if(feedback)feedback.textContent='Saving public profile details…';
  try{const result=await api('/api/business-profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!result?.profile)throw new Error('The server did not confirm the profile save.');state.publicProfileData=result;state.publicProfileFeedback='Public profile changes saved.';state.publicProfileError='';render({motion:'page'})}
  catch(error){if(feedback)feedback.textContent=error?.message||'The public profile was not confirmed as saved.'}
  finally{state.publicProfileBusy=false;const btn=content.querySelector('#cnPublicProfileForm [type=submit]');if(btn)btn.disabled=false}
 }
 async function uploadNativeProfileMedia(file,slot){
  if(state.publicMediaBusy||state.publicProfileBusy||state.publicProfileData?.can_edit!==true||state.publicProfileData?.can_upload_media===false||!['avatar','banner'].includes(slot)||!file)return;
  const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
  const name=String(file.name||''),ext=name.split('.').pop().toLowerCase(),mime=types[ext];
  if(!mime||mime!==file.type||file.size<1||file.size>8*1024*1024||name.length>240||name.includes('/')||name.includes('\\')){
    state.publicMediaFeedback='Choose a JPG, PNG or WebP image up to 8 MB with a matching file extension.';render();return;
  }
  if(typeof supabaseClient==='undefined'||!supabaseClient?.storage?.from){
    state.publicMediaFeedback='Private image uploads are unavailable. Nothing was uploaded.';render();return;
  }
  const epoch=sessionEpoch;
  state.publicMediaBusy=true;state.publicMediaFeedback='Preparing a private image upload…';render();
  try{
   const metadata={slot,file_name:name,mime_type:mime,size_bytes:file.size};
   const prepared=await api('/api/business-profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'prepare_upload',...metadata})});
   if(epoch!==sessionEpoch)return;
   if(prepared?.bucket!=='business-profile-media'||!prepared.path||!prepared.token||prepared.slot!==slot)throw new Error('The private image upload could not be prepared.');
   state.publicMediaFeedback='Uploading privately…';render();
   const storage=supabaseClient.storage.from(prepared.bucket);
   const result=await storage.uploadToSignedUrl(prepared.path,prepared.token,file,{contentType:mime});
   if(result?.error)throw new Error('The file was not uploaded successfully.');
   if(epoch!==sessionEpoch)return;
   state.publicMediaFeedback='Verifying your saved image…';render();
   const confirmed=await api('/api/business-profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'finalize_upload',path:prepared.path,...metadata})});
   if(epoch!==sessionEpoch)return;
   const column=slot==='avatar'?'profile_image_path':'profile_banner_path';
   if(!confirmed?.profile||confirmed.profile[column]!==prepared.path)throw new Error('The server did not confirm the saved image.');
   state.publicProfileData=confirmed;
   state.publicMediaFeedback=slot==='avatar'?'Business logo saved.':'Business cover image saved.';
   state.publicProfileError='';
  }catch(error){
   if(epoch===sessionEpoch)state.publicMediaFeedback=error?.message||'Image upload could not be confirmed. Your previous image is unchanged.';
  }finally{
   if(epoch===sessionEpoch){state.publicMediaBusy=false;if(state.screen==='publicProfile')render({motion:'page'});}
  }
 }
 async function removeNativeProfileMedia(slot){
  if(state.publicMediaBusy||state.publicProfileBusy||state.publicProfileData?.can_edit!==true||!['avatar','banner'].includes(slot))return;
  const current=state.publicProfileData.profile,column=slot==='avatar'?'profile_image_path':'profile_banner_path';
  if(!current?.[column])return;
  if(!window.confirm('Remove this '+(slot==='avatar'?'business logo':'cover image')+'? Customers will no longer see it.'))return;
  const epoch=sessionEpoch;
  state.publicMediaBusy=true;state.publicMediaFeedback='Removing the saved image…';render();
  try{
   const result=await api('/api/business-profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove_media',slot})});
   if(epoch!==sessionEpoch)return;
   if(!result?.profile||result.profile[column])throw new Error('The server did not confirm image removal.');
   state.publicProfileData=result;state.publicMediaFeedback='Image removed from the business profile.';
   state.publicProfileError='';
  }catch(error){
   if(epoch===sessionEpoch)state.publicMediaFeedback=error?.message||'Could not confirm image removal.';
  }finally{
   if(epoch===sessionEpoch){state.publicMediaBusy=false;if(state.screen==='publicProfile')render({motion:'page'});}
  }
 }
 function publicProfile(){
  const d=state.publicProfileData?.profile,canEdit=state.publicProfileData?.can_edit===true;
  const field=(name,label,type='text',max=500)=>'<label>'+label+'<input name="'+name+'" type="'+type+'" maxlength="'+max+'" value="'+safe(d?.[name]||'')+'" '+(!canEdit?'disabled':'')+'></label>';
  const mediaDisabled=(state.publicMediaBusy||state.publicProfileBusy)?'disabled':'';
  const uploadDisabled=state.publicProfileData?.can_upload_media===false?'disabled':mediaDisabled;
  const area=(name,label,max)=>'<label>'+label+'<textarea name="'+name+'" rows="3" maxlength="'+max+'" '+(!canEdit?'disabled':'')+'>'+safe(d?.[name]||'')+'</textarea></label>';
  return '<header class="cf-screen-top"><div><span class="cn-kicker">PUBLIC BUSINESS PAGE</span><h1>Public profile</h1></div><button class="cf-icon-button" type="button" data-public-profile-refresh aria-label="Refresh public profile">↻</button></header><p class="cn-caption">Manage the verified details customers see on your business page.</p>'+(state.publicProfileLoading?empty('Loading public profile…'):'')+(state.publicProfileError?empty(state.publicProfileError,'<button type="button" data-public-profile-refresh>Try again</button>'):'')+(d?'<section class="cn-detail-panel"><h2>Customer-facing preview</h2>'+(d.profile_banner_url?'<img class="cn-public-banner" src="'+safe(d.profile_banner_url)+'" alt="Business banner">':'')+(d.profile_image_url?'<img class="cn-public-avatar" src="'+safe(d.profile_image_url)+'" alt="Business profile image">':'')+'<h3>'+safe(d.business_name||'Business name not set')+'</h3><p>'+safe(d.description||'No public description yet.')+'</p><p class="cn-caption">'+safe(d.public_slug?'Public link is configured':'Public link not configured')+'</p>'+(d.preview_path?'<a class="cn-text-action" href="'+safe(d.preview_path)+'" target="_blank" rel="noopener">Preview public page ↗</a>':'')+'</section><section class="cn-detail-panel cn-profile-media-controls"><h2>Logo and cover image</h2><p class="cn-caption">Use your own JPG, PNG or WebP images (maximum 8 MB). The server checks the actual file content before changing your public profile.</p>'+
  (state.publicProfileData?.can_upload_media===false?'<p class="cn-caption">Image uploads are unavailable in this pilot. You can still edit your business details.</p>':'')+
  (state.publicMediaFeedback?'<p class="cn-work-message" role="status">'+safe(state.publicMediaFeedback)+'</p>':'')+
  (canEdit?'<input type="file" id="cnPublicMediaInput" hidden accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp">'+
    '<div class="cn-form-actions"><button type="button" class="cn-secondary" data-public-media-upload="avatar" '+uploadDisabled+'>Upload logo</button>'+
    (d.profile_image_path?'<button type="button" class="cn-secondary" data-public-media-remove="avatar" '+mediaDisabled+'>Remove logo</button>':'')+'</div>'+
    '<div class="cn-form-actions"><button type="button" class="cn-secondary" data-public-media-upload="banner" '+uploadDisabled+'>Upload cover</button>'+
    (d.profile_banner_path?'<button type="button" class="cn-secondary" data-public-media-remove="banner" '+mediaDisabled+'>Remove cover</button>':'')+'</div>':
    '<p class="cn-caption">Only owners and administrators can change these images.</p>')+
  '</section><section class="cn-detail-panel cn-colzo-record-form"><form id="cnPublicProfileForm">'+field('business_name','Business name','text',120)+field('business_type','Business type','text',120)+field('phone','Phone','tel',80)+field('email','Contact email','email',160)+field('website','Website','url',2048)+area('description','Public description',2000)+area('services','Services',4000)+area('opening_hours','Opening hours',500)+area('service_areas','Service areas',500)+'<p class="cn-caption" id="cnPublicProfileFeedback" role="status">'+safe(state.publicProfileFeedback)+'</p>'+(canEdit?'<button class="cn-primary" type="submit">Save public profile</button>':'<p class="cn-caption">You have read-only access to this profile.</p>')+'</form></section>':'');
 }
 async function loadAutomation(force=false){
  const requestEpoch=sessionEpoch;
  if(state.automationLoading||(!force&&state.automationData))return;
  state.automationLoading=true;state.automationError='';if(state.screen==='automations')render();
  try{const result=await api('/api/marketing-automation');if(requestEpoch!==sessionEpoch)return;if(!result||typeof result!=='object')throw new Error('Unexpected automation response.');state.automationData=result}
  catch(error){if(requestEpoch!==sessionEpoch)return;state.automationError=error?.message||'Automation settings could not be loaded.'}
  finally{if(requestEpoch!==sessionEpoch)return;state.automationLoading=false;if(state.screen==='automations')render()}
 }
 async function pauseNativeMarketingAutomation(){
  const data=state.automationData,settings=data?.settings;
  if(state.automationBusy||data?.can_pause!==true||settings?.enabled!==true)return;
  if(!window.confirm('Pause Marketing automation for this business? No draft will be generated or posted by this action.'))return;
  const epoch=sessionEpoch;
  state.automationBusy=true;state.automationError='';state.automationFeedback='Pausing automation…';render();
  try{
   // Existing server requires all fields. Only disable (never enable); backend
   // forcibly resets mode to approval_required and rechecks tenant/role.
   const body={
     enabled:false,mode:'approval_required',
     tone:['professional','friendly','casual','promotional'].includes(settings.tone)?settings.tone:'professional',
     image_enabled:false,
     posts_per_day:[1,2,3].includes(Number(settings.posts_per_day))?Number(settings.posts_per_day):1
   };
   const result=await api('/api/marketing-automation',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(epoch!==sessionEpoch)return;
   if(!result?.settings||result.settings.enabled!==false||result.settings.mode!=='approval_required')
     throw new Error('The server did not confirm that automation was paused.');
   state.automationData={...data,settings:result.settings};
   state.automationFeedback='Marketing automation paused and saved. No automation was run.';
  }catch(error){
   if(epoch===sessionEpoch){state.automationError=error?.message||'Could not confirm automation was paused.';state.automationFeedback='';}
  }finally{if(epoch===sessionEpoch){state.automationBusy=false;if(state.screen==='automations')render();}}
 }
 async function saveNativeMarketingStrategy(form){
  if(state.automationPlanningBusy||state.automationData?.can_pause!==true||!state.automationData?.settings)return;
  const fd=new FormData(form),saved=state.automationData.settings;
  const pillars=Object.fromEntries(['services','completed_work','advice','trust','offers'].map(key=>[key,Number(fd.get('pillar_'+key))]));
  const brand_voice=Object.fromEntries(['tone','length','emojis','hashtags','sales_style','perspective','local_mentions','avoid_phrases'].map(key=>[key,String(fd.get('voice_'+key)||'')]));
  const strategy={
   primary_goal:String(fd.get('primary_goal')||''),
   posts_per_week:Number(fd.get('posts_per_week')),
   preferred_time:String(fd.get('preferred_time')||''),
   pillars,brand_voice
  };
  const validGoal=['more_enquiries','promote_service','show_work','build_trust','helpful_advice','share_offer'].includes(strategy.primary_goal);
  const total=Object.values(pillars).reduce((sum,n)=>sum+n,0);
  const feedback=form.querySelector('#cnAutomationPlanFeedback');
  if(!validGoal||!Number.isInteger(strategy.posts_per_week)||strategy.posts_per_week<2||strategy.posts_per_week>7||
     !/^([01]\d|2[0-3]):[0-5]\d$/.test(strategy.preferred_time)||
     Object.values(pillars).some(n=>!Number.isInteger(n)||n<0||n>100)||total!==100||brand_voice.avoid_phrases.length>500){
    if(feedback)feedback.textContent='Check the goal, frequency and time. Content percentages must be whole numbers that total 100%.';
    return;
  }
  if(!window.confirm('Save this Marketing strategy? This does not generate content, schedule posts or enable automation.'))return;
  const epoch=sessionEpoch;
  state.automationPlanningBusy=true;
  const button=form.querySelector('[type="submit"]');if(button)button.disabled=true;
  if(feedback)feedback.textContent='Saving your business strategy…';
  try{
   // Only save planning fields; an existing weekly plan remains unchanged.
   // This API path does NOT call Marketing generation, run_now or Meta.
   const body={action:'planning_save',strategy,weekly_plan:Array.isArray(saved.weekly_plan)?saved.weekly_plan:[]};
   const result=await api('/api/marketing-automation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(epoch!==sessionEpoch)return;
   const returned=result?.settings?.strategy;
   if(!returned||returned.primary_goal!==strategy.primary_goal||returned.posts_per_week!==strategy.posts_per_week||
      returned.preferred_time!==strategy.preferred_time||Object.keys(pillars).some(key=>returned.pillars?.[key]!==pillars[key])||
      result.settings.enabled!==saved.enabled)throw new Error('The server did not confirm the saved strategy without changing automation status.');
   state.automationData={...state.automationData,settings:result.settings};
   state.automationEditing=false;state.automationFeedback='Marketing strategy saved. No posts were generated or scheduled.';state.automationError='';
  }catch(error){if(epoch===sessionEpoch&&feedback)feedback.textContent=error?.message||'Could not confirm strategy save.';}
  finally{if(epoch===sessionEpoch){state.automationPlanningBusy=false;if(state.screen==='automations'&&!state.automationEditing)render({motion:'page'});else if(button?.isConnected)button.disabled=false}}
 }
 function automations(){
  const d=state.automationData,s=d?.settings,u=d?.usage;
  const current=s?.strategy||{},mix=current.pillars||{},
    voice=current.brand_voice||{},canEdit=d?.can_pause===true;
  const goals=[['more_enquiries','Get more enquiries'],['promote_service','Promote services'],['show_work','Show completed work'],['build_trust','Build trust'],['helpful_advice','Share helpful advice'],['share_offer','Share an approved offer']];
  const brands={
   tone:['professional','friendly','casual'],length:['short','balanced','detailed'],
   emojis:['never','sometimes','often'],hashtags:['none','light','standard'],
   sales_style:['subtle','balanced','promotional'],perspective:['we','i','business_name'],
   local_mentions:['when_relevant','avoid']
  };
  const fieldSelect=(name,label,choices,selected)=>'<label>'+label+'<select name="'+safe(name)+'">'+choices.map(([v,t])=>
   '<option value="'+safe(v)+'" '+(selected===v?'selected':'')+'>'+safe(t)+'</option>').join('')+'</select></label>';
  const optionValues=(values)=>values.map(v=>[v,v.replace(/_/g,' ')]);
  const defaults={services:30,completed_work:25,advice:20,trust:15,offers:10};
  const strategyInputs=fieldSelect('primary_goal','Primary goal',goals,current.primary_goal||'more_enquiries')+
   fieldSelect('posts_per_week','Posts per week',[2,3,4,5,6,7].map(n=>[String(n),String(n)+' posts']),String(current.posts_per_week||4))+
   '<label>Preferred time<input type="time" name="preferred_time" required value="'+safe(current.preferred_time||'18:30')+'"></label>'+
   '<h3>Content mix</h3><p class="cn-caption">Whole percentages must total 100%. Offers must be supported by approved business facts.</p>'+
   '<div class="cn-automation-pillar-grid">'+Object.keys(defaults).map(key=>
     '<label>'+safe(key.replace(/_/g,' '))+' (%)<input type="number" name="pillar_'+key+'" min="0" max="100" step="1" required value="'+safe(Number.isInteger(mix[key])?mix[key]:defaults[key])+'"></label>').join('')+'</div>'+
   '<h3>Brand voice</h3>'+
   Object.entries(brands).map(([key,values])=>
     fieldSelect('voice_'+key,key.replace(/_/g,' '),optionValues(values),voice[key]||({tone:'friendly',length:'balanced',emojis:'sometimes',hashtags:'light',sales_style:'balanced',perspective:'we',local_mentions:'when_relevant'}[key]))).join('')+
   '<label>Words or phrases to avoid<textarea name="voice_avoid_phrases" maxlength="500" rows="3">'+safe(voice.avoid_phrases||'')+'</textarea></label>';
  const strategyPanel='<section class="cn-detail-panel cn-colzo-record-form"><div class="cn-section-bar"><h2>Marketing content strategy</h2><span class="cn-pill progress">'+(current.primary_goal?'Saved':'Not configured')+'</span></div>'+
   '<p class="cn-caption">Planning only. Saving a strategy does not generate posts, call image providers, enable automation or publish content.</p>'+
   (state.automationEditing&&canEdit?'<form id="cnAutomationStrategyForm">'+strategyInputs+
     '<p class="cn-caption" id="cnAutomationPlanFeedback" role="status"></p>'+
     '<div class="cn-form-actions"><button class="cn-primary" type="submit" '+(state.automationPlanningBusy?'disabled':'')+'>Save strategy</button>'+
     '<button type="button" class="cn-secondary" data-automation-plan-cancel>Cancel</button></div></form>':
     '<dl><div><dt>Primary goal</dt><dd>'+safe(goals.find(x=>x[0]===current.primary_goal)?.[1]||'Not configured')+'</dd></div>'+
     '<div><dt>Posts per week</dt><dd>'+safe(current.posts_per_week||'Not configured')+'</dd></div>'+
     '<div><dt>Preferred time</dt><dd>'+safe(current.preferred_time||'Not configured')+'</dd></div>'+
     '<div><dt>Planned entries</dt><dd>'+safe(Array.isArray(s?.weekly_plan)?s.weekly_plan.length:0)+'</dd></div></dl>'+
     (canEdit?'<button type="button" class="cn-secondary" data-automation-plan-edit>Edit content strategy</button>':'<p class="cn-caption">Only the business owner can edit Marketing strategy.</p>'))+
   '</section>';

  return '<header class="cf-screen-top"><div><span class="cn-kicker">MARKETING CONTROLS</span><h1>Automations</h1></div><button class="cf-icon-button" type="button" data-automation-refresh aria-label="Refresh automation settings">↻</button></header><p class="cn-caption">Review Marketing automation status and save your content strategy without enabling or running automation.</p>'+(state.automationLoading?empty('Loading automation settings…'):'')+(state.automationError?empty(state.automationError,'<button type="button" data-automation-refresh>Try again</button>'):'')+(state.automationFeedback?'<p class="cn-work-message" role="status">'+safe(state.automationFeedback)+'</p>':'')+(d?'<section class="cn-detail-panel"><div class="cn-section-bar"><span class="cn-kicker">CURRENT STATUS</span><span class="cn-pill '+(s?.enabled?'attention':'success')+'">'+(s?.enabled?'Enabled':'Disabled')+'</span></div><h2>'+(s?.enabled?'Automation is enabled in the saved configuration':'Automation is disabled')+'</h2><p class="cn-caption">Colzo will not change this configuration from this screen.</p><dl><div><dt>Mode</dt><dd>'+safe(s?.mode||'Not recorded')+'</dd></div><div><dt>Platform</dt><dd>'+safe(s?.platform||'Not recorded')+'</dd></div><div><dt>Posts per day</dt><dd>'+Number(s?.posts_per_day||0)+'</dd></div><div><dt>Image generation</dt><dd>'+(s?.image_enabled?'Enabled':'Disabled')+'</dd></div><div><dt>Last run</dt><dd>'+safe(s?.last_run_at?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(s.last_run_at)):'Not recorded')+'</dd></div><div><dt>Last status</dt><dd>'+safe(s?.last_status||'Not recorded')+'</dd></div></dl>'+(s?.last_error_code?'<p class="cn-caption">Last error code: '+safe(s.last_error_code)+'</p>':'')+((d.can_pause===true&&s?.enabled)?'<button type="button" class="cn-secondary cn-automation-pause" data-automation-pause '+(state.automationBusy?'disabled':'')+'>Pause automation</button>':'')+'</section>'+(u&&typeof u==='object'?'<section class="cn-detail-panel"><h2>Marketing allowance</h2><p class="cn-caption">Usage summary returned by the existing service.</p><dl>'+Object.entries(u).filter(([,v])=>['string','number','boolean'].includes(typeof v)).slice(0,12).map(([k,v])=>'<div><dt>'+safe(k.replace(/_/g,' '))+'</dt><dd>'+safe(v)+'</dd></div>').join('')+'</dl></section>':''):'')+strategyPanel+'<section class="cn-detail-panel"><h2>Safety</h2><p class="cn-caption">Opening this page does not run or schedule anything. Owners can pause an enabled automation, but enabling, paid generation or automatic publishing remain unavailable here.</p><button class="cn-secondary" type="button" data-cn-screen="marketing">Review marketing drafts</button></section>';
 }
 async function submitNativeFeedback(form){
  if(state.feedbackBusy)return;const fd=new FormData(form),body={category:String(fd.get('category')||''),title:String(fd.get('title')||'').trim(),page:'settings',message:String(fd.get('message')||'').trim()};
  const feedback=content.querySelector('#cnFeedbackStatus'),button=form.querySelector('[type=submit]');
  if(body.message.length<3){if(feedback)feedback.textContent='Please add a short description so we can understand the issue.';return}
  state.feedbackBusy=true;if(button)button.disabled=true;if(feedback)feedback.textContent='Submitting feedback securely…';
  try{const result=await api('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(result?.submitted!==true||!result?.id)throw new Error('The server did not confirm submission.');state.feedbackSuccess='Feedback submitted. Thank you for helping improve Colzo.';state.feedbackError='';form.reset();render({motion:'page'})}
  catch(error){state.feedbackError=error?.message||'Feedback could not be submitted.';if(feedback)feedback.textContent=state.feedbackError}
  finally{state.feedbackBusy=false;const btn=content.querySelector('#cnFeedbackForm [type=submit]');if(btn)btn.disabled=false}
 }
 function feedback(){
  return '<header class="cf-screen-top"><div><span class="cn-kicker">HELP & SUPPORT</span><h1>Feedback</h1></div></header><p class="cn-caption">Report a problem, suggest an improvement or flag an AI accuracy issue.</p>'+(state.feedbackSuccess?'<p class="cn-work-message" role="status">'+safe(state.feedbackSuccess)+'</p>':'')+(state.feedbackError?'<p class="cn-settings-error" role="alert">'+safe(state.feedbackError)+'</p>':'')+'<section class="cn-detail-panel cn-colzo-record-form"><form id="cnFeedbackForm"><label>Feedback category<select name="category"><option value="suggestion">Suggestion</option><option value="bug">Something is not working</option><option value="confusing">Something is confusing</option><option value="ai_accuracy">AI accuracy</option><option value="missing_feature">Missing feature</option><option value="other">Other</option></select></label><label>Title (optional)<input name="title" maxlength="120" placeholder="A short summary"></label><label>What happened or what would help?<textarea name="message" rows="5" maxlength="3000" required placeholder="Please avoid including passwords or sensitive customer information."></textarea></label><p id="cnFeedbackStatus" class="cn-caption" role="status">Your feedback is saved to the authenticated business workspace.</p><button class="cn-primary" type="submit" '+(state.feedbackBusy?'disabled':'')+'>Submit feedback</button></form></section>';
 }
 async function loadAnalytics(force=false){
  const requestEpoch=sessionEpoch;
  if(state.analyticsLoading||(!force&&state.analyticsData))return;
  state.analyticsLoading=true;state.analyticsError='';if(state.screen==='analytics')render();
  try{const result=await api('/api/value-dashboard');if(requestEpoch!==sessionEpoch)return;if(!result?.activity||!result?.values||!result?.sources)throw new Error('Unexpected analytics response.');state.analyticsData=result}
  catch(error){if(requestEpoch!==sessionEpoch)return;state.analyticsError=error?.message||'Analytics could not be loaded.'}
  finally{if(requestEpoch!==sessionEpoch)return;state.analyticsLoading=false;if(state.screen==='analytics')render()}
 }
 function analytics(){
  const d=state.analyticsData,fmt=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(Number(n)||0);
  const activity=d?.activity,values=d?.values,sources=d?.sources;
  const sourceLabels=[['website_widget','Website widget'],['qr','QR code'],['share','Shared link'],['directory','Colzo directory'],['direct','Direct customer link'],['untracked','Not recorded']];
  return '<header class="cf-screen-top"><div><span class="cn-kicker">BUSINESS INSIGHTS</span><h1>Analytics</h1></div><button class="cf-icon-button" type="button" data-analytics-refresh aria-label="Refresh analytics">↻</button></header><p class="cn-caption">'+safe(d?.period?.label||'Last 30 days')+' · Calculated from your recorded business data.</p>'+(state.analyticsLoading?empty('Loading verified analytics…'):'')+(state.analyticsError?empty(state.analyticsError,'<button type="button" data-analytics-refresh>Try again</button>'):'')+(d?'<div class="cf-kpis">'+figmaStat('New enquiries',activity.enquiries,'Last 30 days','▤')+figmaStat('Booking requests',activity.ai_booking_requests,'AI-originated requests','▣')+figmaStat('Completed actions',activity.actions_completed,'Last 30 days','✓')+'</div><section class="cn-detail-panel"><span class="cn-kicker">OPPORTUNITY VALUE</span><h2>'+fmt(values.period_opportunity_value)+'</h2><p class="cn-caption">Estimated value of enquiries created in this period, not confirmed revenue.</p><dl><div><dt>Open pipeline</dt><dd>'+fmt(values.open_pipeline_value)+'</dd></div><div><dt>Converted opportunities</dt><dd>'+fmt(values.converted_opportunity_value)+'</dd></div><div><dt>Enquiries with an estimate</dt><dd>'+Number(values.valued_leads||0)+'</dd></div></dl></section><section class="cn-detail-panel"><h2>Enquiry sources</h2><p class="cn-caption">Counts are based on recorded attribution events. Untracked means the source was not captured.</p><div class="cn-stack">'+sourceLabels.map(([key,label])=>'<div class="cn-settings-status"><span>'+label+'</span><strong>'+Number(sources[key]||0)+'</strong></div>').join('')+'</div></section><section class="cn-detail-panel"><h2>Operational activity</h2><dl><div><dt>Automatic follow-ups created</dt><dd>'+Number(activity.automatic_follow_ups_created||0)+'</dd></div><div><dt>Automatic follow-ups completed</dt><dd>'+Number(activity.automatic_follow_ups_completed||0)+'</dd></div><div><dt>Review requests prepared</dt><dd>'+Number(activity.review_requests_prepared||0)+'</dd></div><div><dt>Review requests marked sent</dt><dd>'+Number(activity.review_requests_marked_sent||0)+'</dd></div></dl><p class="cn-caption">“Marked sent” reflects the saved action status, not independent proof of delivery.</p></section>':'')+'<p class="cn-caption">Colzo does not estimate revenue from enquiry counts or fill missing data with demo numbers.</p>';
 }
 async function loadKnowledge(force=false){
  const requestEpoch=sessionEpoch;
  if(state.knowledgeLoading||(!force&&Array.isArray(state.knowledgeSources)))return;
  state.knowledgeLoading=true;state.knowledgeError='';if(state.screen==='knowledge')render();
  try{const result=await api('/api/knowledge');if(requestEpoch!==sessionEpoch)return;if(!Array.isArray(result?.sources))throw new Error('Unexpected business knowledge response.');state.knowledgeSources=result.sources;state.knowledgeCanManage=result.can_manage===true;state.knowledgeCanAddManual=result.can_add_manual===true;state.knowledgeCanUpload=result.can_upload===undefined?state.knowledgeCanManage:result.can_upload===true;state.knowledgeLimits=result.limits||null}
  catch(error){if(requestEpoch!==sessionEpoch)return;state.knowledgeError=error?.message||'Business knowledge could not be loaded.'}
  finally{if(requestEpoch!==sessionEpoch)return;state.knowledgeLoading=false;if(state.screen==='knowledge')render()}
 }
 async function openKnowledgeSource(id){
  const requestEpoch=sessionEpoch;
  if(!id)return;state.knowledgeLoading=true;state.knowledgeError='';state.knowledgeDetail=null;state.knowledgeIncludes={};render({motion:'detail'});
  try{const result=await api('/api/knowledge?source_id='+encodeURIComponent(id));if(requestEpoch!==sessionEpoch)return;if(!result?.source||!Array.isArray(result.items))throw new Error('Unexpected knowledge detail response.');state.knowledgeDetail=result;state.knowledgeIncludes=Object.fromEntries(result.items.map(item=>[item.id,item.status==='active'||item.status==='needs_review']))}
  catch(error){if(requestEpoch!==sessionEpoch)return;state.knowledgeError=error?.message||'Knowledge details could not be loaded.'}
  finally{if(requestEpoch!==sessionEpoch)return;state.knowledgeLoading=false;if(state.screen==='knowledge')render()}
 }
 async function saveManualKnowledge(form){
  if(state.knowledgeBusy)return;const fd=new FormData(form),body={action:'create_manual',item_type:String(fd.get('item_type')||''),title:String(fd.get('title')||'').trim(),content:String(fd.get('content')||'').trim()};
  const feedback=content.querySelector('#cnKnowledgeFeedback'),button=form.querySelector('[type=submit]');
  if(!body.title||!body.content){if(feedback)feedback.textContent='Add a title and a factual description.';return}
  state.knowledgeBusy=true;if(button)button.disabled=true;if(feedback)feedback.textContent='Saving this fact for accuracy review…';
  try{const result=await api('/api/knowledge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!result?.source?.id||!Array.isArray(result.items))throw new Error('The server did not confirm the knowledge save.');state.knowledgeDetail=result;state.knowledgeIncludes=Object.fromEntries(result.items.map(item=>[item.id,item.status==='active'||item.status==='needs_review']));state.knowledgeForm=false;state.knowledgeFeedback='Fact saved as needs review. It will not be used as approved knowledge until you review and confirm it.';await loadKnowledge(true)}
  catch(error){if(feedback)feedback.textContent=error?.message||'The fact was not confirmed as saved.'}
  finally{state.knowledgeBusy=false;if(state.screen==='knowledge')render()}
 }
 async function approveKnowledge(){
  const detail=state.knowledgeDetail,source=detail?.source;
  if(state.knowledgeBusy||!state.knowledgeCanManage||!source?.id||!['active','needs_review'].includes(source.status))return;
  const form=content.querySelector('#cnKnowledgeReviewForm');
  if(!form)return;
  const items=[...form.querySelectorAll('[data-knowledge-item]')].map(row=>({
   id:row.dataset.knowledgeItem,
   item_type:row.querySelector('[data-k-field="type"]')?.value||'',
   title:row.querySelector('[data-k-field="title"]')?.value.trim()||'',
   content:row.querySelector('[data-k-field="content"]')?.value.trim()||'',
   include:row.querySelector('[data-k-field="include"]')?.checked===true
  }));
  const feedback=form.querySelector('#cnKnowledgeReviewFeedback');
  if(items.length!==(detail.items||[]).length||items.some(item=>!item.title||!item.content||item.title.length>300||item.content.length>3000)){
   if(feedback)feedback.textContent='Review the title and content of every fact before saving.';return;
  }
  if(!items.some(item=>item.include)){if(feedback)feedback.textContent='Choose at least one accurate fact, or remove this source.';return}
  if(!window.confirm('Approve the selected facts as accurate and authorised for your AI receptionist and Marketing?'))return;
  state.knowledgeBusy=true;
  const button=form.querySelector('[type="submit"]');if(button)button.disabled=true;
  if(feedback)feedback.textContent='Saving the reviewed facts…';
  try{
   // The deployed wrapper requires versioned confirmation after the owner
   // explicitly approves the reviewed facts above.
   const result=await api('/api/knowledge',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'approve',source_id:source.id,items,confirmation:true,confirmation_version:'knowledge_accuracy_v1'})});
   if(!result?.source?.id||!Array.isArray(result.items))throw new Error('The server did not confirm the review.');
   state.knowledgeDetail=result;state.knowledgeIncludes=Object.fromEntries(result.items.map(item=>[item.id,item.status==='active']));
   state.knowledgeFeedback='Reviewed knowledge saved. Only approved facts may be used by the assistant.';
   await loadKnowledge(true);
   render({motion:'detail'});
  }catch(error){if(feedback)feedback.textContent=error?.message||'The reviewed facts could not be saved.';}
  finally{state.knowledgeBusy=false;if(button?.isConnected)button.disabled=false}
 }
 async function uploadNativeKnowledgeFile(file,replaceId=null){
  if(state.knowledgeBusy||!state.knowledgeCanUpload||!file)return;
  const mimetypes={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',txt:'text/plain',csv:'text/csv'};
  const ext=String(file.name||'').split('.').pop().toLowerCase();
  const expected=mimetypes[ext];
  if(!expected||file.size<1||file.size>(state.knowledgeLimits?.max_file_bytes||10485760)||file.name.length>240||String(file.name).includes('/')){
   state.knowledgeFeedback='Choose a supported PDF, image, TXT or CSV file between 1 byte and 10 MB.';render();return;
  }
  if(file.type&&file.type.toLowerCase()!==expected){
   state.knowledgeFeedback='The selected file type does not match its extension.';render();return;
  }
  if(typeof supabaseClient==='undefined'||!supabaseClient?.storage?.from){
   state.knowledgeFeedback='Private file uploads are unavailable. Your document has not been sent.';render();return;
  }
  const epoch=sessionEpoch;let prepared=null,uploaded=false;
  state.knowledgeBusy=true;state.knowledgeFeedback='Preparing a private upload…';render();
  try{
   const body={action:'create_upload',file_name:file.name,mime_type:file.type||expected,size_bytes:file.size};
   if(replaceId)body.replace_source_id=replaceId;
   prepared=await api('/api/knowledge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(epoch!==sessionEpoch)return;
   if(!prepared?.source?.id||!prepared.bucket||!prepared.path||!prepared.token)throw new Error('The private upload was not prepared correctly.');
   state.knowledgeFeedback='Uploading securely…';render();
   const result=await supabaseClient.storage.from(prepared.bucket).uploadToSignedUrl(prepared.path,prepared.token,file,{contentType:file.type||expected});
   if(result?.error)throw new Error('The private upload could not be completed.');
   uploaded=true;
   if(epoch!==sessionEpoch)return;
   // Intentionally do not call 'finalize' here. Extraction can use a provider
   // and must remain a separate, explicit user action.
   state.knowledgeFeedback='File uploaded privately. It is not approved and has not been processed. Select “Extract facts” only after reviewing possible provider usage.';
   await loadKnowledge(true);
  }catch(error){
   if(epoch===sessionEpoch&&prepared?.source?.id&&!uploaded){
    try{await api('/api/knowledge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove',source_id:prepared.source.id})})}catch{}
   }
   if(epoch===sessionEpoch){await loadKnowledge(true);state.knowledgeError=error?.message||'Upload did not complete.';}
  }finally{if(epoch===sessionEpoch){state.knowledgeBusy=false;render()}}
 }
 async function extractNativeKnowledge(id){
  if(state.knowledgeBusy||!state.knowledgeCanManage||!id)return;
  const source=state.knowledgeSources?.find(item=>item.id===id);
  if(!source||!['pending_upload','failed'].includes(source.status))return;
  if(!window.confirm('Extraction may use a paid AI provider. Proceed only if its usage is authorised. No facts will become active without your review. Continue?'))return;
  state.knowledgeBusy=true;state.knowledgeFeedback='Extracting facts for review…';render();
  const epoch=sessionEpoch;
  try{
   const result=await api('/api/knowledge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'finalize',source_id:id})});
   if(epoch!==sessionEpoch)return;
   if(!result?.source?.id||!Array.isArray(result.items))throw new Error('Extraction was not confirmed.');
   state.knowledgeDetail=result;
   state.knowledgeIncludes=Object.fromEntries(result.items.map(item=>[item.id,item.status==='needs_review'||item.status==='active']));
   state.knowledgeFeedback='Extraction complete. Review every fact before approval.';
   await loadKnowledge(true);
  }catch(error){if(epoch===sessionEpoch){await loadKnowledge(true);state.knowledgeError=error?.message||'Extraction is unavailable. The source remains available for review or retry.';}}
  finally{if(epoch===sessionEpoch){state.knowledgeBusy=false;render({motion:'detail'})}}
 }
 async function removeKnowledgeSource(id){
  if(state.knowledgeBusy||!state.knowledgeCanManage||!id||!window.confirm('Remove this knowledge source and its associated facts from this business?'))return;
  state.knowledgeBusy=true;
  try{const result=await api('/api/knowledge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove',source_id:id})});if(result?.removed!==true)throw new Error('The server did not confirm removal.');state.knowledgeDetail=null;state.knowledgeFeedback='Knowledge source removed.';await loadKnowledge(true)}
  catch(error){state.knowledgeError=error?.message||'Removal was not confirmed.'}
  finally{state.knowledgeBusy=false;if(state.screen==='knowledge')render()}
 }
 function knowledge(){
  const detail=state.knowledgeDetail,source=detail?.source,items=detail?.items||[],sources=state.knowledgeSources||[];
  const canManage=state.knowledgeCanManage,canUpload=state.knowledgeCanUpload,canAddManual=state.knowledgeCanAddManual;
  const typeOptions=(current='other')=>['service','product','price','hours','policy','faq','contact','location','dietary','other']
    .map(type=>'<option value="'+type+'" '+(type===current?'selected':'')+'>'+type[0].toUpperCase()+type.slice(1)+'</option>').join('');
  const status=state.knowledgeError?'<p class="cn-settings-error" role="alert">'+safe(state.knowledgeError)+'</p>':'';
  const progress=state.knowledgeFeedback?'<p class="cn-work-message" role="status" aria-live="polite">'+safe(state.knowledgeFeedback)+'</p>':'';
  const readable=v=>String(v||'').replace(/_/g,' ');
  const badge=s=>'<span class="cn-pill '+(s==='active'?'success':s==='failed'?'attention':'progress')+'">'+safe(readable(s||'unknown'))+'</span>';
  // Source processing and approval of individual facts are different states.
  // Use the server-supplied item counts; never change what the backend may use.
  const factCount=(source,key)=>Math.max(0,Number(source?.item_counts?.[key])||0);
  const factBadge=source=>{
   if(['failed','pending_upload','superseded'].includes(source?.status))return badge(source.status);
   if(factCount(source,'needs_review')>0)return '<span class="cn-pill progress">Review needed</span>';
   if(factCount(source,'active')>0)return '<span class="cn-pill success">Facts approved</span>';
   return badge(source?.status);
  };
  const factSummary=source=>factCount(source,'active')+' approved facts · '+factCount(source,'needs_review')+' awaiting review';
  const countActive=sources.reduce((sum,item)=>sum+Math.max(0,Number(item.item_counts?.active)||0),0);
  const countReview=sources.reduce((sum,item)=>sum+Math.max(0,Number(item.item_counts?.needs_review)||0),0);
  const uploadMax=Math.min(10,Math.round((state.knowledgeLimits?.max_file_bytes||10485760)/1048576));
  const input='<input id="cnKnowledgeFileInput" type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,application/pdf,image/jpeg,image/png,image/webp,text/plain,text/csv">';
  const sourceActions=item=>{
   const review='<button type="button" class="cn-secondary" data-knowledge-open="'+safe(item.id)+'">View facts</button>';
   const retry=canUpload&&['pending_upload','failed'].includes(item.status)
      ?'<button type="button" class="cn-secondary" data-knowledge-extract="'+safe(item.id)+'" '+(state.knowledgeBusy?'disabled':'')+'>'+ (item.status==='failed'?'Retry extraction':'Extract facts')+'</button>':'';
   const replace=canUpload&&['active','needs_review'].includes(item.status)
      ?'<button type="button" class="cn-secondary" data-knowledge-replace="'+safe(item.id)+'" '+(state.knowledgeBusy?'disabled':'')+'>Replace file</button>':'';
   const remove=canManage?'<button type="button" class="cn-secondary" data-knowledge-remove="'+safe(item.id)+'" '+(state.knowledgeBusy?'disabled':'')+'>Remove</button>':'';
   return '<div class="cn-form-actions">'+review+retry+replace+remove+'</div>';
  };
  if(detail&&source){
   const editable=canManage&&['active','needs_review'].includes(source.status);
   const detailCounts={
    active:items.filter(item=>item.status==='active').length,
    needs_review:items.filter(item=>item.status==='needs_review').length
   };
   const detailedSource={...source,item_counts:detailCounts};
   const title='<header class="cf-screen-top"><button class="cn-back" type="button" data-knowledge-back>← Business knowledge</button></header>'+
    '<header class="cn-screen-heading"><span class="cn-kicker">KNOWLEDGE SOURCE</span><h1>'+safe(source.file_name||'Knowledge source')+'</h1><p>'+factBadge(detailedSource)+' · '+items.length+' facts · '+factSummary(detailedSource)+'</p></header>';
   const sourceInfo='<section class="cn-detail-panel"><h2>Source summary</h2><p>'+safe(source.extracted_summary||'No summary recorded.')+'</p>'+
    (source.error_message?'<p class="cn-settings-error">'+safe(source.error_message)+'</p>':'')+'</section>';
   const warning='<p class="cn-caption">Only selected, explicitly approved facts are available to the AI receptionist and Marketing. Uploaded text is never an instruction to the AI.</p>';
   const fields=items.map(item=>
     '<section class="cn-knowledge-fact" data-knowledge-item="'+safe(item.id)+'"><label>Fact type<select data-k-field="type" '+(!editable?'disabled':'')+'>'+typeOptions(item.item_type)+'</select></label>'+
     '<label>Title<input data-k-field="title" maxlength="300" value="'+safe(item.title)+'" required '+(!editable?'readonly':'')+'></label>'+
     '<label>Factual details<textarea data-k-field="content" maxlength="3000" rows="3" required '+(!editable?'readonly':'')+'>'+safe(item.content)+'</textarea></label>'+
     '<label class="cn-knowledge-include"><input type="checkbox" data-k-field="include" '+(item.status==='active'||state.knowledgeIncludes[item.id]?'checked':'')+' '+(!editable?'disabled':'')+'><span>Include as an approved fact</span></label></section>'
   ).join('');
   const approval=editable?'<form id="cnKnowledgeReviewForm"><h2>Review each fact</h2>'+warning+fields+
      '<p class="cn-caption" id="cnKnowledgeReviewFeedback" role="status"></p>'+
      '<button class="cn-primary" type="submit" '+(state.knowledgeBusy?'disabled':'')+'>Confirm reviewed facts</button></form>':
      '<h2>Facts</h2>'+warning+(items.length?fields:'<p class="cn-caption">There are no extracted facts to review yet.</p>');
   const recovery=canUpload&&['pending_upload','failed'].includes(source.status)?
      '<section class="cn-detail-panel"><h2>Extraction not completed</h2><p class="cn-caption">The file will not be used by the assistant until facts are extracted and approved. Extraction may use a chargeable AI provider and only starts after a separate confirmation.</p>'+
      '<button class="cn-secondary" type="button" data-knowledge-extract="'+safe(source.id)+'" '+(state.knowledgeBusy?'disabled':'')+'>Extract facts</button></section>':'';
   return title+progress+status+sourceInfo+recovery+'<section class="cn-detail-panel">'+approval+'</section>';
  }
  const filter=state.knowledgeFilter;
  const filtered=sources.filter(item=>filter==='all'||(filter==='review'?(item.item_counts?factCount(item,'needs_review')>0:item.status==='needs_review'):(filter==='active'?factCount(item,'active')>0||item.status==='active':item.status==='failed'||item.status==='pending_upload')));
  const options=[['all','All sources'],['review','Needs review'],['active','Active'],['issues','To process']];
  const filters='<div class="cn-knowledge-filters" role="group" aria-label="Filter knowledge sources">'+options.map(([key,label])=>'<button type="button" data-knowledge-filter="'+key+'" aria-pressed="'+(filter===key)+'">'+label+'</button>').join('')+'</div>';
  const rows=filtered.map(item=>'<article class="cn-detail-panel cn-knowledge-source"><div class="cn-section-bar"><span class="cn-knowledge-filename">'+safe(item.file_name)+'</span>'+factBadge(item)+'</div>'+
    '<p>'+safe(item.extracted_summary||'No extracted summary yet.')+'</p><small class="cn-caption">'+Math.max(0,Number(item.item_counts?.total)||0)+' facts · '+factSummary(item)+' · '+safe(day(item.created_at))+'</small>'+sourceActions(item)+'</article>').join('');
  const form=state.knowledgeForm&&canAddManual?'<section class="cn-detail-panel cn-colzo-record-form"><form id="cnKnowledgeForm"><h2>Add a business fact</h2>'+
    '<p class="cn-caption">Manual entry uses no extraction provider. Facts remain inactive until approved.</p>'+
    '<label>Fact type<select name="item_type">'+typeOptions('service')+'</select></label>'+
    '<label>Short title<input name="title" maxlength="200" required placeholder="e.g. Opening hours"></label>'+
    '<label>Fact details<textarea name="content" rows="5" maxlength="3000" required placeholder="Enter accurate information for customers."></textarea></label>'+
    '<p class="cn-caption" id="cnKnowledgeFeedback" role="status"></p><div class="cn-form-actions">'+
    '<button class="cn-primary" type="submit" '+(state.knowledgeBusy?'disabled':'')+'>Save for review</button>'+
    '<button class="cn-secondary" type="button" data-knowledge-cancel>Cancel</button></div></form></section>':'';
  const buttons='<div class="cn-knowledge-actions">'+
   (canAddManual?'<button class="cn-primary" type="button" data-knowledge-create '+(state.knowledgeBusy?'disabled':'')+'>+ Add fact</button>':'')+
   (canUpload?'<button class="cn-secondary" type="button" data-knowledge-upload '+(state.knowledgeBusy?'disabled':'')+'>Upload document</button>':'')+'</div>';
  const limits=!canUpload?'<p class="cn-caption">File uploads are unavailable in this pilot. Add a manual business fact instead.</p>':state.knowledgeLimits?'<p class="cn-caption">Upload limits: '+state.knowledgeLimits.max_sources+' sources, '+uploadMax+' MB per file. Supported: PDF, JPG, PNG, WebP, TXT and CSV.</p>':'';
  return '<header class="cf-screen-top"><h1>Business Knowledge</h1><button class="cf-icon-button" type="button" data-knowledge-refresh aria-label="Refresh business knowledge">↻</button></header>'+
   '<p class="cn-caption">The facts Colzo can use to answer customers and prepare grounded marketing. Nothing becomes active without your review.</p>'+
   '<div class="cn-knowledge-stats"><div><strong>'+countActive+'</strong><span>Approved facts</span></div><div><strong>'+countReview+'</strong><span>Awaiting review</span></div><div><strong>'+sources.length+'</strong><span>Sources</span></div></div>'+
   progress+status+buttons+(canUpload?input:'')+form+limits+filters+
   (state.knowledgeLoading?empty('Loading business knowledge…'):'')+
   (rows||(!state.knowledgeLoading&&!state.knowledgeError?empty(sources.length?'No sources match this filter.':'No knowledge sources saved yet. Add a business fact to begin.'):''));
 }
 async function loadBilling(force=false){
  const requestEpoch=sessionEpoch;
  if(state.billingLoading||(!force&&state.billingData))return;
  state.billingLoading=true;state.billingError='';if(state.screen==='billing')render();
  try{const result=await api('/api/billing');if(requestEpoch!==sessionEpoch)return;if(!result||typeof result!=='object')throw new Error('Unexpected billing response.');state.billingData=result}
  catch(error){if(requestEpoch!==sessionEpoch)return;state.billingError=error?.message||'Billing information could not be loaded.'}
  finally{if(requestEpoch!==sessionEpoch)return;state.billingLoading=false;if(state.screen==='billing')render()}
 }
 function billing(){
  const data=state.billingData,account=data?.account,ents=data?.entitlements;
  const features=ents&&typeof ents==='object'?Object.entries(ents).filter(([,v])=>typeof v==='boolean').map(([k,v])=>'<div><dt>'+safe(k.replace(/_/g,' '))+'</dt><dd>'+ (v?'Included':'Not included')+'</dd></div>').join(''):'';
  return '<header class="cf-screen-top"><div><span class="cn-kicker">ACCOUNT</span><h1>Billing</h1></div><button type="button" class="cf-icon-button" data-billing-refresh aria-label="Refresh billing">↻</button></header><p class="cn-caption">Plan and access details returned by your existing billing service.</p>'+(state.billingLoading?empty('Loading current billing details…'):'')+(state.billingError?empty(state.billingError,'<button type="button" data-billing-refresh>Try again</button>'):'')+(data?'<section class="cn-detail-panel"><span class="cn-kicker">CURRENT PLAN</span><h2>'+safe(data.pilot_free_access?'Pilot access':account?.plan||'No plan recorded')+'</h2><p class="cn-caption">'+safe(data.pilot_free_access?'Your approved pilot features are available at no charge. Feature availability follows the current pilot scope.':account?.status||'No subscription status returned.')+'</p><dl><div><dt>Subscription</dt><dd>'+safe(account?.status||'Not recorded')+'</dd></div><div><dt>Stripe customer</dt><dd>'+(account?.has_customer?'Linked':'Not linked')+'</dd></div><div><dt>Stripe subscription</dt><dd>'+(account?.has_subscription?'Linked':'Not linked')+'</dd></div></dl></section>'+(features?'<section class="cn-detail-panel"><h2>Feature access</h2><dl>'+features+'</dl></section>':'')+(data.pending_plan_change?'<section class="cn-detail-panel"><h2>Scheduled plan change</h2><p>'+safe(data.pending_plan_change.effective_at||'Effective date not provided')+'</p></section>':''):'')+'<section class="cn-detail-panel"><h2>Payment safety</h2><p class="cn-caption">This Colzo screen is read-only. It will not start checkout, change a plan or cancel a subscription. Those actions require a separate explicit decision and the existing security checks.</p></section>';
 }
 async function loadGrowth(force=false){
  const epoch=sessionEpoch;
  if(state.growthLoading||(!force&&state.growthSettings))return;
  state.growthLoading=true;state.growthError='';
  if(state.screen==='growth')render();
  const settled=await Promise.allSettled([api('/api/settings'),api('/api/business-profile'),api('/api/referrals')]);
  if(epoch!==sessionEpoch)return;
  if(settled[0].status==='fulfilled'&&settled[0].value&&typeof settled[0].value==='object'){
   state.growthSettings=settled[0].value;
   state.growthCanManage=settled[0].value.can_manage===true;
  }else{
   state.growthError=settled[0].reason?.message||'Growth settings are unavailable.';
  }
  state.growthProfile=settled[1].status==='fulfilled'?settled[1].value?.profile||null:null;
  // Owner-only referral endpoint. Admin/member 403 is not an empty referral balance.
  state.growthReferral=settled[2].status==='fulfilled'?settled[2].value:null;
  state.growthLoading=false;
  if(state.screen==='growth')render();
 }
 async function saveGrowthSettings(form){
  if(state.growthBusy||!state.growthCanManage||!state.growthSettings)return;
  const fd=new FormData(form),kind=form.id,changes={};
  const other=content.querySelector(kind==='cnGrowthReviewForm'?'#cnGrowthFollowupForm':'#cnGrowthReviewForm');
  if(other?.dataset.cnDirty==='true'&&!window.confirm('You have unsaved edits in the other growth section. Saving this one will discard them. Continue?'))return;
  const feedback=form.querySelector('[role="status"]');
  if(kind==='cnGrowthReviewForm'){
   changes.review_requests_enabled=fd.get('review_enabled')==='on';
   changes.review_google_url=String(fd.get('review_google_url')||'').trim();
   changes.review_facebook_url=String(fd.get('review_facebook_url')||'').trim();
   changes.review_preferred_platform=fd.get('preferred_platform')==='facebook'?'facebook':'google';
   if(changes.review_requests_enabled&&!changes.review_google_url&&!changes.review_facebook_url){
    if(feedback)feedback.textContent='Add a valid Google or Facebook review link before enabling review requests.';return;
   }
   for(const url of [changes.review_google_url,changes.review_facebook_url]){
    if(!url)continue;
    try{const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error()}catch{if(feedback)feedback.textContent='Use an HTTPS review link with no embedded credentials.';return}
   }
  }else if(kind==='cnGrowthFollowupForm'){
   changes.automatic_follow_up_enabled=fd.get('followup_enabled')==='on';
   changes.automatic_follow_up_hours=Number(fd.get('followup_hours')||24);
   if(![24,48,72].includes(changes.automatic_follow_up_hours)){if(feedback)feedback.textContent='Choose a supported 24, 48 or 72-hour delay.';return}
  }else return;
  if(!window.confirm(kind==='cnGrowthReviewForm'?'Save review settings? This only prepares internal Actions tasks; customers are never messaged automatically.':'Save follow-up settings? This only creates internal reminder Actions, not outbound messages.'))return;
  state.growthBusy=true;
  const button=form.querySelector('[type="submit"]');if(button)button.disabled=true;
  if(feedback)feedback.textContent='Saving settings…';
  const epoch=sessionEpoch;
  try{
   const saved=await api('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(changes)});
   if(epoch!==sessionEpoch)return;
   if(!saved||typeof saved!=='object'||Object.entries(changes).some(([key,value])=>{
     if(key==='review_google_url'||key==='review_facebook_url'){
       if(!value)return Boolean(saved[key]);
       const target=new URL(value);target.hash='';
       return String(saved[key]||'')!==target.toString();
     }
     return typeof value==='string' ? String(saved[key]||'').trim()!==value : saved[key]!==value;
   }))throw new Error('The server did not confirm the saved settings.');
   state.growthSettings={...saved,can_manage:state.growthCanManage};
   state.growthFeedback=kind==='cnGrowthReviewForm'?'Review settings saved. No customer message has been sent.':'Follow-up settings saved. No customer message has been sent.';
  }catch(error){
   if(epoch===sessionEpoch&&feedback)feedback.textContent=error?.message||'Could not save these settings.';
   return;
  }finally{
   if(epoch===sessionEpoch){
    state.growthBusy=false;
    if(button?.isConnected)button.disabled=false;
    if(state.growthFeedback&&state.screen==='growth')render();
   }
  }
 }
 function growth(){
  const s=state.growthSettings||{},canManage=state.growthCanManage,profile=state.growthProfile||{};
  const slug=String(profile.public_slug||'');
  const validSlug=/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(slug);
  const target=validSlug?new URL('/customer',window.location.origin):null;
  if(target){target.searchParams.set('business',slug);target.searchParams.set('source','share')}
  const customerUrl=target?.toString()||'';
  const qr=validSlug?'/api/qr-code?business='+encodeURIComponent(slug)+'&format=png':'';
  const widget=validSlug?'<script src="'+new URL('/widget.js',window.location.origin).toString()+'" data-business="'+slug+'" data-label="Chat with us" defer></'+'script>':'';
  const r=state.growthReferral,threshold=Math.max(1,Number(r?.threshold)||5),progress=Math.min(threshold,Math.max(0,Number(r?.progress)||0)),pending=Math.max(0,Number(r?.pending)||0);
  const referralCode=typeof r?.code==='string'&&/^[A-Za-z0-9-]{1,36}$/.test(r.code)?r.code:'';
  const referral=referralCode?new URL('/',window.location.origin):null;
  if(referral)referral.searchParams.set('ref',referralCode);
  const formState=state.growthBusy?'disabled':'';
  const shareCard='<section class="cn-detail-panel"><h2>Customer link and website widget</h2>'+
    '<p class="cn-caption">These links are available only when your business has a verified public slug. These Development links are for testing only. Preview deployment protection may still require sign-in; use the approved public domain after launch.</p>'+
    (customerUrl?'<label class="cn-growth-field">Customer enquiry link<input readonly id="cnGrowthCustomerLink" value="'+safe(customerUrl)+'"></label>'+
      '<div class="cn-form-actions"><button type="button" class="cn-secondary" data-growth-copy="link">Copy link</button><a class="cn-secondary" href="'+safe(qr)+'" target="_blank" rel="noopener">Download QR</a></div>'+
      '<p id="cnGrowthCopyStatus" class="cn-caption" role="status" aria-live="polite"></p>'+
      '<label class="cn-growth-field">Embed code<textarea readonly rows="3" id="cnGrowthWidgetCode">'+safe(widget)+'</textarea></label>'+
      '<button type="button" class="cn-secondary" data-growth-copy="widget">Copy widget code</button>':
      '<p class="cn-caption">A public business address has not been configured yet. Set up the public profile before sharing.</p><button class="cn-secondary" data-cn-screen="publicProfile" type="button">Public profile</button>')+
    '</section>';
  const review='<section class="cn-detail-panel cn-colzo-record-form"><h2>Review requests</h2><p class="cn-caption">After a completed booking, Colzo may prepare an internal Actions task. Your team chooses whether to send the review request. Nothing is delivered automatically.</p>'+
    '<form id="cnGrowthReviewForm">'+
    '<label class="cn-growth-toggle"><input name="review_enabled" type="checkbox" '+(s.review_requests_enabled?'checked':'')+' '+(!canManage?'disabled':'')+'> Prepare review Actions after completed bookings</label>'+
    '<label>Preferred destination<select name="preferred_platform" '+(!canManage?'disabled':'')+'><option value="google" '+(s.review_preferred_platform!=='facebook'?'selected':'')+'>Google</option><option value="facebook" '+(s.review_preferred_platform==='facebook'?'selected':'')+'>Facebook</option></select></label>'+
    '<label>Google review link<input name="review_google_url" type="url" maxlength="2048" value="'+safe(s.review_google_url||'')+'" '+(!canManage?'readonly':'')+' placeholder="https://…"></label>'+
    '<label>Facebook review link<input name="review_facebook_url" type="url" maxlength="2048" value="'+safe(s.review_facebook_url||'')+'" '+(!canManage?'readonly':'')+' placeholder="https://…"></label>'+
    '<p class="cn-caption" role="status"></p>'+(canManage?'<button class="cn-primary" type="submit" '+formState+'>Save review settings</button>':'<p class="cn-caption">You have read-only access.</p>')+'</form></section>';
  const followup='<section class="cn-detail-panel cn-colzo-record-form"><h2>Automatic follow-up reminders</h2><p class="cn-caption">When enabled, a newly captured AI lead creates a private team reminder. It does not text, email or call the customer.</p>'+
    '<form id="cnGrowthFollowupForm"><label class="cn-growth-toggle"><input name="followup_enabled" type="checkbox" '+(s.automatic_follow_up_enabled?'checked':'')+' '+(!canManage?'disabled':'')+'> Create private follow-up Actions</label>'+
    '<label>Reminder delay<select name="followup_hours" '+(!canManage?'disabled':'')+'>'+[24,48,72].map(hours=>'<option value="'+hours+'" '+(Number(s.automatic_follow_up_hours||24)===hours?'selected':'')+'>'+hours+' hours</option>').join('')+'</select></label>'+
    '<p class="cn-caption" role="status"></p>'+(canManage?'<button class="cn-primary" type="submit" '+formState+'>Save follow-up settings</button>':'<p class="cn-caption">You have read-only access.</p>')+'</form></section>';
  const rewards='<section class="cn-detail-panel"><h2>Refer a business</h2>'+
    (referral?'<p class="cn-caption">'+progress+' of '+threshold+' qualifying referrals · '+pending+' awaiting payment. Rewards depend on eligible paid subscriptions, not shares alone.</p>'+
     '<label class="cn-growth-field">Your referral link<input readonly id="cnGrowthReferralLink" value="'+safe(referral.toString())+'"></label>'+
     '<button type="button" class="cn-secondary" data-growth-copy="referral">Copy referral link</button>'+
     (r.latestReward?'<p class="cn-caption">Latest reward status: '+safe(r.latestReward.status||'Not recorded')+'</p>':''):
     '<p class="cn-caption">Referral progress is available to the business owner when the existing referral service is configured.</p>')+'</section>';
  return '<header class="cf-screen-top"><h1>Growth & sharing</h1><button class="cf-icon-button" data-growth-refresh type="button" aria-label="Refresh growth tools">↻</button></header>'+
   '<p class="cn-caption">Share your public business link and prepare private customer follow-ups. Every external message remains a human decision.</p>'+
   (state.growthLoading?empty('Loading growth tools…'):'')+
   (state.growthError?'<p class="cn-settings-error" role="alert">'+safe(state.growthError)+'</p>':'')+
   (state.growthFeedback?'<p class="cn-work-message" role="status">'+safe(state.growthFeedback)+'</p>':'')+
   shareCard+(state.growthSettings?review+followup:'')+rewards;
 }
 async function loadVoiceStatus(force=false){
  const requestEpoch=sessionEpoch;
  if(state.voiceLoading||(!force&&state.voiceStatus))return;
  state.voiceLoading=true;state.voiceError='';if(state.screen==='receptionist')render();
  try{const result=await api('/api/voice-status');if(requestEpoch!==sessionEpoch)return;if(!result||typeof result.enabled!=='boolean')throw new Error('Unexpected receptionist status response.');state.voiceStatus=result}
  catch(error){if(requestEpoch!==sessionEpoch)return;state.voiceError=error?.message||'Receptionist status could not be loaded.'}
  finally{if(requestEpoch!==sessionEpoch)return;state.voiceLoading=false;if(state.screen==='receptionist')render()}
 }
 async function loadReceptionConfig(force=false){
  const epoch=sessionEpoch;
  if(state.receptionLoading||(!force&&state.receptionConfig))return;
  state.receptionLoading=true;state.receptionError='';
  if(state.screen==='receptionist'&&!state.receptionEditing)render();
  try{
   const result=await api('/api/business-configuration');
   if(epoch!==sessionEpoch)return;
   if(!result||!result.configuration||typeof result.configuration!=='object')throw new Error('Business configuration is not available for this workspace.');
   state.receptionConfig=result.configuration;
   state.receptionCanManage=result.can_manage===true;
  }catch(error){if(epoch!==sessionEpoch)return;state.receptionError=error?.message||'AI receptionist settings could not be loaded.'}
  finally{if(epoch!==sessionEpoch)return;state.receptionLoading=false;if(state.screen==='receptionist'&&!state.receptionEditing)render()}
 }
 async function loadNativeHandovers(force=false){
  const epoch=sessionEpoch;
  if(state.handoverLoading||(!force&&Array.isArray(state.handoverRows)))return;
  state.handoverLoading=true;state.handoverError='';
  if(state.screen==='receptionist'&&!state.receptionEditing)render();
  try{
   const result=await api('/api/handovers');
   if(epoch!==sessionEpoch)return;
   if(!Array.isArray(result))throw new Error('Unexpected handover response.');
   state.handoverRows=result;
  }catch(error){if(epoch!==sessionEpoch)return;state.handoverError=error?.message||'Handovers could not be loaded.'}
  finally{if(epoch!==sessionEpoch)return;state.handoverLoading=false;if(state.screen==='receptionist'&&!state.receptionEditing)render()}
 }
 const receptionistModeLabels={
  human_first:['Human-first','Answer approved basic facts and pass genuine enquiries to your team.'],
  balanced:['Balanced','Answer supported questions, collect enquiries and hand over personalised commitments.'],
  ai_first:['AI-first','Handle supported enquiries independently. Safety and human handovers still take priority.']
 };
 function startReceptionEdit(){
  if(!state.receptionCanManage||!state.receptionConfig||state.receptionBusy)return;
  const c=state.receptionConfig;
  state.receptionDraft={ai_handling_mode:['human_first','balanced','ai_first'].includes(c.ai_handling_mode)?c.ai_handling_mode:'balanced',
   customer_enquiry_instructions:String(c.customer_enquiry_instructions||''),
   handover_instructions:String(c.handover_instructions||''),
   faqs:Array.isArray(c.faqs)?c.faqs.slice(0,40).map(item=>({question:String(item.question||''),answer:String(item.answer||'')})):[]};
  state.receptionEditing=true;state.receptionFeedback='';render({motion:'detail'});
 }
 function captureReceptionDraft(){
  const form=content.querySelector('#cnReceptionForm');
  if(!form||!state.receptionDraft)return null;
  const mode=form.querySelector('[name="ai_handling_mode"]')?.value||'balanced';
  const faqs=[...form.querySelectorAll('[data-reception-faq]')].map(row=>({
   question:row.querySelector('[data-reception-question]')?.value.trim()||'',
   answer:row.querySelector('[data-reception-answer]')?.value.trim()||''
  }));
  return {
   ai_handling_mode:mode,
   customer_enquiry_instructions:form.querySelector('[name="customer_enquiry_instructions"]')?.value.trim()||'',
   handover_instructions:form.querySelector('[name="handover_instructions"]')?.value.trim()||'',
   faqs
  };
 }
 async function saveReceptionConfig(){
  if(!state.receptionCanManage||state.receptionBusy||!state.receptionEditing)return;
  const next=captureReceptionDraft();if(!next)return;
  const feedback=content.querySelector('#cnReceptionFeedback'),form=content.querySelector('#cnReceptionForm');
  if(!receptionistModeLabels[next.ai_handling_mode]||next.customer_enquiry_instructions.length>6000||next.handover_instructions.length>4000||
     next.faqs.length>40||next.faqs.some(f=>!f.question||!f.answer||f.question.length>500||f.answer.length>2000)){
   if(feedback)feedback.textContent='Check the selected mode and complete every FAQ. Each question and answer must be within its length limit.';return;
  }
  state.receptionBusy=true;
  form.querySelector('[type="submit"]').disabled=true;
  if(feedback)feedback.textContent='Saving receptionist configuration…';
  const epoch=sessionEpoch;
  try{
   // Only the four supported fields. Never change voice enablement,
   // provider connection, system safeguards or onboarding state here.
   const result=await api('/api/business-configuration',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
   if(epoch!==sessionEpoch)return;
   if(!result?.configuration||result.configuration.ai_handling_mode!==next.ai_handling_mode)throw new Error('The server did not confirm the saved handling mode.');
   state.receptionConfig=result.configuration;
   state.receptionDraft=null;state.receptionEditing=false;
   state.receptionFeedback='Configuration saved. Existing safety rules and provider status have not changed.';
  }catch(error){if(epoch!==sessionEpoch)return;state.receptionError=error?.message||'The configuration could not be saved. Your edits are still here.';state.receptionDraft=next;}
  finally{if(epoch===sessionEpoch){state.receptionBusy=false;render({motion:'page'})}}
 }
 async function updateNativeHandover(id,status){
  if(state.handoverBusy||!['acknowledged','resolved'].includes(status)||!Array.isArray(state.handoverRows))return;
  const row=state.handoverRows.find(item=>String(item.id)===String(id));
  if(!row||!['requires_attention','acknowledged'].includes(row.status))return;
  if(status==='acknowledged'&&row.status!=='requires_attention')return;
  if(!window.confirm(status==='resolved'?'Mark this handover as resolved? This does not send a message to the customer.':'Acknowledge this handover as received?'))return;
  state.handoverBusy=true;state.handoverError='';render();
  const epoch=sessionEpoch;
  try{
   const result=await api('/api/handovers',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status})});
   if(epoch!==sessionEpoch)return;
   if(String(result?.id)!==String(id)||result?.status!==status)throw new Error('The server did not confirm the handover update.');
   state.handoverRows=state.handoverRows.map(item=>String(item.id)===String(id)?result:item);
  }catch(error){if(epoch===sessionEpoch)state.handoverError=error?.message||'The handover update was not saved.'}
  finally{if(epoch===sessionEpoch){state.handoverBusy=false;render()}}
 }
 function receptionist(){
  const c=state.receptionConfig,v=state.voiceStatus,editable=state.receptionCanManage;
  const active=Boolean(v?.enabled&&v?.provider_connected&&v?.live_calls_enabled);
  const mode=['human_first','balanced','ai_first'].includes(c?.ai_handling_mode)?c.ai_handling_mode:'balanced';
  const header='<header class="cf-screen-top"><div><span class="cn-kicker">AI ASSISTANT</span><h1>AI receptionist</h1></div><button type="button" class="cf-icon-button" data-reception-refresh aria-label="Refresh receptionist settings">↻</button></header>';
  const intro='<p class="cn-caption">Control how your web assistant responds to business enquiries. Live telephone calls are a separate provider service.</p>';
  const notice=state.receptionFeedback?'<p class="cn-work-message" role="status">'+safe(state.receptionFeedback)+'</p>':'';
  const error=state.receptionError?'<p class="cn-settings-error" role="alert">'+safe(state.receptionError)+'</p>':'';
  const loading=state.receptionLoading?empty('Loading assistant configuration…'):'';
  const summary=c?'<section class="cn-detail-panel"><div class="cn-section-bar"><span class="cn-kicker">WEB ASSISTANT</span><span class="cn-pill success">Configured</span></div>'+
   '<h2>'+safe(receptionistModeLabels[mode][0])+'</h2><p class="cn-caption">'+safe(receptionistModeLabels[mode][1])+'</p>'+
   '<dl><div><dt>FAQs</dt><dd>'+Math.min(40,Array.isArray(c.faqs)?c.faqs.length:0)+'</dd></div><div><dt>Custom instructions</dt><dd>'+(c.customer_enquiry_instructions?'Saved':'Not set')+'</dd></div><div><dt>Human handover</dt><dd>'+(c.handover_instructions?'Instructions saved':'Standard safeguards')+'</dd></div></dl>'+
   (editable&&!state.receptionEditing?'<button type="button" class="cn-primary" data-reception-edit>Edit assistant settings</button>':'')+
   (!editable?'<p class="cn-caption">You have read-only access to these settings.</p>':'')+'</section>':'';
  const draft=state.receptionDraft;
  const modes=Object.entries(receptionistModeLabels).map(([value,description])=>'<option value="'+value+'" '+(draft?.ai_handling_mode===value?'selected':'')+'>'+safe(description[0])+'</option>').join('');
  const faqs=(draft?.faqs||[]).map((faq,i)=>'<div class="cn-reception-faq" data-reception-faq><div class="cn-section-bar"><strong>FAQ '+(i+1)+'</strong><button type="button" class="cn-secondary" data-reception-remove-faq="'+i+'">Remove</button></div>'+
   '<label>Customer question<input maxlength="500" data-reception-question required value="'+safe(faq.question)+'"></label><label>Approved answer<textarea maxlength="2000" rows="3" data-reception-answer required>'+safe(faq.answer)+'</textarea></label></div>').join('');
  const editor=state.receptionEditing&&draft?'<section class="cn-detail-panel cn-colzo-record-form"><form id="cnReceptionForm"><h2>Assistant configuration</h2>'+
    '<p class="cn-caption">Changing handling mode never overrides safety routing or enables phone answering.</p>'+
    '<label>How should Colzo respond?<select name="ai_handling_mode">'+modes+'</select></label>'+
    '<label>Enquiry instructions<textarea name="customer_enquiry_instructions" rows="4" maxlength="6000" placeholder="What should Colzo ask customers about?">'+safe(draft.customer_enquiry_instructions)+'</textarea></label>'+
    '<label>Human handover instructions<textarea name="handover_instructions" rows="4" maxlength="4000" placeholder="When and how should the team follow up?">'+safe(draft.handover_instructions)+'</textarea></label>'+
    '<h3>Frequently asked questions</h3><p class="cn-caption">Approved FAQs belong to this business. The assistant cannot invent prices or availability.</p>'+faqs+
    '<button type="button" class="cn-secondary" data-reception-add-faq '+(draft.faqs.length>=40?'disabled':'')+'>+ Add FAQ</button>'+
    '<p id="cnReceptionFeedback" role="status" class="cn-caption"></p><div class="cn-form-actions"><button type="submit" class="cn-primary" '+(state.receptionBusy?'disabled':'')+'>Save assistant settings</button>'+
    '<button type="button" class="cn-secondary" data-reception-cancel>Cancel</button></div></form></section>':'';
  const phone='<section class="cn-detail-panel"><div class="cn-section-bar"><h2>Telephone reception</h2><span class="cn-pill '+(active?'success':'attention')+'">'+(active?'Connected':'Not connected')+'</span></div>'+
   (state.voiceLoading?'<p class="cn-caption">Checking connection…</p>':'')+
   (state.voiceError?'<p class="cn-settings-error">'+safe(state.voiceError)+'</p>':'')+
   (v?'<p>'+safe(v.message||'Voice provider status is not available.')+'</p><dl><div><dt>Provider</dt><dd>'+(v.provider_connected?'Connected':'Not connected')+'</dd></div><div><dt>Live calls</dt><dd>'+(v.live_calls_enabled?'Enabled':'Disabled')+'</dd></div><div><dt>Environment gate</dt><dd>'+(v.environment_gate_enabled?'Enabled':'Disabled')+'</dd></div></dl>':'<p class="cn-caption">Live calling is not confirmed and remains unavailable from this screen.</p>')+
   '<p class="cn-caption">This screen cannot enable calls or provision a phone number.</p></section>';
  const rows=Array.isArray(state.handoverRows)?state.handoverRows:[];
  const pending=rows.filter(row=>row.status==='requires_attention');
  const recent=rows.slice(0,15).map(row=>'<article class="cn-reception-handover"><div class="cn-section-bar"><strong>'+safe((row.reason||'Human handover').replace(/_/g,' '))+'</strong><span class="cn-pill '+(row.status==='resolved'?'success':'attention')+'">'+safe((row.status||'requires_attention').replace(/_/g,' '))+'</span></div>'+
   '<p>'+safe(row.summary||'Review the linked enquiry for context.')+'</p><small class="cn-caption">'+safe(row.created_at?day(row.created_at):'')+'</small>'+
   (['requires_attention','acknowledged'].includes(row.status)?'<div class="cn-form-actions">'+(row.status==='requires_attention'?'<button class="cn-secondary" type="button" data-reception-handover="'+safe(row.id)+'" data-reception-handover-status="acknowledged">Acknowledge</button>':'')+
    '<button class="cn-secondary" type="button" data-reception-handover="'+safe(row.id)+'" data-reception-handover-status="resolved">Resolve</button></div>':'')+'</article>').join('');
  const handover='<section class="cn-detail-panel"><div class="cn-section-bar"><h2>Human handovers</h2><span class="cn-pill progress">'+pending.length+' need attention</span></div>'+
   '<p class="cn-caption">Records are loaded from your existing business handover service, not simulated call counts.</p>'+
   (state.handoverLoading?'<p class="cn-caption">Loading handovers…</p>':'')+
   (state.handoverError?'<p class="cn-settings-error" role="alert">'+safe(state.handoverError)+'</p>':'')+
   (recent||(!state.handoverLoading&&!state.handoverError?'<p class="cn-caption">No handovers recorded for this business.</p>':''))+
   '<button class="cn-secondary" type="button" data-cn-screen="enquiries">View enquiries</button></section>';
  return header+intro+notice+error+loading+summary+editor+phone+handover+
    '<section class="cn-detail-panel"><h2>Trusted answers</h2><p class="cn-caption">Only approved Business Knowledge can ground the assistant and Marketing. Unsupported requests and emergencies still require safe routing.</p>'+
    '<div class="cn-form-actions"><button class="cn-secondary" type="button" data-cn-screen="knowledge">Business Knowledge</button><button class="cn-secondary" type="button" data-cn-setting="integrations">Integrations</button></div></section>';
 }
 function more(){
  const moreItems=[['analytics','▥','Analytics','Recorded activity and opportunity value'],['publicProfile','◈','Public profile','Customer-facing business details'],['feedback','?','Help and feedback','Send a secure feedback report'],['automations','↻','Automations','Read current automation status'],['billing','◈','Billing','Current plan and feature access'],['knowledge','◇','Business knowledge','Facts and accuracy review'],['receptionist','✦','AI receptionist','Phone answering and handover status'],['projects','▦','Projects','Track saved work and progress'],['clients','♧','Customers','Saved customer records'],['quotes','£','Quotes','Saved quote records'],['enquiries','▤','Enquiries','Review and manage customer requests'],['bookings','▣','Bookings','Calendar and appointments'],['actions','✓','Actions','Tasks and follow-ups'],['marketing','✧','Marketing','Draft library and scheduled posts'],['growth','↗','Growth & sharing','Review requests, reminders, QR links and referrals'],['profile','▤','Business profile','Your business details'],['team','♧','Team members','Invitations and access'],['integrations','⌁','Integrations','Connected services'],['notifications','◐','Notifications','Device permissions and preferences'],['appearance','✦','Appearance','Motion and display'],['security','⬡','Security','Authentication and session protection'],['help','?','Help and support','Get help or send feedback']];
  const business=typeof settings!=='undefined'?String(settings?.business_name||'Your business'):'Your business';
  const choices=[['▤','Business profile','Manage your business details','profile'],['♧','Team members','Invite and manage your team','team'],['⌁','Integrations','Manage connected services','integrations'],['◐','Notifications','Device alerts and preferences','notifications'],['◐','Appearance','Motion, contrast and display','appearance'],['⬡','Security','Password and two-factor authentication','security'],['?','Help & support','Get help or contact our team','help']];
  return `<header class="cf-screen-top cf-settings-title"><h1>Settings</h1><button type="button" class="cf-icon-button cn-settings-search" data-cn-command aria-label="Search Colzo tools">⌕</button></header><div class="cf-profile"><span class="cf-profile-avatar">${initial(business)}</span><div><strong>${safe(business)}</strong><small>Business account</small><small>Connected workspace</small></div><button data-cn-setting="profile" aria-label="Open business profile" type="button">›</button></div>
  <section class="cn-knowledge-shortcut" aria-label="AI knowledge">
    <button type="button" data-cn-screen="knowledge"><span class="cn-knowledge-glyph" aria-hidden="true">◇</span><span><strong>Business Knowledge</strong><small>Keep AI answers and marketing factual</small></span><span aria-hidden="true">›</span></button>
  </section>
  <div class="cf-settings-list">${choices.map(([glyph,label,detail,view])=>`<button type="button" data-cn-setting="${view}"><span class="cf-settings-icon">${glyph}</span><span class="cf-settings-label"><strong>${label}</strong><small>${detail}</small></span><span class="cf-settings-arrow">›</span></button>`).join('')}</div>
  <section class="cf-tools-extra" aria-labelledby="cnBusinessToolsHeading"><h2 id="cnBusinessToolsHeading">Business tools</h2><div class="cn-more-links">${moreItems.filter(([id])=>id!=='knowledge'&&!choices.some(choice=>choice[3]===id)).map(([id,icon,label,detail])=>`<button type="button" ${['projects','clients','quotes','bookings','actions','marketing','enquiries','receptionist','growth','billing','knowledge','analytics','feedback','automations','publicProfile'].includes(id)?`data-cn-screen="${id}"`:['profile','team','integrations','notifications','appearance','security','help'].includes(id)?`data-cn-setting="${id}"`:`data-cn-legacy="${id}"`}><span class="cn-more-icon">${icon}</span><span><strong>${label}</strong><small>${detail}</small></span><b>›</b></button>`).join('')}</div></section>
  <button class="cf-signout" type="button" data-cn-signout>Sign out</button>`;
 }
 const nativeSettingMeta={
  profile:['Business profile','YOUR BUSINESS','The details that represent your business.'],
  team:['Team members','PEOPLE & ACCESS','Manage staff access and secure invitations.'],
  integrations:['Integrations','CONNECTED SERVICES','Manage existing marketing, website and customer connections.'],
  notifications:['Notifications','ALERTS & UPDATES','Control device notifications and review follow-ups.'],
  appearance:['Appearance','PERSONALISE COLZO','Fine-tune how Colzo looks and moves on this device.'],
  security:['Security','PROTECT YOUR ACCOUNT','Authentication, trusted access and device security.'],
  securityCentre:['Account security','PROTECT YOUR ACCOUNT','Your existing authenticator and account protection controls.'],
  help:['Help & support','HERE TO HELP','Get support and send feedback about Colzo.']
 };
 function settingPanel(titleText,body,iconText='▤'){
   return `<section class="cn-settings-panel"><div class="cn-settings-panel-head"><span class="cn-settings-panel-icon" aria-hidden="true">${safe(iconText)}</span><h2>${safe(titleText)}</h2></div>${body}</section>`;
 }
 const settingsButton=(label,detail,action='settings',icon='↗')=>`<button type="button" class="cn-settings-action" ${['bookings','actions','marketing','receptionist','billing','feedback'].includes(action)?`data-cn-screen="${action}"`:action==='businessProfile'?`data-cn-screen="publicProfile"`:['profile','team','integrations','notifications','appearance','security','securityCentre','help'].includes(action)?`data-cn-setting="${safe(action)}"`:`data-cn-screen="more"`}><span><strong>${safe(label)}</strong><small>${safe(detail)}</small></span><span aria-hidden="true">${icon}</span></button>`;
 function nativeSetting(){
   const key=state.setting;
   const meta=nativeSettingMeta[key];
   if(!meta)return `<button class="cn-back" data-cn-back-settings type="button">← Settings</button>${empty('Choose a settings section.')}`;
   const business=typeof settings!=='undefined'&&settings?settings:{};
   const head=`<header class="cn-settings-detail-head"><button type="button" data-cn-back-settings class="cn-settings-back" aria-label="Back to Settings"><span aria-hidden="true">←</span><span>Settings</span></button><span class="cn-kicker">${safe(meta[1])}</span><h1>${safe(meta[0])}</h1><p>${safe(meta[2])}</p></header>`;
   let body='';
   if(key==='profile'){
     const fields=[['business_name','Business name','text',120],['business_type','Business type','text',120],['phone','Phone','tel',120],['email','Contact email','email',320],['address','Business location','text',1000]];
     body=settingPanel('Business information',`<form id="cnBusinessSettings" class="cn-settings-form">${fields.map(([id,label,type,max])=>`<label for="cn-setting-${id}">${label}<input id="cn-setting-${id}" name="${id}" type="${type}" maxlength="${max}" value="${safe(business[id]||'')}" ${id==='business_name'?'required':''} autocomplete="off"></label>`).join('')}<p class="cn-settings-hint">Updates are saved to your existing business account.</p><button class="cn-settings-save" type="submit" ${state.settingsBusy?'disabled':''}>${state.settingsBusy?'Saving…':'Save business details'} <span aria-hidden="true">↗</span></button><p class="cn-settings-feedback" id="cnBusinessFeedback" role="status"></p></form>`,'▤')+settingPanel('Public business page',`<p class="cn-settings-hint">Profile photos, public services and your listing are managed through the existing secure business profile editor.</p>${settingsButton('Manage public profile','Images, customer-facing content and directory details','businessProfile')}`,'◈');
   }else if(key==='team'){
     const members=Array.isArray(state.teamData?.members)?state.teamData.members:[];
     const invitations=Array.isArray(state.teamData?.invitations)?state.teamData.invitations:[];
     const loaded=!state.teamLoading&&!state.teamError;
     const list=state.teamLoading?'<div class="cn-settings-loading" role="status">Loading your team…</div>':state.teamError?`<p class="cn-settings-error" role="alert">${safe(state.teamError)}</p>`:
       [...members.map(member=>`<div class="cn-settings-member"><span class="cn-avatar">♧</span><span><strong>${safe(member.role||'Member')}</strong><small>Active team access</small></span></div>`),...invitations.map(inv=>`<div class="cn-settings-member"><span class="cn-avatar">✉</span><span><strong>${safe(inv.invited_email||'Invitation')}</strong><small>${safe(inv.role||'member')} · ${safe(inv.status||'Pending')}</small></span></div>`)].join('')||'<p class="cn-settings-hint">No additional team members or invitations.</p>';
     body=settingPanel('Your team',`${list}<button type="button" class="cn-settings-outline" data-cn-refresh-team>Refresh team ↻</button>`,'♧')+settingPanel('Invite a team member',`<p class="cn-settings-hint">Invitations create a secure link for you to share. They do not automatically email the recipient.</p><form id="cnInviteTeam" class="cn-settings-form"><label for="cnInviteEmail">Email address<input id="cnInviteEmail" name="email" type="email" maxlength="320" placeholder="staff@example.co.uk" required></label><label for="cnInviteRole">Access level<select id="cnInviteRole" name="role"><option value="member">Staff member</option><option value="admin">Admin</option></select></label><button class="cn-settings-save" type="submit" ${state.settingsBusy?'disabled':''}>Create secure invitation</button><p id="cnInviteFeedback" class="cn-settings-feedback" role="status">${safe(state.inviteFeedback)}${state.inviteUrl?`<span class="cn-invite-share"><input value="${safe(state.inviteUrl)}" readonly aria-label="New invitation link"/><button type="button" data-cn-copy-invite>Copy link</button></span>`:''}</p></form>`,'✉')+settingPanel('Advanced access',`${settingsButton('Manage existing invitations','Review and revoke existing access using your original secure tools','settings')}`,'⬡');
     if(!loaded&&state.teamData===null)body=body.replace('Your team','Your team');
   }else if(key==='integrations'){
     body=settingPanel('Marketing channels',`<p class="cn-settings-hint">Manage connected social channels and approved publishing within the existing Marketing workspace.</p>${settingsButton('Facebook and social publishing','View connections, drafts and publishing permissions','marketing','↗')}`,'⌁')+settingPanel('Website and enquiries',`<div class="cn-settings-status"><span><strong>Website assistant</strong><small>Embed configuration is not yet available in Colzo. Existing website integrations are preserved.</small></span><strong>Unavailable</strong></div>${settingsButton('Customer-facing business page','View your listing and public profile controls','businessProfile')}`,'▤')+`<p class="cn-settings-note">Colzo does not claim that an integration is connected until your account confirms it.</p>`;
   }else if(key==='notifications'){
     const supported=typeof Notification!=='undefined'&&window.isSecureContext;
     const permission=supported?Notification.permission:'unavailable';
     body=settingPanel('This device',`<div class="cn-settings-status"><span>Browser notification permission</span><strong>${safe(permission)}</strong></div><p class="cn-settings-hint">Allowing notifications gives this browser permission only. Actual Colzo push alerts are not yet enabled, so this will not schedule messages.</p>`,'◐')+settingPanel('Customer follow-ups',`${settingsButton('Actions and reminders','Manage your existing follow-up tasks','actions')}${settingsButton('AI receptionist','Review enquiry notifications and handling settings','settings')}`,'✓');
   }else if(key==='appearance'){
     body=settingPanel('Graphite & Volt',`<div class="cn-settings-swatch"><span></span><div><strong>Signature dark</strong><small>Colzo's reference design. Light theme is not enabled.</small></div><span class="cn-settings-check">✓</span></div>`,'◐')+settingPanel('Motion and layout',`<label class="cn-settings-toggle"><span><strong>Reduced animations</strong><small>Quieter tab changes and screen transitions</small></span><input type="checkbox" id="cnQuietMotion" ${state.quietMotion?'checked':''}></label><label class="cn-settings-toggle"><span><strong>Compact cards</strong><small>Fit more enquiries and projects on each screen</small></span><input type="checkbox" id="cnCompactCards" ${state.compactCards?'checked':''}></label><p class="cn-settings-hint">These appearance choices apply to this session. Your system's Reduce Motion setting always takes priority.</p>`,'✦');
   }else if(key==='security'){
     body=settingPanel('Two-step verification',`<div class="cn-settings-feature"><span class="cn-settings-feature-icon">⬡</span><span><strong>Authenticator app</strong><small>Existing accounts keep their enrolled authenticator and required verification.</small></span></div>${settingsButton('Manage authenticator and devices','View verified factors, recovery options and passkeys','securityCentre')}`,'⬡')+settingPanel('Face ID & passkeys',`<p class="cn-settings-hint">Passkey sign-in using your device remains in testing. It does not bypass an existing second-factor requirement.</p><div class="cn-settings-status"><span>Passkey sign-in</span><strong>${window.colzoPasskeysEnabled===true?'Device eligibility required':'Not enabled'}</strong></div>`,'◈')+settingPanel('Session protection',`${settingsButton('Account security centre','Manage trusted sign-in and session controls','securityCentre')}`,'▣');
   }else if(key==='securityCentre'){
     body='<div id="cnSecurityCentreHost"><p role="status">Account security controls are unavailable. Your existing protection remains enabled.</p></div>';
   }else if(key==='help'){
     body=settingPanel('Help with Colzo',`<p class="cn-settings-hint">Tell us about something that looks wrong, isn't working or could be improved.</p>${settingsButton('Send pilot feedback','Use the secure Colzo feedback form','feedback')}`,'?')+settingPanel('Useful shortcuts',`<button data-cn-command type="button" class="cn-settings-action"><span><strong>Find a Colzo tool</strong><small>Search pages, bookings, marketing or settings</small></span><span aria-hidden="true">⌕</span></button>${settingsButton('Business account controls','Manage your existing business and permissions','settings')}`,'✧');
   }
   return head+`<div class="cn-settings-panels">${body}</div>`;
 }
 async function loadColzoResource(resource,force=false){
  const requestEpoch=sessionEpoch;
  if(!['clients','projects','quotes'].includes(resource)||state.colzoPending[resource])return;
  if(!force&&Array.isArray(state.colzoRecords[resource]))return;
  state.colzoPending[resource]=true;state.colzoLoading=resource;state.colzoError='';state.colzoErrorResource=resource;
  if(state.screen===resource||(state.screen==='colzoDetail'&&state.colzoDetail?.resource===resource))render();
  try{
   if(typeof api!=='function')throw new Error('Colzo records are unavailable in this preview.');
   const data=await api(`/api/colzo-records?resource=${resource}`);if(requestEpoch!==sessionEpoch)return;
   if(!Array.isArray(data))throw new Error('The server returned an unexpected records response.');
   state.colzoRecords[resource]=data;
  }catch(error){if(requestEpoch!==sessionEpoch)return;state.colzoErrorResource=resource;state.colzoError=error?.message||'Records could not be loaded.';}
  finally{if(requestEpoch!==sessionEpoch)return;state.colzoPending[resource]=false;if(state.colzoLoading===resource)state.colzoLoading='';if(state.screen===resource||(state.screen==='colzoDetail'&&state.colzoDetail?.resource===resource))render()}
 }
 async function saveColzoRecord(form){
  if(state.colzoBusy)return;
  const resource=String(form.dataset.resource||''),id=String(form.dataset.recordId||'');
  if(!['clients','projects','quotes'].includes(resource))return;
  const feedback=content.querySelector('#cnColzoFeedback'),button=form.querySelector('[type=submit]');
  const originalButtonLabel=button?.textContent;
  const showSaveError=message=>{if(feedback){feedback.textContent=message;feedback.setAttribute?.('role','alert')}};
  const values=Object.fromEntries(new FormData(form).entries());
  if(resource==='quotes')values.amount_gbp=String(values.amount_gbp||'').trim();
  if(resource==='projects'){values.progress=Number(values.progress||0);values.lead_id=values.lead_id?String(values.lead_id):null}
  if(resource==='quotes')values.lead_id=String(values.lead_id||'');
  // Compare edits with the exact version returned by the server, not browser time.
  const original=id&&state.colzoForm?.resource===resource&&String(state.colzoForm?.record?.id)===id?state.colzoForm.record:null;
  if(id&&(!original||typeof original.updated_at!=='string'||!Number.isFinite(Date.parse(original.updated_at)))){
   showSaveError('This record needs to be reloaded before editing. Your changes have not been saved.');
   return;
  }
  if(resource==='quotes'){
   const selectedStatus=String(values.status||'draft');
   if(id&&(selectedStatus!==String(original.status||'draft')||['sent','accepted'].includes(original.status))){
    showSaveError('Quote status and issued quotes are managed separately. No changes have been saved.');
    return;
   }
   if(!id&&selectedStatus!=='draft'){
    showSaveError('A new quote must start as a draft. No changes have been saved.');
    return;
   }
  }
  if(id)values.expected_updated_at=original.updated_at;
  let writeConfirmed=false;
  const showRefreshWarning=()=>{
    state.colzoFeedback=id
      ?'Changes saved, but the list could not be refreshed. Tap Try again.'
      :'Record created, but the list could not be refreshed. Tap Try again.';
    if(state.screen===resource||(state.screen==='colzoDetail'&&state.colzoDetail?.resource===resource))render();
  };
  state.colzoBusy=true;form.setAttribute?.('aria-busy','true');if(button){button.disabled=true;button.textContent='Saving…'}if(feedback){feedback.setAttribute?.('role','status');feedback.textContent='Saving securely…'}
  try{
   if(typeof api!=='function')throw new Error('Saving is unavailable in this preview.');
   const result=await api(`/api/colzo-records?resource=${resource}${id?`&id=${encodeURIComponent(id)}`:''}`,{method:id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});
   if(!result||!result.id)throw new Error('The server did not confirm the saved record.');
   writeConfirmed=true;
   state.colzoForm=null;state.colzoFeedback=id?'Changes saved.':'Record created.';state.colzoError='';
   await loadColzoResource(resource,true);
   if(state.colzoError&&state.colzoErrorResource===resource)showRefreshWarning();
  }catch(error){
    if(writeConfirmed){
      state.colzoErrorResource=resource;
      state.colzoError=error?.message||'The saved list could not be refreshed.';
      showRefreshWarning();
    }else{showSaveError(error?.message||'Could not save. Your changes have not been confirmed.');state.colzoFeedback='';}
  }
  finally{state.colzoBusy=false;form.setAttribute?.('aria-busy','false');if(button){button.disabled=false;button.textContent=originalButtonLabel}}
 }
 function colzoRecordForm(resource,record=null){
  const editing=!!record,close='<button type="button" class="cn-secondary" data-colzo-cancel>Cancel</button>';
  const field=(name,label,value='',type='text',required=false,extra='')=>`<label>${label}<input name="${name}" type="${type}" value="${safe(value)}" ${required?'required':''} ${extra}></label>`;
  const textarea=(name,label,value='')=>`<label>${label}<textarea name="${name}" rows="3" maxlength="4000">${safe(value)}</textarea></label>`;
  if(resource==='clients'){
    // Dedicated approved Add/Edit screen with only supported customer fields.
    const heading=editing?'Edit Customer':'Add Customer';
    const name=field('full_name','Full name *',record?.full_name||'','text',true,'minlength="2" maxlength="160" autocomplete="name"');
    const email=field('email','Email address',record?.email||'','email',false,'maxlength="320" autocomplete="email"');
    const phone=field('phone','Phone number',record?.phone||'','tel',false,'maxlength="80" autocomplete="tel"');
    const notes=textarea('notes','Internal notes',record?.notes||'');
    return `<section class="cn-approved-client-form" aria-label="${heading}">
      <form id="cnColzoForm" data-resource="clients" data-record-id="${safe(record?.id||'')}">
        <header class="cn-approved-form-header">
          <button type="button" class="cn-approved-text-action" data-colzo-cancel>Cancel</button>
          <h2>${heading}</h2>
          <button type="submit" class="cn-approved-text-action cn-approved-save">${editing?'Save':'Create'}</button>
        </header>
        <p class="cn-approved-form-subtitle">Saved to this business only. No automatic messages are sent.</p>
        <div class="cn-approved-form-group"><h3>CUSTOMER DETAILS</h3>${name}</div>
        <div class="cn-approved-form-group"><h3>CONTACT DETAILS <small>Optional</small></h3>${email}${phone}</div>
        <div class="cn-approved-form-group"><h3>NOTES <small>Optional</small></h3>${notes}</div>
        <p id="cnColzoFeedback" class="cn-caption" role="status" aria-live="polite">${safe(state.colzoFeedback)}</p>
        <p class="cn-approved-form-limit">Customer profiles save contact details and private notes. Add company or work location information to notes if needed.</p>
      </form>
    </section>`;
  }
  let fields='';
  if(resource==='clients')fields=field('full_name','Full name',record?.full_name||'', 'text',true,'minlength="2" maxlength="160"')+field('email','Email address',record?.email||'','email',false,'maxlength="320"')+field('phone','Phone number',record?.phone||'','tel',false,'maxlength="80"')+textarea('notes','Notes',record?.notes||'');
  if(resource==='projects')fields=field('title','Project name',record?.title||'','text',true,'minlength="3" maxlength="160"')+field('client_name','Customer name',record?.client_name||'','text',false,'maxlength="160"')+`<label>Status<select name="status">${['planned','active','paused','completed'].map(v=>`<option value="${v}" ${(record?.status||'planned')===v?'selected':''}>${v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></label><label>Progress <output>${Number(record?.progress||0)}%</output><input name="progress" type="range" min="0" max="100" step="5" value="${Number(record?.progress||0)}"></label>`+textarea('notes','Notes',record?.notes||'');
  if(resource==='quotes')fields=`<label>Related enquiry<select name="lead_id" required><option value="">Choose an enquiry</option>${records().enquiries.map(l=>`<option value="${safe(l.id)}" ${String(record?.lead_id||'')===String(l.id)?'selected':''}>${safe(contact(l))} · ${safe(l.job_type||'Enquiry')}</option>`).join('')}</select></label>`+field('title','Quote title',record?.title||'','text',true,'minlength="3" maxlength="160"')+field('amount_gbp','Amount (GBP)',record?.amount_gbp??'','number',true,'min="0" max="999999999.99" step="0.01"')+`<p class=\"cn-caption cn-quote-draft-hint\">Status: ${safe((record?.status||'draft').replace(/^./,x=>x.toUpperCase()))}. Sending or approving a quote is a separate workflow; saving here does not send it.</p><input type=\"hidden\" name=\"status\" value=\"${safe(record?.status||'draft')}\">`+textarea('notes','Notes',record?.notes||'');
  if(resource==='quotes'&&!editing&&!records().enquiries.length)fields+='<p class="cn-caption cn-quote-link-help" role="status">Create an enquiry before saving a draft quote. Quotes must be linked to an existing enquiry.</p><button class="cn-secondary" type="button" data-cn-screen="enquiries">Go to enquiries</button>';
  return `<section class="cn-detail-panel cn-colzo-record-form"><form id="cnColzoForm" data-resource="${resource}" data-record-id="${safe(record?.id||'')}"><h2>${editing?'Edit':'Create'} ${resource==='clients'?'customer':resource==='projects'?'project':'quote'}</h2>${fields}<p id="cnColzoFeedback" class="cn-caption" role="status">${safe(state.colzoFeedback)}</p><div class="cn-form-actions"><button type="submit" class="cn-primary">${editing?'Save changes':'Create '+(resource==='clients'?'customer':resource==='projects'?'project':'quote')}</button>${close}</div></form></section>`;
 }
 async function loadNativeTeam(){
  const requestEpoch=sessionEpoch;
   if(state.teamLoading)return;
   state.teamLoading=true;state.teamError='';
   if(state.screen==='setting'&&state.setting==='team')render();
   try{
     if(typeof api!=='function')throw new Error('Team data is unavailable in this preview.');
     const response=await api('/api/team');if(requestEpoch!==sessionEpoch)return;
     state.teamData=response;
   }catch(error){if(requestEpoch!==sessionEpoch)return;state.teamError=error?.message||'Team details could not be loaded.';}
   finally{if(requestEpoch!==sessionEpoch)return;state.teamLoading=false;if(state.screen==='setting'&&state.setting==='team')render()}
 }
 async function saveNativeBusiness(form){
   const feedback=content.querySelector('#cnBusinessFeedback');
   if(state.settingsBusy)return;
   const fields=new FormData(form),updates={};
   for(const key of ['business_name','business_type','phone','email','address'])updates[key]=String(fields.get(key)||'').trim();
   if(!updates.business_name){if(feedback)feedback.textContent='Please enter your business name.';return}
   const button=form.querySelector('[type=submit]');state.settingsBusy=true;if(button)button.disabled=true;
   if(feedback)feedback.textContent='Saving business details…';
   try{
     if(typeof api!=='function')throw new Error('Saving is unavailable in this preview.');
     const saved=await api('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(updates)});
     if(typeof settings!=='undefined'){settings=saved;if(typeof fillSettings==='function')fillSettings()}
     if(feedback)feedback.textContent='Business details saved successfully.';
   }catch(error){if(feedback)feedback.textContent=error?.message||'Your changes could not be saved.';}
   finally{state.settingsBusy=false;if(button)button.disabled=false}
 }
 async function inviteNativeMember(form){
   const feedback=content.querySelector('#cnInviteFeedback');if(state.settingsBusy)return;
   const data=new FormData(form),email=String(data.get('email')||'').trim(),role=String(data.get('role')||'member');
   if(!email||!['member','admin'].includes(role)){if(feedback)feedback.textContent='Enter a valid email and access level.';return}
   const button=form.querySelector('[type=submit]');state.settingsBusy=true;if(button)button.disabled=true;
   if(feedback)feedback.textContent='Creating your secure invitation…';
   try{
     if(typeof api!=='function')throw new Error('Invitations are unavailable in this preview.');
     const result=await api('/api/team',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,role})});
     const url=new URL(result.accept_path,window.location.origin);
     if(url.origin!==window.location.origin)throw new Error('Invitation link did not match this app.');
     state.inviteFeedback='Invitation created. Share the secure link only with the intended person.';state.inviteUrl=url.toString();
     if(feedback){feedback.textContent=state.inviteFeedback;}
     form.reset();await loadNativeTeam();
   }catch(error){if(feedback)feedback.textContent=error?.message||'Could not create the invitation.';}
   finally{state.settingsBusy=false;if(button)button.disabled=false}
 }

 const workDateFormat=(value,options={})=>{const parsed=dateValue(value);return parsed?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',...options}).format(parsed):'Not scheduled'};
 const datetimeLocal=value=>{const d=dateValue(value);if(!d)return '';const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16)};
 const workTabs={bookings:['Active','All','Completed','Cancelled'],actions:['Open','All','Completed','Cancelled']};
 const workIsCurrent=(entry,screen,filter)=>{
   const status=String(entry.status||'').toLowerCase();
   if(filter==='All')return true;
   if(filter==='Completed')return status==='completed';
   if(filter==='Cancelled')return status==='cancelled';
   if(screen==='actions')return !['completed','cancelled'].includes(status);
   return !['completed','cancelled'].includes(status);
 };
 const workScreenTitle=screen=>screen==='bookings'?'Bookings':'Actions';
 const workTag=(value)=>{
   const normalized=String(value||'pending').toLowerCase();
   const mood=normalized==='completed'?'finished':normalized==='cancelled'?'cancelled':normalized==='confirmed'?'confirmed':'pending';
   return `<span class="cn-work-status ${mood}">${safe(normalized.replace(/_/g,' '))}</span>`;
 };
 const workCount=(screen,filter)=>records()[screen].filter(entry=>workIsCurrent(entry,screen,filter)).length;
 const workItems=(screen)=>{
   const all=[...records()[screen]];
   const query=state.workSearch[screen].trim().toLowerCase();
   return all.filter(entry=>workIsCurrent(entry,screen,state.workFilter[screen])&&(!query||[entry.title,entry.customer_name,entry.location,entry.description,entry.status,entry.action_type].join(' ').toLowerCase().includes(query)))
     .sort((a,b)=>{
       const aTime=Date.parse(screen==='bookings'?a.starts_at:a.due_at);
       const bTime=Date.parse(screen==='bookings'?b.starts_at:b.due_at);
       return (Number.isFinite(aTime)?aTime:Infinity)-(Number.isFinite(bTime)?bTime:Infinity);
     });
 };
 function workHeader(screen,description){
   const tabs=workTabs[screen];
   return `<header class="cn-work-header"><button type="button" class="cn-settings-back" data-cn-screen="more" aria-label="Back to More">← <span>More</span></button><span class="cn-kicker">OPERATIONS / ${screen==='bookings'?'CALENDAR':'FOLLOW-UPS'}</span><div class="cn-work-title-row"><div><h1>${workScreenTitle(screen)}</h1><p>${safe(description)}</p></div><button class="cn-work-add" data-cn-work-new type="button" aria-label="Add ${screen==='bookings'?'booking':'action'}">+</button></div></header>
     <div class="cn-work-tabs" role="group" aria-label="Filter ${screen}">${tabs.map(filter=>`<button type="button" data-cn-work-tab="${filter}" aria-pressed="${state.workFilter[screen]===filter}">${filter}<span>${workCount(screen,filter)}</span></button>`).join('')}</div>
     <div class="cn-work-search"><span aria-hidden="true">⌕</span><input id="cnWorkSearch" type="search" aria-label="Search ${screen}" value="${safe(state.workSearch[screen])}" placeholder="Search ${screen}…"/><button type="button" data-cn-work-refresh aria-label="Refresh ${screen}" title="Refresh">↻</button></div>`;
 }
 function bookingScreen(){
   const items=workItems('bookings');
   const scheduled=records().bookings.filter(b=>b.starts_at).length;
   return `${workHeader('bookings','Your appointments, requests and confirmed work.')}
     <div class="cn-work-stats"><article><span>Recorded bookings</span><strong>${records().bookings.length}</strong></article><article><span>With a date</span><strong>${scheduled}</strong></article></div>
     <div class="cn-work-month"><button type="button" data-cn-work-month="-1" aria-label="Previous month">‹</button><strong>${safe(new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(new Date(state.workDate+'-01T12:00:00')))}</strong><button type="button" data-cn-work-month="1" aria-label="Next month">›</button></div>
     ${bookingMonth()}
     <div class="cn-work-list-title"><h2>${state.workFilter.bookings==='Active'?'Active bookings':`${safe(state.workFilter.bookings)} bookings`}</h2><span>${items.length} shown</span></div>
     <div class="cn-work-list">${items.length?items.map(item=>workCard(item,'bookings')).join(''):empty('No bookings match this view.','<button type="button" data-cn-work-new>Add a booking</button>')}</div>
     ${state.workFeedback?`<p class="cn-work-message" role="status">${safe(state.workFeedback)}</p>`:''}
     ${state.workModal==='bookings'?workDialog('bookings'):''}`;
 }
 function bookingMonth(){
   const [year,month]=state.workDate.split('-').map(Number),first=new Date(year,month-1,1),days=new Date(year,month,0).getDate(),offset=(first.getDay()+6)%7;
   const counts=new Map();
   for(const b of records().bookings){const date=dateValue(b.starts_at);if(date&&date.getFullYear()===year&&date.getMonth()+1===month){const n=date.getDate();counts.set(n,(counts.get(n)||0)+1)}}
   const today=new Date();
   return `<div class="cn-work-calendar" aria-label="Booking calendar for ${safe(state.workDate)}">${['M','T','W','T','F','S','S'].map(d=>`<span class="weekday">${d}</span>`).join('')}${Array(offset).fill('<span class="emptyday" aria-hidden="true"></span>').join('')}${Array.from({length:days},(_,i)=>{const d=i+1,c=counts.get(d)||0,isToday=year===today.getFullYear()&&month===today.getMonth()+1&&d===today.getDate();return `<div class="calendar-day ${isToday?'today':''}" aria-label="${d}: ${c} bookings"><span>${d}</span>${c?'<i></i>':''}</div>`}).join('')}</div>`;
 }
 function workCard(entry,screen){
   const date=screen==='bookings'?entry.starts_at:entry.due_at;
   const summary=screen==='bookings'?entry.customer_name||entry.location||'Appointment':String(entry.action_type||'follow up').replace(/_/g,' ');
   const priority=screen==='actions'?`<span class="cn-work-priority ${safe(entry.priority||'normal')}">${safe(entry.priority||'normal')} priority</span>`:'';
   return `<button type="button" class="cn-work-record" data-cn-work-edit="${safe(entry.id)}"><span class="cn-work-date"><strong>${dateValue(date)?safe(new Intl.DateTimeFormat('en-GB',{day:'2-digit'}).format(new Date(date))):'—'}</strong><small>${dateValue(date)?safe(new Intl.DateTimeFormat('en-GB',{month:'short'}).format(new Date(date))):'TBD'}</small></span><span class="cn-work-record-main"><strong>${safe(entry.title||'Untitled')}</strong><small>${safe(summary)}</small><span class="cn-work-record-badges">${workTag(entry.status)}${priority}</span></span><span class="cn-work-chevron" aria-hidden="true">›</span></button>`;
 }
 function actionsScreen(){
   const items=workItems('actions');
   const pending=workCount('actions','Open');
   const urgent=records().actions.filter(a=>['high','urgent'].includes(a.priority)&&workIsCurrent(a,'actions','Open')).length;
   return `${workHeader('actions','Keep your follow-ups moving and stay organised.')}
     <div class="cn-work-stats"><article><span>Open tasks</span><strong>${pending}</strong></article><article><span>High priority</span><strong>${urgent}</strong></article></div>
     <div class="cn-work-list-title"><h2>${state.workFilter.actions==='Open'?'To do':`${safe(state.workFilter.actions)} actions`}</h2><span>${items.length} shown</span></div>
     <div class="cn-work-list">${items.length?items.map(entry=>workCard(entry,'actions')).join(''):empty('No actions match this view.','<button type="button" data-cn-work-new>Create an action</button>')}</div>
     ${state.workFeedback?`<p class="cn-work-message" role="status">${safe(state.workFeedback)}</p>`:''}
     ${state.workModal==='actions'?workDialog('actions'):''}`;
 }
 const validWorkId=id=>/^[1-9]\d*$/.test(String(id||''));
 const workPick=(screen,id)=>records()[screen].find(entry=>String(entry.id)===String(id));
 function workDialog(screen){
   const selected=state.workSelected,entry=selected?workPick(screen,selected):null,editing=!!entry;
   if(selected&&!entry)return '';
   const relatedLeads=records().enquiries.filter(l=>validWorkId(l.id));
   const heading=`${editing?'Edit':'New'} ${screen==='bookings'?'booking':'action'}`;
   const common=`<label>Title<input name="title" required maxlength="200" value="${safe(entry?.title||'')}" placeholder="${screen==='bookings'?'Site visit or appointment':'Follow up with a customer'}"/></label>
     <label>Related enquiry (optional)<select name="lead_id"><option value="">Not linked</option>${relatedLeads.map(l=>`<option value="${safe(l.id)}" ${String(entry?.lead_id||'')===String(l.id)?'selected':''}>${safe(contact(l))}</option>`).join('')}</select></label>`;
   const statusOptions=screen==='bookings'?['requested','confirmed','completed','cancelled']:['pending','completed','cancelled'];
   const fields=screen==='bookings'?`
      <label>Customer name<input name="customer_name" maxlength="160" value="${safe(entry?.customer_name||'')}"/></label>
      <div class="cn-work-form-pair"><label>Start<input type="datetime-local" name="starts_at" value="${safe(datetimeLocal(entry?.starts_at))}"/></label><label>End<input type="datetime-local" name="ends_at" value="${safe(datetimeLocal(entry?.ends_at))}"/></label></div>
      <label>Location<input name="location" maxlength="500" value="${safe(entry?.location||'')}"/></label>
      <label>Notes<textarea name="notes" rows="3" maxlength="5000">${safe(entry?.notes||'')}</textarea></label>`:
     `<label>Type<select name="action_type">${['custom','follow_up','call_customer','send_quote','confirm_appointment','review_enquiry'].filter(v=>!editing||entry?.action_type==='request_review'||v!=='').map(v=>`<option value="${v}" ${String(entry?.action_type||'follow_up')===v?'selected':''}>${safe(v.replace(/_/g,' '))}</option>`).join('')}${entry?.action_type==='request_review'?'<option value="request_review" selected>Review request</option>':''}</select></label>
      <div class="cn-work-form-pair"><label>Due date<input name="due_at" type="datetime-local" value="${safe(datetimeLocal(entry?.due_at))}"/></label><label>Priority<select name="priority">${['low','normal','high','urgent'].map(v=>`<option value="${v}" ${String(entry?.priority||'normal')===v?'selected':''}>${v}</option>`).join('')}</select></label></div>
      <label>Description<textarea name="description" rows="3" maxlength="5000">${safe(entry?.description||'')}</textarea></label>`;
   return `<div class="cn-work-dialog-backdrop" role="presentation" data-cn-work-overlay>
      <section class="cn-work-dialog" role="dialog" aria-modal="true" aria-labelledby="cnWorkDialogTitle">
        <button class="cn-sheet-handle" type="button" data-cn-drag-handle data-cn-work-close aria-label="Close editor, or drag down to dismiss"><span aria-hidden="true"></span></button><header><div><span class="cn-kicker">${screen==='bookings'?'CALENDAR':'TASK MANAGEMENT'}</span><h2 id="cnWorkDialogTitle">${heading}</h2></div><button type="button" data-cn-work-close class="cn-work-dialog-x" aria-label="Close editor">×</button></header>
        <form id="cnWorkForm" data-kind="${screen}" class="cn-work-form" ${editing?`data-id="${safe(entry.id)}" data-version="${safe(entry.updated_at||'')}"`:''}>${common}${fields}
          <label>Status<select name="status">${statusOptions.map(v=>`<option value="${v}" ${String(entry?.status||statusOptions[0])===v?'selected':''}>${v}</option>`).join('')}</select></label>
          <p class="cn-work-form-hint">${screen==='bookings'?'Completing a booking may prepare a review-request task if that option is enabled in your existing settings.':'Saving updates your existing business task, not a sample record.'}</p>
          <p class="cn-work-form-error" role="alert" id="cnWorkFormError">${safe(state.workFormError||'')}</p>
          <div class="cn-work-form-actions"><button type="button" class="cn-work-outline" data-cn-work-close>Cancel</button><button type="submit" class="cn-work-submit" ${state.workBusy?'disabled':''}>${state.workBusy?'Saving…':editing?'Save changes':'Create '+(screen==='bookings'?'booking':'action')}</button></div>
        </form>
      </section>
   </div>`;
 }
 const showWorkFormError=message=>{state.workFormError=message;const node=root.querySelector('#cnWorkFormError');if(node)node.textContent=message;};
 function openWorkModal(screen,id=null){
   if(!['bookings','actions'].includes(screen)||state.workBusy)return;
   if(id!=null&&(!validWorkId(id)||!workPick(screen,id)))return;
   state.workSelected=id==null?null:String(id);state.workModal=screen;state.workFormError='';state.workFeedback='';
   render();root.querySelector('#cnWorkForm [name=title]')?.focus({preventScroll:true});
 }
 function closeWorkModal(){const selected=state.workSelected;const closingForm=root.querySelector('#cnWorkForm');if(closingForm)closingForm.inert=true;dismissSurface(root.querySelector('.cn-work-dialog'),()=>{state.workModal=null;state.workSelected=null;state.workFormError='';render();const opener=selected?[...content.querySelectorAll('[data-cn-work-edit]')].find(button=>button.dataset.cnWorkEdit===selected):content.querySelector('[data-cn-work-new]');opener?.focus({preventScroll:true})})}
 function changeWorkMonth(amount){if(!Number.isInteger(amount)||Math.abs(amount)>1)return;const [y,m]=state.workDate.split('-').map(Number),date=new Date(y,m-1+amount,1);state.workDate=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;render({motion:'filter'});const calendar=content.querySelector('.cn-work-calendar');if(calendar&&allowMotion()&&typeof calendar.animate==='function')motionRun.push(calendar.animate([{opacity:.65,transform:`translate3d(${amount*8}px,0,0)`},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:200,easing:'cubic-bezier(.2,.85,.22,1)'}))}
 async function refreshWork(){
   state.workFeedback='Refreshing existing records…';render();
   try{if(typeof loadWorkItems==='function'){await loadWorkItems();state.workFeedback='Up to date.';render()}else throw new Error('Refresh unavailable.')}catch(error){state.workFeedback=error?.message||'Could not refresh.';render()}
 }
 async function saveWork(form){
   const screen=form.dataset.kind;
   if(!['bookings','actions'].includes(screen)||state.workBusy)return;
   const id=form.dataset.id,editing=id!=null;
   if(editing&&(!validWorkId(id)||!workPick(screen,id)))return;
   const fields=new FormData(form),title=String(fields.get('title')||'').trim();
   const body={title,status:String(fields.get('status')||'')};
   if(!title||title.length>200){showWorkFormError('Enter a title, up to 200 characters.');return}
   if(screen==='bookings'){
     for(const key of ['customer_name','location','notes'])body[key]=String(fields.get(key)||'').trim();
     if(!['requested','confirmed','completed','cancelled'].includes(body.status))return;
     for(const name of ['starts_at','ends_at']){const value=String(fields.get(name)||'');if(value&&!Number.isFinite(Date.parse(value))){showWorkFormError('Enter a valid booking date and time.');return}body[name]=value?new Date(value).toISOString():null}
     if(body.starts_at&&body.ends_at&&new Date(body.ends_at)<=new Date(body.starts_at)){showWorkFormError('The end time must be after the start time.');return}
   }else{
     body.description=String(fields.get('description')||'').trim();body.priority=String(fields.get('priority')||'normal');body.action_type=String(fields.get('action_type')||'follow_up');
     const due=String(fields.get('due_at')||'');if(due&&!Number.isFinite(Date.parse(due))){showWorkFormError('Enter a valid due date.');return}body.due_at=due?new Date(due).toISOString():null;
     if(!['pending','completed','cancelled'].includes(body.status)||!['low','normal','high','urgent'].includes(body.priority))return;
     if(editing&&workPick(screen,id)?.action_type==='request_review')delete body.action_type;
   }
   const leadId=String(fields.get('lead_id')||'');body.lead_id=validWorkId(leadId)?Number(leadId):null;
   const record=editing?workPick(screen,id):null;
   if(screen==='bookings'&&body.status==='completed'&&record?.status!=='completed'){
     if(!window.confirm('Mark this booking completed? If review requests are enabled, a follow-up task may be prepared.'))return;
   }
   if(editing)body.id=Number(id);
   if(editing&&(window.colzoRecordVersionsEnabled===true||window.colzoPreviewAuthTransportEnabled===true)){body.expected_updated_at=form.dataset.version;if(!body.expected_updated_at){showWorkFormError('Reload this record before saving. Your draft has not been saved.');return}}
   state.workBusy=true;state.workFormError='';
   const submit=form.querySelector('button[type=submit]');if(submit)submit.disabled=true;
   const error=root.querySelector('#cnWorkFormError');if(error)error.textContent='Saving your changes…';
   try{
     if(typeof api!=='function')throw new Error('The secure business API is unavailable.');
     const saved=await api(`/api/${screen}`,{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
     if(!saved||!validWorkId(saved.id))throw new Error('The server did not confirm the saved record. Please refresh before trying again.');
     const array=screen==='bookings'?bookings:businessActions;
     const at=array.findIndex(e=>String(e.id)===String(saved.id));
     if(at>=0)array[at]=saved;else array.unshift(saved);
     state.workModal=null;state.workSelected=null;state.workFeedback=`${screen==='bookings'?'Booking':'Action'} ${editing?'updated':'created'} successfully.`;
     render({motion:'filter'});
     // Reload from canonical API, preserving the just-saved record if refresh fails.
     if(typeof loadWorkItems==='function')loadWorkItems().catch(()=>{});
   }catch(err){state.workFormError=err?.message||'Could not save changes. Your entered details are unchanged.';if(error)error.textContent=state.workFormError}
   finally{state.workBusy=false;if(submit)submit.disabled=false}
 }
 const primaryScreens=['home','enquiries','bookings','clients','more'];
 const navPosition=screen=>screen==='colzoDetail'?(state.colzoDetail?.resource==='clients'?3:4):['lead','leadForm'].includes(screen)?1:screen==='customer'?3:['setting','quotes','projects','actions','marketing','receptionist','growth','billing','knowledge','analytics','feedback','automations','publicProfile'].includes(screen)?4:Math.max(0,primaryScreens.indexOf(screen));
 const allowMotion=()=>!state.quietMotion&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const scrollContainer=()=>{const overflow=getComputedStyle(root).overflowY;return /auto|scroll/.test(overflow)?root:window};
 const currentScroll=()=>{const container=scrollContainer();return container===window?window.scrollY:root.scrollTop};
 const restoreScroll=position=>{
   const container=scrollContainer();if(container===window)window.scrollTo({top:position,behavior:'instant'});
   else root.scrollTo({top:position,behavior:'instant'});
 };
 let motionRun=[];
 let detailSourceRect=null;
 function rememberDetailSource(element){
   detailSourceRect=null;
   if(!allowMotion()||!element?.getBoundingClientRect)return;
   const rect=element.getBoundingClientRect();
   if(!rect.width||!rect.height)return;
   detailSourceRect={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
 }
 function stopMotion(){
   for(const animation of motionRun){try{animation.cancel()}catch{}}
   motionRun=[];
 }
 const motionPreference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 motionPreference?.addEventListener?.('change',event=>{
   if(event.matches){detailSourceRect=null;stopMotion();}
 });
 function animateArrival(direction=1,kind='page'){
   stopMotion();
   const source=detailSourceRect;detailSourceRect=null;
   // No motion on data refresh, field edits, search, filtering or accessibility
   // reduced-motion. The existing render, focus and scroll logic is untouched.
   if(kind==='none'||kind==='filter'||!allowMotion()||typeof content.animate!=='function')return;
   const detail=kind==='detail';
   const target=detail
     ?(content.querySelector('.cn-record-inspector,.cf-detail-panel,.cn-detail-panel')||content)
     :content;
   let x=detail?(direction>=0?12:-12):0;
   let y=detail?8:6;
   if(detail&&source&&target.getBoundingClientRect){
     const rect=target.getBoundingClientRect();
     if(rect.width&&rect.height){
       // A restrained shared-element hint. Never position or scale the actual
       // app layout to the card's dimensions, which would cause scroll jumps.
       x=Math.max(-36,Math.min(36,source.x-(rect.left+rect.width/2)));
       y=Math.max(-28,Math.min(28,source.y-(rect.top+rect.height/2)));
     }
   }
   try{
     const animation=target.animate([
       {opacity:detail?.58:.66,transform:'translate3d('+x+'px,'+y+'px,0) scale('+(detail?.975:.995)+')'},
       {opacity:1,transform:'translate3d(0,0,0) scale(1)'}
     ],{
       duration:detail?300:215,
       easing:detail?'cubic-bezier(.2,.86,.25,1)':'cubic-bezier(.22,.68,.3,1)',
       fill:'none'
     });
     motionRun.push(animation);
     const cleanup=()=>{motionRun=motionRun.filter(item=>item!==animation)};
     animation.addEventListener?.('finish',cleanup,{once:true});
     animation.addEventListener?.('cancel',cleanup,{once:true});
   }catch{/* A lack of WAAPI must never interrupt navigation. */}
 }
 // The mobile top bar is shared by all Colzo tool screens. Main sections
 // retain the More menu + tool search, while nested pages get a true back
 // action that uses the existing navigation/unsaved-changes protections.
 function updateHeaderNavigation(){
   const control=root.querySelector('.cn-header .cn-wordmark');
   if(!control)return;
   const parents={
     more:['home','Home'],
     growth:['more','More'],
     setting:['more','More'],
     lead:['enquiries','Enquiries'],
     leadForm:[state.leadForm?.mode==='edit'?'lead':'enquiries',state.leadForm?.mode==='edit'?'Enquiry':'Enquiries'],
     customer:['clients','Customers'],
     colzoDetail:[state.colzoDetail?.resource||'more',state.colzoDetail?.resource==='clients'?'Customers':state.colzoDetail?.resource==='projects'?'Projects':state.colzoDetail?.resource==='quotes'?'Quotes':'More']
   };
   const dismiss=state.colzoForm ? ['colzo-form',state.screen==='clients'?'Customers':state.screen==='projects'?'Projects':'Quotes']
     : state.knowledgeForm ? ['knowledge-form','Knowledge']
     : state.knowledgeDetail ? ['knowledge-detail','Knowledge']
     : state.marketingSchedulingDraft ? ['marketing-schedule','Marketing']
     : state.marketingForm||state.marketingEditing ? ['marketing-form','Marketing']
     : null;
   const back=dismiss ? [null,dismiss[1]] : parents[state.screen]||null;
   control.classList.toggle('cn-header-back',Boolean(back));
   if(back){
     control.removeAttribute('data-cn-screen');
     if(dismiss){
       control.removeAttribute('data-cn-header-back');
       control.dataset.cnHeaderDismiss=dismiss[0];
     }else{
       control.removeAttribute('data-cn-header-dismiss');
       control.dataset.cnHeaderBack=back[0];
     }
     control.setAttribute('aria-label','Back to '+back[1]);
     control.title='Back to '+back[1];
   }else{
     control.removeAttribute('data-cn-header-back');
     control.removeAttribute('data-cn-header-dismiss');
     control.dataset.cnScreen='more';
     control.setAttribute('aria-label','Open Colzo tools');
     control.title='Open Colzo tools';
   }
 }
 function render({motion='none',direction=1}={}){
   if(!document.body.classList.contains('auth-ready'))return;
   if(state.workModal&&motion==='none'&&root.querySelector('#cnWorkForm'))return;
   const previousKpis=window.ColzoKpiMotion?.capture();
   window.ColzoKpiMotion?.cancel();window.ColzoGestures?.cancel();
   const pages={home,enquiries:enquiry,lead:leadDetails,leadForm,customer:customerProfile,projects,clients,quotes,colzoDetail:colzoRecordDetail,marketing,receptionist,growth,billing,knowledge,analytics,feedback,automations,publicProfile,more,setting:nativeSetting,bookings:bookingScreen,actions:actionsScreen};
   const page=pages[state.screen]||home;
   stopMotion();
   window.colzoParkSecurityCenter?.();
   root.dataset.screen=state.screen;
   updateHeaderNavigation();
   root.style.setProperty('--cn-active-index',String(navPosition(state.screen)));
   root.querySelector('.cn-work-dialog-backdrop')?.remove();
   const reactModel={...state,enquiries:records().enquiries,
     onSearch:(key,value)=>{if(!['search','clientSearch','projectSearch'].includes(key))return;state[key]=value;render()},
     onResetEnquiry:()=>{state.search='';state.filter='All';render({motion:'filter'})}};
   if(dashboardFailure&&['home','enquiries','lead','leadForm','customer'].includes(state.screen)){
     window.ColzoReact?.unmount(content);
     content.innerHTML=empty(dashboardFailure,'<button data-cn-refresh type="button">Retry loading</button>');
   }else if(!window.ColzoReact?.renderScreen(content,reactModel))content.innerHTML=page();
   const securityHost=content.querySelector('#cnSecurityCentreHost');
   if(securityHost&&typeof window.colzoMountSecurityCenter==='function')window.colzoMountSecurityCenter(securityHost);
   const dialog=content.querySelector('.cn-work-dialog-backdrop');if(dialog)root.appendChild(dialog);
   content.dataset.cnIntro=motion==='none'||motion==='filter'?'':state.screen;
   root.querySelectorAll('.cn-nav button').forEach(b=>{const active=b.dataset.cnScreen===primaryScreens[navPosition(state.screen)];if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
   const input=document.getElementById('cnSearch');if(input&&state.screen==='enquiries'&&state.focusSearch){input.focus();input.setSelectionRange(input.value.length,input.value.length)}
   window.ColzoKpiMotion?.update(previousKpis);
   if(motion!=='none')animateArrival(direction,motion);
 }
 // Approved-screen correction #089: preserve edited user input across navigation.
 // This dialog never claims to save or persist data; it only prevents accidental loss.
 const dirtyFormSelector='#cnLeadForm[data-cn-dirty="true"], #cnColzoForm[data-cn-dirty="true"], #cnBusinessSettings[data-cn-dirty="true"], #cnWorkForm[data-cn-dirty="true"], #cnKnowledgeForm[data-cn-dirty="true"], #cnKnowledgeReviewForm[data-cn-dirty="true"], #cnReceptionForm[data-cn-dirty="true"], #cnGrowthReviewForm[data-cn-dirty="true"], #cnGrowthFollowupForm[data-cn-dirty="true"], #cnAutomationStrategyForm[data-cn-dirty="true"]';
 function markUnsavedDraft(event){
   const form=event.target.closest?.('form');
   if(form&&['cnLeadForm','cnColzoForm','cnBusinessSettings','cnWorkForm','cnKnowledgeForm','cnKnowledgeReviewForm','cnReceptionForm','cnGrowthReviewForm','cnGrowthFollowupForm','cnAutomationStrategyForm'].includes(form.id)){
     form.dataset.cnDirty='true';
   }
 }
 root.addEventListener('input',markUnsavedDraft,true);
 root.addEventListener('change',markUnsavedDraft,true);
 function confirmUnsaved(action){
   const form=root.querySelector(dirtyFormSelector);
   if(!form){action();return}
   if(root.querySelector('.cn-unsaved-overlay'))return;
   const previous=document.activeElement,overlay=document.createElement('div');
   overlay.className='cn-unsaved-overlay';
   overlay.innerHTML='<section class="cn-unsaved-sheet" role="dialog" aria-modal="true" aria-labelledby="cnUnsavedTitle" aria-describedby="cnUnsavedDescription"><span class="cn-unsaved-grip" aria-hidden="true"></span><h2 id="cnUnsavedTitle">Unsaved changes</h2><p id="cnUnsavedDescription">You have edited this form. Leaving now will discard your changes.</p><div class="cn-unsaved-actions"><button type="button" class="cn-unsaved-keep">Keep editing</button><button type="button" class="cn-unsaved-discard">Discard changes</button></div></section>';
   const previousInert=Boolean(form.inert);form.inert=true;
   root.appendChild(overlay);
   const keep=overlay.querySelector('.cn-unsaved-keep'),discard=overlay.querySelector('.cn-unsaved-discard');
   let closing=false;
   const close=(restore=true,after=()=>{})=>{
     if(closing)return;closing=true;
     dismissSurface(overlay.querySelector('.cn-unsaved-sheet'),()=>{
       form.inert=previousInert;overlay.remove();
       if(restore&&previous?.isConnected&&typeof previous.focus==='function')previous.focus({preventScroll:true});
       after();
     });
   };
   keep.addEventListener('click',()=>close());
   discard.addEventListener('click',()=>{
     // A confirmed discard must not trigger a second prompt on the same form.
     close(false,()=>{form.dataset.cnDirty='false';action()});
   });
   overlay.addEventListener('keydown',event=>{
     if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return}
     if(event.key!=='Tab')return;
     const nodes=[keep,discard],first=nodes[0],last=nodes.at(-1);
     if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
     else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
     event.stopPropagation();
   });
   keep.focus({preventScroll:true});
 }
 function navigate(screen){
   if(!['home','enquiries','lead','leadForm','customer','projects','clients','quotes','colzoDetail','more','setting','bookings','actions','marketing','receptionist','growth','billing','knowledge','analytics','feedback','automations','publicProfile'].includes(screen))return;
   closeCommand(false);
   if(screen===state.screen&&screen!=='setting'){restoreScroll(0);return}
   if(root.querySelector(dirtyFormSelector)){confirmUnsaved(()=>navigate(screen));return}
   if(screen===state.screen){render();return}
   const before=state.screen;
   detailSourceRect=null;
   state.scrollByScreen.set(before,currentScroll());
   if(before==='automations'&&screen!=='automations')state.automationEditing=false;
   state.screen=screen;state.notification='';state.focusSearch=false;state.colzoForm=null;state.colzoFeedback='';state.workFeedback='';
  if(['clients','projects','quotes'].includes(screen))loadColzoResource(screen);if(screen==='marketing'){loadMarketingDrafts();if(state.marketingView==='schedule')loadMarketingSchedules();}if(screen==='receptionist'){loadVoiceStatus();loadReceptionConfig();loadNativeHandovers();}if(screen==='growth')loadGrowth();if(screen==='billing')loadBilling();if(screen==='knowledge')loadKnowledge();if(screen==='analytics')loadAnalytics();if(screen==='automations')loadAutomation();if(screen==='publicProfile')loadPublicProfile();
   const announcement=root.querySelector('#cnScreenAnnounce');if(announcement)announcement.textContent=`${{lead:'Enquiry details',more:'Settings',bookings:'Bookings',actions:'Actions',setting:nativeSettingMeta[state.setting]?.[0]||'Settings',clients:'Customers',quotes:'Quotes'}[screen]||screen.replace(/^./,x=>x.toUpperCase())} screen`;
   const direction=navPosition(screen)<navPosition(before)?-1:1;
   render({motion:screen==='lead'?'detail':'page',direction});
   restoreScroll(state.scrollByScreen.get(screen)||0);
   if(before==='colzoDetail'&&state.colzoDetail?.resource===screen){
     [...content.querySelectorAll('[data-colzo-detail][data-colzo-id]')].find(button=>button.dataset.colzoId===String(state.colzoDetail.id))?.focus({preventScroll:true});
   }
 }
 const commandItems=[
   {label:'Home',detail:'Overview, enquiries and insights',glyph:'⌂',screen:'home'},
   {label:'Enquiries',detail:'Find and manage customer requests',glyph:'▤',screen:'enquiries'},
   {label:'Projects',detail:'Track saved work and progress',glyph:'▦',screen:'projects'},
   {label:'Customers',detail:'Saved profiles and enquiry contacts',glyph:'♧',screen:'clients'},
   {label:'Quotes',detail:'Create and manage saved draft quotes',glyph:'£',screen:'quotes'},
   {label:'Marketing',detail:'Create and manage saved content drafts',glyph:'✧',screen:'marketing'},
   {label:'AI receptionist',detail:'Phone answering and handover status',glyph:'✦',screen:'receptionist'},
   {label:'Business knowledge',detail:'Review facts used by your assistant',glyph:'◇',screen:'knowledge'},
   {label:'Analytics',detail:'Recorded activity and opportunity value',glyph:'▥',screen:'analytics'},
   {label:'Help and feedback',detail:'Send a secure feedback report',glyph:'?',screen:'feedback'},
   {label:'Automations',detail:'Read current automation status',glyph:'↻',screen:'automations'},
   {label:'Public profile',detail:'Customer-facing business details',glyph:'◈',screen:'publicProfile'},
   {label:'Billing',detail:'Current plan and feature access',glyph:'◈',screen:'billing'},
   {label:'Bookings',detail:'Appointments and calendar',glyph:'▣',screen:'bookings'},
   {label:'Actions',detail:'Task management and follow-ups',glyph:'✓',screen:'actions'},
   {label:'Account settings',detail:'Business and user preferences',glyph:'⚙',screen:'more'},
   {label:'Security',detail:'Authenticator and passkey choices',glyph:'◇',setting:'security'},
 ];
 const sheet=root.querySelector('#cnCommandSheet');
 const commandInput=root.querySelector('#cnCommandSearch');
 const commandResults=root.querySelector('#cnCommandResults');
 let focusBeforeCommand=null;
 function drawCommandResults(){
   if(!commandResults)return;
   const q=(commandInput?.value||'').trim().toLowerCase();
   const found=commandItems.filter(x=>!q||`${x.label} ${x.detail}`.toLowerCase().includes(q)).sort((a,b)=>q?(Number(b.label.toLowerCase().startsWith(q))-Number(a.label.toLowerCase().startsWith(q))):0);
   const announcement=root.querySelector('#cnCommandStatus');
   if(announcement)announcement.textContent=!found.length?'No matching tools':q?`${found.length} matching tool${found.length===1?'':'s'}`:`${found.length} available tools`;
   commandResults.innerHTML=found.length?found.map(item=>`<button type="button" ${item.screen?`data-cn-screen="${item.screen}"`:item.setting?`data-cn-setting="${item.setting}"`:`data-cn-legacy="${item.legacy}"`}><span class="cn-command-glyph" aria-hidden="true">${safe(item.glyph)}</span><span class="cn-command-name">${safe(item.label)}<small>${safe(item.detail)}</small></span><span class="cn-command-arrow" aria-hidden="true">›</span></button>`).join(''):'<p class="cn-command-empty">No matching tools. Try “Marketing” or “Enquiries”.</p>';
 }
 function dismissSurface(element,done){
   if(window.ColzoSurfaceMotion)window.ColzoSurfaceMotion.leave(element,done);else done();
 }
 function closeCommand(restoreFocus=true){
   if(!sheet||sheet.hidden)return;
   const previous=focusBeforeCommand;
   const finish=()=>{
     sheet.hidden=true;root.classList.remove('cn-command-open');
     if(restoreFocus&&previous?.isConnected)previous.focus({preventScroll:true});
     focusBeforeCommand=null;
   };
   // Navigation and auth teardown never leave a tool overlay over a new page.
   if(!restoreFocus){window.ColzoSurfaceMotion?.cancel();finish();return}
   dismissSurface(sheet.querySelector('.cn-command-panel'),finish);
 }
 function openCommand(){
   if(!sheet||!commandInput||!document.body.classList.contains('auth-ready')||document.body.classList.contains('colzo-legacy-mode')||document.body.classList.contains('security-mfa-required')||state.workModal)return;
   if(sheet.hidden)focusBeforeCommand=document.activeElement;
   sheet.hidden=false;root.classList.add('cn-command-open');
   commandInput.value='';drawCommandResults();commandInput.focus({preventScroll:true});
   window.ColzoSurfaceMotion?.enter(sheet.querySelector('.cn-command-panel'));
 }
 const screenShortcuts=e=>{
   if(root.querySelector('.cn-unsaved-overlay'))return;
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'&&!e.altKey){
     if(!document.body.classList.contains('auth-ready')||document.body.classList.contains('colzo-legacy-mode')||document.body.classList.contains('security-mfa-required')||state.workModal)return;
     e.preventDefault();if(sheet.hidden)openCommand();else closeCommand();return;
   }
   const editor=root.querySelector('.cn-work-dialog');
   if(editor){
     if(e.key==='Escape'&&!state.workBusy){e.preventDefault();confirmUnsaved(closeWorkModal);return}
     if(e.key!=='Tab')return;
     const focusable=[...editor.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(el=>el.getBoundingClientRect().width>0);
     if(!focusable.length)return;
     if(e.shiftKey&&document.activeElement===focusable[0]){e.preventDefault();focusable.at(-1).focus()}
     if(!e.shiftKey&&document.activeElement===focusable.at(-1)){e.preventDefault();focusable[0].focus()}
     return;
   }
   if(!sheet||sheet.hidden){
     if(e.key==='Escape'&&state.screen==='colzoDetail'&&!state.colzoForm&&!e.target?.closest?.('input,textarea,select,[contenteditable]')){e.preventDefault();navigate(state.colzoDetail?.resource||'clients')}
     return;
   }
   if(e.key==='Escape'){e.preventDefault();closeCommand();return}
   // Keyboard users can search, then select a tool without reaching for the
   // mouse. Keep navigation inside the visible results and the search field.
   if(['ArrowDown','ArrowUp'].includes(e.key)
       && (e.target===commandInput||commandResults?.contains(e.target))){
     const results=[...commandResults.querySelectorAll('button:not([disabled])')];
     if(!results.length)return;
     e.preventDefault();
     const current=results.indexOf(document.activeElement);
     if(e.key==='ArrowDown')results[current<0?0:(current+1)%results.length].focus();
     else if(current===0)commandInput.focus();
     else results[current<0?results.length-1:current-1].focus();
     return;
   }
   if(e.key==='Enter'&&e.target===commandInput){
     const first=commandResults?.querySelector('button:not([disabled])');
     if(first){e.preventDefault();first.click()}
     return;
   }
   if(e.key==='Enter'&&commandResults?.contains(e.target)&&e.target.matches('button')){
     e.preventDefault();e.target.click();return;
   }
   if(e.key!=='Tab')return;
   const focusable=[...sheet.querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(el=>el.getBoundingClientRect().width>0);
   if(!focusable.length)return;
   const first=focusable[0],last=focusable[focusable.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
   if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 };
 document.addEventListener('keydown',screenShortcuts);
 function original(view){
  closeCommand(false);stopMotion();
  const originalView=view==='security'?'settings':view;
  document.body.classList.add('colzo-legacy-mode');
  root.setAttribute('aria-hidden','true');
  const back=document.getElementById('cnReturnToColzo');back.hidden=false;
  if(originalView==='leads'&&state.activeLead!=null){if(typeof showView==='function')showView(originalView);if(typeof renderLeads==='function')renderLeads();}
  else if(typeof showView==='function')showView(originalView);
  if(view==='security'){requestAnimationFrame(()=>{if(typeof window.colzoOpenSecurityCenter==='function')window.colzoOpenSecurityCenter();else document.getElementById('securityCenterHubButton')?.click();});}
 }
 async function copyDraft(form){const s=content.querySelector('#cnDraftStatus');const fd=new FormData(form);const leadId=String(fd.get('lead')||'');const amount=Number(fd.get('amount'));const title=String(fd.get('title')||'').trim();state.draftLead=leadId;state.draftAmount=String(fd.get('amount')||'');state.draftTitle=title;
  if(!title||!Number.isFinite(amount)||amount<0||amount>10000000){s.textContent='Please check the title and amount.';return}
  const lead=records().enquiries.find(l=>String(l.id)===leadId);
  const draft=`DRAFT ESTIMATE — NOT ISSUED\nCustomer: ${lead?contact(lead):'Not selected'}\nWork: ${title}\nEstimated amount: £${amount.toFixed(2)}\nThis draft has not been saved, approved or sent.`;
  try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(draft);s.textContent='Draft copied. Nothing has been saved or sent.'}catch{s.textContent='Clipboard unavailable on this device. No draft was saved or sent.'}
 }
 root.addEventListener('click',e=>{
  const target=e.target.closest('button');if(!target||!root.contains(target))return;
  if(target.hasAttribute('data-marketing-media')){confirmUnsaved(()=>inspectMarketingMedia(target.getAttribute('data-marketing-media')));return}
  if(target.hasAttribute('data-marketing-media-close')){state.marketingImageDraft=null;state.marketingImageResult=null;state.marketingImageError='';render({motion:'page'});return}
  if(target.hasAttribute('data-marketing-review')){prepareMarketingApproval(target.getAttribute('data-marketing-review'));return}
  if(target.hasAttribute('data-marketing-approve')){approveMarketingDraft();return}
  if(target.hasAttribute('data-marketing-cancel-review')){state.marketingApprovalDraft=null;state.marketingApprovalPreview=null;state.marketingApprovalError='';render({motion:'page'});return}
  if(target.hasAttribute('data-marketing-edit')){const id=target.getAttribute('data-marketing-edit');state.marketingEditing=state.marketingDrafts?.find(d=>String(d.id)===String(id))||null;state.marketingForm=false;render({motion:'detail'});return}
  if(target.hasAttribute('data-marketing-delete')){deleteMarketingDraft(target.getAttribute('data-marketing-delete'));return}
  if(target.hasAttribute('data-cn-create-lead')){state.leadForm={mode:'create',lead:null};state.leadFeedback='';state.screen='leadForm';render({motion:'detail'});return}
  if(target.hasAttribute('data-cn-edit-lead')){const id=target.getAttribute('data-cn-edit-lead'),lead=records().enquiries.find(x=>String(x.id)===String(id));if(lead){state.leadForm={mode:'edit',lead};state.leadFeedback='';state.screen='leadForm';render({motion:'detail'});}return}
  if(target.hasAttribute('data-cn-lead-cancel')){confirmUnsaved(()=>{const editing=state.leadForm?.mode==='edit';state.leadForm=null;state.leadFeedback='';state.screen=editing?'lead':'enquiries';render({motion:'page'})});return}
  if(target.hasAttribute('data-public-media-upload')){
   const slot=target.getAttribute('data-public-media-upload');
   if(!['avatar','banner'].includes(slot)||state.publicProfileData?.can_edit!==true||state.publicMediaBusy)return;
   confirmUnsaved(()=>{state.publicMediaSlot=slot;content.querySelector('#cnPublicMediaInput')?.click()});return;
  }
  if(target.hasAttribute('data-public-media-remove')){
   const slot=target.getAttribute('data-public-media-remove');
   confirmUnsaved(()=>removeNativeProfileMedia(slot));return;
  }
  if(target.hasAttribute('data-public-profile-refresh')){confirmUnsaved(()=>loadPublicProfile(true));return}
  if(target.hasAttribute('data-automation-plan-edit')){if(state.automationData?.can_pause===true&&!state.automationBusy){state.automationEditing=true;render({motion:'detail'})}return}
  if(target.hasAttribute('data-automation-plan-cancel')){confirmUnsaved(()=>{state.automationEditing=false;render({motion:'page'})});return}
  if(target.hasAttribute('data-automation-refresh')){confirmUnsaved(()=>{state.automationEditing=false;loadAutomation(true)});return}
  if(target.hasAttribute('data-automation-pause')){pauseNativeMarketingAutomation();return}
  if(target.hasAttribute('data-analytics-refresh')){loadAnalytics(true);return}
  if(target.hasAttribute('data-knowledge-create')){if(!state.knowledgeCanAddManual)return;state.knowledgeForm=true;state.knowledgeFeedback='';render({motion:'detail'});return}
  if(target.hasAttribute('data-knowledge-upload')||target.hasAttribute('data-knowledge-replace')){
   if(state.knowledgeBusy||!state.knowledgeCanManage)return;
   state.knowledgeReplaceId=target.getAttribute('data-knowledge-replace')||null;
   content.querySelector('#cnKnowledgeFileInput')?.click();return;
  }
  if(target.hasAttribute('data-knowledge-extract')){extractNativeKnowledge(target.getAttribute('data-knowledge-extract'));return}
  if(target.hasAttribute('data-knowledge-filter')){
   const filter=target.getAttribute('data-knowledge-filter');
   if(['all','review','active','issues'].includes(filter)){state.knowledgeFilter=filter;render({motion:'filter'});}
   return;
  }
  if(target.hasAttribute('data-knowledge-cancel')){confirmUnsaved(()=>{state.knowledgeForm=false;render({motion:'page'})});return}
  if(target.hasAttribute('data-knowledge-refresh')){loadKnowledge(true);return}
  if(target.hasAttribute('data-knowledge-open')){openKnowledgeSource(target.getAttribute('data-knowledge-open'));return}
  if(target.hasAttribute('data-knowledge-back')){confirmUnsaved(()=>{state.knowledgeDetail=null;state.knowledgeError='';render({motion:'page'})});return}
  if(target.hasAttribute('data-knowledge-approve')){approveKnowledge();return}
  if(target.hasAttribute('data-knowledge-remove')){removeKnowledgeSource(target.getAttribute('data-knowledge-remove'));return}
  if(target.hasAttribute('data-billing-refresh')){loadBilling(true);return}
  if(target.hasAttribute('data-reception-refresh')){
    if(state.receptionEditing)return;
    loadVoiceStatus(true);loadReceptionConfig(true);loadNativeHandovers(true);return;
  }
  if(target.hasAttribute('data-growth-refresh')){confirmUnsaved(()=>loadGrowth(true));return}
  if(target.hasAttribute('data-growth-copy')){
   const id={'link':'cnGrowthCustomerLink','widget':'cnGrowthWidgetCode','referral':'cnGrowthReferralLink'}[target.getAttribute('data-growth-copy')];
   const node=id?content.querySelector('#'+id):null;if(!node||!node.value)return;
   if(navigator.clipboard?.writeText)navigator.clipboard.writeText(node.value).then(()=>{const feedback=content.querySelector('#cnGrowthCopyStatus');if(feedback)feedback.textContent='Copied to clipboard.'}).catch(()=>{node.select()});
   else node.select();
   return;
  }
  if(target.hasAttribute('data-reception-edit')){startReceptionEdit();return}
  if(target.hasAttribute('data-reception-cancel')){confirmUnsaved(()=>{state.receptionEditing=false;state.receptionDraft=null;render({motion:'page'})});return}
  if(target.hasAttribute('data-reception-add-faq')){
    const next=captureReceptionDraft();if(!next||next.faqs.length>=40)return;
    state.receptionDraft={...next,faqs:[...next.faqs,{question:'',answer:''}]};render({motion:'detail'});return;
  }
  if(target.hasAttribute('data-reception-remove-faq')){
    const index=Number(target.getAttribute('data-reception-remove-faq'));
    const next=captureReceptionDraft();if(!next||!Number.isSafeInteger(index)||index<0||index>=next.faqs.length)return;
    next.faqs.splice(index,1);state.receptionDraft=next;render({motion:'detail'});return;
  }
  if(target.hasAttribute('data-reception-handover')){
    if(state.receptionEditing){confirmUnsaved(()=>{state.receptionEditing=false;state.receptionDraft=null;updateNativeHandover(target.getAttribute('data-reception-handover'),target.getAttribute('data-reception-handover-status'))});}else updateNativeHandover(target.getAttribute('data-reception-handover'),target.getAttribute('data-reception-handover-status'));return;
  }
  if(target.hasAttribute('data-voice-refresh')){loadVoiceStatus(true);return}
  if(target.hasAttribute('data-marketing-view')){if(state.marketingManualOnly)return;state.marketingView=target.getAttribute('data-marketing-view');state.marketingSchedulingDraft=null;state.marketingImageDraft=null;state.marketingImageResult=null;if(state.marketingView==='schedule')loadMarketingSchedules();render({motion:'filter'});return}
  if(target.hasAttribute('data-marketing-schedule')){if(state.marketingManualOnly)return;const id=target.getAttribute('data-marketing-schedule');state.marketingSchedulingDraft=state.marketingDrafts?.find(d=>String(d.id)===String(id)&&d.approval_status==='approved')||null;state.marketingView='drafts';render({motion:'detail'});return}
  if(target.hasAttribute('data-marketing-cancel-schedule')){state.marketingSchedulingDraft=null;render({motion:'page'});return}
  if(target.hasAttribute('data-marketing-refresh-schedules')){loadMarketingSchedules(true);return}
  if(target.hasAttribute('data-marketing-cancel-item')){cancelMarketingSchedule(target.getAttribute('data-marketing-cancel-item'));return}
  if(target.hasAttribute('data-marketing-create')){state.marketingForm=true;state.marketingFeedback='';render({motion:'detail'});return}
  if(target.hasAttribute('data-marketing-cancel')){state.marketingForm=false;state.marketingEditing=null;render({motion:'page'});return}
  if(target.hasAttribute('data-marketing-refresh')){loadMarketingDrafts(true);return}
  if(target.hasAttribute('data-cn-client-profile-tab')){const next=target.getAttribute('data-cn-client-profile-tab');if(state.screen==='colzoDetail'&&state.colzoDetail?.resource==='clients'&&['overview','activity'].includes(next)){state.customerProfileTab=next;render({motion:'filter'})}return}
  if(target.hasAttribute('data-colzo-detail')){rememberDetailSource(target);const resource=target.getAttribute('data-colzo-detail'),id=target.getAttribute('data-colzo-id');if(['clients','projects','quotes'].includes(resource)&&(state.colzoRecords[resource]||[]).some(x=>String(x.id)===String(id))){const listScroll=currentScroll();state.scrollByScreen.set(state.screen,listScroll);state.colzoDetail={resource,id};state.customerProfileTab='overview';state.colzoForm=null;state.screen='colzoDetail';render({motion:'detail'});restoreScroll(window.innerWidth>=1200?listScroll:0);content.querySelector('.cn-record-inspector')?.focus({preventScroll:true});}else detailSourceRect=null;return}
  if(target.hasAttribute('data-colzo-create')){const resource=target.getAttribute('data-colzo-create');state.colzoForm={resource,record:null};state.colzoFeedback='';render({motion:'detail'});return}
  if(target.hasAttribute('data-colzo-edit')){const resource=target.getAttribute('data-colzo-edit'),id=target.getAttribute('data-colzo-id');const record=state.colzoRecords[resource]?.find(x=>String(x.id)===String(id));if(record){state.colzoForm={resource,record};state.colzoFeedback='';if(state.screen==='colzoDetail')state.screen=resource;state.colzoDetail=null;render({motion:'detail'})}return}
  if(target.hasAttribute('data-colzo-cancel')){confirmUnsaved(()=>{state.colzoForm=null;render({motion:'page'})});return}
  if(target.hasAttribute('data-colzo-refresh')){loadColzoResource(target.getAttribute('data-colzo-refresh'),true);return}
  if(target.hasAttribute('data-cn-header-dismiss')){
    const kind=target.getAttribute('data-cn-header-dismiss');
    confirmUnsaved(()=>{
      if(kind==='colzo-form')state.colzoForm=null;
      else if(kind==='knowledge-form')state.knowledgeForm=false;
      else if(kind==='knowledge-detail'){state.knowledgeDetail=null;state.knowledgeError='';state.knowledgeFeedback='';}
      else if(kind==='marketing-schedule')state.marketingSchedulingDraft=null;
      else if(kind==='marketing-form'){state.marketingForm=false;state.marketingEditing=null;}
      render({motion:'page'});
    });
    return;
  }
  if(target.hasAttribute('data-cn-header-back')){navigate(target.getAttribute('data-cn-header-back'));return}
  if(target.hasAttribute('data-cn-command')){openCommand();return}
  if(target.hasAttribute('data-cn-close-command')){closeCommand();return}
  if(target.hasAttribute('data-cn-setting')){confirmUnsaved(()=>{state.setting=target.getAttribute('data-cn-setting');navigate('setting');if(state.setting==='team'&&!state.teamData&&!state.teamError)loadNativeTeam()});return}
  if(target.hasAttribute('data-cn-back-settings')){confirmUnsaved(()=>navigate('more'));return}
  if(target.hasAttribute('data-cn-refresh-team')){loadNativeTeam();return}
  if(target.hasAttribute('data-cn-copy-invite')){if(state.inviteUrl&&navigator.clipboard?.writeText){navigator.clipboard.writeText(state.inviteUrl).then(()=>{const feedback=content.querySelector('#cnInviteFeedback');if(feedback)feedback.firstChild.textContent='Invitation link copied. Share it only with the intended person.'}).catch(()=>{const field=content.querySelector('.cn-invite-share input');field?.select()})}else{const field=content.querySelector('.cn-invite-share input');field?.select()}return}
  if(target.hasAttribute('data-cn-permission')){if(typeof Notification!=='undefined'&&window.isSecureContext)Notification.requestPermission().then(()=>{if(state.screen==='setting'&&state.setting==='notifications')render()}).catch(()=>{});return}
  if(target.hasAttribute('data-cn-client-filter')){state.clientFilter=target.getAttribute('data-cn-client-filter');render({motion:'filter'});return}
  if(target.hasAttribute('data-cn-work-tab')){state.workFilter[state.screen]=target.getAttribute('data-cn-work-tab');render({motion:'filter'});return}
  if(target.hasAttribute('data-cn-work-month')){changeWorkMonth(Number(target.getAttribute('data-cn-work-month')));return}
  if(target.hasAttribute('data-cn-work-refresh')){refreshWork();return}
  if(target.hasAttribute('data-cn-work-new')){openWorkModal(state.screen);return}
  if(target.hasAttribute('data-cn-work-edit')){openWorkModal(state.screen,target.getAttribute('data-cn-work-edit'));return}
  if(target.hasAttribute('data-cn-work-close')){if(!state.workBusy)confirmUnsaved(closeWorkModal);return}
  if(target.hasAttribute('data-cn-screen')){navigate(target.getAttribute('data-cn-screen'));return}
  if(target.hasAttribute('data-cn-legacy')){confirmUnsaved(()=>original(target.getAttribute('data-cn-legacy')));return}
  if(target.hasAttribute('data-cn-customer')){state.activeLead=target.getAttribute('data-cn-customer');navigate('customer');return}
  if(target.hasAttribute('data-cn-lead')){rememberDetailSource(target);state.activeLead=target.getAttribute('data-cn-lead');navigate('lead');return}
  if(target.hasAttribute('data-cn-filter')){const next=target.getAttribute('data-cn-filter');if(state.filter!==next){state.filter=next;render({motion:'filter'})}return}
  if(target.hasAttribute('data-cn-reset-projects')){state.projectFilter='All';state.projectSearch='';render({motion:'filter'});return}
  if(target.hasAttribute('data-cn-reset-quotes')){state.search='';render({motion:'filter'});return}
  if(target.hasAttribute('data-cn-project-filter')){const next=target.getAttribute('data-cn-project-filter');if(state.projectFilter!==next){state.projectFilter=next;render({motion:'filter'})}return}
  if(target.hasAttribute('data-cn-focus-search')){document.querySelector('#cnSearch')?.focus();return}
  if(target.hasAttribute('data-cn-insights')){navigate('analytics');return}
  if(target.hasAttribute('data-cn-search-projects')){state.showProjectSearch=!state.showProjectSearch;if(!state.showProjectSearch)state.projectSearch='';render({motion:'filter'});if(state.showProjectSearch)document.getElementById('cnProjectSearch')?.focus();return}
  if(target.hasAttribute('data-cn-refresh')){if(typeof loadAll==='function')loadAll(true);return}
  if(target.hasAttribute('data-cn-signout')){confirmUnsaved(()=>document.getElementById('logoutButton')?.click());return}
 });
 root.addEventListener('input',e=>{if(e.target.matches?.('#cnColzoForm input[name=\"progress\"][type=\"range\"]')){const output=e.target.closest('label')?.querySelector('output');if(output)output.value=e.target.value+'%';return}if(e.target.hasAttribute('data-react-field'))return;if(e.target.id==='cnClientSearch'){const pos=e.target.selectionStart;state.clientSearch=e.target.value;render();const field=content.querySelector('#cnClientSearch');if(field){field.focus();field.setSelectionRange(Math.min(pos,field.value.length),Math.min(pos,field.value.length))}return}if(e.target.id==='cnCommandSearch'){drawCommandResults();return}if(e.target.id==='cnWorkSearch'){state.workSearch[state.screen]=e.target.value;const start=e.target.selectionStart;render();const field=content.querySelector('#cnWorkSearch');if(field){field.focus();field.setSelectionRange(Math.min(start,field.value.length),Math.min(start,field.value.length))}return}if(e.target.id==='cnQuoteSearch'){state.search=e.target.value;const pos=e.target.selectionStart;render();const field=content.querySelector('#cnQuoteSearch');if(field){field.focus();field.setSelectionRange(Math.min(pos,field.value.length),Math.min(pos,field.value.length))}return}if(e.target.id==='cnProjectSearch'){const pos=e.target.selectionStart;state.projectSearch=e.target.value;render();const field=document.getElementById('cnProjectSearch');if(field){field.focus();field.setSelectionRange(Math.min(pos,field.value.length),Math.min(pos,field.value.length))}return}if(e.target.id!=='cnSearch')return;const pos=e.target.selectionStart;state.search=e.target.value;state.focusSearch=true;render();const i=document.getElementById('cnSearch');if(i)i.setSelectionRange(Math.min(pos,i.value.length),Math.min(pos,i.value.length));});
 root.addEventListener('submit',e=>{if(e.target.inert||root.querySelector('.cn-unsaved-overlay')){e.preventDefault();e.stopPropagation();return}if(e.target.id==='cnLeadForm'){e.preventDefault();saveNativeLead(e.target);return}if(e.target.id==='cnPublicProfileForm'){e.preventDefault();savePublicProfile(e.target);return}if(e.target.id==='cnFeedbackForm'){e.preventDefault();submitNativeFeedback(e.target);return}if(e.target.id==='cnKnowledgeForm'){e.preventDefault();saveManualKnowledge(e.target);return}if(e.target.id==='cnKnowledgeReviewForm'){e.preventDefault();approveKnowledge();return}if(e.target.id==='cnReceptionForm'){e.preventDefault();saveReceptionConfig();return}if(e.target.id==='cnAutomationStrategyForm'){e.preventDefault();saveNativeMarketingStrategy(e.target);return}if(['cnGrowthReviewForm','cnGrowthFollowupForm'].includes(e.target.id)){e.preventDefault();saveGrowthSettings(e.target);return}if(e.target.id==='cnMarketingScheduleForm'){e.preventDefault();saveMarketingSchedule(e.target);return}if(e.target.id==='cnMarketingManualForm'){e.preventDefault();saveManualMarketingDraft(e.target);return}if(e.target.id==='cnMarketingForm'){e.preventDefault();generateMarketingDraft(e.target);return}if(e.target.id==='cnMarketingEditForm'){e.preventDefault();saveMarketingEdit(e.target);return}if(e.target.id==='cnColzoForm'){e.preventDefault();saveColzoRecord(e.target);return}if(e.target.id==='cnWorkForm'){e.preventDefault();saveWork(e.target);return}if(e.target.id==='cnBusinessSettings'){e.preventDefault();saveNativeBusiness(e.target);return}if(e.target.id==='cnInviteTeam'){e.preventDefault();inviteNativeMember(e.target);return}if(e.target.id!=='cnDraftForm')return;e.preventDefault();copyDraft(e.target)});
 root.addEventListener('change',e=>{
   if(e.target.id==='cnPublicMediaInput'){
    const file=e.target.files?.[0]||null,slot=state.publicMediaSlot;
    e.target.value='';state.publicMediaSlot=null;
    if(file)uploadNativeProfileMedia(file,slot);
    return;
   }
   if(e.target.id==='cnKnowledgeFileInput'){
    const file=e.target.files?.[0]||null;
    const replaceId=state.knowledgeReplaceId;state.knowledgeReplaceId=null;
    e.target.value='';
    if(file)uploadNativeKnowledgeFile(file,replaceId);return;
   }
   if(e.target.dataset.knowledgeInclude){state.knowledgeIncludes[e.target.dataset.knowledgeInclude]=e.target.checked;return}if(e.target.id==='cnQuietMotion'){state.quietMotion=e.target.checked;root.classList.toggle('cn-quiet-motion',state.quietMotion);render();return}if(e.target.id==='cnCompactCards'){state.compactCards=e.target.checked;root.classList.toggle('cn-compact-cards',state.compactCards);render();return}});
 document.getElementById('cnReturnToColzo')?.addEventListener('click',()=>{document.body.classList.remove('colzo-legacy-mode');root.removeAttribute('aria-hidden');document.getElementById('cnReturnToColzo').hidden=true;render({motion:'page',direction:-1});});
 const onAuthState=auth=>{if(auth!=='auth-ready')dashboardFailure=null;if(auth==='auth-ready'){document.body.classList.add('colzo-owner-enabled');root.hidden=false;root.removeAttribute('aria-hidden');render()}else{sessionEpoch++;window.ColzoKpiMotion?.cancel();window.ColzoGestures?.cancel();Object.assign(state,initialState());root.querySelector('.cn-unsaved-overlay')?.remove();closeCommand(false);stopMotion();document.body.classList.remove('colzo-owner-enabled','colzo-legacy-mode');root.hidden=true;window.colzoParkSecurityCenter?.();window.ColzoReact?.unmount(content);content.replaceChildren();const liveRegion=root.querySelector('#cnScreenAnnounce');if(liveRegion)liveRegion.textContent='';state.screen='home';state.setting='';state.teamData=null;state.teamError='';state.inviteFeedback='';state.inviteUrl='';state.teamLoading=false;state.settingsBusy=false;state.quietMotion=false;state.compactCards=false;root.classList.remove('cn-quiet-motion','cn-compact-cards');state.search='';state.filter='All';state.clientSearch='';state.clientFilter='All';state.projectFilter='All';state.projectSearch='';state.showProjectSearch=false;state.workModal=null;state.workBusy=false;state.workFeedback='';state.workSearch={bookings:'',actions:''};state.workFilter={bookings:'Active',actions:'Open'};state.activeLead=null;state.recordsReady=false;state.scrollByScreen.clear();document.getElementById('cnReturnToColzo').hidden=true}};
 window.ColzoOwner={render,onAuthState,openLegacy:original,dashboardLoaded:()=>{dashboardFailure=null;state.recordsReady=true},error:(error)=>{if(document.body.classList.contains('auth-ready')){const detail=typeof colzoDashboardFailureLabel==='function'?colzoDashboardFailureLabel(error,window.colzoPreviewAuthTransportEnabled):'';dashboardFailure='Unable to load your business records. Please try again.'+detail;render()}},getActiveScreen:()=>state.screen};
 onAuthState(document.body.classList.contains('auth-ready')?'auth-ready':'auth-pending');
})();
