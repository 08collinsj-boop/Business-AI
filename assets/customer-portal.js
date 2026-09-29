(function(){
const currentPath=()=>window.location.pathname.replace(/\/+$/,'')||'/';
const isCustomerAccountRoute=()=>currentPath()==='/customer/account';
const isCustomerRoute=()=>currentPath()==='/customer'||isCustomerAccountRoute()||(/^\/customer$/.test(currentPath())&&new URLSearchParams(window.location.search).has('business'));
let client=null;
let session=null;
let customerRuntimeBound=false;
let portalState={customer:null,enquiries:[]};
const byId=id=>document.getElementById(id);
const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));

function setRoleControlState(control,target){
  control.classList.toggle('customer-active',target==='customer');
  control.classList.toggle('business-active',target==='business');
  control.querySelectorAll('[data-auth-role-target]').forEach(option=>{
    const active=option.dataset.authRoleTarget===target;
    option.classList.toggle('active',active);
    if(active)option.setAttribute('aria-current','page');else option.removeAttribute('aria-current');
  });
}

async function showCustomerAuthSurface({updateHistory=true}={}){
  if(updateHistory&&currentPath()!=='/customer/account')history.pushState({authRole:'customer'},'', '/customer/account');
  if(typeof setAppLoading==='function')setAppLoading(false);
  document.body.classList.remove('auth-role-transitioning','auth-required','auth-pending','auth-ready');
  setCustomerSurface(false);
  await ensureCustomerRuntime();
  setCustomerAuthMode('signin');
}

async function showBusinessAuthSurface({updateHistory=true}={}){
  if(updateHistory&&currentPath()!=='/')history.pushState({authRole:'business'},'', '/');
  if(typeof setAppLoading==='function')setAppLoading(false);
  document.body.classList.remove('customer-account','customer-auth-active','customer-portal-ready','auth-role-transitioning');
  const customerAuth=byId('customerAuthScreen');
  const customerPortal=byId('customerPortalScreen');
  if(customerAuth){customerAuth.hidden=true;customerAuth.inert=true;customerAuth.setAttribute('aria-hidden','true');}
  if(customerPortal){customerPortal.hidden=true;customerPortal.inert=true;customerPortal.setAttribute('aria-hidden','true');}
  if(typeof setAuthenticationMode==='function')setAuthenticationMode('login');
  if(typeof setAuthView==='function')setAuthView('auth-required');
  if(typeof frontendAuthEnabled!=='undefined'&&!frontendAuthEnabled&&typeof initializeAuthentication==='function'){
    await initializeAuthentication();
  }
}

function bindAuthRoleSwitches(){
  document.querySelectorAll('[data-auth-role-switch]').forEach(control=>{
    control.querySelectorAll('[data-auth-role-target]').forEach(link=>{
      link.addEventListener('click',async event=>{
        const target=link.dataset.authRoleTarget;
        const alreadyActive=link.classList.contains('active')
          && ((target==='customer'&&isCustomerAccountRoute())||(target==='business'&&currentPath()==='/'));
        if(alreadyActive)return;
        event.preventDefault();
        if(control.classList.contains('switching'))return;
        control.classList.add('switching');
        document.body.classList.add('auth-role-transitioning');
        document.querySelectorAll('[data-auth-role-switch]').forEach(item=>setRoleControlState(item,target));
        await wait(145);
        try{
          if(target==='customer')await showCustomerAuthSurface();
          else await showBusinessAuthSurface();
        }finally{
          document.querySelectorAll('[data-auth-role-switch]').forEach(item=>item.classList.remove('switching'));
          document.body.classList.remove('auth-role-transitioning');
        }
      });
    });
  });
  window.addEventListener('popstate',()=>{
    if(isCustomerAccountRoute())showCustomerAuthSurface({updateHistory:false}).catch(()=>{});
    else if(currentPath()==='/')showBusinessAuthSurface({updateHistory:false}).catch(()=>{});
  });
}
bindAuthRoleSwitches();

