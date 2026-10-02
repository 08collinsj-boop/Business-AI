(() => {
  let epoch = 0, busy = false, output = null, currentGenerationId = null, currentGeneration = null, addons = null, history = [], historyExpanded = false, metaState = null, publications = [], pendingPublicationRequests = new Map(), schedules = [], scheduleDraftId = null, editingScheduleId = null, imageState = null, pendingMarketingPhoto = null, pendingMarketingPhotoUrl = '', photoSelectionTarget = 'composer', automationState = null, automationMedia = [], automationMediaUploadRole = 'post', usageState = null, imageGenerationMode = 'simulate';
  const node = id => document.getElementById(id);
  const message = text => { const target=node('marketingMessage'); if(target) target.textContent = text || ''; };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const money = price => ['configured','approved'].includes(price?.state) && Number.isFinite(Number(price.amount)) ? `£${(Number(price.amount)/100).toFixed(2)}/${price.interval || 'month'}` : 'Pricing not configured';
  const when = value => { const d=new Date(value); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}); };
  const planLabel = value => ({trial:'Trial',starter:'Starter',pro:'Pro',business:'Business',pilot:'Pilot'})[value] || 'Plan';

  function renderUsage(){
    const usage=usageState;
    const rows=[
      {key:'drafts',value:'marketingDraftUsageValue',bar:'marketingDraftUsageBar'},
      {key:'images',value:'marketingImageUsageValue',bar:'marketingImageUsageBar'},
      {key:'facebook_posts',value:'marketingPostUsageValue',bar:'marketingPostUsageBar'}
    ];
    if(node('marketingPlanLabel'))node('marketingPlanLabel').textContent='Plan · '+(usage?planLabel(usage.plan):'—');
    for(const row of rows){
      const item=usage?.[row.key]||null;
      if(node(row.value))node(row.value).textContent=item?(String(item.remaining)+' / '+String(item.limit)):'—';
      if(node(row.bar)){
        const ratio=item?.limit?Math.max(0,Math.min(1,Number(item.used||0)/Number(item.limit))):0;
        node(row.bar).style.width=String(Math.round(ratio*100))+'%';
      }
    }
  }

  function selectedCheckoutAddons(){ return [...document.querySelectorAll('[data-addon-checkout]:checked')].map(input=>input.value); }
  window.selectedCheckoutAddons = selectedCheckoutAddons;

  function renderPricing() {
    const target = node('addonPlanOptions'); if(!target) return;
    target.replaceChildren();
    if (!addons) { target.textContent = 'Optional features: view Additional Features for availability.'; return; }
    for (const addon of addons) {
      const active = addon.entitlement === 'active' && !addon.trial_included;
      const coming = addon.status === 'coming_soon';
      const row = document.createElement('div'); row.className = `addon-choice${active?' is-active':''}${coming?' is-coming':''}`;
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox'; checkbox.value = addon.key; checkbox.dataset.addonCheckout='1';
      checkbox.id = `billing-addon-${addon.key}`;
      checkbox.checked = active;
      checkbox.disabled = coming || active || addon.pricing?.state !== 'configured';

      const copy = document.createElement('label'); copy.className='addon-choice-copy'; copy.htmlFor=checkbox.id;
      const title = document.createElement('strong'); title.textContent=addon.name;
      const detail = document.createElement('small');
      detail.textContent = coming ? 'Not available yet' : active ? 'Included on your current subscription' : `Add to your next plan checkout · ${money(addon.pricing)}`;
      copy.append(title,detail);

      const side = document.createElement('div');
      if(active && addon.key==='ai_marketing'){
        const openButton=document.createElement('button'); openButton.type='button'; openButton.className='addon-inline-action'; openButton.textContent='Open';
        openButton.addEventListener('click',()=>showView('marketing')); side.append(openButton);
      } else {
        const status=document.createElement('span'); status.className='addon-choice-status';
        status.textContent=coming?'Coming soon':active?'Active':money(addon.pricing); side.append(status);
      }
      row.append(checkbox,copy,side); target.append(row);
    }
  }

  async function changeAddon(action,key){
    const target=node('addonStatus'); if(target) target.textContent = action==='purchase'?'Updating your Stripe subscription…':'Removing add-on from your Stripe subscription…';
    try { const result=await api('/api/addons',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,key})}); if(target)target.textContent=result.message||'Subscription update requested.'; await open('addons'); }
    catch(error){ if(target)target.textContent=error.message||'Could not update this add-on.'; }
  }

  function renderAddons() {
    const target = node('addonCards'); if(!target) return; target.replaceChildren();
    for (const addon of addons || []) {
      const article = document.createElement('article'); article.className = 'card addon-card';
      const badge = document.createElement('span'); badge.className = 'addon-badge'; badge.textContent = addon.status === 'coming_soon' ? 'Coming soon' : addon.entitlement === 'active' ? 'Active' : 'Available · Locked';
      const title = document.createElement('h3'); title.textContent = addon.name;
      const description = document.createElement('p'); description.className = 'work-meta'; description.textContent = addon.description;
      const pricing = document.createElement('p'); pricing.className = 'work-meta'; pricing.textContent = addon.status === 'coming_soon' ? 'Not yet available' : money(addon.pricing);
      const actions=document.createElement('div'); actions.className='work-actions';
      const canOpen=addon.key!=='ai_marketing'||addon.entitlement==='active'||addon.trial_included;
      if(canOpen){const openButton=document.createElement('button'); openButton.type='button'; openButton.className='small-btn'; openButton.textContent=addon.key==='ai_marketing'?'Open Marketing':'View'; openButton.disabled=addon.status==='coming_soon'; openButton.addEventListener('click',()=>showView(addon.key==='ai_marketing'?'marketing':'addons')); actions.append(openButton);}
      if(addon.purchasable){ const b=document.createElement('button'); b.type='button'; b.className='small-btn primary-action'; b.textContent='Add to subscription'; b.addEventListener('click',()=>changeAddon('purchase',addon.key)); actions.append(b); }
      if(addon.cancellable){ const b=document.createElement('button'); b.type='button'; b.className='small-btn'; b.textContent='Remove add-on'; b.addEventListener('click',()=>changeAddon('cancel',addon.key)); actions.append(b); }
      if(addon.trial_included) { const trial=document.createElement('p'); trial.textContent='10 Marketing generations included with your trial'; article.append(trial); }
      article.append(badge,title,description,pricing,actions); target.append(article);
    }
  }

  function setBusy(value) {
    busy=value;
    for(const id of ['marketingGenerate','marketingRegenerate','marketingSaveDraft','marketingApprove','marketingDelete','marketingPublishNow','marketingSchedule','marketingCopyMain','marketingCopyShort','marketingCopyCta','marketingCopyTags','marketingCopy','marketingScheduleConfirm','marketingScheduleDraft','marketingGenerateImage','marketingUploadPhoto','marketingReplacePhoto','marketingComposerPhotoRemove','marketingRemoveImage','marketingAutomationSave','marketingAutomationRun','marketingAutomationPostPhotoAdd','marketingAutomationInspirationAdd','marketingAutomationAdvancedToggle']) if(node(id)) node(id).disabled=value;
    if(node('marketingGenerate')) node('marketingGenerate').textContent=value?'Working…':'Generate draft';
    node('marketingForm')?.setAttribute('aria-busy',String(value));
  }

  function outputFromEditor(){
    return {
      main_copy: node('marketing_main_copy')?.value || '',
      short_alternative: node('marketing_short_alternative')?.value || '',
      call_to_action: node('marketing_call_to_action')?.value || '',
      hashtags: String(node('marketing_hashtags')?.value || '').split(/\s+/).map(v=>v.trim()).filter(Boolean).slice(0,12),
      missing_information: Array.isArray(output?.missing_information) ? output.missing_information : []
    };
  }

  function renderCurrent(generation){
    currentGeneration=generation||null; currentGenerationId=generation?.id||null; output=generation?.output||null;
    if(!generation||!output){ node('marketingResult').hidden=true; node('marketingResult')?.classList.remove('is-approved'); node('marketingEmpty').hidden=false; if(node('marketingReviewState'))node('marketingReviewState').textContent='Check the wording, facts and offer details before approval.'; return; }
    node('marketing_main_copy').value=output.main_copy||''; node('marketing_short_alternative').value=output.short_alternative||''; node('marketing_call_to_action').value=output.call_to_action||''; node('marketing_hashtags').value=(output.hashtags||[]).join(' ');
    node('marketing_missing').textContent=(output.missing_information||[]).length?`Information to check: ${output.missing_information.join('; ')}`:'';
    const approved=generation.approval_status==='approved'; node('marketingApprovalBadge').textContent=approved?'Approved · Ready to publish':'Draft · Review required'; node('marketingDraftDate').textContent=when(generation.updated_at||generation.created_at);
    node('marketingResult')?.classList.toggle('is-approved',approved);
    if(node('marketingReviewState'))node('marketingReviewState').textContent=approved?'Approved version locked. Publish it now or schedule it for later.':'Check the wording, facts and image before the owner approves this version.';
    node('marketingApprove').hidden=authenticatedBusinessRole!=='owner'||approved; node('marketingSaveDraft').hidden=approved; node('marketingDelete').hidden=!['owner','admin'].includes(authenticatedBusinessRole); node('marketingPublishControls').hidden=!approved;
    for(const id of ['marketing_main_copy','marketing_short_alternative','marketing_call_to_action','marketing_hashtags']) node(id).disabled=approved;
    node('marketingResult').hidden=false; node('marketingEmpty').hidden=true;
    void loadImageForCurrent();
  }

  const historyFilter=()=>({platform:node('marketingFilterPlatform')?.value||'',contentType:node('marketingFilterType')?.value||'',sort:node('marketingFilterSort')?.value||'newest'});
  const historyStatus=text=>{const target=node('marketingHistoryStatus');if(target)target.textContent=text||'';};
  const previewText=value=>{const text=String(value||'').trim();return text.length>140?`${text.slice(0,140)}…`:text;};

  function filteredHistory(){
    const filter=historyFilter();
    const rows=history.filter(item=>(!filter.platform||item.platform===filter.platform)&&(!filter.contentType||item.content_type===filter.contentType));
    rows.sort((a,b)=>filter.sort==='oldest'?String(a.created_at||'').localeCompare(String(b.created_at||'')):String(b.created_at||'').localeCompare(String(a.created_at||'')));
    return rows;
  }

  function renderHistory(){
    const target=node('marketingHistory'); if(!target)return;
    target.replaceChildren();
    if(!history.length){
      const empty=document.createElement('div');empty.className='empty';empty.textContent='No marketing drafts yet. Create your first draft above and it will be saved here.';target.append(empty);historyStatus('');return;
    }
    const rows=filteredHistory();
    if(!rows.length){
      const empty=document.createElement('div');empty.className='empty';empty.textContent='No drafts match these filters. Try a different platform or content type.';target.append(empty);
      historyStatus(String(history.length)+' saved '+(history.length===1?'draft':'drafts')+' · none match the current filters');return;
    }
    const latest=[...rows].sort((a,b)=>Date.parse(b.created_at||0)-Date.parse(a.created_at||0))[0];
    const visibleRows=historyExpanded?rows:(latest?[latest]:[]);
    historyStatus(historyExpanded
      ? String(rows.length)+' of '+String(history.length)+' saved '+(history.length===1?'draft':'drafts')
      : 'Showing latest draft · '+String(history.length)+' saved '+(history.length===1?'draft':'drafts'));
    for(const item of visibleRows){
      const preview=item.output?.edited_output?.main_copy||item.output?.main_copy||item.request_text||'';
      const article=document.createElement('article');article.className='work-item'+(item.id===currentGenerationId?' marketing-history-active':'');
      const top=document.createElement('div');top.className='work-item-top';
      const titleWrap=document.createElement('div');
      const title=document.createElement('h4');title.textContent=String(item.platform||'general')+' · '+String(item.content_type||'post');
      const meta=document.createElement('div');meta.className='work-meta';meta.textContent=String(item.tone||'')+' · '+when(item.created_at)+' · '+(item.approval_status==='approved'?'Approved':'Draft');
      titleWrap.append(title,meta);
      const tag=document.createElement('span');tag.className='tag';tag.textContent=item.approval_status==='approved'?'Approved':'Draft';
      top.append(titleWrap,tag);
      const previewNode=document.createElement('div');previewNode.className='work-meta marketing-preview';previewNode.textContent=previewText(preview);
      const actions=document.createElement('div');actions.className='work-actions';
      const makeButton=(label,kind,extra='')=>{const button=document.createElement('button');button.className='small-btn'+extra;button.type='button';button.textContent=label;button.dataset[kind]=item.id;return button;};
      actions.append(makeButton('Open','openMarketing'),makeButton('Use again','reuseMarketing'),makeButton('Plan post','scheduleMarketing'),makeButton('Delete','deleteMarketing',' danger'));
      article.append(top,previewNode,actions);target.append(article);
    }
    if(rows.length>1){
      const wrap=document.createElement('div');wrap.className='marketing-history-toggle';
      const button=document.createElement('button');button.className='small-btn';button.type='button';button.setAttribute('aria-expanded',historyExpanded?'true':'false');button.textContent=historyExpanded?'Show less':'See more drafts ('+String(rows.length-1)+')';
      button.addEventListener('click',()=>{historyExpanded=!historyExpanded;renderHistory();});
      wrap.append(button);target.append(wrap);
    }
    target.classList.toggle('marketing-history-expanded',historyExpanded);
    target.querySelectorAll('[data-open-marketing]').forEach(button=>button.addEventListener('click',()=>openGeneration(button.dataset.openMarketing)));
    target.querySelectorAll('[data-reuse-marketing]').forEach(button=>button.addEventListener('click',()=>reuseGeneration(button.dataset.reuseMarketing)));
    target.querySelectorAll('[data-schedule-marketing]').forEach(button=>button.addEventListener('click',()=>startSchedule(button.dataset.scheduleMarketing)));
    target.querySelectorAll('[data-delete-marketing]').forEach(button=>button.addEventListener('click',()=>deleteHistoryGeneration(button.dataset.deleteMarketing)));
  }

  async function loadHistory(){
    const target=node('marketingHistory'); if(target)target.innerHTML='<div class="empty">Loading your drafts…</div>'; historyStatus('Loading…');
    try { const data=await api('/api/marketing?limit=30'); history=Array.isArray(data.generations)?data.generations:[]; }
    catch(error){ history=[]; if(target)target.innerHTML='<div class="empty">Could not load your drafts. Check your connection and press Refresh.</div>'; historyStatus(error?.message||'Drafts are unavailable right now.'); return; }
    renderHistory();
  }

  function fillFormFromGeneration(generation){
    if(!generation)return false;
    if(node('marketingType'))node('marketingType').value=generation.content_type||'social_post';
    if(node('marketingPlatform'))node('marketingPlatform').value=generation.platform||'facebook';
    if(node('marketingTone'))node('marketingTone').value=generation.tone||'friendly';
    if(node('marketingPrompt'))node('marketingPrompt').value=generation.request_text||'';
    if(node('marketingExtra'))node('marketingExtra').value=generation.extra_instructions||'';
    return true;
  }

  async function openGeneration(id){
    try { const data=await api(`/api/marketing?generation_id=${encodeURIComponent(id)}`); const generation=data.generation; if(!generation)return; fillFormFromGeneration(generation); renderCurrent(generation); renderHistory(); tab('create'); node('marketingResult').scrollIntoView({behavior:'smooth',block:'start'}); }
    catch(error){message(error.message||'Could not open that draft.');}
  }

  async function reuseGeneration(id){
    const cached=history.find(item=>item.id===id);
    const apply=generation=>{ if(!fillFormFromGeneration(generation))return; renderHistory(); tab('create'); message('Draft details copied into the form. Press Generate draft when you are ready — nothing has been generated yet.'); node('marketingForm').scrollIntoView({behavior:'smooth',block:'start'}); node('marketingPrompt')?.focus(); };
    if(cached&&cached.request_text){ apply(cached); return; }
    try { const data=await api(`/api/marketing?generation_id=${encodeURIComponent(id)}`); if(data.generation)apply(data.generation); }
    catch(error){message(error.message||'Could not reuse that draft.');}
  }

  async function deleteHistoryGeneration(id){
    if(!confirm('Delete this Marketing draft from your library?'))return;
    try{await api('/api/marketing',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',generation_id:id})}); if(id===currentGenerationId){currentGenerationId=null;currentGeneration=null;output=null;renderCurrent(null);} message('Draft deleted.'); await loadHistory();}
    catch(error){message(error.message||'Could not delete this draft.');}
  }

  const scheduleMessage=text=>{const target=node('marketingScheduleMessage');if(target)target.textContent=text||'';};
  const scheduleStatus=text=>{const target=node('marketingScheduleStatus');if(target)target.textContent=text||'';};
  const scheduleLabels={scheduled:'Scheduled',processing:'Publishing',cancelled:'Cancelled',posted:'Posted',failed:'Failed'};

  function startSchedule(id,platform){
    const cached=history.find(item=>item.id===id)||(id===currentGenerationId?currentGeneration:null);
    if(!cached){message('Open the draft first, then choose Schedule.');return;}
    if(cached.approval_status!=='approved'){message('Approve the draft before scheduling it.');return;}
    scheduleDraftId=cached.id||id;
    if(node('marketingSchedulePlatform'))node('marketingSchedulePlatform').value=platform||cached.platform||'facebook';
    const summary=node('marketingScheduleDraftSummary');
    if(summary)summary.textContent=`Scheduling: ${(cached.platform||'general')} · ${(cached.content_type||'post').replaceAll('_',' ')} — ${(cached.request_text||'saved draft').slice(0,120)}`;
    scheduleMessage('Choose a future date and time, then press Schedule post. Business AI will publish it automatically at that time.');
    tab('schedule');
    node('marketingScheduleDate')?.focus();
  }

  function clearScheduleForm(){
    scheduleDraftId=null;editingScheduleId=null;
    if(node('marketingScheduleDate'))node('marketingScheduleDate').value='';
    if(node('marketingScheduleTime'))node('marketingScheduleTime').value='';
    const summary=node('marketingScheduleDraftSummary');if(summary)summary.textContent='';
    scheduleMessage('');
  }

  function combineDateTime(dateValue,timeValue){
    const date=new Date(`${dateValue}T${timeValue||'00:00'}`);
    if(!Number.isFinite(date.getTime()))return null;
    return date.toISOString();
  }

  async function confirmSchedule(){
    if(busy)return;
    if(!scheduleDraftId){scheduleMessage('Choose a draft from Drafts & History first.');return;}
    const dateValue=node('marketingScheduleDate')?.value||'',timeValue=node('marketingScheduleTime')?.value||'';
    if(!dateValue){scheduleMessage('Choose a date for this scheduled post.');return;}
    const scheduledFor=combineDateTime(dateValue,timeValue);
    if(!scheduledFor){scheduleMessage('That date and time could not be understood.');return;}
    setBusy(true);scheduleMessage('Saving your scheduled post…');
    try{
      const result=await api('/api/marketing-schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',generation_id:scheduleDraftId,platform:node('marketingSchedulePlatform')?.value||'facebook',scheduled_for:scheduledFor})});
      scheduleMessage(`Scheduled for ${when(result.schedule.scheduled_for)}. Business AI will publish it automatically.`);
      clearScheduleForm();await Promise.all([loadSchedules(),loadAutomation()]);
    }catch(error){scheduleMessage(error?.message||'Could not save this scheduled post.');}
    finally{setBusy(false);}
  }

  async function loadSchedules(){
    const target=node('marketingScheduleList');if(target)target.innerHTML='<div class="empty">Loading scheduled posts…</div>';scheduleStatus('Loading…');
    try{const data=await api('/api/marketing-schedules');schedules=Array.isArray(data.schedules)?data.schedules:[];}
    catch(error){schedules=[];if(target)target.innerHTML='<div class="empty">Could not load scheduled posts. Check your connection and press Refresh.</div>';scheduleStatus(error?.message||'Scheduled posts are unavailable right now.');return;}
    renderSchedules();
  }

  function renderSchedules(){
    const target=node('marketingScheduleList');if(!target)return;
    const upcoming=[...schedules].sort((a,b)=>{const rank=value=>['scheduled','processing'].includes(value)?0:value==='failed'?1:2;return rank(a.status)-rank(b.status)||String(a.scheduled_for||'').localeCompare(String(b.scheduled_for||''));});
    if(!upcoming.length){target.innerHTML='<div class="empty">No scheduled posts yet. Approve a draft, then choose Schedule to add it here.</div>';scheduleStatus('');return;}
    const active=upcoming.filter(item=>['scheduled','processing'].includes(item.status));
    const next=active.find(item=>Date.parse(item.scheduled_for)>Date.now())||active[0]||null;
    scheduleStatus(active.length?`${active.length} upcoming${next?' · next '+when(next.scheduled_for):''}`:`${upcoming.length} previous scheduled ${upcoming.length===1?'item':'items'}`);
    target.innerHTML=upcoming.map(item=>{
      const generation=item.generation||{};
      const preview=generation.main_copy||'';
      const past=item.status==='scheduled'&&new Date(item.scheduled_for).getTime()<=Date.now();
      const tag=item.status==='scheduled'&&past?'Due':(scheduleLabels[item.status]||item.status);
      const editing=editingScheduleId===item.id;
      return `<article class="work-item"><div class="work-item-top"><div><h4>${esc(when(item.scheduled_for)||'Unscheduled')} · ${esc(item.platform)}</h4><div class="work-meta">${esc(generation.content_type||'post')} · ${esc(previewText(preview)||'saved draft')}${past?' · waiting to be processed':''}</div></div><span class="tag">${esc(tag)}</span></div>${editing?`<div class="marketing-filters"><div class="field"><label>Date</label><input type="date" data-schedule-date="${esc(item.id)}" value=""></div><div class="field"><label>Time</label><input type="time" data-schedule-time="${esc(item.id)}" value=""></div></div><div class="work-actions"><button class="small-btn primary-action" type="button" data-save-schedule="${esc(item.id)}">Save new time</button><button class="small-btn" type="button" data-stop-edit-schedule="${esc(item.id)}">Keep existing</button></div>`:item.status==='scheduled'?`<div class="work-actions"><button class="small-btn" type="button" data-edit-schedule="${esc(item.id)}">Change time</button><button class="small-btn danger" type="button" data-cancel-schedule="${esc(item.id)}">Cancel</button></div>`:''}</article>`;
    }).join('');
    target.querySelectorAll('[data-edit-schedule]').forEach(button=>button.addEventListener('click',()=>{editingScheduleId=button.dataset.editSchedule;renderSchedules();}));
    target.querySelectorAll('[data-stop-edit-schedule]').forEach(button=>button.addEventListener('click',()=>{editingScheduleId=null;renderSchedules();}));
    target.querySelectorAll('[data-save-schedule]').forEach(button=>button.addEventListener('click',()=>saveReschedule(button.dataset.saveSchedule)));
    target.querySelectorAll('[data-cancel-schedule]').forEach(button=>button.addEventListener('click',()=>cancelScheduleItem(button.dataset.cancelSchedule)));
  }

  async function saveReschedule(id){
    const dateValue=document.querySelector(`[data-schedule-date="${id}"]`)?.value||'';
    const timeValue=document.querySelector(`[data-schedule-time="${id}"]`)?.value||'';
    if(!dateValue){scheduleStatus('Choose a new date first.');return;}
    const scheduledFor=combineDateTime(dateValue,timeValue);
    if(!scheduledFor){scheduleStatus('That date and time could not be understood.');return;}
    try{
      await api('/api/marketing-schedules',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reschedule',schedule_id:id,scheduled_for:scheduledFor})});
      editingScheduleId=null;scheduleStatus('Scheduled time updated.');await Promise.all([loadSchedules(),loadAutomation()]);
    }catch(error){scheduleStatus(error?.message||'Could not update this scheduled post.');}
  }

  async function cancelScheduleItem(id){
    if(!confirm('Cancel this scheduled post? Your draft stays in Drafts & History.'))return;
    try{
      await api('/api/marketing-schedules',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cancel',schedule_id:id})});
      scheduleStatus('Scheduled post cancelled. Your draft was kept.');await Promise.all([loadSchedules(),loadAutomation()]);
    }catch(error){scheduleStatus(error?.message||'Could not cancel this scheduled post.');}
  }

  function tab(name){
    const panes={create:'marketingCreatePane',history:'marketingHistoryPane',schedule:'marketingSchedulePane'};
    const current=name==='history'?'history':name==='schedule'?'schedule':'create';
    for(const [key,id] of Object.entries(panes)) if(node(id))node(id).hidden=key!==current;
    const tabs={create:'marketingTabCreate',history:'marketingTabHistory',schedule:'marketingTabSchedule'};
    for(const [key,id] of Object.entries(tabs)) if(node(id)){const selected=key===current;node(id).setAttribute('aria-selected',String(selected));node(id).setAttribute('tabindex',selected?'0':'-1');node(id).classList.toggle('primary-action',selected);}
    if(current==='history')renderHistory();
    if(current==='schedule')loadSchedules();
  }

  function handleMarketingTabKeydown(event){
    const order=['marketingTabCreate','marketingTabHistory','marketingTabSchedule'];
    const index=order.indexOf(event.currentTarget?.id);
    if(index<0||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    event.preventDefault();
    const nextIndex=event.key==='Home'?0:event.key==='End'?order.length-1:event.key==='ArrowRight'?(index+1)%order.length:(index-1+order.length)%order.length;
    const next=node(order[nextIndex]);
    if(!next)return;
    const name=next.id==='marketingTabHistory'?'history':next.id==='marketingTabSchedule'?'schedule':'create';
    tab(name);
    next.focus();
  }

  function clearPendingMarketingPhoto(){
    if(pendingMarketingPhotoUrl){URL.revokeObjectURL(pendingMarketingPhotoUrl);pendingMarketingPhotoUrl='';}
    pendingMarketingPhoto=null;
    const input=node('marketingPhotoInput');if(input)input.value='';
    renderComposerPhoto();
  }

  function renderComposerPhoto(){
    const state=node('marketingComposerPhotoState'),preview=node('marketingComposerPhotoPreview'),name=node('marketingComposerPhotoName'),button=node('marketingUploadPhoto');
    if(!state||!preview)return;
    preview.replaceChildren();
    if(!pendingMarketingPhoto){
      state.hidden=true;
      if(button)button.textContent='Add photo';
      return;
    }
    state.hidden=false;
    if(button)button.textContent='Change photo';
    if(name)name.textContent=pendingMarketingPhoto.fileName||'Selected photo';
    if(pendingMarketingPhotoUrl){
      const img=document.createElement('img');img.src=pendingMarketingPhotoUrl;img.alt='Selected marketing photo preview';preview.append(img);
    }
  }

  async function generate(event){
    event?.preventDefault(); if(busy)return; const current=epoch; const input=Object.fromEntries(new FormData(node('marketingForm'))); const selectedPhoto=pendingMarketingPhoto; setBusy(true); message(selectedPhoto?'Creating your draft, then attaching your photo…':'Creating a draft using approved business information…');
    try {
      const result=await api('/api/marketing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
      if(current!==epoch)return;
      renderCurrent({id:result.id,content_type:input.content_type,platform:input.platform,tone:input.tone,request_text:input.prompt,extra_instructions:input.extra_instructions||'',output:result.output,approval_status:'draft',created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
      if(selectedPhoto){
        try{
          await uploadPreparedMarketingPhoto(selectedPhoto,result.id,{manageBusy:false,reload:false});
          clearPendingMarketingPhoto();
          message('Draft and photo ready. Business AI used the visible photo context to refresh the caption. Review both before approval.');
        }catch(photoError){
          message('Draft created, but the photo could not be attached. Your photo is still selected so you can try again.');
        }
      }else{
        message('Draft ready. Check facts, dates and offers before approving. Nothing has been published.');
      }
      await Promise.all([loadHistory(),loadAutomation()]);
      node('marketingResult').focus();
    }
    catch(error){if(current===epoch)message(error.message||'Could not generate a draft.');}
    finally{if(current===epoch)setBusy(false);}
  }

  async function saveDraft(){ if(!currentGenerationId||busy)return; setBusy(true); try{const result=await api('/api/marketing',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'edit',generation_id:currentGenerationId,output:outputFromEditor()})}); renderCurrent(result.generation); message('Edits saved. Owner approval is still required before publishing.'); await loadHistory();}catch(error){message(error.message||'Could not save this draft.');}finally{setBusy(false);} }
  async function approveDraft(){ if(!currentGenerationId||busy)return; setBusy(true); try{const result=await api('/api/marketing',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'approve',generation_id:currentGenerationId})}); renderCurrent(result.generation); message('Approved. You can now publish or schedule this exact reviewed version.'); await Promise.all([loadHistory(),loadMeta(),loadPublications()]);}catch(error){message(error.message||'Could not approve this draft.');}finally{setBusy(false);} }
  async function deleteDraft(){ if(!currentGenerationId||busy)return; if(!confirm('Delete this Marketing draft from your library?'))return; setBusy(true); try{await api('/api/marketing',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',generation_id:currentGenerationId})}); currentGenerationId=null;currentGeneration=null;output=null;renderCurrent(null);message('Draft deleted.');await loadHistory();}catch(error){message(error.message||'Could not delete this draft.');}finally{setBusy(false);} }


  function renderImage(){
    const status=node('marketingImageStatus'),preview=node('marketingImagePreview'),button=node('marketingGenerateImage'),replace=node('marketingReplacePhoto'),remove=node('marketingRemoveImage');
    if(!status||!preview)return;
    preview.replaceChildren();
    const uploaded=imageState?.provider==='upload';
    if(button)button.textContent=imageState?.status==='completed'&&!uploaded?'Generate new AI image':'Generate AI image';
    if(replace)replace.textContent=uploaded?'Replace attached photo':'Attach a photo';
    if(remove)remove.hidden=!imageState||!['completed','simulated','failed'].includes(imageState.status);
    if(!currentGenerationId){status.textContent='Create or open a saved draft before adding a photo.';return;}
    if(!imageState){status.textContent=imageGenerationMode==='simulate'?'Upload your own photo, or test the AI image pipeline in simulation mode.':'Upload a real business photo or generate a square AI image. Any image change requires owner approval again.';return;}
    if(imageState.status==='simulated'){status.textContent='AI image simulation passed. No real AI image was created. You can still upload your own photo.';return;}
    if(imageState.status==='failed'){status.textContent=imageState.failure_message||'Image generation failed.';return;}
    if(imageState.status==='pending'){status.textContent=uploaded?'Your photo is being prepared…':'AI image generation is still processing…';return;}
    if(imageState.status==='completed'&&imageState.image_url){
      status.textContent=uploaded?'Your photo is attached to this draft. Review the refreshed caption and photo before approval.':'AI image ready. Review it before approval, or upload your own photo instead.';
      const img=document.createElement('img');img.src=imageState.image_url;img.alt=uploaded?'Uploaded business photo preview':'Generated marketing image preview';img.className='marketing-image-preview';preview.append(img);return;
    }
    status.textContent='Image state is unavailable.';
  }

  async function loadImageForCurrent(){
    imageState=null;
    if(!currentGenerationId){renderImage();return;}
    try{
      const data=await api('/api/marketing-images?generation_id='+encodeURIComponent(currentGenerationId));
      imageState=data.image||null;
      imageGenerationMode=data.configuration?.mode||imageGenerationMode;
    }catch{imageState=null;}
    renderImage();
  }

  async function generateImage(){
    if(!currentGenerationId||busy)return message('Create or open a saved Marketing draft first.');
    setBusy(true);message(imageGenerationMode==='simulate'?'Testing the image-generation backend…':'Generating a marketing image…');
    try{
      const generationId=currentGenerationId;
      const data=await api('/api/marketing-images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'generate',generation_id:generationId})});
      imageState=data.image||null;imageGenerationMode=data.configuration?.mode||imageGenerationMode;renderImage();
      if(!imageState?.simulation){
        const refreshed=await api('/api/marketing?generation_id='+encodeURIComponent(generationId)).catch(()=>null);
        if(refreshed?.generation)renderCurrent(refreshed.generation);
      }
      message(imageState?.simulation?'Image simulation passed. No paid image was generated.':'Image generated. Review the image and approve the draft before publishing.');
      await Promise.all([loadHistory(),loadAutomation()]);
    }catch(error){message(error?.message||'Could not generate an image for this draft.');}
    finally{setBusy(false);}
  }


  function chooseMarketingPhoto(target='composer'){
    if(busy)return;
    if(target==='current'&&!currentGenerationId)return message('Create or open a saved Marketing draft first.');
    photoSelectionTarget=target==='current'?'current':'composer';
    const input=node('marketingPhotoInput');if(input){input.value='';input.click();}
  }

  async function normaliseMarketingPhoto(file){
    const supported=['image/jpeg','image/png','image/webp'];
    if(!file||!String(file.type||'').startsWith('image/'))throw new Error('Choose an image from your device.');
    if(supported.includes(file.type)&&file.size<=10*1024*1024){
      return {blob:file,fileName:file.name||('marketing-photo.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg')),mimeType:file.type};
    }
    const url=URL.createObjectURL(file);
    try{
      const img=new Image();
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('That photo format could not be opened. Try a JPG, PNG or WebP image.'));img.src=url;});
      const maxSide=1920,scale=Math.min(1,maxSide/Math.max(img.naturalWidth||1,img.naturalHeight||1));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round((img.naturalWidth||1)*scale));canvas.height=Math.max(1,Math.round((img.naturalHeight||1)*scale));
      const context=canvas.getContext('2d');if(!context)throw new Error('This photo could not be prepared on your device.');
      context.drawImage(img,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.88));
      if(!blob||blob.size<1||blob.size>10*1024*1024)throw new Error('That photo is too large. Choose a photo under 10 MB.');
      const base=String(file.name||'marketing-photo').replace(/\.[^.]+$/,'').slice(0,180)||'marketing-photo';
      return {blob,fileName:base+'.jpg',mimeType:'image/jpeg'};
    }finally{URL.revokeObjectURL(url);}
  }

  async function uploadPreparedMarketingPhoto(photo,generationId,{manageBusy=true,reload=true}={}){
    if(!photo||!generationId)throw new Error('Choose a photo and create a Marketing draft first.');
    if(manageBusy)setBusy(true);
    message('Uploading your photo privately…');
    let prepared=null,uploaded=false;
    try{
      prepared=await api('/api/marketing-images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create_upload',generation_id:generationId,file_name:photo.fileName,mime_type:photo.mimeType,size_bytes:photo.blob.size})});
      if(!supabaseClient)throw new Error('Secure photo upload is unavailable.');
      const {error}=await supabaseClient.storage.from(prepared.upload.bucket).uploadToSignedUrl(prepared.upload.path,prepared.upload.token,photo.blob,{contentType:photo.mimeType});
      if(error)throw new Error('The private photo upload could not be completed.');
      uploaded=true;message('Business AI is reviewing the photo and refreshing the caption…');
      const data=await api('/api/marketing-images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'finalize_upload',generation_id:generationId,path:prepared.upload.path,file_name:photo.fileName,mime_type:photo.mimeType,size_bytes:photo.blob.size})});
      imageState=data.image||null;imageGenerationMode=data.configuration?.mode||imageGenerationMode;
      if(data.generation&&generationId===currentGenerationId)renderCurrent(data.generation);else renderImage();
      if(data.copy_refreshed)message('Photo uploaded. Business AI used the visible photo context to refresh the caption. Review both before approval.');
      else if(data.copy_refresh_error)message('Photo uploaded and ready to publish. '+data.copy_refresh_error);
      else if(data.analysed)message('Photo uploaded and analysed. Review the post and photo before approval.');
      else message('Photo uploaded and attached to this post. Review it before approval.');
      if(reload)await Promise.all([loadHistory(),loadAutomation()]);
      return data;
    }catch(error){
      if(uploaded&&generationId===currentGenerationId)await loadImageForCurrent().catch(()=>null);
      throw error;
    }finally{if(manageBusy)setBusy(false);}
  }

  async function uploadMarketingPhoto(event){
    const input=event?.target,file=input?.files?.[0];
    if(!file)return;
    if(busy){if(input)input.value='';return;}
    try{
      const photo=await normaliseMarketingPhoto(file);
      if(photoSelectionTarget==='composer'){
        if(pendingMarketingPhotoUrl)URL.revokeObjectURL(pendingMarketingPhotoUrl);
        pendingMarketingPhoto=photo;
        pendingMarketingPhotoUrl=URL.createObjectURL(photo.blob);
        renderComposerPhoto();
        message('Photo selected. Add your prompt, then press Generate draft.');
        return;
      }
      if(!currentGenerationId)throw new Error('Create or open a saved Marketing draft first.');
      await uploadPreparedMarketingPhoto(photo,currentGenerationId);
    }catch(error){message(error?.message||'Could not use this photo.');}
    finally{if(input)input.value='';photoSelectionTarget='composer';}
  }

  async function removeCurrentImage(){
    if(!currentGenerationId||!imageState||busy)return;
    if(!confirm('Remove this image from the Marketing draft?'))return;
    setBusy(true);message('Removing image…');
    try{
      await api('/api/marketing-images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove',generation_id:currentGenerationId})});
      imageState=null;renderImage();
      const refreshed=await api('/api/marketing?generation_id='+encodeURIComponent(currentGenerationId)).catch(()=>null);
      if(refreshed?.generation)renderCurrent(refreshed.generation);
      message('Image removed. Owner approval is required again before publishing.');
      await loadHistory();
    }catch(error){message(error?.message||'Could not remove this image.');}
    finally{setBusy(false);}
  }

  function renderAutomationMedia(){
    const owner=authenticatedBusinessRole==='owner';
    const renderRole=(role,targetId)=>{
      const target=node(targetId);if(!target)return;
      const rows=(Array.isArray(automationMedia)?automationMedia:[]).filter(item=>item?.role===role);
      target.replaceChildren();
      if(!rows.length){const empty=document.createElement('div');empty.className='empty';empty.textContent=role==='post'?'No post photos added.':'No inspiration photos added.';target.append(empty);return;}
      for(const item of rows){
        const card=document.createElement('article');card.className='marketing-automation-media-card';
        const thumb=document.createElement('div');thumb.className='marketing-automation-media-thumb';
        if(item.image_url){const img=document.createElement('img');img.src=item.image_url;img.alt=role==='post'?'Approved automated post photo':'Automation inspiration photo';img.loading='lazy';thumb.append(img);}else{const fallback=document.createElement('span');fallback.textContent='Preview unavailable';thumb.append(fallback);}
        const meta=document.createElement('div');meta.className='marketing-automation-media-meta';
        const name=document.createElement('strong');name.textContent=item.file_name||'Photo';
        const detail=document.createElement('small');detail.textContent=role==='post'?(item.last_used_at?'Last used '+when(item.last_used_at):'Ready for rotation'):(item.analysed?'Visual style analysed':'Stored as inspiration');
        const remove=document.createElement('button');remove.type='button';remove.className='small-btn danger';remove.textContent='Remove';remove.disabled=!owner||busy;remove.addEventListener('click',()=>deleteAutomationMedia(item.id));
        meta.append(name,detail,remove);card.append(thumb,meta);target.append(card);
      }
    };
    renderRole('post','marketingAutomationPostPhotos');
    renderRole('inspiration','marketingAutomationInspirationPhotos');
    if(node('marketingAutomationPostPhotoAdd'))node('marketingAutomationPostPhotoAdd').hidden=!owner;
    if(node('marketingAutomationInspirationAdd'))node('marketingAutomationInspirationAdd').hidden=!owner;
    const postCount=(automationMedia||[]).filter(item=>item?.role==='post').length;
    const inspirationCount=(automationMedia||[]).filter(item=>item?.role==='inspiration').length;
    if(node('marketingAutomationMediaStatus'))node('marketingAutomationMediaStatus').textContent=`${postCount}/12 post photos · ${inspirationCount}/12 inspiration photos. Post photos can be published; inspiration photos never are.`;
  }

  function toggleAutomationAdvanced(force){
    const panel=node('marketingAutomationAdvanced'),button=node('marketingAutomationAdvancedToggle');if(!panel||!button)return;
    const open=typeof force==='boolean'?force:panel.hidden;
    panel.hidden=!open;button.setAttribute('aria-expanded',String(open));
  }

  function chooseAutomationMedia(role){
    if(authenticatedBusinessRole!=='owner'||busy)return;
    automationMediaUploadRole=role==='inspiration'?'inspiration':'post';
    const input=node('marketingAutomationMediaInput');if(input){input.value='';input.click();}
  }

  async function uploadAutomationMedia(event){
    const input=event?.target,file=input?.files?.[0];if(!file)return;
    if(authenticatedBusinessRole!=='owner'||busy){input.value='';return;}
    setBusy(true);message(automationMediaUploadRole==='post'?'Adding approved post photo…':'Adding inspiration photo…');
    try{
      const photo=await normaliseMarketingPhoto(file);
      const prepared=await api('/api/marketing-automation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'media_create_upload',role:automationMediaUploadRole,file_name:photo.fileName,mime_type:photo.mimeType,size_bytes:photo.blob.size})});
      if(!supabaseClient)throw new Error('Secure photo upload is unavailable.');
      const {error}=await supabaseClient.storage.from(prepared.upload.bucket).uploadToSignedUrl(prepared.upload.path,prepared.upload.token,photo.blob,{contentType:photo.mimeType});
      if(error)throw new Error('The private photo upload could not be completed.');
      const data=await api('/api/marketing-automation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'media_finalize_upload',role:automationMediaUploadRole,path:prepared.upload.path,file_name:photo.fileName,mime_type:photo.mimeType,size_bytes:photo.blob.size})});
      automationMedia=Array.isArray(data.library)?data.library:automationMedia;
      renderAutomationMedia();toggleAutomationAdvanced(true);
      message(automationMediaUploadRole==='post'?'Post photo added. Automation may use it on a future post.':'Inspiration photo added. It can guide AI visuals but will never be published directly.');
    }catch(error){message(error?.message||'Could not add that automation photo.');}
    finally{input.value='';setBusy(false);renderAutomationMedia();}
  }

  async function deleteAutomationMedia(mediaId){
    if(authenticatedBusinessRole!=='owner'||busy||!mediaId)return;
    const item=(automationMedia||[]).find(row=>row?.id===mediaId);
    const label=item?.role==='inspiration'?'inspiration photo':'post photo';
    if(!confirm('Remove this '+label+' from Marketing automation?'))return;
    setBusy(true);
    try{
      const data=await api('/api/marketing-automation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'media_delete',media_id:mediaId})});
      automationMedia=Array.isArray(data.library)?data.library:(automationMedia||[]).filter(row=>row?.id!==mediaId);renderAutomationMedia();message('Automation '+label+' removed.');
    }catch(error){message(error?.message||'Could not remove that automation photo.');}
    finally{setBusy(false);renderAutomationMedia();}
  }

  function renderAutomation(){
    const settings=automationState||{enabled:false,mode:'approval_required',tone:'friendly',image_enabled:false};
    const owner=authenticatedBusinessRole==='owner';
    if(node('marketingAutomationEnabledLabel'))node('marketingAutomationEnabledLabel').textContent=settings.enabled===true?'Enabled':'Paused';
    if(node('marketingAutomationSummaryChip'))node('marketingAutomationSummaryChip').textContent='Automation · '+(settings.enabled===true?(settings.mode==='fully_automated'?'Auto publish':'Approval'):'Paused');
    if(node('marketingAutomationMode')){node('marketingAutomationMode').value=settings.mode||'approval_required';node('marketingAutomationMode').disabled=!owner;}
    if(node('marketingAutomationTone')){node('marketingAutomationTone').value=settings.tone||'friendly';node('marketingAutomationTone').disabled=!owner;}
    if(node('marketingAutomationEnabled')){node('marketingAutomationEnabled').checked=settings.enabled===true;node('marketingAutomationEnabled').disabled=!owner;}
    if(node('marketingAutomationImage')){node('marketingAutomationImage').checked=settings.image_enabled===true;node('marketingAutomationImage').disabled=!owner;}
    if(node('marketingAutomationSave'))node('marketingAutomationSave').hidden=!owner;
    if(node('marketingAutomationRun'))node('marketingAutomationRun').hidden=!owner;
    if(node('marketingAutomationAdvancedToggle'))node('marketingAutomationAdvancedToggle').hidden=!owner;
    renderAutomationMedia();
    if(node('marketingAutomationBadge'))node('marketingAutomationBadge').textContent=settings.mode==='fully_automated'?'Fully automated':'Approval required';
    const last=settings.last_status?('Last run: '+settings.last_status.replaceAll('_',' ')+(settings.last_run_at?' · '+when(settings.last_run_at):'')):'No automated run yet.';
    if(node('marketingAutomationStatus'))node('marketingAutomationStatus').textContent=last+(settings.last_error_code?' · '+settings.last_error_code:'');
    if(node('marketingAutomationHint')){
      const imageNote=(automationMedia||[]).some(item=>item?.role==='post')?'Approved post photos will be rotated before AI image generation is used. ':imageGenerationMode==='simulate'?'No approved post photos are available and AI image generation is currently simulated. ':'If no approved post photo is available, Business AI can generate an image; inspiration photos guide visual style only. ';
      node('marketingAutomationHint').textContent=(settings.mode==='fully_automated'?'Fully automated mode can generate, approve and publish a daily Facebook post without asking first. ':'Approval required mode creates a daily draft and waits for the owner. ')+imageNote;
    }
  }

  async function loadAutomation(){
    try{
      const data=await api('/api/marketing-automation');
      automationState=data.settings||null;
      automationMedia=Array.isArray(data.media)?data.media:[];
      usageState=data.usage||usageState;
      imageGenerationMode=data.image_generation_mode||imageGenerationMode;
    }catch{automationState=null;automationMedia=[];}
    renderUsage();
    renderAutomation();
  }

  async function saveAutomation(){
    if(authenticatedBusinessRole!=='owner'||busy)return;
    const body={
      enabled:Boolean(node('marketingAutomationEnabled')?.checked),
      mode:node('marketingAutomationMode')?.value||'approval_required',
      tone:node('marketingAutomationTone')?.value||'friendly',
      image_enabled:Boolean(node('marketingAutomationImage')?.checked)
    };
    setBusy(true);
    try{
      const data=await api('/api/marketing-automation',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      automationState=data.settings||body;imageGenerationMode=data.image_generation_mode||imageGenerationMode;renderAutomation();
      message(body.enabled?(body.mode==='fully_automated'?'Fully automated Facebook Marketing enabled.':'Daily Marketing drafts enabled with owner approval required.'):'Marketing automation disabled.');
    }catch(error){message(error?.message||'Could not save Marketing automation settings.');}
    finally{setBusy(false);}
  }

  async function runAutomationNow(){
    if(authenticatedBusinessRole!=='owner'||busy)return;
    setBusy(true);message('Running Marketing automation now…');
    try{
      const data=await api('/api/marketing-automation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'run_now'})});
      const result=data.result||{};
      message(result.status==='published'?'Automated Facebook post published successfully.':result.status==='draft_created'?'Automated draft created and saved for your approval.':'Automation completed.');
      await Promise.all([loadHistory(),loadPublications(),loadAutomation()]);
    }catch(error){message(error?.message||'Marketing automation could not run.');await loadAutomation();}
    finally{setBusy(false);}
  }

  async function loadMeta(){
    try{metaState=await api('/api/meta');}catch{metaState=null;}
    const badge=node('metaConnectionBadge'),status=node('metaConnectionStatus'),accounts=node('metaAccounts'),connect=node('metaConnect'),disconnect=node('metaDisconnect'); if(!badge)return;
    if(!metaState?.configured){badge.textContent='Setup required';status.textContent='Meta credentials have not been configured for this Pilot environment yet.';accounts.innerHTML='';connect.disabled=true;disconnect.hidden=true;if(node('marketingMetaSummaryChip'))node('marketingMetaSummaryChip').textContent='Facebook · Setup required';return;}
    connect.disabled=false; if(!metaState.connected){badge.textContent=metaState.needs_reauth?'Reconnect required':'Not connected';status.textContent='Connect Facebook to load eligible Pages. Instagram professional accounts linked to those Pages will be detected where available.';accounts.innerHTML='';connect.textContent=metaState.needs_reauth?'Reconnect Facebook':'Connect Facebook';disconnect.hidden=true;if(node('marketingMetaSummaryChip'))node('marketingMetaSummaryChip').textContent='Facebook · '+(metaState.needs_reauth?'Reconnect':'Not connected');return;}
    badge.textContent='Connected';status.textContent=metaState.publish_enabled?'Connection ready. Publishing still requires an owner-approved draft.':'Connected. Live publishing is disabled until the Pilot Meta publishing switch is enabled.';connect.textContent='Reconnect Facebook';disconnect.hidden=false;
    if(node('marketingMetaSummaryChip'))node('marketingMetaSummaryChip').textContent='Facebook · '+(metaState.publish_enabled?'Ready':'Connected');
    const list=Array.isArray(metaState.accounts)?metaState.accounts:[]; accounts.innerHTML=list.length?list.map(a=>`<article class="work-item"><div class="work-item-top"><div><h4>${esc(a.display_name||a.platform)}</h4><div class="work-meta">${esc(a.platform==='facebook'?'Facebook Page':'Instagram professional account')}</div></div><span class="tag">${a.selected?'Selected':'Available'}</span></div>${!a.selected?`<div class="work-actions"><button type="button" class="small-btn" data-select-meta="${esc(a.id)}">Select</button></div>`:''}</article>`).join(''):'<div class="empty">No eligible Pages or professional Instagram accounts were returned by Meta.</div>';
    accounts.querySelectorAll('[data-select-meta]').forEach(button=>button.addEventListener('click',()=>selectMeta(button.dataset.selectMeta)));
  }
  async function connectMeta(){try{const result=await api('/api/meta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'oauth_start'})});if(result.authorization_url?.startsWith('https://'))location.assign(result.authorization_url);else throw new Error('Meta connection is unavailable');}catch(error){message(error.message||'Could not start Meta connection.');}}
  async function selectMeta(id){try{await api('/api/meta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'select_account',account_id:id})});message('Social account selected.');await loadMeta();}catch(error){message(error.message||'Could not select that account.');}}
  async function disconnectMeta(){if(!confirm('Disconnect Facebook and remove stored Meta access tokens from Business AI?'))return;try{await api('/api/meta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'disconnect'})});message('Meta connection removed.');await loadMeta();}catch(error){message(error.message||'Could not disconnect Meta.');}}

  async function loadPublications(){
    try{const data=await api('/api/marketing-publications');publications=Array.isArray(data.publications)?data.publications:[];}catch{publications=[];}
    const target=node('marketingPublications');if(!target)return;if(!publications.length){target.innerHTML='<div class="empty">No publishing activity yet.</div>';return;}
    target.innerHTML=publications.map(item=>`<article class="work-item"><div class="work-item-top"><div><h4>${esc(item.platform)} · ${esc(item.status)}</h4><div class="work-meta">${item.status==='scheduled'?`Scheduled ${esc(when(item.scheduled_for))}`:item.status==='published'?`Published ${esc(when(item.published_at))}`:item.failure_message?esc(item.failure_message):esc(when(item.created_at))}</div></div><span class="tag">${esc(item.status)}</span></div><div class="work-actions">${item.status==='scheduled'?`<button class="small-btn danger" type="button" data-pub-action="cancel" data-pub-id="${esc(item.id)}">Cancel</button>`:''}${item.status==='failed'&&item.failure_code!=='META_AMBIGUOUS_RESULT'?`<button class="small-btn" type="button" data-pub-action="retry" data-pub-id="${esc(item.id)}">Retry</button>`:''}</div></article>`).join('');
    target.querySelectorAll('[data-pub-action]').forEach(button=>button.addEventListener('click',()=>publicationAction(button.dataset.pubAction,button.dataset.pubId)));
  }
  async function publicationAction(action,id){try{await api('/api/marketing-publications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,publication_id:id})});message(action==='cancel'?'Scheduled publication cancelled.':'Publication retry completed.');await loadPublications();}catch(error){message(error.message||'Could not update publication.');}}
  async function publish(schedule){if(!currentGenerationId||currentGeneration?.approval_status!=='approved')return message('Owner approval is required before publishing.');const platform=node('marketingPublishPlatform').value;const at=node('marketingScheduleAt').value;if(schedule&&!at)return message('Choose a schedule date and time.');const scheduledFor=schedule?new Date(at).toISOString():'';const requestKey=`${currentGenerationId}:${platform}:${scheduledFor||'now'}`;let requestId=pendingPublicationRequests.get(requestKey);if(!requestId){requestId=crypto.randomUUID();pendingPublicationRequests.set(requestKey,requestId);}setBusy(true);try{const body={action:'schedule',generation_id:currentGenerationId,platform,request_id:requestId};if(schedule)body.scheduled_for=scheduledFor;const result=await api('/api/marketing-publications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});pendingPublicationRequests.delete(requestKey);message(result.publication?.status==='published'?'Published successfully.':result.publication?.status==='failed'?(result.publication.failure_message||'Publishing failed.'):'Publication scheduled.');await Promise.all([loadPublications(),loadAutomation()]);}catch(error){message(error.message||'Could not publish this draft.');}finally{setBusy(false);}}

  async function open(view){
    if(!['addons','marketing','settings'].includes(view))return; const current=++epoch;
    if(view==='marketing'){node('marketingCreator').hidden=true;node('marketingLocked').hidden=true;message('Checking Marketing access…');}
    if(view==='addons')node('addonStatus').textContent='Loading additional features…';
    try{const result=await api('/api/addons');if(current!==epoch)return;addons=result.addons||[];renderAddons();renderPricing();if(node('addonStatus'))node('addonStatus').textContent='';if(view==='marketing'){const active=addons.some(a=>a.key==='ai_marketing'&&(a.entitlement==='active'||a.trial_included));node('marketingCreator').hidden=!active;node('marketingLocked').hidden=active;if(!active){renderCurrent(null);message('');return;}await Promise.all([loadHistory(),loadMeta(),loadPublications(),loadSchedules(),loadAutomation()]);const query=new URLSearchParams(location.search);if(query.get('meta')==='connected')message('Facebook connection completed. Select the Page Business AI may use.');else if(query.get('meta')==='error')message('Facebook connection was not completed. Check the Meta setup and try again.');else message('');}}
    catch(error){if(current!==epoch)return;if(view==='marketing')message(error.message||'Could not check Marketing access.');if(view==='addons')node('addonStatus').textContent=error.message||'Could not load additional features.';}
  }

  ['marketingTabCreate','marketingTabHistory','marketingTabSchedule'].forEach(id=>node(id)?.addEventListener('keydown',handleMarketingTabKeydown));
  node('marketingForm')?.addEventListener('submit',generate);node('marketingRegenerate')?.addEventListener('click',generate);node('marketingSaveDraft')?.addEventListener('click',saveDraft);node('marketingApprove')?.addEventListener('click',approveDraft);node('marketingDelete')?.addEventListener('click',deleteDraft);node('marketingEdit')?.addEventListener('click',()=>{node('marketingPrompt').focus();node('marketingForm').scrollIntoView({behavior:'smooth',block:'start'});});
  async function copyMarketingField(field){
    const value=outputFromEditor();
    const text=field==='main'?value.main_copy:field==='short'?value.short_alternative:field==='cta'?value.call_to_action:field==='tags'?value.hashtags.join(' '):[value.main_copy,value.short_alternative,value.call_to_action,value.hashtags.join(' ')].filter(Boolean).join('\n\n');
    const label=field==='main'?'Main post copied.':field==='short'?'Shorter version copied.':field==='cta'?'Call-to-action copied.':field==='tags'?'Hashtags copied.':'Post, shorter version, call-to-action and hashtags copied.';
    if(!text)return message('There is nothing to copy yet.');
    try{await navigator.clipboard.writeText(text);message(label);}
    catch{message('Copy is unavailable. Select the draft text to copy it manually.');}
  }
  node('marketingGenerateImage')?.addEventListener('click',generateImage);node('marketingUploadPhoto')?.addEventListener('click',()=>chooseMarketingPhoto('composer'));node('marketingReplacePhoto')?.addEventListener('click',()=>chooseMarketingPhoto('current'));node('marketingPhotoInput')?.addEventListener('change',uploadMarketingPhoto);node('marketingComposerPhotoRemove')?.addEventListener('click',()=>{clearPendingMarketingPhoto();message('Photo removed from this draft brief.');});node('marketingRemoveImage')?.addEventListener('click',removeCurrentImage);node('marketingAutomationSave')?.addEventListener('click',saveAutomation);node('marketingAutomationRun')?.addEventListener('click',runAutomationNow);node('marketingAutomationAdvancedToggle')?.addEventListener('click',()=>toggleAutomationAdvanced());node('marketingAutomationPostPhotoAdd')?.addEventListener('click',()=>chooseAutomationMedia('post'));node('marketingAutomationInspirationAdd')?.addEventListener('click',()=>chooseAutomationMedia('inspiration'));node('marketingAutomationMediaInput')?.addEventListener('change',uploadAutomationMedia);node('marketingRefreshHistory')?.addEventListener('click',loadHistory);node('marketingScheduleDraft')?.addEventListener('click',()=>startSchedule(currentGenerationId,currentGeneration?.platform));node('marketingScheduleConfirm')?.addEventListener('click',confirmSchedule);node('marketingScheduleClear')?.addEventListener('click',clearScheduleForm);node('marketingRefreshSchedules')?.addEventListener('click',loadSchedules);node('marketingFilterPlatform')?.addEventListener('change',renderHistory);node('marketingFilterType')?.addEventListener('change',renderHistory);node('marketingFilterSort')?.addEventListener('change',renderHistory);node('marketingCopyMain')?.addEventListener('click',()=>copyMarketingField('main'));node('marketingCopyShort')?.addEventListener('click',()=>copyMarketingField('short'));node('marketingCopyCta')?.addEventListener('click',()=>copyMarketingField('cta'));node('marketingCopyTags')?.addEventListener('click',()=>copyMarketingField('tags'));node('marketingCopy')?.addEventListener('click',()=>copyMarketingField('all'));node('metaConnect')?.addEventListener('click',connectMeta);node('metaDisconnect')?.addEventListener('click',disconnectMeta);node('marketingRefreshPublications')?.addEventListener('click',loadPublications);node('marketingPublishNow')?.addEventListener('click',()=>publish(false));node('marketingSchedule')?.addEventListener('click',()=>publish(true));

  window.marketingWorkspace={open,tab,renderPricing,reset(){epoch+=1;addons=null;output=null;currentGeneration=null;currentGenerationId=null;history=[];historyExpanded=false;metaState=null;publications=[];pendingPublicationRequests.clear();schedules=[];scheduleDraftId=null;editingScheduleId=null;imageState=null;automationState=null;automationMedia=[];automationMediaUploadRole='post';usageState=null;imageGenerationMode='simulate';renderUsage();setBusy(false);node('marketingForm')?.reset();clearPendingMarketingPhoto();photoSelectionTarget='composer';if(node('marketingFilterPlatform'))node('marketingFilterPlatform').value='';if(node('marketingFilterType'))node('marketingFilterType').value='';if(node('marketingFilterSort'))node('marketingFilterSort').value='newest';clearScheduleForm();toggleAutomationAdvanced(false);renderAutomationMedia();tab('create');renderCurrent(null);for(const id of ['addonCards','addonStatus','addonPlanOptions','marketingHistory','metaAccounts','marketingPublications','marketingMessage','marketingHistoryStatus','marketingScheduleList','marketingScheduleStatus','marketingScheduleMessage'])node(id)?.replaceChildren();}};
})();
