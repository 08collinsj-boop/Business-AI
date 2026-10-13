/* Colzo's native owner interface. Same authenticated Business AI account, same
 * browser-loaded tenant records, NO new API endpoints or silent mutations.
 * The original feature-rich owner app remains one click away. */
(()=>{
 'use strict';
 const root=document.getElementById('colzoOwner');
 const content=document.getElementById('cnContent');
 if(!root||!content)return;
 const state={screen:'home',filter:'All',projectFilter:'All',projectSearch:'',showProjectSearch:false,search:'',recordsReady:false,activeLead:null,notification:'',draftLead:'',draftTitle:'',draftAmount:'',scrollByScreen:new Map()};
 const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const dateValue=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?d:null};
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
    <div class="cn-duo"><button data-cn-legacy="bookings" type="button"><b>▣</b><strong>Bookings</strong><small>Open calendar →</small></button><button data-cn-legacy="marketing" type="button"><b>✧</b><strong>AI marketing</strong><small>Open drafts →</small></button></div>
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
  <div class="cf-contact-row">${phone?`<a href="tel:${safe(phone)}"><b>☎</b><span>Call</span></a>`:''}${email?`<a href="mailto:${safe(email)}"><b>✉</b><span>Email</span></a>`:''}<button data-cn-legacy="bookings" type="button"><b>▣</b><span>Schedule</span></button><button data-cn-legacy="leads" type="button"><b>•••</b><span>More</span></button></div>
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
    <div class="cn-stack cf-project-list">${visible.length?visible.map(x=>{const title=String(x.title||x.job_type|| (x.type==='booking'?'Booking':'Follow-up action'));const pct=Number(x.progress);const tracked=x.progress!==null&&x.progress!==undefined&&x.progress!==''&&Number.isFinite(pct)&&pct>=0&&pct<=100;return `<button class="cf-project-card" type="button" data-cn-legacy="${x.type==='booking'?'bookings':'actions'}"><span class="cn-avatar">${safe(title.split(/\s+/).slice(0,2).map(v=>v[0]).join('').toUpperCase())}</span><span class="cf-project-text"><strong>${safe(title)}</strong><small>${x.type==='booking'?'Booking':'Action'} · ${safe(day(x.due_at||x.start_at||x.created_at))}</small>${tracked?`<span class="cf-progress" aria-label="Recorded progress ${pct}%"><i style="width:${pct}%"></i></span>`:`<span class="cf-project-status">${safe(x.status||'Pending')} · Progress not tracked</span>`}</span><span class="cf-project-end">›${tracked?`<small>${pct}%</small>`:''}</span></button>`}).join(''):empty('No recorded work matches this filter.')}</div>
    <aside class="cf-project-promo"><div class="cf-promo-art"></div><span class="cf-promo-icon">▥</span><h2>Turn enquiries<br>into real progress.</h2><p>Keep projects moving and see<br>the bigger picture.</p><button type="button" data-cn-legacy="bookings" aria-label="Open bookings">→</button></aside>
    <p class="cn-caption">Shows existing bookings and actions. Dedicated Colzo project tracking is not enabled yet.</p>`;
 }
 function clients(){
  const entries=records().enquiries.filter(l=>l.name||l.email||l.phone);
  return `${title('Clients','YOUR CONTACTS','Contacts recorded through your customer enquiries.')}<div class="cn-list-title"><span>${entries.length} enquiry contacts</span><button class="cn-text-action" data-cn-screen="enquiries" type="button">Enquiries ↗</button></div><div class="cn-stack">${entries.length?entries.map(l=>`<button class="cn-record" type="button" data-cn-lead="${safe(l.id)}"><span class="cn-avatar">${initial(contact(l))}</span><span class="cn-record-main"><strong>${safe(contact(l))}</strong><small>${safe(l.email||l.phone||'Contact details not supplied')}</small></span><span class="cn-record-end">›</span></button>`).join(''):empty('Enquiry contacts will appear here.')}</div><p class="cn-caption">Contacts are shown once per enquiry; these are not yet separate saved Colzo client profiles.</p>`;
 }
 function quotes(){
  const entries=records().enquiries;
  return `${title('Quotes','ESTIMATES / QUOTES','Prepare a draft using an existing enquiry.')}
  <section class="cn-detail-panel"><div class="cn-notice"><strong>Draft-only mode</strong><p>Colzo quote storage and sending are not enabled in this release. You can copy a draft, but it will not be saved or sent.</p></div>
  <form id="cnDraftForm" class="cn-form"><label>Customer enquiry<select name="lead"><option value="">Choose an enquiry</option>${entries.map(l=>`<option value="${safe(l.id)}" ${state.draftLead===String(l.id)?'selected':''}>${safe(contact(l))} — ${safe(l.job_type||'Enquiry')}</option>`).join('')}</select></label><label>Estimate title<input name="title" maxlength="120" required placeholder="Work to be completed" value="${safe(state.draftTitle)}"></label><label>Estimated amount (GBP)<input name="amount" type="number" step="0.01" min="0" max="10000000" required placeholder="0.00" value="${safe(state.draftAmount)}"></label><button type="submit" class="cn-primary">Copy draft estimate ↗</button></form><p id="cnDraftStatus" role="status" class="cn-caption"></p></section>`;
 }
 const moreItems=[['clients','♧','Clients','Contacts from enquiries'],['quotes','£','Quotes','Draft estimates'],['settings','⚙','Settings','Original account controls'],['bookings','▣','Bookings','Calendar and appointments'],['actions','✓','Actions','Follow-ups and tasks'],['enquiriesLegacy','✦','AI receptionist','Assistant and handling settings'],['marketing','↗','Marketing','Posts, drafts and scheduling'],['businessProfile','◈','Business profile','Your public business page'],['addons','◇','Additional features','Existing add-ons and plans']];
 function more(){
  const business=typeof settings!=='undefined'?String(settings?.business_name||'Your business'):'Your business';
  const choices=[['▤','Business profile','Manage your business details','businessProfile'],['♧','Team members','Invite and manage your team','settings'],['⌁','Integrations','Connect your favourite tools','settings'],['◐','Notifications','Choose what you’re notified about','settings'],['◐','Appearance','Dark mode, language and display','settings'],['⬡','Security','Password and two-factor authentication','security'],['?','Help & support','Get help or contact our team','settings']];
  return `<header class="cf-screen-top cf-settings-title"><h1>Settings</h1><button type="button" class="cf-icon-button cn-settings-search" data-cn-command aria-label="Search Colzo tools">⌕</button></header><div class="cf-profile"><span class="cf-profile-avatar">${initial(business)}</span><div><strong>${safe(business)}</strong><small>Business account</small><small>Connected workspace</small></div><button data-cn-legacy="settings" aria-label="Open account settings" type="button">›</button></div>
  <div class="cf-settings-list">${choices.map(([glyph,label,detail,view])=>`<button type="button" data-cn-legacy="${view}"><span class="cf-settings-icon">${glyph}</span><span class="cf-settings-label"><strong>${label}</strong><small>${detail}</small></span><span class="cf-settings-arrow">›</span></button>`).join('')}</div>
  <button class="cf-signout" type="button" data-cn-signout>Sign out</button>
  <section class="cf-tools-extra"><h2>Other business tools</h2><div class="cn-more-links">${moreItems.map(([id,icon,label,detail])=>`<button type="button" ${['clients','quotes'].includes(id)?`data-cn-screen="${id}"`:`data-cn-legacy="${id==='enquiriesLegacy'?'enquiries':id}"`}><span class="cn-more-icon">${icon}</span><span><strong>${label}</strong><small>${detail}</small></span><b>›</b></button>`).join('')}</div></section>`;
 }
 const primaryScreens=['home','enquiries','projects','more'];
 const navPosition=screen=>screen==='lead'?1:screen==='clients'||screen==='quotes'?3:Math.max(0,primaryScreens.indexOf(screen));
 const allowMotion=()=>!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
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
   state.recordsReady=true;
   const pages={home,enquiries:enquiry,lead:leadDetails,projects,clients,quotes,more};
   const page=pages[state.screen]||home;
   stopMotion();
   root.dataset.screen=state.screen;
   root.style.setProperty('--cn-active-index',String(navPosition(state.screen)));
   content.innerHTML=page();
   content.dataset.cnIntro=state.screen;
   root.querySelectorAll('.cn-nav button').forEach(b=>{const active=b.dataset.cnScreen===state.screen||(state.screen==='lead'&&b.dataset.cnScreen==='enquiries')||(['clients','quotes'].includes(state.screen)&&b.dataset.cnScreen==='more');if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
   const input=document.getElementById('cnSearch');if(input&&state.screen==='enquiries'&&state.focusSearch){input.focus();input.setSelectionRange(input.value.length,input.value.length)}
   if(motion!=='none')animateArrival(direction,motion);
 }
 function navigate(screen){
   if(!['home','enquiries','lead','projects','clients','quotes','more'].includes(screen))return;
   closeCommand(false);
   if(screen===state.screen){restoreScroll(0);return}
   const before=state.screen;
   state.scrollByScreen.set(before,currentScroll());
   state.screen=screen;state.notification='';state.focusSearch=false;
   const announcement=root.querySelector('#cnScreenAnnounce');if(announcement)announcement.textContent=`${{lead:'Enquiry details',more:'Settings',clients:'Clients',quotes:'Quotes'}[screen]||screen.replace(/^./,x=>x.toUpperCase())} screen`;
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
   {label:'Bookings',detail:'Appointments and calendar',glyph:'▣',legacy:'bookings'},
   {label:'Actions',detail:'Task management and follow-ups',glyph:'✓',legacy:'actions'},
   {label:'AI receptionist',detail:'Existing assistant settings',glyph:'✦',legacy:'enquiries'},
   {label:'Account settings',detail:'Business and user preferences',glyph:'⚙',screen:'more'},
   {label:'Security',detail:'Authenticator and passkey choices',glyph:'◇',legacy:'security'},
   {label:'Billing',detail:'Current plans and subscription controls',glyph:'◈',legacy:'settings'}
 ];
 const sheet=root.querySelector('#cnCommandSheet');
 const commandInput=root.querySelector('#cnCommandSearch');
 const commandResults=root.querySelector('#cnCommandResults');
 let focusBeforeCommand=null;
 function drawCommandResults(){
   if(!commandResults)return;
   const q=(commandInput?.value||'').trim().toLowerCase();
   const found=commandItems.filter(x=>!q||`${x.label} ${x.detail}`.toLowerCase().includes(q)).sort((a,b)=>q?(Number(b.label.toLowerCase().startsWith(q))-Number(a.label.toLowerCase().startsWith(q))):0);
   commandResults.innerHTML=found.length?found.map(item=>`<button type="button" ${item.screen?`data-cn-screen="${item.screen}"`:`data-cn-legacy="${item.legacy}"`}><span class="cn-command-glyph" aria-hidden="true">${safe(item.glyph)}</span><span class="cn-command-name">${safe(item.label)}<small>${safe(item.detail)}</small></span><span class="cn-command-arrow" aria-hidden="true">›</span></button>`).join(''):'<p class="cn-command-empty">No matching tools. Try “Marketing” or “Enquiries”.</p>';
 }
 function closeCommand(restoreFocus=true){
   if(!sheet||sheet.hidden)return;
   sheet.hidden=true;
   root.classList.remove('cn-command-open');
   if(restoreFocus&&focusBeforeCommand?.isConnected)focusBeforeCommand.focus({preventScroll:true});
   focusBeforeCommand=null;
 }
 function openCommand(){
   if(!sheet||!commandInput||!document.body.classList.contains('auth-ready')||document.body.classList.contains('colzo-legacy-mode')||document.body.classList.contains('security-mfa-required'))return;
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
     if(!document.body.classList.contains('auth-ready')||document.body.classList.contains('colzo-legacy-mode')||document.body.classList.contains('security-mfa-required'))return;
     e.preventDefault();if(sheet.hidden)openCommand();else closeCommand();return;
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
 root.addEventListener('input',e=>{if(e.target.id==='cnCommandSearch'){drawCommandResults();return}if(e.target.id==='cnProjectSearch'){const pos=e.target.selectionStart;state.projectSearch=e.target.value;render();const field=document.getElementById('cnProjectSearch');if(field){field.focus();field.setSelectionRange(Math.min(pos,field.value.length),Math.min(pos,field.value.length))}return}if(e.target.id!=='cnSearch')return;const pos=e.target.selectionStart;state.search=e.target.value;state.focusSearch=true;render();const i=document.getElementById('cnSearch');if(i)i.setSelectionRange(Math.min(pos,i.value.length),Math.min(pos,i.value.length));});
 root.addEventListener('submit',e=>{if(e.target.id!=='cnDraftForm')return;e.preventDefault();copyDraft(e.target)});
 document.getElementById('cnReturnToColzo')?.addEventListener('click',()=>{document.body.classList.remove('colzo-legacy-mode');root.removeAttribute('aria-hidden');document.getElementById('cnReturnToColzo').hidden=true;render({motion:'page',direction:-1});});
 const onAuthState=auth=>{if(auth==='auth-ready'){document.body.classList.add('colzo-owner-enabled');root.hidden=false;root.removeAttribute('aria-hidden');render()}else{closeCommand(false);stopMotion();document.body.classList.remove('colzo-owner-enabled','colzo-legacy-mode');root.hidden=true;content.replaceChildren();const liveRegion=root.querySelector('#cnScreenAnnounce');if(liveRegion)liveRegion.textContent='';state.screen='home';state.search='';state.filter='All';state.projectFilter='All';state.projectSearch='';state.showProjectSearch=false;state.activeLead=null;state.recordsReady=false;state.scrollByScreen.clear();document.getElementById('cnReturnToColzo').hidden=true}};
 window.ColzoOwner={render,onAuthState,openLegacy:original,error:()=>{if(document.body.classList.contains('auth-ready'))content.innerHTML=empty('Unable to load your business records. Please try again.','<button data-cn-refresh type="button">Retry loading</button>')},getActiveScreen:()=>state.screen};
 onAuthState(document.body.classList.contains('auth-ready')?'auth-ready':'auth-pending');
})();
