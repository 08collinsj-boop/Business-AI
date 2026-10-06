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


  // Repair legacy UTF-8 mojibake in visible app chrome and use SVGs for the
  // authentication icons so rendering no longer depends on text encoding.
  const mojibakePattern=/(?:\u00e2[\u0080-\u00ff]{2}|\u00c3[\u0080-\u00ff]|\u00c2[\u0080-\u00ff])/g;
  const utf8Decoder=typeof TextDecoder==='function'?new TextDecoder('utf-8',{fatal:true}):null;
  const repairMojibake=value=>{
    if(!value||!utf8Decoder)return value;
    return String(value).replace(mojibakePattern,chunk=>{
      try{
        const bytes=Uint8Array.from(Array.from(chunk),character=>character.charCodeAt(0));
        return utf8Decoder.decode(bytes);
      }catch(_error){
        return chunk;
      }
    });
  };
  const repairAttributes=element=>{
    ['placeholder','title','aria-label'].forEach(name=>{
      if(!element.hasAttribute||!element.hasAttribute(name))return;
      const before=element.getAttribute(name);
      const after=repairMojibake(before);
      if(after!==before)element.setAttribute(name,after);
    });
  };
  const repairTree=node=>{
    if(!node)return;
    if(node.nodeType===Node.TEXT_NODE){
      const before=node.nodeValue;
      const after=repairMojibake(before);
      if(after!==before)node.nodeValue=after;
      return;
    }
    if(node.nodeType!==Node.ELEMENT_NODE&&node.nodeType!==Node.DOCUMENT_FRAGMENT_NODE)return;
    if(node.nodeType===Node.ELEMENT_NODE){
      if(/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(node.tagName))return;
      repairAttributes(node);
    }
    Array.from(node.childNodes||[]).forEach(repairTree);
  };

  const iconSvg=body=>'<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>';
  const authIcons={
    business:iconSvg('<path d="M4 21V6.5A1.5 1.5 0 0 1 5.5 5h8A1.5 1.5 0 0 1 15 6.5V21"/><path d="M15 9h3.5A1.5 1.5 0 0 1 20 10.5V21M8 9h3M8 13h3M8 17h3M3 21h18"/>'),
    customer:iconSvg('<circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.7-4 2.8-6 6.5-6s5.8 2 6.5 6"/>'),
    email:iconSvg('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/>'),
    password:iconSvg('<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
    eye:iconSvg('<path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.5"/>')
  };
  const setAuthSvgIcon=(element,markup,key)=>{
    if(!element)return;
    if(element.dataset.businessAiSvgIcon===key&&element.querySelector('svg'))return;
    element.innerHTML=markup;
    element.dataset.businessAiSvgIcon=key;
  };
  const applyAuthSvgIcons=()=>{
    const businessIcon=document.querySelector('[data-auth-role-target="business"] .auth-role-option-icon');
    const customerIcon=document.querySelector('[data-auth-role-target="customer"] .auth-role-option-icon');
    setAuthSvgIcon(businessIcon,authIcons.business,'business');
    setAuthSvgIcon(customerIcon,authIcons.customer,'customer');
    document.querySelectorAll('.auth-input').forEach(label=>{
      const icon=label.querySelector('i');
      const input=label.querySelector('input');
      if(!icon||!input)return;
      const key=input.type==='email'?'email':(input.type==='password'?'password':'customer');
      setAuthSvgIcon(icon,authIcons[key],key);
    });
    document.querySelectorAll('[data-password-toggle]').forEach(button=>{
      setAuthSvgIcon(button,authIcons.eye,'eye');
    });
  };

  repairTree(document.body);
  applyAuthSvgIcons();

  const glyph=code=>String.fromCodePoint(code);
  if(!document.querySelector('style[data-business-ai-encoding-fix]')){
    const style=document.createElement('style');
    style.dataset.businessAiEncodingFix='true';
    style.textContent=`
      .auth-role-option-icon svg,.auth-input>i svg,.auth-password-toggle svg{display:block;margin:auto}
      .public-detail.has-content:before{content:"${glyph(0x2022)}"!important}
      .public-detail#publicBusinessAreas:before{content:"${glyph(0x2316)}"!important}
      .public-detail#publicBusinessHours:before{content:"${glyph(0x25f7)}"!important}
      .public-detail#publicBusinessPhone:before{content:"${glyph(0x260e)}"!important}
      .dashboard-launch:before{content:"${glyph(0x203a)}"!important}
      .ai-screen-title:after{content:"${glyph(0x2726)}"!important}
    `;
    document.head.appendChild(style);
  }

  const encodingObserver=new MutationObserver(mutations=>{
    mutations.forEach(mutation=>{
      if(mutation.type==='characterData')repairTree(mutation.target);
      if(mutation.type==='attributes')repairAttributes(mutation.target);
      if(mutation.addedNodes)mutation.addedNodes.forEach(node=>repairTree(node));
    });
    applyAuthSvgIcons();
  });
  encodingObserver.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});

  if(!document.querySelector('link[data-business-ai-final-showcase]')){
    const finalLink=document.createElement('link');
    finalLink.rel='stylesheet';
    finalLink.href='/assets/final-showcase.css?v=20261005-settings-profile-width-1';
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
