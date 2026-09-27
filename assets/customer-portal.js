(function(){
const path=window.location.pathname.replace(/\/+$/,'')||'/';
const isAccount=path==='/customer/account';
const isCustomerRoute=path==='/customer'||isAccount||(/^\/customer$/.test(path)&&new URLSearchParams(window.location.search).has('business'));
let client=null;
let session=null;
let portalState={customer:null,enquiries:[]};
const byId=id=>document.getElementById(id);

async function initClient(){
  if(!isCustomerRoute)return null;
  try{
    const response=await fetch('/api/public-config',{headers:{Accept:'application/json'}});
    const config=await response.json();
    if(!response.ok||!config?.frontendAuthEnabled||!window.supabase?.createClient)return null;
    client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);
    const current=await client.auth.getSession();session=current.data.session||null;
    window.customerPortalAuthHeaders=async()=>{
      const value=await client.auth.getSession();
      return value.data.session?{Authorization:'Bearer '+value.data.session.access_token}:{};
    };
    client.auth.onAuthStateChange((event,next)=>{session=next||null;window.setTimeout(()=>refreshRoute(),0);});
    return client;
  }catch{return null;}
}

async function portalApi(url,options={}){
  if(!client)throw new Error('Customer sign in is unavailable.');
  const value=await client.auth.getSession();
  const current=value.data.session;
  if(!current)throw new Error('Sign in to continue.');
  const headers=new Headers(options.headers||{});headers.set('Authorization','Bearer '+current.access_token);
  const response=await fetch(url,{...options,headers});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.error||'Customer portal is unavailable.');
  return data;
}

function setCustomerAuthMode(mode){
  const signIn=mode!=='signup';
  byId('customerSignInForm').hidden=!signIn;byId('customerSignUpForm').hidden=signIn;
  byId('customerAuthTabSignIn').classList.toggle('active',signIn);byId('customerAuthTabSignUp').classList.toggle('active',!signIn);
}

function statusDate(value){
  const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
}

function renderEnquiries(target,items,limit=null){
  if(!target)return;target.replaceChildren();
  const rows=limit?items.slice(0,limit):items;
  if(!rows.length){const empty=document.createElement('div');empty.className='customer-empty';empty.textContent='No tracked enquiries yet. Sign in before messaging a business and new enquiries will appear here.';target.append(empty);return;}
  for(const item of rows){
    const card=document.createElement('article');card.className='customer-enquiry-card';
    const top=document.createElement('div');top.className='customer-enquiry-top';
    const copy=document.createElement('div');const title=document.createElement('h4');title.textContent=item.business?.name||'Business';const meta=document.createElement('div');meta.className='meta';meta.textContent=(item.title||'Enquiry')+' · '+statusDate(item.submitted_at);copy.append(title,meta);
    const badge=document.createElement('span');badge.className='customer-status '+String(item.status_key||'received');badge.textContent=item.status||'Received';top.append(copy,badge);card.append(top);
    if(item.summary){const summary=document.createElement('p');summary.textContent=item.summary;card.append(summary);}
    if(item.business_path){const actions=document.createElement('div');actions.className='customer-enquiry-actions';const link=document.createElement('a');link.href=item.business_path;link.textContent='Open business';actions.append(link);card.append(actions);}
    target.append(card);
  }
}

async function loadPortal(){
  portalState=await portalApi('/api/customer-portal');
  const name=portalState.customer?.display_name||portalState.customer?.email||'Customer';
  if(byId('customerPortalGreeting'))byId('customerPortalGreeting').textContent='Welcome, '+name.split('@')[0];
  if(byId('customerPortalEmail'))byId('customerPortalEmail').textContent=portalState.customer?.email||'';
  if(byId('customerProfileName'))byId('customerProfileName').value=portalState.customer?.display_name||'';
  if(byId('customerProfileEmail'))byId('customerProfileEmail').value=portalState.customer?.email||'';
  renderEnquiries(byId('customerRecentEnquiries'),portalState.enquiries||[],3);
  renderEnquiries(byId('customerAllEnquiries'),portalState.enquiries||[]);
}

function showPortalTab(name){
  document.querySelectorAll('[data-customer-pane]').forEach(p=>p.hidden=p.dataset.customerPane!==name);
  document.querySelectorAll('[data-customer-tab]').forEach(b=>b.classList.toggle('active',b.dataset.customerTab===name));
  if(name==='find')searchBusinesses('');
}

