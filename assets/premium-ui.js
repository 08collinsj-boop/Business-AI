(function(){
  const byId=id=>document.getElementById(id);

  if(!document.querySelector('link[data-business-ai-premium-v2]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/assets/premium-v2.css?v=20261003-ui-fixes-1';
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


(function(){
  const byId=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));

  function ensureMarketingPerformanceTab(){
    const tabs=document.querySelector('#marketingView .marketing-tabs');
    const overview=byId('marketingOverviewPane');
    const create=byId('marketingCreatePane');
    const library=byId('marketingHistoryPane');
    const calendar=byId('marketingSchedulePane');
    const performanceCard=document.querySelector('#marketingView .marketing-performance-card');
    if(!tabs||!overview||!create||!library||!calendar||!performanceCard)return;

    let performance=byId('marketingPerformancePane');
    if(!performance){
      performance=document.createElement('div');
      performance.id='marketingPerformancePane';
      performance.setAttribute('role','tabpanel');
      performance.setAttribute('aria-labelledby','marketingTabPerformance');
      performance.hidden=true;
      overview.after(performance);
      performance.appendChild(performanceCard);
    }

    let button=byId('marketingTabPerformance');
    if(!button){
      button=document.createElement('button');
      button.id='marketingTabPerformance';
      button.className='small-btn';
      button.type='button';
      button.setAttribute('role','tab');
      button.setAttribute('aria-selected','false');
      button.setAttribute('aria-controls','marketingPerformancePane');
      button.setAttribute('tabindex','-1');
      button.textContent='Performance';
      button.addEventListener('click',()=>window.marketingWorkspace?.tab?.('performance'));
      button.addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();
        const target=event.key==='ArrowLeft'?byId('marketingTabHistory'):byId('marketingTabOverview');
        if(event.key==='Home')byId('marketingTabOverview')?.focus();
        else if(event.key==='End')button.focus();
        else { target?.click(); target?.focus(); }
      });
    }

    const overviewButton=byId('marketingTabOverview');
    const createButton=byId('marketingTabCreate');
    const calendarButton=byId('marketingTabSchedule');
    const libraryButton=byId('marketingTabHistory');
    [overviewButton,createButton,calendarButton,libraryButton,button].filter(Boolean).forEach(item=>tabs.appendChild(item));

    if(window.marketingWorkspace?.tab&&!window.marketingWorkspace.__mockupParityWrapped){
      const original=window.marketingWorkspace.tab.bind(window.marketingWorkspace);
      window.marketingWorkspace.tab=function(name){
        if(name==='performance'){
          [overview,create,library,calendar].forEach(pane=>{pane.hidden=true;});
          performance.hidden=false;
          tabs.querySelectorAll('[role="tab"]').forEach(tab=>{
            const selected=tab===button;
            tab.setAttribute('aria-selected',String(selected));
            tab.setAttribute('tabindex',selected?'0':'-1');
            tab.classList.toggle('primary-action',selected);
          });
          performance.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
          return;
        }
        original(name);
        performance.hidden=true;
        button.setAttribute('aria-selected','false');
        button.setAttribute('tabindex','-1');
        button.classList.remove('primary-action');
      };
      window.marketingWorkspace.__mockupParityWrapped=true;
    }
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
      if(email)actions.push(`<a class="small-btn mockup-contact-btn" href="mailto:${esc(email)}">Email</a>`);
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

  ensureMarketingPerformanceTab();
  enhanceOperationalCards();
  const parityObserver=new MutationObserver(()=>{
    ensureMarketingPerformanceTab();
    enhanceOperationalCards();
  });
  ['marketingView','actionsList','bookingsList'].forEach(id=>{const target=byId(id);if(target)parityObserver.observe(target,{childList:true,subtree:true});});
})();
