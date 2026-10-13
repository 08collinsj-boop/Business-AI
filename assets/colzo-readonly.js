/* Colzo preview-only verification. Never persists tokens or sends a password
 * to any endpoint except the original Supabase Auth service via its JS SDK. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const status = (message, kind = '') => {const el = $('status'); el.textContent = message; el.className = 'status ' + kind;};
  const button = $('verifyButton');
  const form = $('originalLogin');
  let client = null;
  let token = null;
  let verificationGeneration = 0;
  let refreshBusy = false;
  let verifiedEnquiries = [];
  let verifiedBookings = [];
  let verifiedActions = [];
  let workLoadState = {bookings:'waiting',actions:'waiting'};
  let workTab = 'bookings';
  let activeFilter = 'All';
  let lastListScreen = 'Enquiries';
  const source = '/api/colzo-original-readonly';

  async function configure() {
    try {
      const response = await fetch(`${source}?kind=config`, {cache:'no-store',headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('Original authentication service could not be verified');
      const config = await response.json();
      if (typeof window.supabase?.createClient !== 'function') throw new Error('The sign-in library could not be loaded');
      client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
      });
      status('Ready to verify your original account. Nothing will be changed.');
      button.disabled = false;
    } catch {status('This test is not available yet. Use the original app while we check the preview.', 'warning');}
  }
  const stage = value => value === 'Converted' ? 'Won' : value === 'Contacted' ? 'In Progress' : 'New';
  const safeDate = value => {const date = Date.parse(value||'');return Number.isFinite(date)?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(date):'Not provided';};
  const countFor = target => verifiedEnquiries.filter(row => stage(row.status)===target).length;
  const getEnquiry = id => verifiedEnquiries.find(row => String(row.id)===String(id));
  const create = (tag,cls,content) => {const el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=String(content);return el;};
  function showScreen(screen) {
    const allowed=['Home','Enquiries','Projects','More','Detail','SettingsDetail','QuoteDraft'];if(!allowed.includes(screen))return;
    for(const section of allowed){const el=$('colzoExplore'+section);if(el)el.hidden=section!==screen;}
    const tab=screen==='Detail'?'Enquiries':screen==='SettingsDetail'?'More':screen==='QuoteDraft'?'Home':screen;
    document.querySelectorAll('[data-colzo-screen]').forEach(button=>{
      if(button.dataset.colzoScreen===tab)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    if(screen==='Enquiries')renderSearchList();
    const scroller=$('colzoExplore').querySelector('.colzo-explore-body');
    if(scroller)scroller.scrollTop=0;
  }
  const settingsInfo = Object.freeze({
    profile: { title:'Business profile', intro:'Business details remain managed in the original app.', detail:'This read-only preview does not change your business name, address, trading details, public profile or existing enquiries.' },
    team: { title:'Team members', intro:'Your existing team access stays unchanged.', detail:'Team invitations, roles and permissions must be managed inside your existing Business AI owner account until the new Colzo environment is fully certified.' },
    integrations: { title:'Integrations', intro:'Your connected services remain on the original application.', detail:'Billing, AI receptionist, marketing, Meta and other integrations have not been migrated to this read-only preview. No connection will be modified here.' },
    notifications: { title:'Notifications', intro:'Recent enquiry activity from your verified business. These are records, not push notifications.' },
    appearance: { title:'Appearance', intro:'Try the Colzo display options locally for this session. No preferences are sent to your business.' },
    security: { title:'Security', intro:'Keep account security settings in the original application.', detail:'Password management, MFA and identity settings remain with your existing Business AI account. This preview cannot reset passwords or change authentication.' },
    support: { title:'Help & support', intro:'Your original Business AI support and information remain available.', detail:'This is a limited Colzo compatibility preview. For live account management, use your existing application.' },
    clients: {title:'Enquiry contacts',intro:'People named in your existing enquiry records. This is not yet a separate clients database.'}
  });
  function openSettingsDetail(kind) {
    const config=settingsInfo[kind];if(!config)return;
    $('colzoSettingsDetailTitle').textContent=config.title;
    $('colzoSettingsDetailIntro').textContent=config.intro;
    const content=$('colzoSettingsDetailContents');content.replaceChildren();
    if(kind==='notifications'){
      const rows=verifiedEnquiries.slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,20);
      if(!rows.length)content.append(create('p','colzo-setting-description','No recorded enquiry activity yet.'));
      for(const row of rows){
        const btn=create('button','colzo-setting-activity');btn.type='button';
        const marker=create('span','colzo-setting-activity-icon','▤');
        const main=create('span','colzo-setting-activity-text');main.append(create('strong','',row.name||'Enquiry'),create('small','',(row.job_type||'General enquiry')+' · '+safeDate(row.created_at)));
        const chip=create('span','colzo-setting-activity-status',stage(row.status));
        btn.append(marker,main,chip);btn.addEventListener('click',()=>openDetail(row.id));content.append(btn);
      }
    }else if(kind==='clients'){
      // Names alone do not establish identity. Keep one contact entry per
      // authorised enquiry so two customers with the same name cannot merge.
      const entries=verifiedEnquiries.filter(enquiry=>String(enquiry.name||'').trim());
      entries.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')));
      content.append(create('p','colzo-setting-description',`${entries.length} named enquiry record${entries.length===1?'':'s'}. Repeated names are shown separately because customer identities have not been verified. Client-account editing is not available here.`));
      for(const enquiry of entries){
        const btn=create('button','colzo-setting-activity');btn.type='button';
        const avatar=create('span','colzo-avatar',String(enquiry.name||'E').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase());
        const main=create('span','colzo-setting-activity-text');main.append(create('strong','',enquiry.name),create('small','',(enquiry.job_type||'General enquiry')+' · '+safeDate(enquiry.created_at)));
        btn.append(avatar,main,create('span','colzo-chevron','›'));
        btn.addEventListener('click',()=>openDetail(enquiry.id));content.append(btn);
      }
    }else if(kind==='appearance'){
      for(const [id,title,detail,cls] of [['colzoContrastSwitch','High contrast','Increase separation between cards and text.','colzo-more-contrast'],['colzoMotionSwitch','Reduce motion','Disable decorative transitions in this preview.','colzo-less-motion']]){
        const label=create('label','colzo-pref-control');const main=create('span','');main.append(create('strong','',title),create('small','',detail));
        const checkbox=create('input','');checkbox.type='checkbox';checkbox.id=id;checkbox.checked=$('colzoExplore').classList.contains(cls);
        checkbox.addEventListener('change',()=>{$('colzoExplore').classList.toggle(cls,checkbox.checked);});label.append(main,checkbox);content.append(label);
      }
    }else{
      content.append(create('p','colzo-setting-description',config.detail));
      const link=create('a','colzo-original-link','Open your original Business AI app ↗');link.href='https://app.getbusiness-ai.com/';link.target='_blank';link.rel='noopener noreferrer';content.append(link);
    }
    showScreen('SettingsDetail');
  }
  const workDate = value => {
    if(!value||!Number.isFinite(Date.parse(value)))return 'Date not recorded';
    return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));
  };
  function renderWork(){
    const names={bookings:'bookings',actions:'actions'};
    const kind=workTab;
    const current=kind==='bookings'?verifiedBookings:verifiedActions;
    const state=workLoadState[kind];
    $('colzoWorkStatus').textContent=state==='loaded'
      ?`${current.length} recorded ${names[kind]}. No records can be edited here.`
      :state==='error'?`Your existing ${kind} could not be loaded. Try your original Business AI app.`:'Checking existing work records…';
    document.querySelectorAll('[data-colzo-work]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.colzoWork===kind)));
    const list=$('colzoWorkRecords');list.replaceChildren();
    if(state!=='loaded')return;
    if(!current.length){list.append(create('p','colzo-empty-list',`No ${kind} recorded for your business.`));return;}
    for(const item of current){
      const card=create('article','colzo-work-row');
      const mark=create('span','colzo-work-mark',kind==='bookings'?'▣':'✓');
      const copy=create('span','colzo-work-copy');
      copy.append(create('strong','',item.title||'Untitled '+(kind==='bookings'?'booking':'action')));
      const detail=kind==='bookings'?`${item.customer_name||'Customer not recorded'} · ${workDate(item.starts_at)}`:`${item.priority||'Normal'} priority · ${workDate(item.due_at)}`;
      copy.append(create('small','',detail));
      const end=create('span','colzo-work-stage',item.status||'Unknown');card.append(mark,copy,end);list.append(card);
    }
  }
  function renderUpcomingWork(){
    const root=$('colzoHomeWorkList');root.replaceChildren();
    const connected=workLoadState.bookings==='loaded'||workLoadState.actions==='loaded';
    if(!connected){$('colzoWorkSummaryStatus').textContent='Bookings and actions are not available in this preview yet.';return;}
    const now=Date.now();
    const upcoming=verifiedBookings.filter(x=>x.status!=='cancelled'&&x.status!=='completed'&&(!x.starts_at||Date.parse(x.starts_at)>=now-86400000)).map(x=>({label:'Booking',title:x.title||'Booking',date:x.starts_at,status:x.status}));
    const pending=verifiedActions.filter(x=>x.status==='pending').map(x=>({label:'Action',title:x.title||'Action',date:x.due_at,status:x.status}));
    const combined=[...upcoming,...pending].sort((a,b)=>{const aDate=Date.parse(a.date),bDate=Date.parse(b.date);return (Number.isFinite(aDate)?aDate:Number.MAX_SAFE_INTEGER)-(Number.isFinite(bDate)?bDate:Number.MAX_SAFE_INTEGER)}).slice(0,4);
    $('colzoWorkSummaryStatus').textContent=`${upcoming.length} upcoming booking${upcoming.length===1?'':'s'} · ${pending.length} pending action${pending.length===1?'':'s'}`;
    if(!combined.length){root.append(create('p','colzo-work-subline','No upcoming bookings or pending actions.'));return;}
    for(const item of combined){
      const card=create('div','colzo-upcoming-row');
      const ico=create('span','colzo-upcoming-icon',item.label==='Booking'?'▣':'✓');
      const copy=create('span','colzo-work-copy');copy.append(create('strong','',item.title),create('small','',`${item.label} · ${workDate(item.date)}`));
      const pill=create('span','colzo-work-stage',item.status||'Open');card.append(ico,copy,pill);root.append(card);
    }
  }
  async function loadWorkData(){
    const sessionToken=token;
    if(!sessionToken)return;
    const load=async kind=>{
      try{
        const response=await fetch(`${source}?kind=${kind}`,{method:'GET',cache:'no-store',headers:{Accept:'application/json',Authorization:`Bearer ${sessionToken}`}});
        if(!response.ok)throw new Error('Original endpoint unavailable');
        const payload=await response.json();
        if(!Array.isArray(payload.items))throw new Error('Invalid response');
        if(!token||token!==sessionToken)return;
        if(kind==='bookings')verifiedBookings=payload.items;
        else verifiedActions=payload.items;
        workLoadState[kind]='loaded';
      }catch{if(token===sessionToken)workLoadState[kind]='error';}
    };
    await Promise.allSettled([load('bookings'),load('actions')]);
    if(token!==sessionToken)return;
    renderWork();renderUpcomingWork();
  }
  function openQuoteDraft(){
    if(!token)return;
    const select=$('colzoQuoteLead');select.replaceChildren();
    const placeholder=create('option','','Choose an existing enquiry');placeholder.value='';select.append(placeholder);
    for(const enquiry of verifiedEnquiries){
      const option=create('option','',`${enquiry.name||'Customer'} · ${enquiry.job_type||'General enquiry'}`);
      option.value=String(enquiry.id);select.append(option);
    }
    $('colzoQuoteForm').reset();$('colzoQuoteResult').hidden=true;$('colzoQuoteOutput').value='';
    showScreen('QuoteDraft');
  }
  function buildQuote(event){
    event.preventDefault();if(!token)return;
    const lead=getEnquiry($('colzoQuoteLead').value);
    const title=$('colzoQuoteDescription').value.trim(),amount=Number($('colzoQuotePrice').value);
    const notes=$('colzoQuoteNotes').value.trim();
    const result=$('colzoQuoteResult');result.hidden=true;
    if(!lead||title.length<3||title.length>160||!Number.isFinite(amount)||amount<=0||amount>99999999||Math.abs(Math.round(amount*100)-amount*100)>0.000001)return;
    const gbp=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
    const today=new Intl.DateTimeFormat('en-GB',{dateStyle:'long'}).format(new Date());
    const quote=['DRAFT QUOTATION — REVIEW BEFORE SENDING',`Prepared on: ${today}`,'',`Customer: ${lead.name||'Customer'}`,`Service: ${title}`,`Amount: ${gbp.format(amount)}`];
    if(notes)quote.push('',`Scope / notes:
${notes}`);
    quote.push('','VAT, terms and quotation validity have not been confirmed.','DRAFT ONLY — NOT SENT OR ACCEPTED');
    $('colzoQuoteOutput').value=quote.join('\n');
    $('colzoQuoteMessage').textContent='Draft prepared in this browser only. It has not been saved or sent.';
    result.hidden=false;result.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  async function copyQuote(){
    const value=$('colzoQuoteOutput').value;
    if(!value)return;
    try{
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      $('colzoQuoteMessage').textContent='Quote text copied. Review it before sending to the customer.';
    }catch{
      $('colzoQuoteOutput').focus();$('colzoQuoteOutput').select();
      $('colzoQuoteMessage').textContent='Clipboard access is unavailable here. The draft is selected — use Copy on your device.';
    }
  }
  function renderTrend() {
    const now=new Date(),monthStarts=Array.from({length:6},(_,i)=>new Date(now.getFullYear(),now.getMonth()-5+i,1));
    const counts=monthStarts.map((first,i)=>{
      const after=new Date(first.getFullYear(),first.getMonth()+1,1);
      return verifiedEnquiries.filter(row=>{const value=Date.parse(row.created_at||'');return Number.isFinite(value)&&value>=first.getTime()&&value<after.getTime();}).length;
    });
    const max=Math.max(1,...counts);
    $('colzoTrendLine').setAttribute('points',counts.map((v,i)=>`${16+i*57},${112-Math.round((v/max)*79)}`).join(' '));
    const labels=$('colzoTrendLabels');labels.replaceChildren();
    for(const date of monthStarts)labels.append(create('span','',new Intl.DateTimeFormat('en-GB',{month:'short'}).format(date)));
  }
  function renderHome() {
    const hour=new Date().getHours();
    $('colzoHomeTitle').textContent=hour<12?'Good morning.':hour<18?'Good afternoon.':'Good evening.';
    $('colzoHomeEnquiries').textContent=String(verifiedEnquiries.length);
    renderTrend();
    renderUpcomingWork();
  }
  function renderSearchList() {
    const text=String($('colzoEnquirySearch').value||'').trim().toLowerCase();
    const rows=verifiedEnquiries.filter(row=>(activeFilter==='All'||stage(row.status)===activeFilter)&&(!text||[row.name,row.job_type,row.status].join(' ').toLowerCase().includes(text))).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
    $('colzoEnquiryCount').textContent=`${rows.length} enquir${rows.length===1?'y':'ies'}`;
    document.querySelectorAll('[data-colzo-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.colzoFilter===activeFilter)));
    const root=$('colzoEnquiryCards');root.replaceChildren();
    if(!rows.length){root.append(create('p','colzo-empty-list','No enquiries match these filters.'));return;}
    for(const item of rows){
      const btn=create('button','colzo-lead-card');btn.type='button';btn.dataset.enquiryId=String(item.id);
      const avatar=create('span','colzo-avatar',String(item.name||'E').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase());
      const copy=create('span','colzo-lead-copy');copy.append(create('strong','',item.name||'New enquiry'),create('small','',item.job_type||'General enquiry'));
      const label=create('span','colzo-stage '+(stage(item.status)==='Won'?'stage-won':stage(item.status)==='In Progress'?'stage-progress':'stage-new'),stage(item.status));
      copy.append(label);
      const right=create('span','colzo-lead-side');right.append(create('small','',safeDate(item.created_at)),create('b','', '›'));
      btn.append(avatar,copy,right);btn.addEventListener('click',()=>openDetail(item.id));root.append(btn);
    }
  }
  function openDetail(id) {
    const lead=getEnquiry(id);if(!lead)return;
    const name=lead.name||'New enquiry';
    const root=$('colzoDetailPerson');root.replaceChildren();
    root.append(create('span','colzo-avatar colzo-large-avatar',name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()));
    const copy=create('div','colzo-detail-text');const title=create('h1','',name);title.id='colzoDetailTitle';
    copy.append(title,create('p','',lead.job_type||'General enquiry'),create('span','colzo-stage',stage(lead.status)));root.append(copy);
    const fields=$('colzoDetailFields');fields.replaceChildren();
    const linkedBookings=verifiedBookings.filter(x=>String(x.lead_id)===String(lead.id));
    const linkedActions=verifiedActions.filter(x=>String(x.lead_id)===String(lead.id));
    for(const [label,value] of [['Submitted',safeDate(lead.created_at)],['Current status',stage(lead.status)],['Enquiry type',lead.job_type||'General enquiry'],['Linked bookings',workLoadState.bookings==='loaded'?String(linkedBookings.length):'Unavailable'],['Linked actions',workLoadState.actions==='loaded'?String(linkedActions.length):'Unavailable']]){
      const wrap=create('div','');wrap.append(create('dt','',label),create('dd','',value));fields.append(wrap);
    }
    lastListScreen='Enquiries';showScreen('Detail');
  }
  function openDashboard() {
    if(!token)return;
    document.querySelector('.screen').classList.add('colzo-preview-active');
    $('colzoExplore').hidden=false;
    renderHome();renderSearchList();showScreen('Home');
  }
  function endVerification() {
    // Invalidate in-flight reads before touching the UI, so a stale response
    // can never repopulate another business's data after the owner exits.
    verificationGeneration++;
    const oldClient=client;
    token=null;verifiedEnquiries=[];verifiedBookings=[];verifiedActions=[];workLoadState={bookings:'waiting',actions:'waiting'};client=null;activeFilter='All';
    refreshBusy=false;
    $('colzoRefreshData').disabled=true;$('colzoRefreshStatus').hidden=true;
    if(oldClient?.auth?.signOut)void oldClient.auth.signOut({scope:'local'}).catch(()=>{});
    $('colzoQuoteForm').reset();$('colzoQuoteOutput').value='';$('colzoQuoteResult').hidden=true;
    document.querySelector('.screen').classList.remove('colzo-preview-active');
    $('colzoExplore').hidden=true;
    $('results').hidden=true;$('enquiriesList').replaceChildren();$('colzoEnquiryCards').replaceChildren();form.reset();button.disabled=true;
    status('This verification session has ended. Reload the page to start another.');
    window.scrollTo({top:0,behavior:'instant'});
  }
  function render(items, truncated) {
    const list = $('enquiriesList');list.replaceChildren();
    $('resultsDescription').textContent = items.length
      ? `Signed in to the original account. ${items.length} enquiry record${items.length===1?'':'s'} returned for your authorised business${truncated?' (first 100 shown)':''}. No records were changed.`
      : 'Signed in successfully. No enquiries were returned for the business linked to this account.';
    if (!items.length) return;
    for (const item of items) {
      const card=document.createElement('div');card.className='enquiry';
      const avatar=document.createElement('span');avatar.className='initials';avatar.textContent=String(item.name||'E').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
      const copy=document.createElement('span');copy.className='copy';
      const name=document.createElement('strong');name.textContent=item.name||'Unnamed enquiry';
      const service=document.createElement('small');service.textContent=item.job_type||'General enquiry';
      const stage=document.createElement('span');stage.className='stage';stage.textContent=item.status||'New';
      copy.append(name,service);card.append(avatar,copy,stage);list.append(card);
    }
  }
  async function readEnquiries(expectedToken=token, expectedGeneration=verificationGeneration) {
    if(!expectedToken || expectedGeneration!==verificationGeneration)return false;
    const response=await fetch(`${source}?kind=enquiries`,{
      method:'GET',cache:'no-store',headers:{Accept:'application/json',Authorization:`Bearer ${expectedToken}`}
    });
    const data=await response.json().catch(()=>({}));
    if(token!==expectedToken||verificationGeneration!==expectedGeneration)return false;
    if(!response.ok){
      const error=new Error(response.status===401||response.status===403?'Original account authorisation has expired. End verification and sign in again.':'The original app could not return enquiries right now.');
      error.status=response.status;throw error;
    }
    if(!Array.isArray(data.items))throw new Error('Unexpected enquiry response from the original app.');
    verifiedEnquiries=data.items;
    render(verifiedEnquiries,Boolean(data.truncated));
    $('results').hidden=false;
    return true;
  }
  async function refreshData(){
    if(!token||refreshBusy)return;
    const currentToken=token,currentGeneration=verificationGeneration;
    refreshBusy=true;
    const button=$('colzoRefreshData'),notice=$('colzoRefreshStatus');
    button.disabled=true;notice.hidden=false;notice.textContent='Refreshing authorised business data…';
    try{
      const refreshed=await readEnquiries(currentToken,currentGeneration);
      if(!refreshed||token!==currentToken||verificationGeneration!==currentGeneration)return;
      workLoadState={bookings:'waiting',actions:'waiting'};
      await loadWorkData();
      if(token!==currentToken||verificationGeneration!==currentGeneration)return;
      renderHome();renderSearchList();renderWork();
      notice.textContent='Business data refreshed. No records were changed.';
    }catch(error){
      if(token!==currentToken||verificationGeneration!==currentGeneration)return;
      notice.textContent=error?.status===401||error?.status===403
        ?'Your original account session has expired. End verification and sign in again.'
        :'Refresh unavailable. Previously loaded records are unchanged.';
    }finally{
      refreshBusy=false;
      if(token===currentToken&&verificationGeneration===currentGeneration)button.disabled=false;
    }
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!client)return;
    const email=$('originalEmail').value.trim(),password=$('originalPassword').value;
    if(!email||!password)return;
    button.disabled=true;status('Verifying against the original Business AI authentication service…');
    try {
      const result=await client.auth.signInWithPassword({email,password});
      $('originalPassword').value=''; // clear input immediately after the Auth request
      if (result.error) throw result.error;
      token=result.data?.session?.access_token||null;
      if(!token)throw new Error('No confirmed session');
      status('Original account sign-in successful. Loading authorised enquiries…','success');
      await readEnquiries();
      await loadWorkData();
      status('Read-only verification completed. Your customer records were not changed.','success');
    } catch(error){
      $('originalPassword').value='';
      const code=String(error?.code||'');
      status(code==='invalid_credentials'?'The original authentication service did not accept those sign-in details.':code==='email_not_confirmed'?'Your email needs verification before you can sign in.':'Verification could not complete. Check the original app and try again.', 'warning');
    } finally{button.disabled=false;}
  });
  $('endCheck').addEventListener('click',endVerification);
  $('openColzoExplore').addEventListener('click',openDashboard);
  $('colzoExploreExit').addEventListener('click',endVerification);
  $('colzoRefreshData').addEventListener('click',refreshData);
  $('colzoSafeSignOut').addEventListener('click',endVerification);
  document.querySelectorAll('[data-colzo-setting]').forEach(button=>button.addEventListener('click',()=>openSettingsDetail(button.dataset.colzoSetting)));
  $('colzoSettingsDetailBack').addEventListener('click',()=>showScreen('More'));
  document.querySelectorAll('[data-colzo-screen]').forEach(button=>button.addEventListener('click',()=>showScreen(button.dataset.colzoScreen)));
  document.querySelectorAll('[data-colzo-filter]').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.colzoFilter;renderSearchList();}));
  $('colzoEnquirySearch').addEventListener('input',renderSearchList);
  $('colzoDetailReturn').addEventListener('click',()=>showScreen(lastListScreen));
  $('colzoOpenEnquiries').addEventListener('click',()=>showScreen('Enquiries'));
  $('colzoOpenQuote').addEventListener('click',openQuoteDraft);
  $('colzoOpenContacts').addEventListener('click',()=>openSettingsDetail('clients'));
  $('colzoQuoteBack').addEventListener('click',()=>showScreen('Home'));
  $('colzoQuoteForm').addEventListener('submit',buildQuote);
  $('colzoQuoteCopy').addEventListener('click',copyQuote);
  $('colzoOpenProjects').addEventListener('click',()=>showScreen('Projects'));
  $('colzoHomeOpenWork').addEventListener('click',()=>showScreen('Projects'));
  document.querySelectorAll('[data-colzo-work]').forEach(button=>button.addEventListener('click',()=>{workTab=button.dataset.colzoWork;renderWork();}));

  button.disabled=true;
  configure();
})();
