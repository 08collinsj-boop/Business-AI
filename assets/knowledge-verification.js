(() => {
  const byId=id=>document.getElementById(id);
  const VERSION='knowledge_accuracy_v1';
  const CONFIRMATION='I confirm that I have reviewed this information and that, to the best of my knowledge, it is accurate and authorised for Business AI to use when answering customers and preparing marketing content.';

  const sources=()=>{try{return Array.isArray(knowledgeSources)?knowledgeSources:[];}catch{return [];}};
  const canManage=()=>{try{return Boolean(knowledgeCanManage);}catch{return false;}};
  const reviewDetail=()=>{try{return knowledgeReviewSource||null;}catch{return null;}};
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function verificationState(){
    const current=sources().filter(source=>source.status!=='superseded');
    const active=current.filter(source=>source.status==='active');
    const attention=current.filter(source=>source.status!=='active');
    const needsReview=current.filter(source=>source.status==='needs_review');
    const approvedFacts=active.reduce((sum,source)=>sum+(Number(source.item_counts?.active)||0),0);
    const reviewedTimes=active.map(source=>new Date(source.updated_at||source.activated_at||0).getTime()).filter(Number.isFinite).filter(Boolean);
    return {
      current,
      active,
      attention,
      needsReview,
      approvedFacts,
      verified:current.length>0&&attention.length===0,
      lastReviewed:reviewedTimes.length?new Date(Math.max(...reviewedTimes)).toISOString():null
    };
  }

  function ensurePanel(){
    const card=byId('businessKnowledgeCard');
    if(!card||byId('knowledgeAccuracyPanel'))return;
    const panel=document.createElement('section');
    panel.id='knowledgeAccuracyPanel';
    panel.setAttribute('aria-label','Knowledge accuracy approval');
    panel.innerHTML=`<div class="settings-subsection-head" style="margin-top:14px"><div><span class="settings-card-kicker">Accuracy check</span><h3>Knowledge approval</h3></div><span id="knowledgeAccuracyBadge" class="settings-status-badge">Checking…</span></div><p id="knowledgeAccuracyMessage" class="work-meta">Checking the review status of your uploaded business knowledge…</p><div class="reference-summary-grid reference-summary-grid-three" aria-label="Knowledge approval summary"><div class="reference-summary-card"><span>Approved facts</span><strong id="knowledgeApprovedFactCount">0</strong><small>available to AI</small></div><div class="reference-summary-card attention"><span>Needs attention</span><strong id="knowledgeAttentionCount">0</strong><small>sources</small></div><div class="reference-summary-card"><span>Last reviewed</span><strong id="knowledgeLastReviewed" class="reference-summary-word">—</strong><small>owner/admin review</small></div></div><div id="knowledgeAccuracyActions" class="work-actions" style="margin-top:12px"></div>`;
    const status=byId('knowledgeStatus');
    if(status)status.before(panel);else card.prepend(panel);
  }

  function renderPanel(){
    ensurePanel();
    const badge=byId('knowledgeAccuracyBadge'),message=byId('knowledgeAccuracyMessage'),facts=byId('knowledgeApprovedFactCount'),attention=byId('knowledgeAttentionCount'),last=byId('knowledgeLastReviewed'),actions=byId('knowledgeAccuracyActions');
    if(!badge||!message||!facts||!attention||!last||!actions)return;
    const state=verificationState();
    facts.textContent=String(state.approvedFacts);
    attention.textContent=String(state.attention.length);
    last.textContent=state.lastReviewed?(typeof timeLabel==='function'?(timeLabel(state.lastReviewed)||'Reviewed'):'Reviewed'):'—';
    badge.textContent=state.verified?'Verified':state.current.length?'Review required':'Not verified';
    message.textContent=state.verified
      ?'All current uploaded knowledge has been reviewed and approved by an owner or admin.'
      :state.current.length
        ?'Review every current knowledge source before Business AI can use its extracted facts. Changes and replacement files require a fresh approval.'
        :'Upload a knowledge file, review the extracted facts and confirm accuracy before Business AI can use those facts.';
    actions.replaceChildren();
    if(canManage()&&state.needsReview.length){
      const button=document.createElement('button');
      button.type='button';button.className='small-btn primary-action';button.textContent='Review next';
      button.addEventListener('click',()=>openKnowledgeReview(state.needsReview[0].id));
      actions.appendChild(button);
    }
  }

  function mountConfirmation(){
    const target=byId('knowledgeReview'),detail=reviewDetail();
    if(!target||!detail?.source||!canManage()||!['needs_review','active'].includes(detail.source.status)||byId('knowledgeAccuracyConfirmation'))return;
    const actionRow=target.querySelector('.work-actions');
    if(!actionRow)return;
    const box=document.createElement('div');
    box.id='knowledgeAccuracyConfirmationBox';
    box.className='checkbox-row';
    box.style.marginTop='14px';
    box.innerHTML=`<label for="knowledgeAccuracyConfirmation"><strong>Confirm knowledge accuracy</strong><br><span style="color:var(--muted);font-size:11px;line-height:1.45;display:inline-block;margin-top:4px">${escapeHtml(CONFIRMATION)}</span></label><input id="knowledgeAccuracyConfirmation" type="checkbox" aria-describedby="knowledgeAccuracyConfirmationHelp">`;
    const help=document.createElement('p');
    help.id='knowledgeAccuracyConfirmationHelp';help.className='work-meta';
    help.textContent='Approval is required before these extracted facts become available to the AI. Replacing a source requires a new review.';
    actionRow.before(box,help);
  }

  const originalRenderSources=window.renderKnowledgeSources;
  if(typeof originalRenderSources==='function'){
    window.renderKnowledgeSources=function(...args){const result=originalRenderSources.apply(this,args);renderPanel();return result;};
  }

  const originalRenderReview=window.renderKnowledgeReview;
  if(typeof originalRenderReview==='function'){
    window.renderKnowledgeReview=function(...args){const result=originalRenderReview.apply(this,args);mountConfirmation();return result;};
  }

  window.approveKnowledgeReview=async function(){
    const confirmation=byId('knowledgeAccuracyConfirmation');
    const status=byId('knowledgeStatus');
    if(!confirmation?.checked){
      if(status)status.textContent='Confirm that you have reviewed the knowledge and that it is accurate before saving.';
      confirmation?.focus();
      return;
    }
    const target=byId('knowledgeReviewItems'),detail=reviewDetail();
    if(!target||!detail?.source)return;
    const rows=[...target.querySelectorAll('[data-knowledge-item]')].map(row=>({
      id:row.dataset.knowledgeItem,
      item_type:row.querySelector('[data-k-field="type"]').value,
      title:row.querySelector('[data-k-field="title"]').value.trim(),
      content:row.querySelector('[data-k-field="content"]').value.trim(),
      include:row.querySelector('[data-k-field="include"]').checked
    }));
    const button=byId('knowledgeReview')?.querySelector('.work-actions .primary-action');
    if(button)button.disabled=true;
    if(status)status.textContent='Saving approved knowledge…';
    try{
      knowledgeReviewSource=await api('/api/knowledge',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        action:'approve',source_id:detail.source.id,items:rows,confirmation:true,confirmation_version:VERSION
      })});
      if(status)status.textContent='Approved knowledge is now available to your AI receptionist and Marketing.';
      renderKnowledgeReview();
      await loadKnowledge();
      toast('Business knowledge verified');
    }catch(error){
      if(status)status.innerHTML=`<span class="error">${escapeHtml(error.message||'Could not approve this knowledge.')}</span>`;
    }finally{if(button)button.disabled=false;}
  };

  ensurePanel();
  renderPanel();
})();
