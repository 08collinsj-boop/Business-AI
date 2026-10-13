/* Colzo's native owner interface. Same authenticated Business AI account, same
 * browser-loaded tenant records, NO new API endpoints or silent mutations.
 * The original feature-rich owner app remains one click away. */
(()=>{
 'use strict';
 const root=document.getElementById('colzoOwner');
 const content=document.getElementById('cnContent');
 if(!root||!content)return;
 const state={screen:'home',filter:'All',search:'',recordsReady:false,activeLead:null,notification:'',draftLead:'',draftTitle:'',draftAmount:''};
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
 const status=(v)=>{const s=String(v||'New');const cls=/completed|converted|won|confirmed/i.test(s)?'success':/new|pending|draft/i.test(s)?'attention':'neutral';return `<span class="cn-pill ${cls}">${safe(s)}</span>`};
 const contact=(lead)=>String(lead.name||lead.email||lead.phone||'Customer');
 const initial=(name)=>safe(String(name||'?').trim().slice(0,1).toUpperCase());
 const totalToday=()=>new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(new Date());
 const trend=(list)=>{
  const months=Array.from({length:6},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-(5-i));return {k:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,name:new Intl.DateTimeFormat('en-GB',{month:'short'}).format(d),value:0}});
  const lookup=new Map(months.map(x=>[x.k,x]));
  for(const l of list){const d=dateValue(l.created_at);if(!d)continue;const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;if(lookup.has(k))lookup.get(k).value++}
  const max=Math.max(1,...months.map(m=>m.value));const dots=months.map((m,i)=>`${20+i*65},${120-(m.value/max)*90}`).join(' ');
  return `<section class="cn-chart"><div class="cn-section-bar"><div><span class="cn-kicker">ACTIVITY</span><h2>Enquiry trend</h2></div><small>Last 6 months</small></div><svg viewBox="0 0 370 145" role="img" aria-label="Monthly enquiry counts"><path d="M20 120H345M20 75H345M20 30H345" stroke="#414a4b" stroke-dasharray="3 6" fill="none"/><polyline points="${dots}" fill="none" stroke="#c8ff2e" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>${months.map((m,i)=>`<circle cx="${20+i*65}" cy="${120-(m.value/max)*90}" r="4.5" fill="#c8ff2e"><title>${safe(m.name)}: ${m.value}</title></circle>`).join('')}</svg><div class="cn-chart-axis">${months.map(m=>`<span>${safe(m.name)}</span>`).join('')}</div><p class="cn-caption">Counts are based on recorded enquiries, not estimated revenue.</p></section>`;
 };
 function home(){
  const {enquiries,bookings,actions}=records();
  const pending=actions.filter(a=>!/done|completed|cancelled/i.test(String(a.status||''))).length;
  const newOnes=enquiries.filter(e=>String(e.status||'New').toLowerCase()==='new').length;
  const business=typeof settings!=='undefined'?String(settings?.business_name||'').trim():'';
  const recent=enquiries.slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,3);
  return `<section class="cn-hero"><div class="cn-eyebrow"><span class="cn-pulse"></span> YOUR COMMAND CENTRE <span class="cn-hero-date">${safe(totalToday())}</span></div><div class="cn-hero-grid"><div><p class="cn-hello">${greeting()}.</p><h1>Everything.<br><em>Under control.</em></h1><p>${safe(business||'Your business')} — your customers, enquiries and next steps in one place.</p><button type="button" class="cn-primary" data-cn-screen="enquiries">View enquiries <span>↗</span></button></div><img src="/assets/icons/colzo-mark.svg" alt="" class="cn-hero-mark"></div><div class="cn-hero-footer"><span class="cn-online">●</span> Your existing tools remain available <span>›</span></div></section>
  <div class="cn-section-bar"><div><span class="cn-kicker">OVERVIEW</span><h2>At a glance</h2></div><span class="cn-muted">Live records</span></div>
  <div class="cn-stats">${stat(enquiries.length,'Total enquiries','Recorded enquiries','↗')}${stat(newOnes,'New enquiries','Awaiting response','◎')}${stat(bookings.length,'Bookings','Existing appointments','▣')}${stat(pending,'Open actions','Outstanding follow-ups','✓')}</div>
  ${trend(enquiries)}
  <div class="cn-section-bar"><div><span class="cn-kicker">YOUR DAY</span><h2>Recent enquiries</h2></div><button class="cn-text-action" type="button" data-cn-screen="enquiries">View all ↗</button></div>
  <div class="cn-stack">${recent.length?recent.map(leadRow).join(''):empty('New enquiries will appear here as they arrive.')}</div>
  <div class="cn-duo"><button type="button" data-cn-legacy="bookings"><b>▣</b><strong>Bookings</strong><small>Manage appointments →</small></button><button type="button" data-cn-legacy="marketing"><b>✧</b><strong>AI marketing</strong><small>Drafts and publishing →</small></button></div>`;
 }
 function leadRow(l){return `<button class="cn-record" type="button" data-cn-lead="${safe(l.id)}"><span class="cn-avatar">${initial(contact(l))}</span><span class="cn-record-main"><strong>${safe(contact(l))}</strong><small>${safe(l.job_type||'General enquiry')}</small>${status(l.status)}</span><span class="cn-record-end"><time>${safe(day(l.created_at))}</time><span>›</span></span></button>`}
 function enquiry(){
  const all=records().enquiries;
  const filtered=all.filter(l=>(state.filter==='All'||String(l.status||'New').toLowerCase()===state.filter.toLowerCase())&&[l.name,l.job_type,l.description,l.location,l.email,l.phone].join(' ').toLowerCase().includes(state.search.toLowerCase()));
  const tabs=['All','New','Contacted','Converted'];
  return `${title('Enquiries','CUSTOMER INBOX','Every customer conversation, clearly organised.')}
  <div class="cn-search"><span aria-hidden="true">⌕</span><input id="cnSearch" type="search" placeholder="Search enquiries" value="${safe(state.search)}" aria-label="Search enquiries"></div>
  <div class="cn-tabs" role="group" aria-label="Filter enquiries">${tabs.map(t=>`<button type="button" data-cn-filter="${t}" aria-pressed="${state.filter===t}">${t}</button>`).join('')}</div>
  <div class="cn-list-title"><span>${filtered.length} ${filtered.length===1?'enquiry':'enquiries'}</span><button type="button" class="cn-text-action" data-cn-refresh>Refresh ↻</button></div>
  <div class="cn-stack">${filtered.length?filtered.map(leadRow).join(''):empty('No enquiries match this view.','<button type="button" data-cn-filter="All">Show all</button>')}</div>
  <button type="button" class="cn-floating" data-cn-legacy="leads" aria-label="Open enquiry management">+</button>`;
 }
 function leadDetails(){
  const lead=records().enquiries.find(l=>String(l.id)===String(state.activeLead));
  if(!lead)return `<button class="cn-back" data-cn-screen="enquiries" type="button">← Enquiries</button>${empty('This enquiry is no longer available.')}`;
  return `<button class="cn-back" data-cn-screen="enquiries" type="button">← All enquiries</button><div class="cn-client-profile"><span class="cn-avatar large">${initial(contact(lead))}</span><h1>${safe(contact(lead))}</h1>${status(lead.status)}<p>${safe(lead.job_type||'General enquiry')}</p></div><div class="cn-contact-actions">${lead.phone?`<a href="tel:${safe(String(lead.phone).replace(/[^+\d]/g,''))}">Call</a>`:''}${lead.email?`<a href="mailto:${encodeURIComponent(lead.email)}">Email</a>`:''}<button data-cn-legacy="leads">Edit enquiry</button></div><section class="cn-detail-panel"><h2>Enquiry information</h2><dl><div><dt>Created</dt><dd>${safe(day(lead.created_at))}</dd></div><div><dt>Location</dt><dd>${safe(lead.location||'Not supplied')}</dd></div><div><dt>Service</dt><dd>${safe(lead.job_type||'General enquiry')}</dd></div><div><dt>Priority</dt><dd>${safe(lead.priority||'Normal')}</dd></div></dl></section><section class="cn-detail-panel"><h2>Customer message</h2><p>${safe(lead.description||'No message has been recorded.')}</p></section><button class="cn-full-width" type="button" data-cn-legacy="leads">Open full enquiry editor ↗</button>`;
 }
 function projects(){
  const {bookings,actions}=records();
  const work=[...bookings.map(x=>({...x,type:'booking'})),...actions.map(x=>({...x,type:'action'}))].sort((a,b)=>String(b.created_at||b.due_at||'').localeCompare(String(a.created_at||a.due_at||'')));
  return `${title('Projects','WORKSPACE / PROJECTS','An overview of your booked work and outstanding actions.')}
  <section class="cn-project-banner"><div><span class="cn-kicker">KEEP WORK MOVING</span><h2>Your work,<br>organised.</h2><p>This view uses your existing bookings and actions. Dedicated Colzo project tracking is not enabled yet.</p></div><span aria-hidden="true">▦</span></section>
  <div class="cn-stats two">${stat(bookings.length,'Bookings','Existing records','▣')}${stat(actions.length,'Actions','Existing follow-ups','✓')}</div>
  <div class="cn-section-bar"><div><span class="cn-kicker">ACTIVITY</span><h2>Current work</h2></div><button class="cn-text-action" data-cn-legacy="bookings" type="button">Calendar ↗</button></div>
  <div class="cn-stack">${work.length?work.map(x=>`<button class="cn-record" type="button" data-cn-legacy="${x.type==='booking'?'bookings':'actions'}"><span class="cn-avatar square">${x.type==='booking'?'▣':'✓'}</span><span class="cn-record-main"><strong>${safe(x.title|| (x.type==='booking'?'Booking':'Action'))}</strong><small>${x.type==='booking'?'Booking':'Action'} · ${safe(day(x.due_at||x.booking_start||x.start_at||x.created_at))}</small>${status(x.status||'Pending')}</span><span class="cn-record-end">›</span></button>`).join(''):empty('Your existing bookings and actions will appear here.')}</div><div class="cn-duo"><button data-cn-legacy="bookings" type="button"><b>▣</b><strong>Bookings</strong><small>Open calendar →</small></button><button data-cn-legacy="actions" type="button"><b>✓</b><strong>Actions</strong><small>Open follow-ups →</small></button></div>`;
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
 function more(){return `${title('More','WORKSPACE / MORE','All your business tools in one place.')}<div class="cn-more-profile"><img src="/assets/icons/colzo-mark.svg" alt=""><div><strong>${safe(typeof settings!=='undefined'?settings?.business_name||'Your business':'Your business')}</strong><small>Existing business account</small></div><span>↗</span></div><div class="cn-more-links">${moreItems.map(([id,ic,heading,sub])=>`<button type="button" ${['clients','quotes'].includes(id)?`data-cn-screen="${id}"`:`data-cn-legacy="${id==='enquiriesLegacy'?'enquiries':id}"`}><span class="cn-more-icon">${ic}</span><span><strong>${heading}</strong><small>${sub}</small></span><b>›</b></button>`).join('')}</div><p class="cn-caption">Existing billing, marketing and AI receptionist features continue to run on Business AI's established backend.</p>`}
 function render(){
  if(!document.body.classList.contains('auth-ready'))return;
  state.recordsReady=true;
  const pages={home,enquiries:enquiry,lead:leadDetails,projects,clients,quotes,more};
  const page=pages[state.screen]||home;
  content.innerHTML=page();
  root.querySelectorAll('.cn-nav button').forEach(b=>{const active=b.dataset.cnScreen===state.screen||(state.screen==='lead'&&b.dataset.cnScreen==='enquiries')||(['clients','quotes'].includes(state.screen)&&b.dataset.cnScreen==='more');if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  const input=document.getElementById('cnSearch');if(input&&state.screen==='enquiries'&&state.focusSearch){input.focus();input.setSelectionRange(input.value.length,input.value.length)}
 }
 function navigate(screen){state.screen=screen;state.notification='';state.focusSearch=false;render();root.scrollTo({top:0,behavior:'instant'});window.scrollTo({top:0,behavior:'instant'});}
 function original(view){
  const originalView=view==='settings'?'settings':view;
  document.body.classList.add('colzo-legacy-mode');
  root.setAttribute('aria-hidden','true');
  const back=document.getElementById('cnReturnToColzo');back.hidden=false;
  if(originalView==='leads'&&state.activeLead!=null){if(typeof showView==='function')showView(originalView);if(typeof renderLeads==='function')renderLeads();}
  else if(typeof showView==='function')showView(originalView);
 }
 async function copyDraft(form){const s=content.querySelector('#cnDraftStatus');const fd=new FormData(form);const leadId=String(fd.get('lead')||'');const amount=Number(fd.get('amount'));const title=String(fd.get('title')||'').trim();state.draftLead=leadId;state.draftAmount=String(fd.get('amount')||'');state.draftTitle=title;
  if(!title||!Number.isFinite(amount)||amount<0||amount>10000000){s.textContent='Please check the title and amount.';return}
  const lead=records().enquiries.find(l=>String(l.id)===leadId);
  const draft=`DRAFT ESTIMATE — NOT ISSUED\nCustomer: ${lead?contact(lead):'Not selected'}\nWork: ${title}\nEstimated amount: £${amount.toFixed(2)}\nThis draft has not been saved, approved or sent.`;
  try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(draft);s.textContent='Draft copied. Nothing has been saved or sent.'}catch{s.textContent='Clipboard unavailable on this device. No draft was saved or sent.'}
 }
 root.addEventListener('click',e=>{
  const target=e.target.closest('button');if(!target||!root.contains(target))return;
  if(target.hasAttribute('data-cn-screen')){navigate(target.getAttribute('data-cn-screen'));return}
  if(target.hasAttribute('data-cn-legacy')){original(target.getAttribute('data-cn-legacy'));return}
  if(target.hasAttribute('data-cn-lead')){state.activeLead=target.getAttribute('data-cn-lead');navigate('lead');return}
  if(target.hasAttribute('data-cn-filter')){state.filter=target.getAttribute('data-cn-filter');navigate('enquiries');return}
  if(target.hasAttribute('data-cn-refresh')){if(typeof loadAll==='function')loadAll(true);return}
 });
 root.addEventListener('input',e=>{if(e.target.id!=='cnSearch')return;const pos=e.target.selectionStart;state.search=e.target.value;state.focusSearch=true;render();const i=document.getElementById('cnSearch');if(i)i.setSelectionRange(Math.min(pos,i.value.length),Math.min(pos,i.value.length));});
 root.addEventListener('submit',e=>{if(e.target.id!=='cnDraftForm')return;e.preventDefault();copyDraft(e.target)});
 document.getElementById('cnReturnToColzo')?.addEventListener('click',()=>{document.body.classList.remove('colzo-legacy-mode');root.removeAttribute('aria-hidden');document.getElementById('cnReturnToColzo').hidden=true;render();});
 const onAuthState=auth=>{if(auth==='auth-ready'){document.body.classList.add('colzo-owner-enabled');root.hidden=false;root.removeAttribute('aria-hidden');render()}else{document.body.classList.remove('colzo-owner-enabled','colzo-legacy-mode');root.hidden=true;content.replaceChildren();state.screen='home';state.search='';state.filter='All';state.activeLead=null;state.recordsReady=false;document.getElementById('cnReturnToColzo').hidden=true}};
 window.ColzoOwner={render,onAuthState,error:()=>{if(document.body.classList.contains('auth-ready'))content.innerHTML=empty('Unable to load your business records. Please try again.','<button data-cn-refresh type="button">Retry loading</button>')},getActiveScreen:()=>state.screen};
 onAuthState(document.body.classList.contains('auth-ready')?'auth-ready':'auth-pending');
})();
