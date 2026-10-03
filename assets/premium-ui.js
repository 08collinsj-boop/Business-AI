(function(){
  const byId=id=>document.getElementById(id);
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
    shell.dataset.authRole=target==='customer'?'customer':'business';
  };
  document.querySelectorAll('[data-auth-role-target]').forEach(option=>{
    option.addEventListener('click',()=>syncShellRole(option.dataset.authRoleTarget));
  });
  window.addEventListener('popstate',()=>syncShellRole(/^\/customer\/account\/?$/.test(location.pathname)?'customer':'business'));
  if(/^\/customer\/account\/?$/.test(location.pathname))syncShellRole('customer');
})();
