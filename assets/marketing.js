(() => {
  let epoch = 0, busy = false, output = null, currentGenerationId = null, currentGeneration = null, addons = null, history = [], metaState = null, publications = [], pendingPublicationRequests = new Map();
  const node = id => document.getElementById(id);
  const message = text => { const target=node('marketingMessage'); if(target) target.textContent = text || ''; };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const money = price => ['configured','approved'].includes(price?.state) && Number.isFinite(Number(price.amount)) ? `£${(Number(price.amount)/100).toFixed(2)}/${price.interval || 'month'}` : 'Pricing not configured';
  const when = value => { const d=new Date(value); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}); };

  function selectedCheckoutAddons(){ return [...document.querySelectorAll('[data-addon-checkout]:checked')].map(input=>input.value); }
  window.selectedCheckoutAddons = selectedCheckoutAddons;

  function renderPricing() {
    const target = node('addonPlanOptions'); if(!target) return;
    target.replaceChildren();
    if (!addons) { target.textContent = 'Optional features: view Additional Features for availability.'; return; }
    for (const addon of addons) {
      const label = document.createElement('label'), checkbox = document.createElement('input');
      checkbox.type = 'checkbox'; checkbox.value = addon.key; checkbox.dataset.addonCheckout='1';
      checkbox.disabled = addon.status === 'coming_soon' || (addon.entitlement === 'active' && !addon.trial_included) || addon.pricing?.state !== 'configured';
      const suffix = addon.status === 'coming_soon' ? 'Coming soon' : addon.entitlement === 'active' && !addon.trial_included ? 'Already active' : money(addon.pricing);
      label.append(checkbox, document.createTextNode(`${addon.name} — ${suffix}`)); target.append(label);
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
      const openButton=document.createElement('button'); openButton.type='button'; openButton.className='small-btn'; openButton.textContent=addon.key==='ai_marketing'?'Open Marketing':'View'; openButton.disabled=addon.status==='coming_soon'; openButton.addEventListener('click',()=>showView(addon.key==='ai_marketing'?'marketing':'addons')); actions.append(openButton);
      if(addon.purchasable){ const b=document.createElement('button'); b.type='button'; b.className='small-btn primary-action'; b.textContent='Add to subscription'; b.addEventListener('click',()=>changeAddon('purchase',addon.key)); actions.append(b); }
      if(addon.cancellable){ const b=document.createElement('button'); b.type='button'; b.className='small-btn'; b.textContent='Remove add-on'; b.addEventListener('click',()=>changeAddon('cancel',addon.key)); actions.append(b); }
      if(addon.trial_included) { const trial=document.createElement('p'); trial.textContent='10 Marketing generations included with your trial'; article.append(trial); }
      article.append(badge,title,description,pricing,actions); target.append(article);
    }
  }

  function setBusy(value) {
    busy=value;
    for(const id of ['marketingGenerate','marketingRegenerate','marketingSaveDraft','marketingApprove','marketingDelete','marketingPublishNow','marketingSchedule','marketingCopyMain','marketingCopyShort','marketingCopyCta','marketingCopyTags','marketingCopy']) if(node(id)) node(id).disabled=value;
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
    if(!generation||!output){ node('marketingResult').hidden=true; node('marketingEmpty').hidden=false; return; }
    node('marketing_main_copy').value=output.main_copy||''; node('marketing_short_alternative').value=output.short_alternative||''; node('marketing_call_to_action').value=output.call_to_action||''; node('marketing_hashtags').value=(output.hashtags||[]).join(' ');
    node('marketing_missing').textContent=(output.missing_information||[]).length?`Information to check: ${output.missing_information.join('; ')}`:'';
    const approved=generation.approval_status==='approved'; node('marketingApprovalBadge').textContent=approved?'Approved · Ready to publish':'Draft · Review required'; node('marketingDraftDate').textContent=when(generation.updated_at||generation.created_at);
    node('marketingApprove').hidden=authenticatedBusinessRole!=='owner'||approved; node('marketingSaveDraft').hidden=approved; node('marketingDelete').hidden=!['owner','admin'].includes(authenticatedBusinessRole); node('marketingPublishControls').hidden=!approved;
    for(const id of ['marketing_main_copy','marketing_short_alternative','marketing_call_to_action','marketing_hashtags']) node(id).disabled=approved;
    node('marketingResult').hidden=false; node('marketingEmpty').hidden=true;
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
    if(!history.length){target.innerHTML='<div class="empty">No marketing drafts yet. Create your first draft above and it will be saved here.</div>';historyStatus('');return;}
    const rows=filteredHistory();
    if(!rows.length){target.innerHTML='<div class="empty">No drafts match these filters. Try a different platform or content type.</div>';historyStatus(`${history.length} saved ${history.length===1?'draft':'drafts'} · none match the current filters`);return;}
    historyStatus(`${rows.length} of ${history.length} saved ${history.length===1?'draft':'drafts'}`);
    target.innerHTML=rows.map(item=>{const preview=item.output?.edited_output?.main_copy||item.output?.main_copy||item.request_text||'';return `<article class="work-item ${item.id===currentGenerationId?'marketing-history-active':''}"><div class="work-item-top"><div><h4>${esc(item.platform)} · ${esc(item.content_type)}</h4><div class="work-meta">${esc(item.tone)} · ${esc(when(item.created_at))} · ${item.approval_status==='approved'?'Approved':'Draft'}</div></div><span class="tag">${item.approval_status==='approved'?'Approved':'Draft'}</span></div><div class="work-meta marketing-preview">${esc(previewText(preview))}</div><div class="work-actions"><button class="small-btn" type="button" data-open-marketing="${esc(item.id)}">Open</button><button class="small-btn" type="button" data-reuse-marketing="${esc(item.id)}">Use again</button><button class="small-btn" type="button" data-delete-marketing="${esc(item.id)}">Delete</button></div></article>`;}).join('');
    target.querySelectorAll('[data-open-marketing]').forEach(button=>button.addEventListener('click',()=>openGeneration(button.dataset.openMarketing)));
    target.querySelectorAll('[data-reuse-marketing]').forEach(button=>button.addEventListener('click',()=>reuseGeneration(button.dataset.reuseMarketing)));
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

  function tab(name){
    const create=name!=='history';
    if(node('marketingCreatePane'))node('marketingCreatePane').hidden=!create;
    if(node('marketingHistoryPane'))node('marketingHistoryPane').hidden=create;
    if(node('marketingTabCreate')){node('marketingTabCreate').setAttribute('aria-selected',String(create));node('marketingTabCreate').classList.toggle('primary-action',create);}
    if(node('marketingTabHistory')){node('marketingTabHistory').setAttribute('aria-selected',String(!create));node('marketingTabHistory').classList.toggle('primary-action',!create);}
    if(!create)renderHistory();
  }

  async function generate(event){
    event?.preventDefault(); if(busy)return; const current=epoch; const input=Object.fromEntries(new FormData(node('marketingForm'))); setBusy(true); message('Creating a draft using approved business information…');
    try { const result=await api('/api/marketing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}); if(current!==epoch)return; renderCurrent({id:result.id,content_type:input.content_type,platform:input.platform,tone:input.tone,request_text:input.prompt,extra_instructions:input.extra_instructions||'',output:result.output,approval_status:'draft',created_at:new Date().toISOString(),updated_at:new Date().toISOString()}); message('Draft ready. Check facts, dates and offers before approving. Nothing has been published.'); await loadHistory(); node('marketingResult').focus(); }
    catch(error){if(current===epoch)message(error.message||'Could not generate a draft.');}
    finally{if(current===epoch)setBusy(false);}
  }

  async function saveDraft(){ if(!currentGenerationId||busy)return; setBusy(true); try{const result=await api('/api/marketing',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'edit',generation_id:currentGenerationId,output:outputFromEditor()})}); renderCurrent(result.generation); message('Edits saved. Owner approval is still required before publishing.'); await loadHistory();}catch(error){message(error.message||'Could not save this draft.');}finally{setBusy(false);} }
  async function approveDraft(){ if(!currentGenerationId||busy)return; setBusy(true); try{const result=await api('/api/marketing',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'approve',generation_id:currentGenerationId})}); renderCurrent(result.generation); message('Approved. You can now publish or schedule this exact reviewed version.'); await Promise.all([loadHistory(),loadMeta(),loadPublications()]);}catch(error){message(error.message||'Could not approve this draft.');}finally{setBusy(false);} }
  async function deleteDraft(){ if(!currentGenerationId||busy)return; if(!confirm('Delete this Marketing draft from your library?'))return; setBusy(true); try{await api('/api/marketing',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',generation_id:currentGenerationId})}); currentGenerationId=null;currentGeneration=null;output=null;renderCurrent(null);message('Draft deleted.');await loadHistory();}catch(error){message(error.message||'Could not delete this draft.');}finally{setBusy(false);} }

  async function loadMeta(){
    try{metaState=await api('/api/meta');}catch{metaState=null;}
    const badge=node('metaConnectionBadge'),status=node('metaConnectionStatus'),accounts=node('metaAccounts'),connect=node('metaConnect'),disconnect=node('metaDisconnect'); if(!badge)return;
    if(!metaState?.configured){badge.textContent='Setup required';status.textContent='Meta credentials have not been configured for this Pilot environment yet.';accounts.innerHTML='';connect.disabled=true;disconnect.hidden=true;return;}
    connect.disabled=false; if(!metaState.connected){badge.textContent=metaState.needs_reauth?'Reconnect required':'Not connected';status.textContent='Connect Facebook to load eligible Pages. Instagram professional accounts linked to those Pages will be detected where available.';accounts.innerHTML='';connect.textContent=metaState.needs_reauth?'Reconnect Facebook':'Connect Facebook';disconnect.hidden=true;return;}
    badge.textContent='Connected';status.textContent=metaState.publish_enabled?'Connection ready. Publishing still requires an owner-approved draft.':'Connected. Live publishing is disabled until the Pilot Meta publishing switch is enabled.';connect.textContent='Reconnect Facebook';disconnect.hidden=false;
    const list=Array.isArray(metaState.accounts)?metaState.accounts:[]; accounts.innerHTML=list.length?list.map(a=>`<article class="work-item"><div class="work-item-top"><div><h4>${esc(a.display_name||a.platform)}</h4><div class="work-meta">${esc(a.platform==='facebook'?'Facebook Page':'Instagram professional account')}</div></div><span class="tag">${a.selected?'Selected':'Available'}</span></div>${!a.selected?`<div class="work-actions"><button type="button" class="small-btn" data-select-meta="${esc(a.id)}">Select</button></div>`:''}</article>`).join(''):'<div class="empty">No eligible Pages or professional Instagram accounts were returned by Meta.</div>';
    accounts.querySelectorAll('[data-select-meta]').forEach(button=>button.addEventListener('click',()=>selectMeta(button.dataset.selectMeta)));
  }
  async function connectMeta(){try{const result=await api('/api/meta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'oauth_start'})});if(result.authorization_url?.startsWith('https://'))location.assign(result.authorization_url);else throw new Error('Meta connection is unavailable');}catch(error){message(error.message||'Could not start Meta connection.');}}
  async function selectMeta(id){try{await api('/api/meta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'select_account',account_id:id})});message('Social account selected.');await loadMeta();}catch(error){message(error.message||'Could not select that account.');}}
  async function disconnectMeta(){if(!confirm('Disconnect Facebook and remove stored Meta access tokens from Business AI?'))return;try{await api('/api/meta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'disconnect'})});message('Meta connection removed.');await loadMeta();}catch(error){message(error.message||'Could not disconnect Meta.');}}

  async function loadPublications(){
    try{const data=await api('/api/marketing-publications');publications=Array.isArray(data.publications)?data.publications:[];}catch{publications=[];}
    const target=node('marketingPublications');if(!target)return;if(!publications.length){target.innerHTML='<div class="empty">No publishing activity yet.</div>';return;}
    target.innerHTML=publications.map(item=>`<article class="work-item"><div class="work-item-top"><div><h4>${esc(item.platform)} · ${esc(item.status)}</h4><div class="work-meta">${item.status==='scheduled'?`Scheduled ${esc(when(item.scheduled_for))}`:item.status==='published'?`Published ${esc(when(item.published_at))}`:item.failure_message?esc(item.failure_message):esc(when(item.created_at))}</div></div><span class="tag">${esc(item.status)}</span></div><div class="work-actions">${item.status==='scheduled'?`<button class="small-btn" type="button" data-pub-action="cancel" data-pub-id="${esc(item.id)}">Cancel</button>`:''}${item.status==='failed'&&item.failure_code!=='META_AMBIGUOUS_RESULT'?`<button class="small-btn" type="button" data-pub-action="retry" data-pub-id="${esc(item.id)}">Retry</button>`:''}</div></article>`).join('');
    target.querySelectorAll('[data-pub-action]').forEach(button=>button.addEventListener('click',()=>publicationAction(button.dataset.pubAction,button.dataset.pubId)));
  }
  async function publicationAction(action,id){try{await api('/api/marketing-publications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,publication_id:id})});message(action==='cancel'?'Scheduled publication cancelled.':'Publication retry completed.');await loadPublications();}catch(error){message(error.message||'Could not update publication.');}}
  async function publish(schedule){if(!currentGenerationId||currentGeneration?.approval_status!=='approved')return message('Owner approval is required before publishing.');const platform=node('marketingPublishPlatform').value;const at=node('marketingScheduleAt').value;if(schedule&&!at)return message('Choose a schedule date and time.');const scheduledFor=schedule?new Date(at).toISOString():'';const requestKey=`${currentGenerationId}:${platform}:${scheduledFor||'now'}`;let requestId=pendingPublicationRequests.get(requestKey);if(!requestId){requestId=crypto.randomUUID();pendingPublicationRequests.set(requestKey,requestId);}setBusy(true);try{const body={action:'schedule',generation_id:currentGenerationId,platform,request_id:requestId};if(schedule)body.scheduled_for=scheduledFor;const result=await api('/api/marketing-publications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});pendingPublicationRequests.delete(requestKey);message(result.publication?.status==='published'?'Published successfully.':result.publication?.status==='failed'?(result.publication.failure_message||'Publishing failed.'):'Publication scheduled.');await loadPublications();}catch(error){message(error.message||'Could not publish this draft.');}finally{setBusy(false);}}

  async function open(view){
    if(!['addons','marketing','settings'].includes(view))return; const current=++epoch;
    if(view==='marketing'){node('marketingCreator').hidden=true;node('marketingLocked').hidden=true;message('Checking Marketing access…');}
    if(view==='addons')node('addonStatus').textContent='Loading additional features…';
    try{const result=await api('/api/addons');if(current!==epoch)return;addons=result.addons||[];renderAddons();renderPricing();if(node('addonStatus'))node('addonStatus').textContent='';if(view==='marketing'){const active=addons.some(a=>a.key==='ai_marketing'&&a.entitlement==='active');node('marketingCreator').hidden=!active;node('marketingLocked').hidden=active;if(!active){renderCurrent(null);message('');return;}await Promise.all([loadHistory(),loadMeta(),loadPublications()]);const query=new URLSearchParams(location.search);if(query.get('meta')==='connected')message('Facebook connection completed. Select the Page Business AI may use.');else if(query.get('meta')==='error')message('Facebook connection was not completed. Check the Meta setup and try again.');else message('');}}
    catch(error){if(current!==epoch)return;if(view==='marketing')message(error.message||'Could not check Marketing access.');if(view==='addons')node('addonStatus').textContent=error.message||'Could not load additional features.';}
  }

  node('marketingForm')?.addEventListener('submit',generate);node('marketingRegenerate')?.addEventListener('click',generate);node('marketingSaveDraft')?.addEventListener('click',saveDraft);node('marketingApprove')?.addEventListener('click',approveDraft);node('marketingDelete')?.addEventListener('click',deleteDraft);node('marketingEdit')?.addEventListener('click',()=>{node('marketingPrompt').focus();node('marketingForm').scrollIntoView({behavior:'smooth',block:'start'});});
  async function copyMarketingField(field){
    const value=outputFromEditor();
    const text=field==='main'?value.main_copy:field==='short'?value.short_alternative:field==='cta'?value.call_to_action:field==='tags'?value.hashtags.join(' '):[value.main_copy,value.short_alternative,value.call_to_action,value.hashtags.join(' ')].filter(Boolean).join('\n\n');
    const label=field==='main'?'Main post copied.':field==='short'?'Shorter version copied.':field==='cta'?'Call-to-action copied.':field==='tags'?'Hashtags copied.':'Post, shorter version, call-to-action and hashtags copied.';
    if(!text)return message('There is nothing to copy yet.');
    try{await navigator.clipboard.writeText(text);message(label);}
    catch{message('Copy is unavailable. Select the draft text to copy it manually.');}
  }
  node('marketingRefreshHistory')?.addEventListener('click',loadHistory);node('marketingFilterPlatform')?.addEventListener('change',renderHistory);node('marketingFilterType')?.addEventListener('change',renderHistory);node('marketingFilterSort')?.addEventListener('change',renderHistory);node('marketingCopyMain')?.addEventListener('click',()=>copyMarketingField('main'));node('marketingCopyShort')?.addEventListener('click',()=>copyMarketingField('short'));node('marketingCopyCta')?.addEventListener('click',()=>copyMarketingField('cta'));node('marketingCopyTags')?.addEventListener('click',()=>copyMarketingField('tags'));node('marketingCopy')?.addEventListener('click',()=>copyMarketingField('all'));node('metaConnect')?.addEventListener('click',connectMeta);node('metaDisconnect')?.addEventListener('click',disconnectMeta);node('marketingRefreshPublications')?.addEventListener('click',loadPublications);node('marketingPublishNow')?.addEventListener('click',()=>publish(false));node('marketingSchedule')?.addEventListener('click',()=>publish(true));

  window.marketingWorkspace={open,tab,renderPricing,reset(){epoch+=1;addons=null;output=null;currentGeneration=null;currentGenerationId=null;history=[];metaState=null;publications=[];pendingPublicationRequests.clear();setBusy(false);node('marketingForm')?.reset();if(node('marketingFilterPlatform'))node('marketingFilterPlatform').value='';if(node('marketingFilterType'))node('marketingFilterType').value='';if(node('marketingFilterSort'))node('marketingFilterSort').value='newest';tab('create');renderCurrent(null);for(const id of ['addonCards','addonStatus','addonPlanOptions','marketingHistory','metaAccounts','marketingPublications','marketingMessage','marketingHistoryStatus'])node(id)?.replaceChildren();}};
})();
