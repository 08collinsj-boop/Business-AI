(function(){
  const byId=id=>document.getElementById(id);

  if(!document.querySelector('link[data-business-ai-premium-v2]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/assets/premium-v2.css?v=20261003-refmatch-1';
    link.dataset.businessAiPremiumV2='true';
    document.head.appendChild(link);
  }
  document.documentElement.dataset.businessAiUi='premium-v2';

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
})();
