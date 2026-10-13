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
  let verifiedEnquiries = [];
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
    const allowed=['Home','Enquiries','Projects','More','Detail'];if(!allowed.includes(screen))return;
    for(const section of allowed){const el=$('colzoExplore'+section);if(el)el.hidden=section!==screen;}
    const tab=screen==='Detail'?'Enquiries':screen;
    document.querySelectorAll('[data-colzo-screen]').forEach(button=>{
      if(button.dataset.colzoScreen===tab)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    if(screen==='Enquiries')renderSearchList();
    $('colzoExplore').scrollIntoView({block:'start',behavior:'instant'});
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
    $('colzoHomeEnquiries').textContent=String(verifiedEnquiries.length);
    renderTrend();
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
    for(const [label,value] of [['Submitted',safeDate(lead.created_at)],['Current status',stage(lead.status)],['Enquiry type',lead.job_type||'General enquiry']]){
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
    token=null;verifiedEnquiries=[];client=null;activeFilter='All';
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
  async function readEnquiries() {
    const response = await fetch(`${source}?kind=enquiries`, {
      method:'GET',cache:'no-store',headers:{Accept:'application/json',Authorization:`Bearer ${token}`}
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(response.status===401||response.status===403?'The original app could not authorise this session.':'The original app could not return enquiries right now.');
    verifiedEnquiries=Array.isArray(data.items)?data.items:[];
    render(verifiedEnquiries,Boolean(data.truncated));
    $('results').hidden=false;
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
  $('colzoSafeSignOut').addEventListener('click',endVerification);
  document.querySelectorAll('[data-colzo-screen]').forEach(button=>button.addEventListener('click',()=>showScreen(button.dataset.colzoScreen)));
  document.querySelectorAll('[data-colzo-filter]').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.colzoFilter;renderSearchList();}));
  $('colzoEnquirySearch').addEventListener('input',renderSearchList);
  $('colzoDetailReturn').addEventListener('click',()=>showScreen(lastListScreen));
  $('colzoOpenEnquiries').addEventListener('click',()=>showScreen('Enquiries'));
  $('colzoOpenProjects').addEventListener('click',()=>showScreen('Projects'));
  $('colzoOpenSettings').addEventListener('click',()=>showScreen('More'));
  $('colzoViewOriginal').addEventListener('click',()=>{window.open('https://app.getbusiness-ai.com/','_blank','noopener,noreferrer');});
  button.disabled=true;
  configure();
})();
