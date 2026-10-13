/* Colzo's native owner interface. Same authenticated Business AI account, same
 * browser-loaded tenant records, NO new API endpoints or silent mutations.
 * The original feature-rich owner app remains one click away. */
(()=>{
 'use strict';
 const root=document.getElementById('colzoOwner');
 const content=document.getElementById('cnContent');
 if(!root||!content)return;
 const state={screen:'home',setting:'',settingsBusy:false,teamData:null,teamLoading:false,teamError:'',inviteFeedback:'',inviteUrl:'',compactCards:false,quietMotion:false,filter:'All',clientSearch:'',clientFilter:'All',projectFilter:'All',projectSearch:'',showProjectSearch:false,search:'',recordsReady:false,activeLead:null,notification:'',draftLead:'',draftTitle:'',draftAmount:'',scrollByScreen:new Map(),workFilter:{bookings:'Active',actions:'Open'},workSearch:{bookings:'',actions:''},workDate:new Date().toISOString().slice(0,7),workModal:null,workBusy:false,workFeedback:''};
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
 const status=(v)=>{const label=String(v||'New');const group=leadStage({status:label});return `<span class="cn-pill ${group==='Won'?'success':group==='New'?'attention':'progress'}">${safe(label)}</span>`};
 const greetingLine=()=>`${greeting()},`;
 function home(){
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
    <button type="button" data-cn-legacy="leads"><span class="cf-quick-icon primary">+</span><small>New enquiry</small></button>
    <button type="button" data-cn-screen="quotes"><span class="cf-quick-icon">▤</span><small>Draft quote</small></button>
    <button type="button" data-cn-screen="clients"><span class="cf-quick-icon">♧</span><small>View clients</small></button>
    <button type="button" data-cn-insights><span class="cf-quick-icon">▥</span><small>View reports</small></button>
  </div></section>
  <section class="cf-below-fold"><div class="cn-section-bar"><div><span class="cn-kicker">YOUR DAY</span><h2>Recent enquiries</h2></div><button data-cn-screen="enquiries" class="cn-text-action" type="button">View all ↗</button></div>
    <div class="cn-stack">${enquiries.length?enquiries.slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,3).map(leadRow).join(''):empty('No enquiries recorded yet.')}</div>
    <div class="cn-duo"><button data-cn-screen="bookings" type="button"><b>▣</b><strong>Bookings</strong><small>Open calendar →</small></button><button data-cn-legacy="marketing" type="button"><b>✧</b><strong>AI marketing</strong><small>Open drafts →</small></button></div>
  </section>`;
 }
 function figmaStat(label,n,details,icon){return `<article class="cf-kpi"><span class="cf-kpi-label">${safe(label)}</span><strong>${safe(n)}</strong><span class="cf-kpi-sub">${safe(details)}</span></article>`}
 function figmaTrend(list){
  const months=Array.from({length:6},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-(5-i));return{k:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:new Intl.DateTimeFormat('en-GB',{month:'short'}).format(d),count:0}});
  const map=new Map(months.map(m=>[m.k,m]));
  for(const e of list){const d=dateValue(e.created_at);if(!d)continue;const record=map.get(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);if(record)record.count++}
  const max=Math.max(1,...months.map(m=>m.count));const points=months.map((m,i)=>`${14+i*56},${122-(m.count/max)*88}`).join(' ');
  const coords=months.map((m,i)=>[14+i*56,122-(m.count/max)*88]);const area='M'+coords.map(([x,y])=>`${x},${y}`).join(' L')+' L294,122 L14,122 Z';
  return `<section class="cf-trend" id="cnTrend"><header><h2>Enquiry trend</h2><span>Last 6 months⌄</span></header><svg viewBox="0 0 310 160" role="img" aria-label="Recorded enquiries per month"> <defs><linearGradient id="cnTrendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#c8ff2e" stop-opacity=".23"/><stop offset="100%" stop-color="#c8ff2e" stop-opacity="0"/></linearGradient></defs><path d="M14 34H294 M14 64H294 M14 93H294 M14 122H294" stroke="#354044" stroke-width="1"/><path d="${area}" fill="url(#cnTrendFill)"/><polyline points="${points}" fill="none" stroke="#c8ff2e" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>${months.map((m,i)=>`<circle cx="${14+i*56}" cy="${122-(m.count/max)*88}" r="3.1" fill="#c8ff2e"><title>${safe(m.label)}: ${m.count} enquiries</title></circle>`).join('')}</svg><div class="cf-months">${months.map(m=>`<span>${safe(m.label)}</span>`).join('')}</div><p>Based on recorded enquiries, not revenue.</p></section>`;
 }
 function leadRow(l){return `<button class="cn-record cf-lead-card" type="button" data-cn-lead="${safe(l.id)}"><span class="cn-avatar">${safe(contact(l).split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase().slice(0,2))}</span><span class="cn-record-main"><strong>${safe(contact(l))}</strong><small>${safe(l.job_type||'General enquiry')}</small>${status(l.status)}</span><span class="cn-record-end"><time>${safe(day(l.created_at))}</time><span>›</span></span></button>`}
 function enquiry(){
  const all=records().enquiries;
  const filtered=all.filter(l=>(state.filter==='All'||leadStage(l)===state.filter)&&[l.name,l.job_type,l.description,l.location,l.email,l.phone].join(' ').toLowerCase().includes(state.search.toLowerCase()));
  const tabs=['All','New','In Progress','Won'];
  return `<div class="cf-screen-top"><h1>Enquiries</h1><div class="cf-top-actions"><button type="button" class="cf-icon-button" data-cn-focus-search aria-label="Focus enquiry search">⌕</button><button type="button" class="cf-icon-button volt" data-cn-legacy="leads" aria-label="Open enquiry management to add an enquiry">+</button></div></div>
  <div class="cn-tabs cf-tabs" role="group" aria-label="Filter enquiries">${tabs.map(t=>`<button type="button" data-cn-filter="${t}" aria-pressed="${state.filter===t}">${t}${t!=='All'?` (${leadCount(all,t)})`:''}</button>`).join('')}</div>
  <div class="cn-search cf-search"><span aria-hidden="true">⌕</span><input id="cnSearch" type="search" placeholder="Search enquiries..." value="${safe(state.search)}" aria-label="Search enquiries"></div>
  <div class="cn-stack cf-lead-list">${filtered.length?filtered.map(leadRow).join(''):empty('No enquiries match this view.','<button type="button" data-cn-filter="All">Show all</button>')}</div>
  <div class="cf-list-footer"><span>${filtered.length} ${filtered.length===1?'enquiry':'enquiries'}</span><button type="button" data-cn-refresh>Refresh ↻</button></div>`;
 }
 function leadDetails(){
  const lead=records().enquiries.find(l=>String(l.id)===String(state.activeLead));
  if(!lead)return `<button class="cn-back" data-cn-screen="enquiries" type="button">‹ Enquiries</button>${empty('This enquiry is no longer available.')}`;
  const phone=String(lead.phone||'').replace(/[^+\d]/g,'');
  const email=String(lead.email||'');
  return `<header class="cf-detail-top"><button class="cn-back" data-cn-screen="enquiries" type="button" aria-label="Back to enquiries">‹</button><button class="cf-more-button" data-cn-legacy="leads" type="button" aria-label="More enquiry options">•••</button></header>
  <section class="cf-detail-contact"><span class="cn-avatar large">${initial(contact(lead))}</span><div><h1>${safe(contact(lead))}</h1><p>${safe(lead.job_type||'General enquiry')}</p>${status(lead.status)}</div></section>
  <div class="cf-contact-row">${phone?`<a href="tel:${safe(phone)}"><b>☎</b><span>Call</span></a>`:''}${email?`<a href="mailto:${safe(email)}"><b>✉</b><span>Email</span></a>`:''}<button data-cn-screen="bookings" type="button"><b>▣</b><span>Schedule</span></button><button data-cn-legacy="leads" type="button"><b>•••</b><span>More</span></button></div>
  <section class="cn-detail-panel cf-detail-panel"><h2>Details</h2><dl><div><dt>▣　Enquiry source</dt><dd>${safe(lead.source||lead.enquiry_source||'Not recorded')}</dd></div><div><dt>▤　Submitted</dt><dd>${safe(day(lead.created_at))}</dd></div><div><dt>◇　Budget</dt><dd>${safe(lead.budget||'Not supplied')}</dd></div><div><dt>♧　Location</dt><dd>${safe(lead.location||'Not supplied')}</dd></div></dl></section>
  <section class="cn-detail-panel cf-detail-panel"><h2>Description</h2><p>${safe(lead.description||'No message has been recorded.')}</p></section>
  <div class="cf-detail-buttons"><button class="cf-button-muted" type="button" data-cn-screen="quotes">Create quote</button><button class="cf-button-volt" type="button" data-cn-legacy="leads">Mark as in progress</button></div>
  <p class="cn-caption">Updates are confirmed in the existing enquiry editor. Draft quotes are not saved or sent.</p>`;
 }
 function projects(){
  const {bookings,actions}=records();
  const work=[...bookings.map(x=>({...x,type:'booking'})),...actions.map(x=>({...x,type:'action'}))].sort((a,b)=>String(b.created_at||b.due_at||'').localeCompare(String(a.created_at||a.due_at||'')));
  const done=x=>/done|completed|cancelled/i.test(String(x.status||''));
  const projectTabs=['All','Active','Completed'];const chosen=state.projectFilter||'All';
  const visible=work.filter(x=>(chosen==='All'||(chosen==='Completed'?done(x):!done(x)))&&(!state.projectSearch||`${x.title||''} ${x.job_type||''} ${x.status||''} ${x.type||''}`.toLowerCase().includes(state.projectSearch.toLowerCase())));
  return `<div class="cf-screen-top"><h1>Projects</h1><button type="button" class="cf-icon-button" data-cn-search-projects aria-label="Search projects" aria-expanded="${state.showProjectSearch}">⌕</button></div>
    ${state.showProjectSearch?`<label class="cn-search cf-search cn-project-search"><span aria-hidden="true">⌕</span><input id="cnProjectSearch" type="search" autocomplete="off" placeholder="Find work or customers..." aria-label="Search existing work" value="${safe(state.projectSearch)}"></label>`:''}
    <div class="cf-tabs cf-project-tabs" role="group" aria-label="Filter work">${projectTabs.map(t=>`<button type="button" data-cn-project-filter="${t}" aria-pressed="${chosen===t}">${t} (${t==='All'?work.length:t==='Completed'?work.filter(done).length:work.filter(x=>!done(x)).length})</button>`).join('')}</div>
    <div class="cn-stack cf-project-list">${visible.length?visible.map(x=>{const title=String(x.title||x.job_type|| (x.type==='booking'?'Booking':'Follow-up action'));const pct=Number(x.progress);const tracked=x.progress!==null&&x.progress!==undefined&&x.progress!==''&&Number.isFinite(pct)&&pct>=0&&pct<=100;return `<button class="cf-project-card" type="button" data-cn-screen="${x.type==='booking'?'bookings':'actions'}"><span class="cn-avatar">${safe(title.split(/\s+/).slice(0,2).map(v=>v[0]).join('').toUpperCase())}</span><span class="cf-project-text"><strong>${safe(title)}</strong><small>${x.type==='booking'?'Booking':'Action'} · ${safe(day(x.due_at||x.start_at||x.created_at))}</small>${tracked?`<span class="cf-progress" aria-label="Recorded progress ${pct}%"><i style="width:${pct}%"></i></span>`:`<span class="cf-project-status">${safe(x.status||'Pending')} · Progress not tracked</span>`}</span><span class="cf-project-end">›${tracked?`<small>${pct}%</small>`:''}</span></button>`}).join(''):empty('No recorded work matches this filter.')}</div>
    <aside class="cf-project-promo"><div class="cf-promo-art"></div><span class="cf-promo-icon">▥</span><h2>Turn enquiries<br>into real progress.</h2><p>Keep projects moving and see<br>the bigger picture.</p><button type="button" data-cn-screen="bookings" aria-label="Open bookings">→</button></aside>
    <p class="cn-caption">Shows existing bookings and actions. Dedicated Colzo project tracking is not enabled yet.</p>`;
 }
 function clients(){
   const entries=records().enquiries.filter(l=>l.name||l.email||l.phone).slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
   const unique=new Map();
   for(const l of entries){const k=String(l.email||l.phone||l.name||'').trim().toLowerCase();if(k&&!unique.has(k))unique.set(k,l)}
   const all=[...unique.values()];
   const filtered=all.filter(l=>[l.name,l.email,l.phone,l.company,l.business_name,l.job_type].join(' ').toLowerCase().includes(state.clientSearch.toLowerCase())&&(state.clientFilter==='All'||(state.clientFilter==='Active'&&leadStage(l)!=='Won')||(state.clientFilter==='Recent'&&!!dateValue(l.created_at)&&Date.now()-dateValue(l.created_at).getTime()<2592000000))).sort((a,b)=>contact(a).localeCompare(contact(b)));
   const row=l=>`<button class="cn-stitch-customer" type="button" data-cn-lead="${safe(l.id)}"><span class="cn-avatar">${safe(contact(l).split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase().slice(0,2))}</span><span class="cn-stitch-customer-copy"><strong>${safe(contact(l))}</strong><small>${safe(l.company||l.business_name||l.email||'Customer')}</small><small>${safe(l.job_type||'Enquiry')} · ${safe(day(l.created_at))}</small></span><span aria-hidden="true">›</span></button>`;
   return `<div class="cn-stitch-title"><div><h1>Customers</h1><p>${all.length} enquiry contacts</p></div><button class="cn-stitch-add" data-cn-legacy="leads" type="button" aria-label="Add contact through an enquiry">+</button></div><label class="cn-stitch-search"><span aria-hidden="true">⌕</span><input id="cnClientSearch" type="search" aria-label="Search customers" value="${safe(state.clientSearch)}" placeholder="Search customers by name, business…"></label><div class="cn-stitch-filters" role="group" aria-label="Filter customers">${['All','Recent','Active'].map(f=>`<button type="button" data-cn-client-filter="${f}" aria-pressed="${state.clientFilter===f}">${f}${f==='All'?' ('+all.length+')':''}</button>`).join('')}</div><div class="cn-stitch-directory-label"><b>DIRECTORY</b><span>${filtered.length} contacts</span></div><div class="cn-stitch-customer-list">${filtered.length?filtered.map(row).join(''):empty('No customers match this view.')}</div><p class="cn-caption">Contacts are derived from existing enquiries; separate saved customer profiles are not yet supported. Use the existing enquiry tools to add contacts.</p>`;
 }
 function quotes(){
  const entries=records().enquiries;
  return `${title('Quotes','ESTIMATES / QUOTES','Prepare a draft using an existing enquiry.')}
  <section class="cn-detail-panel"><div class="cn-notice"><strong>Draft-only mode</strong><p>Colzo quote storage and sending are not enabled in this release. You can copy a draft, but it will not be saved or sent.</p></div>
  <form id="cnDraftForm" class="cn-form"><label>Customer enquiry<select name="lead"><option value="">Choose an enquiry</option>${entries.map(l=>`<option value="${safe(l.id)}" ${state.draftLead===String(l.id)?'selected':''}>${safe(contact(l))} — ${safe(l.job_type||'Enquiry')}</option>`).join('')}</select></label><label>Estimate title<input name="title" maxlength="120" required placeholder="Work to be completed" value="${safe(state.draftTitle)}"></label><label>Estimated amount (GBP)<input name="amount" type="number" step="0.01" min="0" max="10000000" required placeholder="0.00" value="${safe(state.draftAmount)}"></label><button type="submit" class="cn-primary">Copy draft estimate ↗</button></form><p id="cnDraftStatus" role="status" class="cn-caption"></p></section>`;
 }
 const moreItems=[['projects','▦','Projects','Existing bookings and actions'],['clients','♧','Clients','Contacts from enquiries'],['quotes','£','Quotes','Draft estimates'],['bookings','▣','Bookings','Calendar and appointments'],['actions','✓','Actions','Follow-ups and tasks'],['enquiriesLegacy','✦','AI receptionist','Assistant and handling settings'],['marketing','↗','Marketing','Posts, drafts and scheduling'],['profile','◈','Business profile','Business details and public profile'],['addons','◇','Additional features','Existing add-ons and plans']];
 function more(){
  const business=typeof settings!=='undefined'?String(settings?.business_name||'Your business'):'Your business';
  const choices=[['▤','Business profile','Manage your business details','profile'],['♧','Team members','Invite and manage your team','team'],['⌁','Integrations','Manage connected services','integrations'],['◐','Notifications','Device alerts and preferences','notifications'],['◐','Appearance','Motion, contrast and display','appearance'],['⬡','Security','Password and two-factor authentication','security'],['?','Help & support','Get help or contact our team','help']];
  return `<header class="cf-screen-top cf-settings-title"><h1>Settings</h1><button type="button" class="cf-icon-button cn-settings-search" data-cn-command aria-label="Search Colzo tools">⌕</button></header><div class="cf-profile"><span class="cf-profile-avatar">${initial(business)}</span><div><strong>${safe(business)}</strong><small>Business account</small><small>Connected workspace</small></div><button data-cn-setting="profile" aria-label="Open business profile" type="button">›</button></div>
  <div class="cf-settings-list">${choices.map(([glyph,label,detail,view])=>`<button type="button" data-cn-setting="${view}"><span class="cf-settings-icon">${glyph}</span><span class="cf-settings-label"><strong>${label}</strong><small>${detail}</small></span><span class="cf-settings-arrow">›</span></button>`).join('')}</div>
  <button class="cf-signout" type="button" data-cn-signout>Sign out</button>
  <section class="cf-tools-extra"><h2>Other business tools</h2><div class="cn-more-links">${moreItems.map(([id,icon,label,detail])=>`<button type="button" ${['projects','clients','quotes','bookings','actions'].includes(id)?`data-cn-screen="${id}"`:id==='profile'?`data-cn-setting="profile"`:`data-cn-legacy="${id==='enquiriesLegacy'?'enquiries':id}"`}><span class="cn-more-icon">${icon}</span><span><strong>${label}</strong><small>${detail}</small></span><b>›</b></button>`).join('')}</div></section>`;
 }
 const nativeSettingMeta={
  profile:['Business profile','YOUR BUSINESS','The details that represent your business.'],
  team:['Team members','PEOPLE & ACCESS','Manage staff access and secure invitations.'],
  integrations:['Integrations','CONNECTED SERVICES','Manage existing marketing, website and customer connections.'],
  notifications:['Notifications','ALERTS & UPDATES','Control device notifications and review follow-ups.'],
  appearance:['Appearance','PERSONALISE COLZO','Fine-tune how Colzo looks and moves on this device.'],
  security:['Security','PROTECT YOUR ACCOUNT','Authentication, trusted access and device security.'],
  help:['Help & support','HERE TO HELP','Get support and send feedback about Colzo.']
 };
 function settingPanel(titleText,body,iconText='▤'){
   return `<section class="cn-settings-panel"><div class="cn-settings-panel-head"><span class="cn-settings-panel-icon" aria-hidden="true">${safe(iconText)}</span><h2>${safe(titleText)}</h2></div>${body}</section>`;
 }
 const settingsButton=(label,detail,action='settings',icon='↗')=>`<button type="button" class="cn-settings-action" ${['bookings','actions'].includes(action)?`data-cn-screen="${action}"`:`data-cn-legacy="${safe(action)}"`}><span><strong>${safe(label)}</strong><small>${safe(detail)}</small></span><span aria-hidden="true">${icon}</span></button>`;
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
     body=settingPanel('Marketing channels',`<p class="cn-settings-hint">Manage connected social channels and approved publishing within the existing Marketing workspace.</p>${settingsButton('Facebook and social publishing','View connections, drafts and publishing permissions','marketing','↗')}`,'⌁')+settingPanel('Website and enquiries',`${settingsButton('Website assistant','Embed or link your AI receptionist on your website','settings')}${settingsButton('Customer-facing business page','View your listing and public profile controls','businessProfile')}`,'▤')+`<p class="cn-settings-note">Colzo does not claim that an integration is connected until your account confirms it.</p>`;
   }else if(key==='notifications'){
     const supported=typeof Notification!=='undefined'&&window.isSecureContext;
     const permission=supported?Notification.permission:'unavailable';
     body=settingPanel('This device',`<div class="cn-settings-status"><span>Browser notification permission</span><strong>${safe(permission)}</strong></div><p class="cn-settings-hint">Allowing notifications gives this browser permission only. Actual Colzo push alerts are not yet enabled, so this will not schedule messages.</p>`,'◐')+settingPanel('Customer follow-ups',`${settingsButton('Actions and reminders','Manage your existing follow-up tasks','actions')}${settingsButton('AI receptionist','Review enquiry notifications and handling settings','settings')}`,'✓');
   }else if(key==='appearance'){
     body=settingPanel('Graphite & Volt',`<div class="cn-settings-swatch"><span></span><div><strong>Signature dark</strong><small>Colzo's reference design. Light theme is not enabled.</small></div><span class="cn-settings-check">✓</span></div>`,'◐')+settingPanel('Motion and layout',`<label class="cn-settings-toggle"><span><strong>Reduced animations</strong><small>Quieter tab changes and screen transitions</small></span><input type="checkbox" id="cnQuietMotion" ${state.quietMotion?'checked':''}></label><label class="cn-settings-toggle"><span><strong>Compact cards</strong><small>Fit more enquiries and projects on each screen</small></span><input type="checkbox" id="cnCompactCards" ${state.compactCards?'checked':''}></label><p class="cn-settings-hint">These appearance choices apply to this session. Your system's Reduce Motion setting always takes priority.</p>`,'✦');
   }else if(key==='security'){
     body=settingPanel('Two-step verification',`<div class="cn-settings-feature"><span class="cn-settings-feature-icon">⬡</span><span><strong>Authenticator app</strong><small>Existing accounts keep their enrolled authenticator and required verification.</small></span></div>${settingsButton('Manage authenticator and devices','View verified factors, recovery options and passkeys','security')}`,'⬡')+settingPanel('Face ID & passkeys',`<p class="cn-settings-hint">Passkey sign-in using your device remains in testing. It does not bypass an existing second-factor requirement.</p><div class="cn-settings-status"><span>Passkey sign-in</span><strong>${window.colzoPasskeysEnabled===true?'Device eligibility required':'Not enabled'}</strong></div>`,'◈')+settingPanel('Session protection',`${settingsButton('Account security centre','Manage trusted sign-in and session controls','security')}`,'▣');
   }else if(key==='help'){
     body=settingPanel('Help with Colzo',`<p class="cn-settings-hint">Tell us about something that looks wrong, isn't working or could be improved.</p>${settingsButton('Send pilot feedback','Use the existing secure feedback form','settings')}`,'?')+settingPanel('Useful shortcuts',`<button data-cn-command type="button" class="cn-settings-action"><span><strong>Find a Colzo tool</strong><small>Search pages, bookings, marketing or settings</small></span><span aria-hidden="true">⌕</span></button>${settingsButton('Business account controls','Manage your existing business and permissions','settings')}`,'✧');
   }
   return head+`<div class="cn-settings-panels">${body}</div>`;
 }
 async function loadNativeTeam(){
   if(state.teamLoading)return;
   state.teamLoading=true;state.teamError='';
   if(state.screen==='setting'&&state.setting==='team')render();
   try{
     if(typeof api!=='function')throw new Error('Team data is unavailable in this preview.');
     const response=await api('/api/team');
     state.teamData=response;
   }catch(error){state.teamError=error?.message||'Team details could not be loaded.';}
   finally{state.teamLoading=false;if(state.screen==='setting'&&state.setting==='team')render()}
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
        <header><div><span class="cn-kicker">${screen==='bookings'?'CALENDAR':'TASK MANAGEMENT'}</span><h2 id="cnWorkDialogTitle">${heading}</h2></div><button type="button" data-cn-work-close class="cn-work-dialog-x" aria-label="Close editor">×</button></header>
        <form id="cnWorkForm" data-kind="${screen}" class="cn-work-form" ${editing?`data-id="${safe(entry.id)}"`:''}>${common}${fields}
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
 function closeWorkModal(){state.workModal=null;state.workSelected=null;state.workFormError='';render()}
 function changeWorkMonth(amount){if(!Number.isInteger(amount)||Math.abs(amount)>1)return;const [y,m]=state.workDate.split('-').map(Number),date=new Date(y,m-1+amount,1);state.workDate=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;render({motion:'filter'})}
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
 const navPosition=screen=>screen==='lead'?1:['setting','quotes','projects','actions'].includes(screen)?4:Math.max(0,primaryScreens.indexOf(screen));
 const allowMotion=()=>!state.quietMotion&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const scrollContainer=()=>{const overflow=getComputedStyle(root).overflowY;return /auto|scroll/.test(overflow)?root:window};
 const currentScroll=()=>{const container=scrollContainer();return container===window?window.scrollY:root.scrollTop};
 const restoreScroll=position=>{
   const container=scrollContainer();if(container===window)window.scrollTo({top:position,behavior:'instant'});
   else root.scrollTo({top:position,behavior:'instant'});
 };
 let motionRun=[];
 function stopMotion(){for(const animation of motionRun){try{animation.cancel()}catch{}}motionRun=[]}
 function animateArrival(direction=1,kind='page'){
   stopMotion();
   if(!allowMotion()||typeof content.animate!=='function')return;
   const entering=kind==='filter'?8:direction>=0?18:-18;
   const duration=kind==='filter'?220:kind==='detail'?420:355;
   const contentAnimation=content.animate([
     {opacity:.62,transform:`translate3d(${entering}px,6px,0) scale(.992)`},
     {opacity:1,transform:'translate3d(0,0,0) scale(1)'}
   ],{duration,easing:'cubic-bezier(.2,.85,.22,1)'});
   motionRun.push(contentAnimation);
   const items=[...content.querySelectorAll('.cf-kpi,.cf-lead-card,.cf-project-card,.cf-quick-grid button,.cf-settings-list button,.cn-more-links button,.cn-detail-panel,.cn-record')].slice(0,16);
   items.forEach((item,i)=>{
     const a=item.animate([
       {opacity:.28,transform:`translate3d(0,${kind==='filter'?5:11}px,0)`},
       {opacity:1,transform:'translate3d(0,0,0)'}
     ],{duration:320,delay:Math.min(i,8)*28,easing:'cubic-bezier(.17,.8,.24,1)',fill:'backwards'});
     motionRun.push(a);
   });
 }
 function render({motion='none',direction=1}={}){
   if(!document.body.classList.contains('auth-ready'))return;
   if(state.workModal&&motion==='none'&&root.querySelector('#cnWorkForm'))return;
   state.recordsReady=true;
   const pages={home,enquiries:enquiry,lead:leadDetails,projects,clients,quotes,more,setting:nativeSetting,bookings:bookingScreen,actions:actionsScreen};
   const page=pages[state.screen]||home;
   stopMotion();
   root.dataset.screen=state.screen;
   root.style.setProperty('--cn-active-index',String(navPosition(state.screen)));
   root.querySelector('.cn-work-dialog-backdrop')?.remove();
   content.innerHTML=page();
   const dialog=content.querySelector('.cn-work-dialog-backdrop');if(dialog)root.appendChild(dialog);
   content.dataset.cnIntro=state.screen;
   root.querySelectorAll('.cn-nav button').forEach(b=>{const active=b.dataset.cnScreen===state.screen||(state.screen==='lead'&&b.dataset.cnScreen==='enquiries')||(['quotes','setting','projects','actions'].includes(state.screen)&&b.dataset.cnScreen==='more');if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
   const input=document.getElementById('cnSearch');if(input&&state.screen==='enquiries'&&state.focusSearch){input.focus();input.setSelectionRange(input.value.length,input.value.length)}
   if(motion!=='none')animateArrival(direction,motion);
 }
 function navigate(screen){
   if(!['home','enquiries','lead','projects','clients','quotes','more','setting','bookings','actions'].includes(screen))return;
   closeCommand(false);
   if(screen===state.screen){restoreScroll(0);return}
   const before=state.screen;
   state.scrollByScreen.set(before,currentScroll());
   state.screen=screen;state.notification='';state.focusSearch=false;
   const announcement=root.querySelector('#cnScreenAnnounce');if(announcement)announcement.textContent=`${{lead:'Enquiry details',more:'Settings',bookings:'Bookings',actions:'Actions',setting:nativeSettingMeta[state.setting]?.[0]||'Settings',clients:'Customers',quotes:'Quotes'}[screen]||screen.replace(/^./,x=>x.toUpperCase())} screen`;
   const direction=navPosition(screen)<navPosition(before)?-1:1;
   render({motion:screen==='lead'?'detail':'page',direction});
   restoreScroll(state.scrollByScreen.get(screen)||0);
 }
 const commandItems=[
   {label:'Home',detail:'Overview, enquiries and insights',glyph:'⌂',screen:'home'},
   {label:'Enquiries',detail:'Find and manage customer requests',glyph:'▤',screen:'enquiries'},
   {label:'Projects',detail:'Your bookings and open actions',glyph:'▦',screen:'projects'},
   {label:'Clients',detail:'Contacts from real enquiries',glyph:'♧',screen:'clients'},
   {label:'Quotes',detail:'Prepare a copy-only draft estimate',glyph:'£',screen:'quotes'},
   {label:'Marketing',detail:'AI drafts and publishing controls',glyph:'✧',legacy:'marketing'},
   {label:'Bookings',detail:'Appointments and calendar',glyph:'▣',screen:'bookings'},
   {label:'Actions',detail:'Task management and follow-ups',glyph:'✓',screen:'actions'},
   {label:'AI receptionist',detail:'Existing assistant settings',glyph:'✦',legacy:'enquiries'},
   {label:'Account settings',detail:'Business and user preferences',glyph:'⚙',screen:'more'},
   {label:'Security',detail:'Authenticator and passkey choices',glyph:'◇',setting:'security'},
   {label:'Billing',detail:'Current plans and subscription controls',glyph:'◈',legacy:'billing'}
 ];
 const sheet=root.querySelector('#cnCommandSheet');
 const commandInput=root.querySelector('#cnCommandSearch');
 const commandResults=root.querySelector('#cnCommandResults');
 let focusBeforeCommand=null;
 function drawCommandResults(){
   if(!commandResults)return;
   const q=(commandInput?.value||'').trim().toLowerCase();
   const found=commandItems.filter(x=>!q||`${x.label} ${x.detail}`.toLowerCase().includes(q)).sort((a,b)=>q?(Number(b.label.toLowerCase().startsWith(q))-Number(a.label.toLowerCase().startsWith(q))):0);
   commandResults.innerHTML=found.length?found.map(item=>`<button type="button" ${item.screen?`data-cn-screen="${item.screen}"`:item.setting?`data-cn-setting="${item.setting}"`:`data-cn-legacy="${item.legacy}"`}><span class="cn-command-glyph" aria-hidden="true">${safe(item.glyph)}</span><span class="cn-command-name">${safe(item.label)}<small>${safe(item.detail)}</small></span><span class="cn-command-arrow" aria-hidden="true">›</span></button>`).join(''):'<p class="cn-command-empty">No matching tools. Try “Marketing” or “Enquiries”.</p>';
 }
 function closeCommand(restoreFocus=true){
   if(!sheet||sheet.hidden)return;
   sheet.hidden=true;
   root.classList.remove('cn-command-open');
   if(restoreFocus&&focusBeforeCommand?.isConnected)focusBeforeCommand.focus({preventScroll:true});
   focusBeforeCommand=null;
 }
 function openCommand(){
   if(!sheet||!commandInput||!document.body.classList.contains('auth-ready')||document.body.classList.contains('colzo-legacy-mode')||document.body.classList.contains('security-mfa-required')||state.workModal)return;
   focusBeforeCommand=document.activeElement;
   sheet.hidden=false;
   root.classList.add('cn-command-open');
   commandInput.value='';drawCommandResults();commandInput.focus({preventScroll:true});
   if(allowMotion()&&typeof sheet.querySelector('.cn-command-panel')?.animate==='function'){
     sheet.querySelector('.cn-command-panel').animate([{opacity:0,transform:'translate3d(0,18px,0) scale(.97)'},{opacity:1,transform:'translate3d(0,0,0) scale(1)'}],{duration:335,easing:'cubic-bezier(.17,.85,.24,1)'});
   }
 }
 const screenShortcuts=e=>{
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'&&!e.altKey){
     if(!document.body.classList.contains('auth-ready')||document.body.classList.contains('colzo-legacy-mode')||document.body.classList.contains('security-mfa-required')||state.workModal)return;
     e.preventDefault();if(sheet.hidden)openCommand();else closeCommand();return;
   }
   const editor=root.querySelector('.cn-work-dialog');
   if(editor){
     if(e.key==='Escape'&&!state.workBusy){e.preventDefault();closeWorkModal();return}
     if(e.key!=='Tab')return;
     const focusable=[...editor.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(el=>el.getBoundingClientRect().width>0);
     if(!focusable.length)return;
     if(e.shiftKey&&document.activeElement===focusable[0]){e.preventDefault();focusable.at(-1).focus()}
     if(!e.shiftKey&&document.activeElement===focusable.at(-1)){e.preventDefault();focusable[0].focus()}
     return;
   }
   if(sheet?.hidden)return;
   if(e.key==='Escape'){e.preventDefault();closeCommand();return}
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
  if(target.hasAttribute('data-cn-command')){openCommand();return}
  if(target.hasAttribute('data-cn-close-command')){closeCommand();return}
  if(target.hasAttribute('data-cn-setting')){state.setting=target.getAttribute('data-cn-setting');navigate('setting');if(state.setting==='team'&&!state.teamData&&!state.teamError)loadNativeTeam();return}
  if(target.hasAttribute('data-cn-back-settings')){navigate('more');return}
  if(target.hasAttribute('data-cn-refresh-team')){loadNativeTeam();return}
  if(target.hasAttribute('data-cn-copy-invite')){if(state.inviteUrl&&navigator.clipboard?.writeText){navigator.clipboard.writeText(state.inviteUrl).then(()=>{const feedback=content.querySelector('#cnInviteFeedback');if(feedback)feedback.firstChild.textContent='Invitation link copied. Share it only with the intended person.'}).catch(()=>{const field=content.querySelector('.cn-invite-share input');field?.select()})}else{const field=content.querySelector('.cn-invite-share input');field?.select()}return}
  if(target.hasAttribute('data-cn-permission')){if(typeof Notification!=='undefined'&&window.isSecureContext)Notification.requestPermission().then(()=>{if(state.screen==='setting'&&state.setting==='notifications')render()}).catch(()=>{});return}
  if(target.hasAttribute('data-cn-client-filter')){state.clientFilter=target.getAttribute('data-cn-client-filter');render({motion:'filter'});return}
  if(target.hasAttribute('data-cn-work-tab')){state.workFilter[state.screen]=target.getAttribute('data-cn-work-tab');render({motion:'filter'});return}
  if(target.hasAttribute('data-cn-work-month')){changeWorkMonth(Number(target.getAttribute('data-cn-work-month')));return}
  if(target.hasAttribute('data-cn-work-refresh')){refreshWork();return}
  if(target.hasAttribute('data-cn-work-new')){openWorkModal(state.screen);return}
  if(target.hasAttribute('data-cn-work-edit')){openWorkModal(state.screen,target.getAttribute('data-cn-work-edit'));return}
  if(target.hasAttribute('data-cn-work-close')){if(!state.workBusy)closeWorkModal();return}
  if(target.hasAttribute('data-cn-screen')){navigate(target.getAttribute('data-cn-screen'));return}
  if(target.hasAttribute('data-cn-legacy')){original(target.getAttribute('data-cn-legacy'));return}
  if(target.hasAttribute('data-cn-lead')){state.activeLead=target.getAttribute('data-cn-lead');navigate('lead');return}
  if(target.hasAttribute('data-cn-filter')){const next=target.getAttribute('data-cn-filter');if(state.filter!==next){state.filter=next;render({motion:'filter'})}return}
  if(target.hasAttribute('data-cn-project-filter')){const next=target.getAttribute('data-cn-project-filter');if(state.projectFilter!==next){state.projectFilter=next;render({motion:'filter'})}return}
  if(target.hasAttribute('data-cn-focus-search')){document.querySelector('#cnSearch')?.focus();return}
  if(target.hasAttribute('data-cn-insights')){document.querySelector('#cnTrend')?.scrollIntoView({behavior:'smooth',block:'center'});return}
  if(target.hasAttribute('data-cn-search-projects')){state.showProjectSearch=!state.showProjectSearch;if(!state.showProjectSearch)state.projectSearch='';render({motion:'filter'});if(state.showProjectSearch)document.getElementById('cnProjectSearch')?.focus();return}
  if(target.hasAttribute('data-cn-refresh')){if(typeof loadAll==='function')loadAll(true);return}
  if(target.hasAttribute('data-cn-signout')){document.getElementById('logoutButton')?.click();return}
 });
 root.addEventListener('input',e=>{if(e.target.id==='cnClientSearch'){const pos=e.target.selectionStart;state.clientSearch=e.target.value;render();const field=content.querySelector('#cnClientSearch');if(field){field.focus();field.setSelectionRange(Math.min(pos,field.value.length),Math.min(pos,field.value.length))}return}if(e.target.id==='cnCommandSearch'){drawCommandResults();return}if(e.target.id==='cnWorkSearch'){state.workSearch[state.screen]=e.target.value;const start=e.target.selectionStart;render();const field=content.querySelector('#cnWorkSearch');if(field){field.focus();field.setSelectionRange(Math.min(start,field.value.length),Math.min(start,field.value.length))}return}if(e.target.id==='cnProjectSearch'){const pos=e.target.selectionStart;state.projectSearch=e.target.value;render();const field=document.getElementById('cnProjectSearch');if(field){field.focus();field.setSelectionRange(Math.min(pos,field.value.length),Math.min(pos,field.value.length))}return}if(e.target.id!=='cnSearch')return;const pos=e.target.selectionStart;state.search=e.target.value;state.focusSearch=true;render();const i=document.getElementById('cnSearch');if(i)i.setSelectionRange(Math.min(pos,i.value.length),Math.min(pos,i.value.length));});
 root.addEventListener('submit',e=>{if(e.target.id==='cnWorkForm'){e.preventDefault();saveWork(e.target);return}if(e.target.id==='cnBusinessSettings'){e.preventDefault();saveNativeBusiness(e.target);return}if(e.target.id==='cnInviteTeam'){e.preventDefault();inviteNativeMember(e.target);return}if(e.target.id!=='cnDraftForm')return;e.preventDefault();copyDraft(e.target)});
 root.addEventListener('change',e=>{if(e.target.id==='cnQuietMotion'){state.quietMotion=e.target.checked;root.classList.toggle('cn-quiet-motion',state.quietMotion);render();return}if(e.target.id==='cnCompactCards'){state.compactCards=e.target.checked;root.classList.toggle('cn-compact-cards',state.compactCards);render();return}});
 document.getElementById('cnReturnToColzo')?.addEventListener('click',()=>{document.body.classList.remove('colzo-legacy-mode');root.removeAttribute('aria-hidden');document.getElementById('cnReturnToColzo').hidden=true;render({motion:'page',direction:-1});});
 const onAuthState=auth=>{if(auth==='auth-ready'){document.body.classList.add('colzo-owner-enabled');root.hidden=false;root.removeAttribute('aria-hidden');render()}else{closeCommand(false);stopMotion();document.body.classList.remove('colzo-owner-enabled','colzo-legacy-mode');root.hidden=true;content.replaceChildren();const liveRegion=root.querySelector('#cnScreenAnnounce');if(liveRegion)liveRegion.textContent='';state.screen='home';state.setting='';state.teamData=null;state.teamError='';state.inviteFeedback='';state.inviteUrl='';state.teamLoading=false;state.settingsBusy=false;state.quietMotion=false;state.compactCards=false;root.classList.remove('cn-quiet-motion','cn-compact-cards');state.search='';state.filter='All';state.clientSearch='';state.clientFilter='All';state.projectFilter='All';state.projectSearch='';state.showProjectSearch=false;state.workModal=null;state.workBusy=false;state.workFeedback='';state.workSearch={bookings:'',actions:''};state.workFilter={bookings:'Upcoming',actions:'Open'};state.activeLead=null;state.recordsReady=false;state.scrollByScreen.clear();document.getElementById('cnReturnToColzo').hidden=true}};
 window.ColzoOwner={render,onAuthState,openLegacy:original,error:()=>{if(document.body.classList.contains('auth-ready'))content.innerHTML=empty('Unable to load your business records. Please try again.','<button data-cn-refresh type="button">Retry loading</button>')},getActiveScreen:()=>state.screen};
 onAuthState(document.body.classList.contains('auth-ready')?'auth-ready':'auth-pending');
})();
