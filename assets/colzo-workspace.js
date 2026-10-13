/* Colzo mobile workspace: uses the existing authenticated business APIs.
   All user content is escaped, all mutation errors are visible, and no demo data is inserted. */
(() => {
  const $=id=>document.getElementById(id);
  const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const byId=id=>(typeof leads!=='undefined'&&Array.isArray(leads)?leads:[]).find(row=>String(row.id)===String(id));
  const allLeads=()=>typeof leads!=='undefined'&&Array.isArray(leads)?leads:[];
  const fmtDate=value=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)):'Date not provided';
  const fmtTime=value=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(new Date(value)):'Recently';
  const initials=name=>String(name||'NE').split(/\s+/).slice(0,2).map(v=>v[0]||'').join('').toUpperCase();
  const stage=value=>value==='Converted'?'Won':value==='Contacted'?'In Progress':'New';
  const gbp=value=>'£'+Number(value||0).toLocaleString('en-GB',{maximumFractionDigits:2,minimumFractionDigits:0});
  const safeTel=value=>{const t=String(value||'').replace(/[^\d+]/g,'');return /^\+?\d{6,15}$/.test(t)?t:null;};
  const safeEmail=value=>{const t=String(value||'').trim();return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(t)&&t.length<=320?t:null;};
  const state={enquiryFilter:'All',projectFilter:'All',projects:[],projectsLoaded:false,clients:[],clientsLoaded:false,selectedLead:null,quoteRows:[],lastModalFocus:null,modalKind:null,modalId:null,modalVersion:null,leadId:null};
  const request=(url,init)=>api(url,init);
  function report(target,message){if($(target))$(target).textContent=message||'';}
  function updateFilters(){
    for(const kind of ['enquiry','project']){
      const active=kind==='enquiry'?state.enquiryFilter:state.projectFilter;
      document.querySelectorAll(`[data-colzo-${kind}-filter]`).forEach(button=>{const isActive=button.dataset[`colzo${kind[0].toUpperCase()+kind.slice(1)}Filter`]===active;button.setAttribute('aria-pressed',String(isActive));button.classList.toggle('is-active',isActive);});
    }
  }
  function filteredLeads(){
    const text=String($('search')?.value||'').trim().toLowerCase();
    return allLeads().filter(row=>(state.enquiryFilter==='All'||stage(row.status)===state.enquiryFilter)&&(!text||[row.name,row.job_type,row.description,row.email,row.location].join(' ').toLowerCase().includes(text))).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  }
  function renderEnquiries(){
    const parent=$('colzoEnquiriesList');if(!parent)return;
    updateFilters();const list=filteredLeads();
    parent.replaceChildren();
    const count=document.createElement('p');count.className='colzo-record-count';count.textContent=`${list.length} enquir${list.length===1?'y':'ies'}`;parent.append(count);
    if(!list.length){const empty=document.createElement('p');empty.className='colzo-empty';empty.textContent='No enquiries in this view yet.';parent.append(empty);return;}
    for(const row of list){
      const card=document.createElement('button');card.type='button';card.className='colzo-enquiry-row';card.dataset.leadId=String(row.id);
      const s=stage(row.status),cls=s==='Won'?'won':s==='In Progress'?'progress':'new';
      card.innerHTML=`<span class="colzo-initials">${escape(initials(row.name))}</span><span class="colzo-enquiry-main"><strong>${escape(row.name||'New enquiry')}</strong><small>${escape(row.job_type||row.description||'General enquiry')}</small><span class="colzo-status ${cls}">${escape(s)}</span></span><span class="colzo-enquiry-right"><time>${escape(fmtTime(row.created_at))}</time><span aria-hidden="true">›</span></span>`;
      card.addEventListener('click',()=>openLead(row.id));parent.append(card);
    }
  }
  async function openLead(id){
    const lead=byId(id);if(!lead)return;
    state.selectedLead=String(lead.id);state.quoteRows=[];
    renderLeadDetail();showView('colzoLeadDetail');
    report('colzoLeadDetailStatus','Loading quotes…');
    try{const rows=await request(`/api/colzo/quotes?lead_id=${encodeURIComponent(String(lead.id))}`);if(state.selectedLead!==String(lead.id))return;state.quoteRows=rows.items||[];report('colzoLeadDetailStatus','');renderLeadDetail();}
    catch{report('colzoLeadDetailStatus','Quotes are unavailable in this environment. Enquiry actions still work.');}
  }
  function contactButton(label,icon,href){return href?`<a class="colzo-contact" href="${escape(href)}"><span>${icon}</span>${label}</a>`:`<span class="colzo-contact unavailable" aria-disabled="true" title="No contact details provided"><span>${icon}</span>${label}</span>`;}
  function renderLeadDetail(){
    const lead=byId(state.selectedLead),target=$('colzoLeadDetailContent');if(!lead||!target)return;
    const s=stage(lead.status),cls=s==='Won'?'won':s==='In Progress'?'progress':'new';
    const tel=safeTel(lead.phone),email=safeEmail(lead.email);
    target.innerHTML=`<div class="colzo-detail-person"><span class="colzo-initials large">${escape(initials(lead.name))}</span><div><h2>${escape(lead.name||'New enquiry')}</h2><p>${escape(lead.job_type||'General enquiry')}</p><span class="colzo-status ${cls}">${escape(s)}</span></div></div>
    <div class="colzo-detail-actions">${contactButton('Call','☎',tel?'tel:'+tel:null)}${contactButton('Email','✉',email?'mailto:'+encodeURIComponent(email):null)}<button type="button" id="colzoDetailSchedule" class="colzo-contact"><span>▣</span>Schedule</button><button type="button" id="colzoDetailProject" class="colzo-contact"><span>•••</span>Project</button></div>
    <div class="colzo-detail-card"><h3>Details</h3><dl><div><dt>Enquiry source</dt><dd>${escape(lead.source||'Customer enquiry')}</dd></div><div><dt>Submitted</dt><dd>${escape(fmtTime(lead.created_at))}</dd></div><div><dt>Estimated value</dt><dd>${escape(lead.estimated_value?gbp(lead.estimated_value):'Not provided')}</dd></div><div><dt>Location</dt><dd>${escape(lead.location||'Not provided')}</dd></div></dl></div>
    <div class="colzo-detail-card"><h3>Description</h3><p>${escape(lead.description||'No description provided.')}</p></div>
    <div class="colzo-detail-card"><h3>Quotes</h3><div class="colzo-quote-list">${state.quoteRows.length?state.quoteRows.map(q=>`<div><strong>${escape(q.title)}</strong><span>${escape(gbp(q.amount_gbp))} · ${escape(q.status)}</span>${q.status==='draft'?`<button type="button" data-colzo-quote-id="${escape(q.id)}" data-colzo-quote-next="sent">Mark sent</button>`:q.status==='sent'?`<button type="button" data-colzo-quote-id="${escape(q.id)}" data-colzo-quote-next="accepted">Accepted</button><button type="button" data-colzo-quote-id="${escape(q.id)}" data-colzo-quote-next="declined">Declined</button>`:''}</div>`).join(''):'<p>No quotes created yet.</p>'}</div></div>
    <div class="colzo-detail-footer"><button type="button" id="colzoDetailQuote">Create quote</button><button type="button" id="colzoDetailProgress" class="colzo-submit">${s==='New'?'Mark as in progress':s==='In Progress'?'Mark as won':'Won · View enquiry'}</button></div>`;
    target.querySelectorAll('[data-colzo-quote-id]').forEach(button=>button.addEventListener('click',async()=>{
      if(button.dataset.colzoQuoteNext==='sent'&&!window.confirm('Confirm that you sent this quote to the customer outside Colzo? Colzo does not send it automatically.'))return;
      button.disabled=true;
      try{await request('/api/colzo/quotes',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:button.dataset.colzoQuoteId,expected_updated_at:state.quoteRows.find(row=>String(row.id)===button.dataset.colzoQuoteId)?.updated_at,status:button.dataset.colzoQuoteNext})});await openLead(lead.id);report('colzoLeadDetailStatus','Quote record updated.');}
      catch(e){report('colzoLeadDetailStatus',e.message||'Could not update quote');button.disabled=false;}
    }));
    $('colzoDetailSchedule')?.addEventListener('click',()=>{showView('bookings');requestAnimationFrame(()=>{const linked=$('bookingLead');if(linked)linked.value=String(lead.id);if(typeof toggleWorkForm==='function')toggleWorkForm('bookings');});});
    $('colzoDetailProject')?.addEventListener('click',()=>openModal('project',null,lead.id));
    $('colzoDetailQuote')?.addEventListener('click',()=>openModal('quote',null,lead.id));
    $('colzoDetailProgress')?.addEventListener('click',async()=>{
      const newStatus=s==='New'?'Contacted':s==='In Progress'?'Converted':null;
      if(!newStatus){showView('leads');return;}
      try{await updateLead(lead.id,{status:newStatus});state.selectedLead=String(lead.id);renderLeadDetail();showView('colzoLeadDetail');renderEnquiries();report('colzoLeadDetailStatus','Enquiry updated.');}
      catch(e){report('colzoLeadDetailStatus',e.message||'Could not update enquiry');}
    });
  }
  async function refreshProjects(){
    if(!document.body.classList.contains('auth-ready'))return;
    report('colzoProjectsStatus','Loading projects…');
    try{const data=await request('/api/colzo/projects');state.projects=Array.isArray(data.items)?data.items:[];state.projectsLoaded=true;report('colzoProjectsStatus','');renderProjects();renderDashboardExtras();}
    catch{state.projectsLoaded=false;state.projects=[];report('colzoProjectsStatus','Projects are not available in this environment yet.');renderProjects();renderDashboardExtras();}
  }
  function renderProjects(){
    const parent=$('colzoProjectsList');if(!parent)return;updateFilters();
    const list=state.projects.filter(row=>state.projectFilter==='All'||(state.projectFilter==='Active'?['planned','active','paused'].includes(row.status):row.status==='completed'));
    parent.replaceChildren();if(!list.length){const empty=document.createElement('p');empty.className='colzo-empty';empty.textContent=state.projectsLoaded?'No projects in this view. Create your first project to get started.':'Projects will appear when available.';parent.append(empty);return;}
    for(const row of list){
      const card=document.createElement('button');card.type='button';card.className='colzo-project-row';card.innerHTML=`<span class="colzo-initials">${escape(initials(row.client_name||row.title))}</span><span class="colzo-project-main"><strong>${escape(row.title)}</strong><small>${escape(row.client_name||'No client specified')} · ${escape(row.status)}</small><span class="colzo-progress-track"><span style="width:${Math.max(0,Math.min(100,Number(row.progress)||0))}%"></span></span></span><span class="colzo-project-right"><b>${Number(row.progress)||0}%</b><span aria-hidden="true">›</span></span>`;
      card.addEventListener('click',()=>openModal('project',row.id,row.lead_id));parent.append(card);
    }
  }
  async function refreshClients(){
    if(!document.body.classList.contains('auth-ready'))return;
    report('colzoClientsStatus','Loading clients…');
    try{const data=await request('/api/colzo/clients');state.clients=Array.isArray(data.clients)?data.clients:[];state.clientsLoaded=true;report('colzoClientsStatus',`${state.clients.length} saved client${state.clients.length===1?'':'s'}`);renderClients();}
    catch{state.clientsLoaded=false;state.clients=[];report('colzoClientsStatus','Client directory unavailable in this environment.');renderClients();}
  }
  function renderClients(){const target=$('colzoClientsList');if(!target)return;target.replaceChildren();
    if(!state.clients.length){const empty=document.createElement('p');empty.className='colzo-empty';empty.textContent=state.clientsLoaded?'No client contacts yet. Add one above.':'No client contacts available.';target.append(empty);return;}
    for(const client of state.clients){const btn=document.createElement('button');btn.type='button';btn.className='colzo-client-row';btn.innerHTML=`<span class="colzo-initials">${escape(initials(client.full_name))}</span><span><strong>${escape(client.full_name)}</strong><small>${escape(client.email||client.phone||'No contact details')}</small></span><span aria-hidden="true">›</span>`;btn.addEventListener('click',()=>openModal('client',client.id));target.append(btn);}
  }
  function renderNotifications(){
    const target=$('colzoNotificationsList');if(!target)return;target.replaceChildren();
    const leadsToHandle=allLeads().filter(x=>x.status==='New');
    const pending=typeof businessActions!=='undefined'&&Array.isArray(businessActions)?businessActions.filter(a=>a.status==='pending'):[];
    const items=[...leadsToHandle.map(lead=>({title:lead.name||'New enquiry',detail:lead.job_type||'New customer enquiry',kind:'enquiry',id:lead.id,date:lead.created_at})),...pending.map(action=>({title:action.title||'Action required',detail:action.description||'Pending task',kind:'action',id:action.id,date:action.due_at}))].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,50);
    if(!items.length){const empty=document.createElement('p');empty.className='colzo-empty';empty.textContent='Nothing needs attention right now.';target.append(empty);return;}
    for(const item of items){const btn=document.createElement('button');btn.type='button';btn.className='colzo-notification-row';const mark=document.createElement('span');mark.className='colzo-notification-symbol';mark.textContent=item.kind==='enquiry'?'▤':'✓';const copy=document.createElement('span');copy.className='colzo-notification-copy';const title=document.createElement('strong');title.textContent=item.title;const detail=document.createElement('small');detail.textContent=`${item.detail} · ${fmtDate(item.date)}`;copy.append(title,detail);btn.append(mark,copy);const arrow=document.createElement('span');arrow.textContent='›';btn.append(arrow);btn.addEventListener('click',()=>item.kind==='enquiry'?openLead(item.id):showView('actions'));target.append(btn);}
  }
  const appearanceKey='colzo-display-preferences-v1';
  function loadAppearance(){
    let prefs={};try{prefs=JSON.parse(localStorage.getItem(appearanceKey)||'{}')||{};}catch{}
    if($('colzoHighContrast'))$('colzoHighContrast').checked=prefs.highContrast===true;
    if($('colzoReduceMotion'))$('colzoReduceMotion').checked=prefs.reduceMotion===true;
    document.body.classList.toggle('colzo-high-contrast',prefs.highContrast===true);
    document.body.classList.toggle('colzo-reduced-motion',prefs.reduceMotion===true);
  }
  function saveAppearance(){
    const prefs={highContrast:Boolean($('colzoHighContrast')?.checked),reduceMotion:Boolean($('colzoReduceMotion')?.checked)};
    try{localStorage.setItem(appearanceKey,JSON.stringify(prefs));}catch{}
    loadAppearance();
  }
  function renderDashboardExtras(){
    const stats=$('stats');if(!stats)return;
    // These figures are verified tenant records, not illustrative mockup numbers.
    const total=allLeads().length,active=state.projects.filter(x=>x.status==='active').length;
    const estimate=allLeads().filter(x=>x.status==='Converted').reduce((sum,x)=>sum+Number(x.estimated_value||0),0);
    const launches=document.querySelectorAll('#dashboardView .dashboard-launch');
    if(launches.length>=4){
      const setup=(node,label,icon,action)=>{const title=node.querySelector('strong');if(title)title.textContent=label;const glyph=node.querySelector('i');if(glyph)glyph.textContent=icon;node.onclick=action;};
      setup(launches[0],'New enquiry','+',()=>openModal('enquiry'));
      setup(launches[1],'Create quote','▤',()=>{if(!allLeads().length){toast('Add an enquiry before creating a quote');return;}openModal('quote');});
      setup(launches[2],'Add client','♧',()=>openModal('client'));
      setup(launches[3],'View reports','▥',()=>{const el=$('valueDashboardCard');el?.scrollIntoView({behavior:'smooth',block:'start'});});
    }
    if(!state.projectsLoaded){
      // A failed project refresh must never leave figures from a previous
      // authenticated business on screen; project counts are UNKNOWN, not zero.
      stats.innerHTML=`<div class="stat"><div class="stat-top"><span class="metric-icon">£</span><span class="stat-label">Won estimates</span></div><div class="stat-value">—</div><div class="stat-sub">Unavailable while records refresh</div></div><div class="stat"><div class="stat-top"><span class="metric-icon">▤</span><span class="stat-label">Enquiries</span></div><div class="stat-value">${total}</div><div class="stat-sub">All recorded enquiries</div></div><div class="stat"><div class="stat-top"><span class="metric-icon">▣</span><span class="stat-label">Active projects</span></div><div class="stat-value">—</div><div class="stat-sub">Projects are currently unavailable</div></div>`;
      return;
    }
    stats.innerHTML=`<div class="stat><div class="stat-top"><span class="metric-icon">£</span><span class="stat-label">Won estimates</span></div><div class="stat-value">${gbp(estimate)}</div><div class="stat-sub">Estimated, not received revenue</div></div><div class="stat"><div class="stat-top"><span class="metric-icon">▤</span><span class="stat-label">Enquiries</span></div><div class="stat-value">${total}</div><div class="stat-sub">All recorded enquiries</div></div><div class="stat"><div class="stat-top"><span class="metric-icon">▣</span><span class="stat-label">Active projects</span></div><div class="stat-value">${active}</div><div class="stat-sub">Work in progress</div></div>`;
    const trend=$('colzoLiveTrend');if(!trend)return;
    const months=Array.from({length:6},(_,i)=>{const date=new Date();date.setDate(1);date.setMonth(date.getMonth()-(5-i));const start=new Date(date.getFullYear(),date.getMonth(),1),end=new Date(date.getFullYear(),date.getMonth()+1,1);return {name:new Intl.DateTimeFormat('en-GB',{month:'short'}).format(start),value:allLeads().filter(row=>Date.parse(row.created_at)>=start.getTime()&&Date.parse(row.created_at)<end.getTime()).length};});
    const max=Math.max(1,...months.map(x=>x.value)),points=months.map((x,i)=>`${18+i*55},${106-(x.value/max)*80}`).join(' ');
    trend.innerHTML=`<div class="colzo-trend-top"><h3>Enquiry trend</h3><span>Last 6 months</span></div><svg viewBox="0 0 320 125" role="img" aria-label="Enquiries recorded in the last six months"><polyline points="${points}" stroke="#c8ff2e" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="colzo-trend-axis">${months.map(x=>`<span>${escape(x.name)}</span>`).join('')}</div><p>Recorded enquiries, not revenue.</p>`;
  }
  function field(label,name,value='',type='text',extra='') {return `<label>${label}<input name="${name}" type="${type}" ${extra} value="${escape(value)}"></label>`;}
  function openModal(kind,id=null,leadId=null){
    const modal=$('colzoWorkspaceDialog'),sheet=$('colzoWorkspaceFields');if(!modal||!sheet)return;
    const project=kind==='project',client=kind==='client',enquiry=kind==='enquiry',existing=project?state.projects.find(p=>p.id===id):client?state.clients.find(c=>c.id===id):null;
    state.modalKind=kind;state.modalId=id;state.modalVersion=existing?.updated_at||null;state.leadId=leadId;state.lastModalFocus=document.activeElement;
    $('colzoWorkspaceDialogTitle').textContent=enquiry?'New enquiry':project?(existing?'Edit project':'New project'):client?(existing?'Edit client':'Add client'):'Create quote';
    const leadsOptions=['<option value="">No linked enquiry</option>',...allLeads().map(l=>`<option value="${escape(l.id)}" ${String(l.id)===String(existing?.lead_id||leadId)?'selected':''}>${escape(l.name||'Enquiry')} · ${escape(l.job_type||'General')}</option>`)].join('');
    const linked=`<label>Related enquiry<select name="lead_id" ${project?'':'required'}>${project?leadsOptions:leadsOptions.replace('<option value="">No linked enquiry</option>','<option value="" selected disabled>Choose an enquiry</option>')}</select></label>`;
    sheet.innerHTML=enquiry?`${field('Customer name','name','','text','maxlength="200"')}${field('Phone number','phone','','tel','maxlength="80"')}${field('Email address','email','','email','maxlength="320"')}${field('Service / job type','job_type','','text','maxlength="200"')}${field('Location','location','','text','maxlength="300"')}${field('Estimated value (£)','estimated_value','0','number','min="0" step="0.01"')}<label>Details<textarea name="description" maxlength="5000"></textarea></label><p class="colzo-form-hint">Add a name, phone or email address. This creates a real enquiry in your business workspace.</p>`:client?`${field('Full name','full_name',existing?.full_name||'','text','minlength="2" maxlength="160" required')}${field('Email address','email',existing?.email||'','email','maxlength="320"')}${field('Phone','phone',existing?.phone||'','tel','maxlength="80"')}<label>Notes<textarea name="notes" maxlength="4000">${escape(existing?.notes||'')}</textarea></label>`:project?`${field('Project title','title',existing?.title||'', 'text','minlength="3" maxlength="160" required')}${field('Client name','client_name',existing?.client_name||'','text','maxlength="160"')}${linked}<label>Status<select name="status">${['planned','active','paused','completed'].map(x=>`<option ${existing?.status===x?'selected':''}>${x}</option>`).join('')}</select></label>${field('Progress %','progress',existing?.progress??0,'number','min="0" max="100" step="1"')}<label>Notes<textarea name="notes" maxlength="4000">${escape(existing?.notes||'')}</textarea></label>`:`${field('Quote title','title',byId(leadId)?.job_type||'New quote','text','minlength="3" maxlength="160" required')}${linked}${field('Amount GBP','amount_gbp','','number','min="0" step="0.01" required')}<label>Scope and notes<textarea name="notes" maxlength="4000"></textarea></label><p class="colzo-form-hint">This creates a private draft. Colzo will not automatically send an email or request payment.</p>`;
    report('colzoWorkspaceFormMessage','');modal.hidden=false;document.body.style.overflow='hidden';sheet.querySelector('input')?.focus();
  }
  function closeModal(){const modal=$('colzoWorkspaceDialog');if(modal)modal.hidden=true;document.body.style.overflow='';state.lastModalFocus?.focus?.();}
  async function submitModal(event){
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type=submit]'),raw=Object.fromEntries(new FormData(form).entries());
    const project=state.modalKind==='project',client=state.modalKind==='client',enquiry=state.modalKind==='enquiry';
    const body=enquiry?{name:raw.name.trim(),phone:raw.phone.trim(),email:raw.email.trim(),job_type:raw.job_type.trim(),location:raw.location.trim(),estimated_value:Number(raw.estimated_value),description:raw.description.trim()}:client?{full_name:raw.full_name.trim(),email:raw.email.trim(),phone:raw.phone.trim(),notes:raw.notes}:project?{title:raw.title.trim(),client_name:raw.client_name.trim(),lead_id:raw.lead_id?Number(raw.lead_id):null,status:raw.status,progress:Number(raw.progress),notes:raw.notes}:{title:raw.title.trim(),lead_id:Number(raw.lead_id),amount_gbp:Number(raw.amount_gbp),notes:raw.notes};
    if(enquiry&&!body.name&&!body.phone&&!body.email){report('colzoWorkspaceFormMessage','Enter a name, phone number or email address.');return;}
    if(enquiry&&(!Number.isFinite(body.estimated_value)||body.estimated_value<0)){report('colzoWorkspaceFormMessage','Enter a valid estimated value.');return;}
    button.disabled=true;report('colzoWorkspaceFormMessage','Saving…');
    try{
      const url=enquiry?'/api/leads':client?'/api/colzo/clients':project?'/api/colzo/projects':'/api/colzo/quotes';
      const saved=await request(url,{method:state.modalId?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state.modalId?{id:state.modalId,expected_updated_at:state.modalVersion,...body}:body)});
      const leadId=state.leadId||(!enquiry&&!client&&!project?saved?.item?.lead_id:null);closeModal();
      if(enquiry){await loadAll(false);showView('leads');toast('Enquiry created');}else if(client){await refreshClients();toast('Client saved');}else if(project){await refreshProjects();toast('Project saved');}else if(leadId){await openLead(leadId);toast('Quote draft saved');}else{showView('leads');toast('Quote draft saved');}
    }catch(e){report('colzoWorkspaceFormMessage',e.message||'Could not save this record.');}
    finally{button.disabled=false;}
  }
  document.querySelectorAll('[data-colzo-enquiry-filter]').forEach(b=>b.addEventListener('click',()=>{state.enquiryFilter=b.dataset.colzoEnquiryFilter;renderEnquiries();}));
  document.querySelectorAll('[data-colzo-project-filter]').forEach(b=>b.addEventListener('click',()=>{state.projectFilter=b.dataset.colzoProjectFilter;renderProjects();}));
  // Welcome is a public UX step, NOT a separate account or authentication database.
  const welcome=$('colzoWelcome');
  const preview=window.location.hostname.endsWith('.vercel.app');
  const previewNote='Development preview: existing Business AI accounts and data remain on the original application. If sign-in fails here, check the preview authentication configuration rather than resetting your account.';
  if(preview){
    const notice=$('colzoPreviewAuthNotice');
    if(notice){notice.hidden=false;notice.textContent='Checking that this preview uses your existing Business AI account system…';}
    window.colzoPreviewAuthStatus='checking';
    fetch('/api/colzo-preview-auth',{cache:'no-store',headers:{Accept:'application/json'}})
      .then(async response=>response.ok?response.json():{status:'unknown'})
      .then(info=>{
        const status=['same_project','different_project','unknown','unconfigured'].includes(info?.status)?info.status:'unknown';
        window.colzoPreviewAuthStatus=status;
        const link=$('colzoOriginalReadOnlyLink');if(link)link.hidden=status!=='different_project';
        if(!notice)return;
        notice.classList.toggle('colzo-preview-warning',status!=='same_project');
        notice.textContent=status==='different_project'
          ?'This preview is connected to a DIFFERENT Supabase authentication project from your original Business AI app. Your existing login may not work here. Your account and data have not been changed.'
          :status==='same_project'
          ?'This preview uses the SAME Supabase project as the original app. That does not yet verify its API key, membership permissions or complete application setup.'
          :status==='unconfigured'
          ?'Authentication is not fully configured on this preview. Your original account has not been changed.'
          :previewNote;
      }).catch(()=>{
        window.colzoPreviewAuthStatus='unknown';
        if(notice)notice.textContent=previewNote;
      });
  }
  let dismissed=false;
  try{dismissed=sessionStorage.getItem('colzo-welcome-dismissed-v1')==='1';}catch{}
  const isNormalEntry=window.location.pathname==='/'&&!new URLSearchParams(window.location.search).has('auth')&&!new URLSearchParams(window.location.search).has('ref');
  if(welcome&&isNormalEntry&&!dismissed){welcome.hidden=false;document.body.classList.add('colzo-welcome-active');}
  const dismissWelcome=(screen='login')=>{
    if(welcome)welcome.hidden=true;
    document.body.classList.remove('colzo-welcome-active');
    try{sessionStorage.setItem('colzo-welcome-dismissed-v1','1');}catch{}
    if(screen==='signup')$('showSignUp')?.click();
    else if(typeof setAuthenticationMode==='function')setAuthenticationMode('login');
  };
  $('colzoWelcomeStart')?.addEventListener('click',()=>dismissWelcome('signup'));
  $('colzoWelcomeSignIn')?.addEventListener('click',()=>dismissWelcome('login'));
  document.querySelectorAll('[data-colzo-welcome-provider]').forEach(button=>button.addEventListener('click',()=>{
    const provider=button.dataset.colzoWelcomeProvider;
    dismissWelcome('login');
    const target=document.querySelector(`[data-colzo-oauth="${provider}"]`);
    if(target)target.click();
  }));
  document.querySelectorAll('[data-colzo-oauth]').forEach(button=>button.addEventListener('click',async()=>{
    const provider=button.dataset.colzoOauth;
    const status=$('colzoSocialStatus');
    if(!['apple','google','azure'].includes(provider)||!window.colzoOauthProviders?.[provider]){
      if(status)status.textContent=`${provider==='azure'?'Microsoft':provider[0].toUpperCase()+provider.slice(1)} sign-in is not connected yet. Use your email and password for now.`;
      return;
    }
    if(!supabaseClient?.auth?.signInWithOAuth){if(status)status.textContent='Sign-in is currently unavailable.';return;}
    button.disabled=true;if(status)status.textContent='Opening secure sign-in…';
    try{const redirectTo=new URL('/',window.location.origin).href;
      const options={redirectTo};if(provider==='azure')options.scopes='email';
      const result=await supabaseClient.auth.signInWithOAuth({provider,options});if(result.error)throw result.error;
    }catch{if(status)status.textContent='Unable to start this sign-in. Use email and password.';button.disabled=false;}
  }));
  $('search')?.addEventListener('input',renderEnquiries);
  $('colzoDetailBack')?.addEventListener('click',()=>showView('leads'));
  $('colzoNewEnquiry')?.addEventListener('click',()=>openModal('enquiry'));
  $('colzoNewProject')?.addEventListener('click',()=>openModal('project'));
  $('colzoAddClient')?.addEventListener('click',()=>openModal('client'));
  $('colzoHighContrast')?.addEventListener('change',saveAppearance);
  $('colzoReduceMotion')?.addEventListener('change',saveAppearance);
  loadAppearance();
  $('colzoProjectsToLeads')?.addEventListener('click',()=>showView('leads'));
  $('colzoDialogClose')?.addEventListener('click',closeModal);
  $('colzoWorkspaceDialog')?.addEventListener('click',e=>{if(e.target.id==='colzoWorkspaceDialog')closeModal();});
  $('colzoWorkspaceForm')?.addEventListener('submit',submitModal);
  document.addEventListener('keydown',e=>{
    const modal=$('colzoWorkspaceDialog');if(!modal||modal.hidden)return;
    if(e.key==='Escape'){e.preventDefault();closeModal();return;}
    if(e.key!=='Tab')return;
    const focusable=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(el=>el.getClientRects().length>0);
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  window.ColzoWorkspace={syncLeads(){renderEnquiries();renderDashboardExtras();},refreshProjects,refreshClients,renderProjects,renderEnquiries,renderNotifications,openLead};
})();
