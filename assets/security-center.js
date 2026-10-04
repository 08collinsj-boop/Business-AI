(function(){
  const byId=id=>document.getElementById(id);
  const CONTROLS=[
    {key:'ai_receptionist_paused',label:'AI Receptionist',detail:'Stops AI replies and AI receptionist processing.'},
    {key:'customer_submissions_paused',label:'Customer enquiry submissions',detail:'Stops new customer enquiries from being submitted.'},
    {key:'automatic_followups_paused',label:'Automatic follow-ups',detail:'Stops new automatic follow-up actions from being created.'},
    {key:'marketing_generation_paused',label:'Marketing generation',detail:'Stops new AI Marketing copy and generation workflows.'},
    {key:'marketing_publishing_paused',label:'Marketing publishing',detail:'Stops Business AI from publishing Marketing content to connected channels.'}
  ];
  let incidentState=null;
  let pendingEnrollment=null;
  let mounted=false;
  let authReadyCheckRunning=false;
  let activeChallenge=null;

  const currentRole=()=>typeof authenticatedBusinessRole!=='undefined'?authenticatedBusinessRole:null;
  const client=()=>typeof supabaseClient!=='undefined'?supabaseClient:null;
  const notify=message=>{if(typeof toast==='function')toast(message);};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const timeLabel=value=>{if(!value)return '';const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});};

  async function authorisedFetch(path,options={}){
    const authClient=client();
    if(!authClient)throw new Error('Account security is unavailable.');
    const {data:{session}}=await authClient.auth.getSession();
    if(!session?.access_token)throw new Error('Your session has expired.');
    const headers=new Headers(options.headers||{});
    headers.set('Authorization',`Bearer ${session.access_token}`);
    const response=await fetch(path,{...options,headers});
    const data=await response.json().catch(()=>null);
    if(!response.ok){
      const error=new Error(data?.error||'Security request failed.');
      error.status=response.status;
      error.code=data?.code||null;
      throw error;
    }
    return data;
  }

  function injectUi(){
    if(mounted)return true;
    const settingsView=byId('settingsView');
    const hub=settingsView?.querySelector('.settings-hub');
    if(!settingsView||!hub)return false;

    const hubButton=document.createElement('button');
    hubButton.className='settings-hub-card';
    hubButton.type='button';
    hubButton.id='securityCenterHubButton';
    hubButton.innerHTML='<i aria-hidden="true">⌾</i><span><strong>Security &amp; incidents</strong><small>MFA, emergency controls and security activity</small></span><b aria-hidden="true">›</b>';
    hubButton.addEventListener('click',openSecurityCenter);
    hub.appendChild(hubButton);

    const shell=document.createElement('div');
    shell.id='securityCenterShell';
    shell.innerHTML=`
      <div class="settings-section-label">Security &amp; incidents</div>
      <section id="accountSecurityCard" class="card settings-card settings-anchor-card security-card">
        <div class="card-head"><div><span class="settings-card-kicker">Account security</span><h3>Two-step verification</h3></div><span id="securityMfaBadge" class="settings-status-badge">Checking…</span></div>
        <p class="work-meta">Protect this account with a time-based code from an authenticator app. Once enabled, Business AI requires the second factor on future sign-ins.</p>
        <div id="securityMfaState" class="security-state-panel"><div class="security-loading">Checking account security…</div></div>
        <div id="securityMfaEnrollment" class="security-mfa-enrol" hidden>
          <div class="security-mfa-qr"><img id="securityMfaQr" alt="QR code for adding Business AI to an authenticator app"></div>
          <div class="field full"><label for="securityMfaSecret">Manual setup key</label><input id="securityMfaSecret" readonly autocomplete="off" spellcheck="false"></div>
          <div class="field full"><label for="securityMfaCode">6-digit authenticator code</label><input id="securityMfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000"></div>
          <p id="securityMfaEnrollmentStatus" class="work-meta" role="status" aria-live="polite"></p>
          <div class="work-actions"><button id="securityMfaVerify" class="small-btn primary-action" type="button">Enable two-step verification</button><button id="securityMfaCancel" class="small-btn" type="button">Cancel setup</button></div>
        </div>
      </section>

      <section id="incidentCentreCard" class="card settings-card settings-anchor-card security-card" hidden>
        <div class="card-head"><div><span class="settings-card-kicker">Incident Centre</span><h3>Emergency controls</h3></div><span id="incidentCentreBadge" class="settings-status-badge">Checking…</span></div>
        <p class="work-meta">Pause high-risk automation immediately without taking the whole Business AI workspace offline. Pauses are enforced by the server and recorded in the audit trail.</p>
        <div id="incidentPlatformNotice" class="security-platform-notice" hidden></div>
        <div id="incidentControlsList" class="security-control-list"></div>
        <div class="field full security-reason-field"><label for="incidentReason">Reason for this change</label><textarea id="incidentReason" maxlength="500" placeholder="For example: investigating unexpected Marketing publishing behaviour"></textarea><span class="work-meta">Required when changing a control. Keep it factual so the audit trail is useful.</span></div>
        <p id="incidentCentreStatus" class="work-meta" role="status" aria-live="polite"></p>
        <div class="work-actions"><button id="incidentSaveControls" class="small-btn primary-action" type="button">Save safety controls</button><button id="incidentRefreshControls" class="small-btn" type="button">Refresh</button></div>
      </section>

      <section id="securityActivityCard" class="card settings-card settings-anchor-card security-card" hidden>
        <div class="card-head"><div><span class="settings-card-kicker">Security activity</span><h3>Recent protection events</h3></div><button id="securityActivityRefresh" class="small-btn" type="button">Refresh</button></div>
        <p class="work-meta">Recent incident-control and security events from this business audit trail.</p>
        <div id="securityActivityList" class="work-list"><div class="empty">Loading security activity…</div></div>
      </section>`;

    const retention=byId('privacyRetentionCard');
    if(retention)retention.insertAdjacentElement('afterend',shell);
    else settingsView.appendChild(shell);

    byId('securityMfaVerify')?.addEventListener('click',verifyEnrollment);
    byId('securityMfaCancel')?.addEventListener('click',cancelEnrollment);
    byId('incidentSaveControls')?.addEventListener('click',saveIncidentControls);
    byId('incidentRefreshControls')?.addEventListener('click',()=>loadIncidentControls(true));
    byId('securityActivityRefresh')?.addEventListener('click',()=>loadSecurityActivity(true));
    mounted=true;
    return true;
  }

  function openSecurityCenter(){
    const card=byId('accountSecurityCard');
    card?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    card?.classList.remove('settings-focus-pulse');
    requestAnimationFrame(()=>card?.classList.add('settings-focus-pulse'));
    loadMfaState();
    if(['owner','admin'].includes(currentRole())){loadIncidentControls();loadSecurityActivity();}
  }

  function renderIncidentControls(){
    const card=byId('incidentCentreCard');
    const activity=byId('securityActivityCard');
    const role=currentRole();
    const canManage=['owner','admin'].includes(role);
    if(card)card.hidden=!canManage;
    if(activity)activity.hidden=!canManage;
    if(!canManage)return;
    const list=byId('incidentControlsList');
    const badge=byId('incidentCentreBadge');
    const platformNotice=byId('incidentPlatformNotice');
    if(!list||!badge)return;
    if(!incidentState){list.innerHTML='<div class="security-loading">Loading emergency controls…</div>';badge.textContent='Checking…';return;}
    const paused=CONTROLS.filter(item=>incidentState.effective?.[item.key]).length;
    badge.textContent=paused?`${paused} paused`:'All systems available';
    badge.classList.toggle('is-warning',paused>0);
    const platformPaused=CONTROLS.filter(item=>incidentState.platform?.[item.key]);
    if(platformNotice){
      platformNotice.hidden=!platformPaused.length;
      platformNotice.innerHTML=platformPaused.length?`<strong>Business AI platform protection active.</strong><span>${esc(platformPaused.map(item=>item.label).join(', '))} ${platformPaused.length===1?'is':'are'} paused centrally and cannot be resumed from this business.</span>`:'';
    }
    list.innerHTML=CONTROLS.map(item=>{
      const businessPaused=incidentState.controls?.[item.key]===true;
      const platformOverride=incidentState.platform?.[item.key]===true;
      const effective=incidentState.effective?.[item.key]===true;
      const adminLocked=role!=='owner'&&businessPaused;
      const disabled=platformOverride||adminLocked;
      const source=platformOverride?'Platform pause':businessPaused?'Business pause':'Available';
      const sourceClass=effective?'paused':'available';
      return `<label class="security-control-row ${effective?'is-paused':''}"><span class="security-control-copy"><strong>${esc(item.label)}</strong><small>${esc(item.detail)}</small><em class="security-control-source ${sourceClass}">${esc(source)}${adminLocked?' · owner required to resume':''}</em></span><input class="switch" type="checkbox" data-incident-control="${esc(item.key)}" ${effective?'checked':''} ${disabled?'disabled':''} aria-label="Pause ${esc(item.label)}"></label>`;
    }).join('');
    const reason=byId('incidentReason');
    if(reason&&!reason.matches(':focus'))reason.value=incidentState.controls?.reason||'';
    updatePauseBanner();
  }

  async function loadIncidentControls(showFeedback=false){
    if(!['owner','admin'].includes(currentRole()))return;
    if(!incidentState)renderIncidentControls();
    try{
      incidentState=await authorisedFetch('/api/incident-controls',{headers:{Accept:'application/json'},cache:'no-store'});
      renderIncidentControls();
      if(showFeedback)notify('Incident controls refreshed');
    }catch(error){
      const status=byId('incidentCentreStatus');
      if(status)status.textContent=error.message||'Incident controls are unavailable.';
      const badge=byId('incidentCentreBadge');if(badge)badge.textContent='Unavailable';
    }
  }

  function updatePauseBanner(){
    const app=byId('dashboardApp');
    if(!app||!incidentState)return;
    const paused=CONTROLS.filter(item=>incidentState.effective?.[item.key]);
    let banner=byId('securityPauseBanner');
    if(!paused.length){banner?.remove();return;}
    if(!banner){
      banner=document.createElement('div');
      banner.id='securityPauseBanner';
      banner.className='security-pause-banner';
      banner.setAttribute('role','status');
      app.prepend(banner);
    }
    banner.innerHTML=`<span aria-hidden="true">!</span><div><strong>Safety pause active</strong><small>${esc(paused.map(item=>item.label).join(', '))}</small></div><button type="button">Review</button>`;
    banner.querySelector('button')?.addEventListener('click',()=>{if(typeof showView==='function')showView('settings');requestAnimationFrame(openSecurityCenter);});
  }

  async function saveIncidentControls(){
    if(!incidentState)return loadIncidentControls();
    const role=currentRole();
    if(!['owner','admin'].includes(role))return;
    const changes={};
    let resumes=false;
    for(const item of CONTROLS){
      if(incidentState.platform?.[item.key])continue;
      const input=document.querySelector(`[data-incident-control="${item.key}"]`);
      if(!input||input.disabled&&role!=='owner')continue;
      const before=incidentState.controls?.[item.key]===true;
      const after=input.checked===true;
      if(before!==after){changes[item.key]=after;if(before&&!after)resumes=true;}
    }
    if(!Object.keys(changes).length){notify('No safety-control changes to save');return;}
    const reason=String(byId('incidentReason')?.value||'').trim();
    if(reason.length<3){const status=byId('incidentCentreStatus');if(status)status.textContent='Add a short reason before changing a safety control.';byId('incidentReason')?.focus();return;}
    if(resumes&&role==='owner'){
      const verified=await ensureAal2ForAction();
      if(!verified)return;
    }
    const button=byId('incidentSaveControls');if(button)button.disabled=true;
    const status=byId('incidentCentreStatus');if(status)status.textContent='Applying server-side safety controls…';
    try{
      incidentState=await authorisedFetch('/api/incident-controls',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...changes,reason})});
      renderIncidentControls();
      if(status)status.textContent='Safety controls updated and recorded in the audit trail.';
      notify('Safety controls updated');
      await loadSecurityActivity();
    }catch(error){
      if(error.code==='MFA_REQUIRED'){
        const verified=await ensureAal2ForAction();
        if(verified)return saveIncidentControls();
      }
      if(status)status.textContent=error.message||'Could not update safety controls.';
      await loadIncidentControls();
    }finally{if(button)button.disabled=false;}
  }

  async function loadSecurityActivity(showFeedback=false){
    if(!['owner','admin'].includes(currentRole()))return;
    const list=byId('securityActivityList');if(!list)return;
    try{
      const rows=await authorisedFetch('/api/audit-log',{headers:{Accept:'application/json'},cache:'no-store'});
      const events=(Array.isArray(rows)?rows:[]).filter(row=>String(row.action||'').startsWith('incident.')||String(row.action||'').startsWith('security.')).slice(0,6);
      list.innerHTML=events.length?events.map(event=>`<article class="work-item security-event"><div class="work-item-top"><div><h4>${esc(String(event.action||'Security event').replaceAll('.',' · ').replaceAll('_',' '))}</h4><div class="work-meta">${esc(timeLabel(event.created_at)||'Recently')} · ${esc(event.resource_type||'security')}</div></div><span class="tag">Recorded</span></div></article>`).join(''):'<div class="empty">No security or incident events have been recorded for this business yet.</div>';
      if(showFeedback)notify('Security activity refreshed');
    }catch(error){list.innerHTML=`<div class="error">${esc(error.message||'Could not load security activity.')}</div>`;}
  }

  async function mfaSnapshot(){
    const authClient=client();if(!authClient)throw new Error('Account security is unavailable.');
    const [aalResult,factorResult]=await Promise.all([authClient.auth.mfa.getAuthenticatorAssuranceLevel(),authClient.auth.mfa.listFactors()]);
    if(aalResult.error)throw aalResult.error;if(factorResult.error)throw factorResult.error;
    const totp=Array.isArray(factorResult.data?.totp)?factorResult.data.totp:[];
    return {aal:aalResult.data,factors:totp,verified:totp.filter(factor=>factor.status==='verified')};
  }

  function renderMfaSnapshot(snapshot){
    const badge=byId('securityMfaBadge'),state=byId('securityMfaState');if(!badge||!state)return;
    const enabled=snapshot.verified.length>0;
    const aal2=snapshot.aal?.currentLevel==='aal2';
    badge.textContent=enabled?(aal2?'MFA verified':'MFA enabled'):'Not enabled';
    badge.classList.toggle('is-success',enabled);
    if(enabled){
      state.innerHTML=`<div class="security-account-row"><div><strong>Authenticator app enabled</strong><small>${aal2?'This session has completed two-step verification.':'Your account is protected. A code will be required before this session can perform protected actions.'}</small></div><div class="work-actions"><button id="securityMfaVerifySession" class="small-btn" type="button" ${aal2?'hidden':''}>Verify this session</button><button id="securityMfaRemove" class="small-btn danger" type="button">Remove authenticator</button></div></div>`;
      byId('securityMfaVerifySession')?.addEventListener('click',()=>ensureAal2ForAction());
      byId('securityMfaRemove')?.addEventListener('click',()=>removeMfaFactor(snapshot.verified[0]));
    }else{
      state.innerHTML='<div class="security-account-row"><div><strong>Add an authenticator app</strong><small>Use an app such as your password manager or authenticator to generate a rotating 6-digit code.</small></div><button id="securityMfaStart" class="small-btn primary-action" type="button">Set up authenticator</button></div>';
      byId('securityMfaStart')?.addEventListener('click',beginMfaEnrollment);
    }
  }

  async function loadMfaState(){
    const state=byId('securityMfaState');if(!state)return;
    state.innerHTML='<div class="security-loading">Checking two-step verification…</div>';
    try{renderMfaSnapshot(await mfaSnapshot());}
    catch(error){state.innerHTML=`<div class="error">${esc(error.message||'Account security is unavailable.')}</div>`;const badge=byId('securityMfaBadge');if(badge)badge.textContent='Unavailable';}
  }

  async function beginMfaEnrollment(){
    const authClient=client();if(!authClient)return;
    const status=byId('securityMfaEnrollmentStatus');
    try{
      const current=await mfaSnapshot();
      for(const factor of current.factors.filter(item=>item.status!=='verified')){try{await authClient.auth.mfa.unenroll({factorId:factor.id});}catch{}}
      const {data,error}=await authClient.auth.mfa.enroll({factorType:'totp',friendlyName:'Business AI'});
      if(error)throw error;
      pendingEnrollment=data;
      const area=byId('securityMfaEnrollment');area.hidden=false;
      byId('securityMfaQr').src=data.totp?.qr_code||'';
      byId('securityMfaSecret').value=data.totp?.secret||'';
      byId('securityMfaCode').value='';
      if(status)status.textContent='Scan the QR code, then enter the 6-digit code to finish setup.';
      area.scrollIntoView({behavior:'smooth',block:'center'});
      byId('securityMfaCode')?.focus();
    }catch(error){if(status)status.textContent=error.message||'Could not start authenticator setup.';}
  }

  async function verifyEnrollment(){
    const authClient=client();const code=String(byId('securityMfaCode')?.value||'').replace(/\s+/g,'');const status=byId('securityMfaEnrollmentStatus');
    if(!authClient||!pendingEnrollment?.id)return;
    if(!/^\d{6}$/.test(code)){if(status)status.textContent='Enter the current 6-digit code from your authenticator app.';return;}
    const button=byId('securityMfaVerify');if(button)button.disabled=true;
    try{
      const challenge=await authClient.auth.mfa.challenge({factorId:pendingEnrollment.id});if(challenge.error)throw challenge.error;
      const verify=await authClient.auth.mfa.verify({factorId:pendingEnrollment.id,challengeId:challenge.data.id,code});if(verify.error)throw verify.error;
      pendingEnrollment=null;byId('securityMfaEnrollment').hidden=true;if(status)status.textContent='';
      notify('Two-step verification enabled');await loadMfaState();
    }catch(error){if(status)status.textContent=error.message||'That code could not be verified.';}
    finally{if(button)button.disabled=false;}
  }

  async function cancelEnrollment(){
    const authClient=client();const factorId=pendingEnrollment?.id;pendingEnrollment=null;
    if(factorId&&authClient){try{await authClient.auth.mfa.unenroll({factorId});}catch{}}
    const area=byId('securityMfaEnrollment');if(area)area.hidden=true;
    await loadMfaState();
  }

  async function removeMfaFactor(factor){
    const authClient=client();if(!authClient||!factor?.id)return;
    if(!window.confirm('Remove this authenticator from your Business AI account?'))return;
    const verified=await ensureAal2ForAction();if(!verified)return;
    const {error}=await authClient.auth.mfa.unenroll({factorId:factor.id});
    if(error){notify(error.message||'Could not remove authenticator');return;}
    try{await authClient.auth.refreshSession();}catch{}
    notify('Authenticator removed');await loadMfaState();
  }

  function ensureMfaOverlay(){
    let overlay=byId('securityMfaGate');if(overlay)return overlay;
    overlay=document.createElement('div');overlay.id='securityMfaGate';overlay.className='security-mfa-gate';overlay.hidden=true;
    overlay.innerHTML=`<section class="security-mfa-dialog" role="dialog" aria-modal="true" aria-labelledby="securityMfaGateTitle"><span class="settings-card-kicker">Protected action</span><h2 id="securityMfaGateTitle">Verify it’s you</h2><p id="securityMfaGateCopy">Enter the current code from your authenticator app.</p><label class="field full" for="securityMfaGateCode"><span>Authenticator code</span><input id="securityMfaGateCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label><p id="securityMfaGateStatus" class="work-meta" role="alert"></p><div class="work-actions"><button id="securityMfaGateVerify" class="small-btn primary-action" type="button">Verify</button><button id="securityMfaGateCancel" class="small-btn" type="button">Cancel</button><button id="securityMfaGateLogout" class="small-btn danger" type="button">Log out</button></div></section>`;
    document.body.appendChild(overlay);
    byId('securityMfaGateVerify')?.addEventListener('click',verifyActiveChallenge);
    byId('securityMfaGateCancel')?.addEventListener('click',()=>finishChallenge(false));
    byId('securityMfaGateLogout')?.addEventListener('click',async()=>{const authClient=client();if(authClient)await authClient.auth.signOut();finishChallenge(false);});
    return overlay;
  }

  async function challengeForAal2({blocking=false,reason='Confirm this protected action.'}={}){
    const authClient=client();if(!authClient)return false;
    const snapshot=await mfaSnapshot();
    if(snapshot.aal?.currentLevel==='aal2')return true;
    const factor=snapshot.verified[0];
    if(!factor){
      notify('Set up two-step verification in Account security first');
      if(typeof showView==='function')showView('settings');requestAnimationFrame(openSecurityCenter);
      return false;
    }
    if(activeChallenge)return activeChallenge.promise;
    const overlay=ensureMfaOverlay();
    byId('securityMfaGateCopy').textContent=reason;
    byId('securityMfaGateCode').value='';
    byId('securityMfaGateStatus').textContent='';
    byId('securityMfaGateCancel').hidden=blocking;
    overlay.hidden=false;
    document.body.classList.add('security-mfa-required');
    const app=byId('dashboardApp');if(app)app.inert=true;
    const promise=new Promise(resolve=>{activeChallenge={resolve,promise:null,factor,blocking};});
    activeChallenge.promise=promise;
    requestAnimationFrame(()=>byId('securityMfaGateCode')?.focus());
    return promise;
  }

  async function verifyActiveChallenge(){
    if(!activeChallenge)return;
    const authClient=client();const code=String(byId('securityMfaGateCode')?.value||'').replace(/\s+/g,'');const status=byId('securityMfaGateStatus');
    if(!/^\d{6}$/.test(code)){status.textContent='Enter the current 6-digit authenticator code.';return;}
    const button=byId('securityMfaGateVerify');button.disabled=true;status.textContent='Verifying…';
    try{
      const challenge=await authClient.auth.mfa.challenge({factorId:activeChallenge.factor.id});if(challenge.error)throw challenge.error;
      const verify=await authClient.auth.mfa.verify({factorId:activeChallenge.factor.id,challengeId:challenge.data.id,code});if(verify.error)throw verify.error;
      const aal=await authClient.auth.mfa.getAuthenticatorAssuranceLevel();if(aal.error||aal.data?.currentLevel!=='aal2')throw new Error('Two-step verification did not complete.');
      finishChallenge(true);await loadMfaState();
    }catch(error){status.textContent=error.message||'That code could not be verified.';}
    finally{button.disabled=false;}
  }

  function finishChallenge(result){
    const challenge=activeChallenge;activeChallenge=null;
    const overlay=byId('securityMfaGate');if(overlay)overlay.hidden=true;
    document.body.classList.remove('security-mfa-required');
    const app=byId('dashboardApp');if(app)app.inert=false;
    challenge?.resolve(Boolean(result));
  }

  async function ensureAal2ForAction(){
    try{return await challengeForAal2({blocking:false,reason:'This action changes a safety protection. Verify with your authenticator app to continue.'});}
    catch(error){notify(error.message||'Two-step verification is unavailable');return false;}
  }

  window.businessAiVerifyProtectedAction=async()=>{
    try{return await challengeForAal2({blocking:false,reason:'Verify with your authenticator app to continue this protected owner action.'});}
    catch(error){notify(error.message||'Two-step verification is unavailable');return false;}
  };

  async function enforceExistingMfa(){
    if(authReadyCheckRunning||!document.body.classList.contains('auth-ready'))return;
    authReadyCheckRunning=true;
    try{
      const snapshot=await mfaSnapshot();
      if(snapshot.aal?.currentLevel==='aal1'&&snapshot.aal?.nextLevel==='aal2'){
        await challengeForAal2({blocking:true,reason:'Your account has two-step verification enabled. Enter your authenticator code to open Business AI.'});
      }
    }catch{}finally{authReadyCheckRunning=false;}
  }

  async function refreshForAuthenticatedState(){
    if(!document.body.classList.contains('auth-ready'))return;
    if(!injectUi())return;
    await loadMfaState();
    if(['owner','admin'].includes(currentRole())){await Promise.all([loadIncidentControls(),loadSecurityActivity()]);}
    enforceExistingMfa();
  }

  const bodyObserver=new MutationObserver(()=>{
    if(document.body.classList.contains('auth-ready'))refreshForAuthenticatedState();
    else if(activeChallenge)finishChallenge(false);
  });
  bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('pageshow',refreshForAuthenticatedState);
  if(document.body.classList.contains('auth-ready'))refreshForAuthenticatedState();
})();