async function searchBusinesses(query){
  const target=byId('customerPortalSearchResults');if(!target)return;
  target.innerHTML='<div class="customer-empty">Searching businesses…</div>';
  try{
    const url=new URL('/api/public-businesses',window.location.origin);if(query)url.searchParams.set('q',query);
    const response=await fetch(url.pathname+url.search,{headers:{Accept:'application/json'}});
    const data=await response.json();target.replaceChildren();
    const rows=Array.isArray(data.businesses)?data.businesses:[];
    if(!rows.length){target.innerHTML='<div class="customer-empty">No matching businesses found.</div>';return;}
    for(const business of rows){
      const card=document.createElement('article');card.className='customer-search-result';
      const copy=document.createElement('div');const h=document.createElement('h4');h.textContent=business.name||'Business';const p=document.createElement('p');p.textContent=business.description||business.services||business.type||'Customer enquiries';copy.append(h,p);
      const link=document.createElement('a');link.href=business.message_path||('/customer?business='+encodeURIComponent(business.slug||''));link.textContent='Message';
      card.append(copy,link);target.append(card);
    }
  }catch{target.innerHTML='<div class="customer-empty">Business search is temporarily unavailable.</div>';}
}

async function refreshRoute(){
  if(!isCustomerRoute)return;
  const signedIn=Boolean(session);
  document.querySelectorAll('[data-customer-account-link]').forEach(link=>{link.textContent=signedIn?'My enquiries':'Customer sign in';link.href='/customer/account';});
  const hint=byId('publicCustomerAccountHint');
  if(hint)hint.innerHTML=signedIn?'Signed in · qualifying enquiries will appear in <a href="/customer/account">My enquiries</a>.':'Want to track your enquiry? <a href="/customer/account">Sign in as a customer</a> before sending it.';
  if(!isAccount)return;
  document.body.classList.add('customer-account');
  byId('customerAuthScreen').hidden=signedIn;byId('customerPortalScreen').hidden=!signedIn;
  if(signedIn){try{await loadPortal();}catch{await client.auth.signOut();}}
}

async function bind(){
  byId('customerAuthTabSignIn')?.addEventListener('click',()=>setCustomerAuthMode('signin'));
  byId('customerAuthTabSignUp')?.addEventListener('click',()=>setCustomerAuthMode('signup'));
  byId('customerSignInForm')?.addEventListener('submit',async event=>{
    event.preventDefault();const message=byId('customerSignInMessage');message.textContent='Signing in…';
    const result=await client.auth.signInWithPassword({email:byId('customerSignInEmail').value.trim(),password:byId('customerSignInPassword').value});
    message.textContent=result.error?'Unable to sign in with those details.':'';if(!result.error)await refreshRoute();
  });
  byId('customerSignUpForm')?.addEventListener('submit',async event=>{
    event.preventDefault();const message=byId('customerSignUpMessage');const password=byId('customerSignUpPassword').value;const confirm=byId('customerSignUpConfirm').value;
    if(password.length<12||password!==confirm){message.textContent='Use matching passwords of at least 12 characters.';return;}
    if(!byId('customerPrivacyAcknowledgement').checked){message.textContent='Please acknowledge the Privacy Notice.';return;}
    message.textContent='Creating your customer account…';
    const email=byId('customerSignUpEmail').value.trim();const displayName=byId('customerSignUpName').value.trim();
    const result=await client.auth.signUp({email,password,options:{emailRedirectTo:new URL('/customer/account',window.location.origin).toString()}});
    if(result.error){message.textContent='We could not create the account. Check the details and try again.';return;}
    if(result.data.session){
      session=result.data.session;
      if(displayName){try{await portalApi('/api/customer-portal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile',display_name:displayName})});}catch{}}
      await refreshRoute();
    }else message.textContent='Check your inbox to confirm your email, then return here to sign in.';
  });
  byId('customerPortalLogout')?.addEventListener('click',async()=>{await client.auth.signOut();location.href='/customer/account';});
  document.querySelectorAll('[data-customer-tab]').forEach(button=>button.addEventListener('click',()=>showPortalTab(button.dataset.customerTab)));
  document.querySelectorAll('[data-customer-go]').forEach(button=>button.addEventListener('click',()=>showPortalTab(button.dataset.customerGo)));
  byId('customerPortalSearchForm')?.addEventListener('submit',event=>{event.preventDefault();searchBusinesses(byId('customerPortalSearchInput').value.trim().slice(0,80));});
  byId('customerProfileForm')?.addEventListener('submit',async event=>{
    event.preventDefault();const message=byId('customerProfileMessage');message.textContent='Saving…';
    try{await portalApi('/api/customer-portal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile',display_name:byId('customerProfileName').value})});message.textContent='Account updated.';await loadPortal();}catch(error){message.textContent=error.message;}
  });
}

(async()=>{await initClient();if(!client)return;await bind();await refreshRoute();})();
})();