async function initClient(){
  if(client)return client;
  try{
    if(typeof supabaseClient!=='undefined'&&supabaseClient){
      client=supabaseClient;
    }else{
      const response=await fetch('/api/public-config',{headers:{Accept:'application/json'}});
      const config=await response.json();
      if(!response.ok||!config?.frontendAuthEnabled||!window.supabase?.createClient)return null;
      client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);
    }
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
  const signInForm=byId('customerSignInForm');
  const signUpForm=byId('customerSignUpForm');
  if(signInForm)signInForm.hidden=!signIn;
  if(signUpForm)signUpForm.hidden=signIn;
  if(signIn)byId('customerSignInEmail')?.focus();
  else byId('customerSignUpName')?.focus();
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
    if(item.business_path||item.review_request?.url){
      const actions=document.createElement('div');actions.className='customer-enquiry-actions';
      if(item.business_path){const link=document.createElement('a');link.href=item.business_path;link.textContent='Open business';actions.append(link);}
      if(item.review_request?.url){
        const review=document.createElement('a');review.className='customer-review-link';review.href=item.review_request.url;review.target='_blank';review.rel='noopener noreferrer';review.textContent='Leave a '+(item.review_request.label||'customer')+' review';actions.append(review);
      }
      card.append(actions);
    }
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

function setCustomerSurface(portalReady){
  if(!isCustomerAccountRoute())return;
  const auth=byId('customerAuthScreen');
  const portal=byId('customerPortalScreen');
  document.body.classList.add('customer-account');
  document.body.classList.toggle('customer-auth-active',!portalReady);
  document.body.classList.toggle('customer-portal-ready',portalReady);
  document.body.classList.remove('auth-role-transitioning');
  if(auth){
    auth.hidden=portalReady;
    auth.inert=portalReady;
    auth.setAttribute('aria-hidden',portalReady?'true':'false');
  }
  if(portal){
    portal.hidden=!portalReady;
    portal.inert=!portalReady;
    portal.setAttribute('aria-hidden',portalReady?'false':'true');
  }
}

async function refreshRoute(){
  if(!isCustomerRoute())return;
  const signedIn=Boolean(session);
  document.querySelectorAll('[data-customer-account-link]').forEach(link=>{link.textContent=signedIn?'My enquiries':'Customer sign in';link.href='/customer/account';});
  const hint=byId('publicCustomerAccountHint');
  if(hint)hint.innerHTML=signedIn?'Signed in · qualifying enquiries will appear in <a href="/customer/account">My enquiries</a>.':'Want to track your enquiry? <a href="/customer/account">Sign in as a customer</a> before sending it.';
  if(!isCustomerAccountRoute())return;

  // Never expose the portal merely because a browser has a Supabase session.
  // The authenticated customer API must succeed before the portal is revealed.
  setCustomerSurface(false);
  if(!signedIn)return;

  try{
    await loadPortal();
    setCustomerSurface(true);
  }catch{
    await client.auth.signOut().catch(()=>{});
    session=null;
    setCustomerSurface(false);
    const message=byId('customerSignInMessage');
    if(message)message.textContent='Your customer session could not be verified. Please sign in again.';
  }
}

async function bindCustomerRuntime(){
  if(customerRuntimeBound)return;
  customerRuntimeBound=true;
  byId('customerShowSignIn')?.addEventListener('click',()=>setCustomerAuthMode('signin'));
  byId('customerShowSignUp')?.addEventListener('click',()=>setCustomerAuthMode('signup'));
  byId('customerSignInForm')?.addEventListener('submit',async event=>{
    event.preventDefault();const message=byId('customerSignInMessage');message.textContent='Signing in…';
    const result=await client.auth.signInWithPassword({email:byId('customerSignInEmail').value.trim(),password:byId('customerSignInPassword').value});
    message.textContent=result.error?'Unable to sign in with those details.':'';if(!result.error)await refreshRoute();
  });
  byId('customerForgotPassword')?.addEventListener('click',async()=>{
    const message=byId('customerSignInMessage');const email=byId('customerSignInEmail')?.value.trim();
    if(!email){message.textContent='Enter your email address first.';return;}
    message.textContent='Requesting a secure reset link…';
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:new URL('/',window.location.origin).toString()});
    message.textContent=error?'We could not request a reset link. Please try again shortly.':'If this email can be used, check your inbox for a secure reset link.';
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
      return;
    }

    // Business and Customer access share one Business AI identity. If these
    // credentials already belong to a confirmed business user, reuse that
    // same account for the Customer portal instead of creating a duplicate.
    const existingSignIn=await client.auth.signInWithPassword({email,password});
    if(!existingSignIn.error&&existingSignIn.data.session){
      session=existingSignIn.data.session;
      if(displayName){try{await portalApi('/api/customer-portal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile',display_name:displayName})});}catch{}}
      await refreshRoute();
      return;
    }

    const confirmationActions=byId('customerConfirmationActions');if(confirmationActions)confirmationActions.hidden=false;
    message.textContent='If this is a new email, check your inbox to confirm it. If you already use this email for Business AI, sign in with your existing password — the same account works for Customer.';
  });
  byId('customerPortalLogout')?.addEventListener('click',async()=>{await client.auth.signOut();location.href='/customer/account';});
  document.querySelectorAll('[data-customer-tab]').forEach(button=>button.addEventListener('click',()=>showPortalTab(button.dataset.customerTab)));
  document.querySelectorAll('[data-customer-go]').forEach(button=>button.addEventListener('click',()=>showPortalTab(button.dataset.customerGo)));
  byId('customerPortalSearchForm')?.addEventListener('submit',event=>{event.preventDefault();searchBusinesses(byId('customerPortalSearchInput').value.trim().slice(0,80));});
  byId('customerResendConfirmation')?.addEventListener('click',async()=>{
    const message=byId('customerSignUpMessage');const email=byId('customerSignUpEmail')?.value.trim();
    if(!email){message.textContent='Enter your email address first.';return;}
    message.textContent='Requesting another confirmation email…';
    const {error}=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:new URL('/customer/account',window.location.origin).toString()}});
    message.textContent=error?'We could not request another confirmation email. Please wait a moment and try again.':'If this address has an unconfirmed account, a new confirmation email will arrive shortly. Already confirmed? Sign in instead.';
  });
  byId('customerProfileForm')?.addEventListener('submit',async event=>{
    event.preventDefault();const message=byId('customerProfileMessage');message.textContent='Saving…';
    try{await portalApi('/api/customer-portal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile',display_name:byId('customerProfileName').value})});message.textContent='Account updated.';await loadPortal();}catch(error){message.textContent=error.message;}
  });
}

async function ensureCustomerRuntime(){
  await initClient();
  if(!client){
    if(isCustomerAccountRoute()){
      setCustomerSurface(false);
      const message=byId('customerSignInMessage');
      if(message)message.textContent='Customer sign in is temporarily unavailable. You can still continue as a guest.';
    }
    return false;
  }
  await bindCustomerRuntime();
  await refreshRoute();
  return true;
}

(async()=>{
  if(isCustomerRoute())await ensureCustomerRuntime();
})();
})();