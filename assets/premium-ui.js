(function(){
  const byId=id=>document.getElementById(id);

  if(!document.querySelector('link[data-business-ai-premium-v2]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/assets/premium-v2.css?v=20261003-ui-fixes-1';
    link.dataset.businessAiPremiumV2='true';
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-business-ai-final]')){
    const finalLink=document.createElement('link');
    finalLink.rel='stylesheet';
    finalLink.href='/assets/premium-final.css?v=20261003-final-1';
    finalLink.dataset.businessAiFinal='true';
    document.head.appendChild(finalLink);
  }
  if(!document.querySelector('script[data-business-ai-final]')){
    const finalScript=document.createElement('script');
    finalScript.src='/assets/premium-final.js?v=20261003-final-1';
    finalScript.dataset.businessAiFinal='true';
    document.body.appendChild(finalScript);
  }
  document.documentElement.dataset.businessAiUi='premium-v2';

  if(!document.querySelector('link[data-business-ai-final-showcase]')){
    const finalLink=document.createElement('link');
    finalLink.rel='stylesheet';
    finalLink.href='/assets/final-showcase.css?v=20261003-mobile-4';
    finalLink.dataset.businessAiFinalShowcase='true';
    document.head.appendChild(finalLink);
  }

  document.querySelectorAll('[data-password-toggle]').forEach(button=>{
    button.addEventListener('click',()=>{
      const input=byId(button.dataset.passwordToggle);
      if(!input)return;
      const showing=input.type==='text';
      input.type=showing?'password':'text';
      button.setAttribute('aria-label',showing?'Show password':'Hide password');
      button.setAttribute('aria-pressed',String(!showing));
    });
  });

  const shell=byId('sharedAuthShell');
  const syncShellRole=target=>{
    if(!shell)return;
    const role=target==='customer'?'customer':'business';
    shell.dataset.authRole=role;
    shell.classList.toggle('customer-active',role==='customer');
    shell.classList.toggle('business-active',role==='business');
    const switcher=shell.querySelector('[data-auth-role-switch]');
    if(switcher){
      switcher.classList.toggle('customer-active',role==='customer');
      switcher.classList.toggle('business-active',role==='business');
    }
    shell.querySelectorAll('[data-auth-role-target]').forEach(option=>{
      const active=option.dataset.authRoleTarget===role;
      option.classList.toggle('active',active);
      if(active)option.setAttribute('aria-current','page');
      else option.removeAttribute('aria-current');
    });
  };

  document.querySelectorAll('[data-auth-role-target]').forEach(option=>{
    option.addEventListener('click',()=>syncShellRole(option.dataset.authRoleTarget));
  });

  const roleFromLocation=()=>/^\/customer\/account\/?$/.test(location.pathname)?'customer':'business';
  window.addEventListener('popstate',()=>syncShellRole(roleFromLocation()));
  syncShellRole(roleFromLocation());

  const observer=new MutationObserver(()=>{
    document.documentElement.classList.toggle('business-ai-v2-ready',document.body.classList.contains('auth-ready'));
  });
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  document.documentElement.classList.toggle('business-ai-v2-ready',document.body.classList.contains('auth-ready'));

  if(!document.querySelector('script[data-business-ai-final-showcase]')){
    const finalScript=document.createElement('script');
    finalScript.src='/assets/final-showcase.js?v=20261003-final-2';
    finalScript.dataset.businessAiFinalShowcase='true';
    finalScript.async=false;
    document.body.appendChild(finalScript);
  }

  // Billing tiers should remain visible even if the entitlement/status request is
  // temporarily unavailable. The backend still controls whether checkout can run.
  const originalRenderBilling=window.renderBilling;
  const visibleBillingPlans={
    trial:{name:'Trial',price:'£3.99 / 7 days',detail:'100 AI enquiries · 1 staff account',note:'Ends after seven days. It does not automatically subscribe.'},
    starter:{name:'Starter',price:'£34.99 / month',detail:'250 AI enquiries · 2 staff accounts'},
    pro:{name:'Pro',price:'£79.99 / month',detail:'1,000 AI enquiries · 5 staff accounts'},
    business:{name:'Business',price:'£159.99 / month',detail:'3,000 AI enquiries · 15 staff accounts'}
  };

  window.renderBilling=function(){
    if(typeof originalRenderBilling==='function'&&billingState?.entitlements?.enforced){
      return originalRenderBilling();
    }

    const card=byId('billingCard');
    const badge=byId('billingPlanBadge');
    const summary=byId('billingSummary');
    const plans=byId('billingPlans');
    const manage=byId('manageBillingButton');
    const cancelChange=byId('cancelPlanChangeButton');
    const cancel=byId('cancelBillingButton');
    if(!card||!badge||!summary||!plans||!manage||!cancelChange||!cancel)return;
    if(authenticatedBusinessRole!=='owner'){
      card.hidden=true;
      return;
    }

    card.hidden=false;
    badge.textContent='Plans';
    summary.textContent='Compare the available Business AI plans below. Subscription actions are temporarily unavailable until billing status finishes loading.';
    plans.innerHTML=Object.entries(visibleBillingPlans).map(([plan,item])=>
      '<article class="billing-plan '+(plan==='pro'?'pro':'')+'">'+
        '<h4>'+esc(item.name)+'</h4>'+
        '<strong>'+esc(item.price)+'</strong>'+
        '<p>'+esc(item.detail)+(item.note?'<br>'+esc(item.note):'')+'</p>'+
        '<button class="small-btn '+(plan==='pro'?'primary-action':'')+'" type="button" disabled>Temporarily unavailable</button>'+
      '</article>'
    ).join('');
    manage.hidden=true;
    cancelChange.hidden=true;
    cancel.hidden=true;
  };

  const refreshBillingPlans=()=>{
    if(!document.body.classList.contains('auth-ready'))return;
    try{window.renderBilling();}catch{}
  };
  const billingReadyObserver=new MutationObserver(refreshBillingPlans);
  billingReadyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  refreshBillingPlans();
})();
