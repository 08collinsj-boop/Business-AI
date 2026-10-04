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
  if(!document.querySelector('link[data-business-ai-security]')){
    const securityLink=document.createElement('link');
    securityLink.rel='stylesheet';
    securityLink.href='/assets/security-center.css?v=20261003-security-1';
    securityLink.dataset.businessAiSecurity='true';
    document.head.appendChild(securityLink);
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
    finalLink.href='/assets/final-showcase.css?v=20261004-customer-redesign-1';
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

  if(!document.querySelector('script[data-business-ai-knowledge-verification]')){
    const knowledgeScript=document.createElement('script');
    knowledgeScript.src='/assets/knowledge-verification.js?v=20261003-1';
    knowledgeScript.dataset.businessAiKnowledgeVerification='true';
    knowledgeScript.async=false;
    document.body.appendChild(knowledgeScript);
  }

  if(!document.querySelector('script[data-business-ai-final-showcase]')){
    const finalScript=document.createElement('script');
    finalScript.src='/assets/final-showcase.js?v=20261004-customer-redesign-1';
    finalScript.dataset.businessAiFinalShowcase='true';
    finalScript.async=false;
    document.body.appendChild(finalScript);
  }

  if(!document.querySelector('script[data-business-ai-security]')){
    const securityScript=document.createElement('script');
    securityScript.src='/assets/security-center.js?v=20261003-security-1';
    securityScript.dataset.businessAiSecurity='true';
    securityScript.async=false;
    document.body.appendChild(securityScript);
  }

})();
