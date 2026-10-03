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
    finalLink.href='/assets/premium-final.css?v=20261003-final-2';
    finalLink.dataset.businessAiFinal='true';
    document.head.appendChild(finalLink);
  }
  if(!document.querySelector('script[data-business-ai-final]')){
    const finalScript=document.createElement('script');
    finalScript.src='/assets/premium-final.js?v=20261003-final-2';
    finalScript.dataset.businessAiFinal='true';
    document.body.appendChild(finalScript);
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


(function(){
  const byId=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));

  function ensureMarketingTabOrder(){
    const tabs=document.querySelector('#marketingView .marketing-tabs');
    if(!tabs)return;
    const performanceButton=byId('marketingTabPerformance');
    const performancePane=byId('marketingPerformancePane');
    const performanceCard=performancePane?.querySelector('.marketing-performance-card');
    const overview=byId('marketingOverviewPane');
    if(performanceCard&&overview)overview.appendChild(performanceCard);
    performancePane?.remove();
    performanceButton?.remove();
    [byId('marketingTabOverview'),byId('marketingTabCreate'),byId('marketingTabSchedule'),byId('marketingTabHistory')].filter(Boolean).forEach(item=>tabs.appendChild(item));
  }

  window.startLeadBooking=function(id){
    try{
      if(typeof showView==='function')showView('bookings');
      window.setTimeout(()=>{
        const card=byId('bookingsFormCard');
        if(card?.hidden&&typeof toggleWorkForm==='function')toggleWorkForm('bookings');
        const lead=typeof leads!=='undefined'?leads.find(item=>String(item.id)===String(id)):null;
        const leadSelect=byId('bookingLead');
        if(leadSelect)leadSelect.value=String(id);
        const title=byId('bookingTitle');
        if(title&&lead?.job_type&&!title.value)title.value=lead.job_type;
        const location=byId('bookingLocation');
        if(location&&lead?.location&&!location.value)location.value=lead.location;
        title?.focus();
      },80);
    }catch{}
  };

  if(typeof renderLeadCard==='function'&&!renderLeadCard.__mockupParityWrapped){
    const originalRenderLeadCard=renderLeadCard;
    renderLeadCard=function(lead){
      let html=originalRenderLeadCard(lead);
      const id=esc(lead?.id);
      const phone=String(lead?.phone||'').trim();
      const email=String(lead?.email||'').trim();
      const actions=[];
      if(phone)actions.push(`<a class="small-btn mockup-contact-btn" href="tel:${esc(phone.replace(/[^+0-9]/g,''))}">Call</a>`);
      if(email)actions.push(`<a class="small-btn mockup-contact-btn" href="mailto:${esc(email)}">Message</a>`);
      if(lead?.status!=='Converted')actions.push(`<button class="small-btn mockup-book-btn" type="button" onclick="startLeadBooking('${id}')">Book</button>`);
      if(actions.length){
        const quick=`<div class="mockup-lead-quick" aria-label="Lead quick actions">${actions.join('')}</div>`;
        html=html.replace('<div class="lead-actions">',quick+'<div class="lead-actions">');
      }
      return html;
    };
    renderLeadCard.__mockupParityWrapped=true;
  }

  function enhanceOperationalCards(){
    const actionCards=[...document.querySelectorAll('#actionsList .action-reference-card')];
    actionCards.forEach(card=>card.classList.remove('mockup-featured-action'));
    const featured=actionCards.find(card=>card.classList.contains('priority-action'))||actionCards[0];
    if(featured){
      featured.classList.add('mockup-featured-action');
      if(!featured.querySelector('.mockup-featured-label')){
        const label=document.createElement('span');
        label.className='mockup-featured-label';
        label.textContent=featured.classList.contains('priority-action')?'Priority action':'Next action';
        featured.prepend(label);
      }
    }
    const bookingCards=[...document.querySelectorAll('#bookingsList .booking-reference-card')];
    bookingCards.forEach(card=>card.classList.remove('mockup-featured-booking'));
    bookingCards[0]?.classList.add('mockup-featured-booking');
  }

  if(typeof renderActions==='function'&&!renderActions.__mockupParityWrapped){
    const originalRenderActions=renderActions;
    renderActions=function(){const result=originalRenderActions();enhanceOperationalCards();return result;};
    renderActions.__mockupParityWrapped=true;
  }
  if(typeof renderBookings==='function'&&!renderBookings.__mockupParityWrapped){
    const originalRenderBookings=renderBookings;
    renderBookings=function(){const result=originalRenderBookings();enhanceOperationalCards();return result;};
    renderBookings.__mockupParityWrapped=true;
  }

  ensureMarketingTabOrder();
  enhanceOperationalCards();
  const parityObserver=new MutationObserver(()=>{
    ensureMarketingTabOrder();
    enhanceOperationalCards();
  });
  ['marketingView','actionsList','bookingsList'].forEach(id=>{const target=byId(id);if(target)parityObserver.observe(target,{childList:true,subtree:true});});
})();
