/* Synthetic owner + local fake API for browser QA.
 * Explicitly NOT a real auth implementation, Supabase database or message integration.
 * No fetch, browser storage, network or external side effects.
 */
(()=>{
  'use strict';
  const panel=document.getElementById('cnContent');
  const inbox=window.ColzoWhatsAppDemo;
  let principal='owner-a',mfa=true,holdRead=false,heldRead=null;
  const tenants=new Map();
  const clone=value=>JSON.parse(JSON.stringify(value));
  const FIXTURES=Object.freeze([
    {fixture_key:'demo-a',customer_label:'Sample customer A',tag:'Booking request',
      messages:['Hi, could I book a visit for Friday?','Do you have availability in the afternoon?'],
      draft:'Thanks for reaching out. A team member can confirm available appointment times.',state:'review'},
    {fixture_key:'demo-b',customer_label:'Sample customer B',tag:'Human handover',
      messages:['Could somebody call me back about my enquiry?'],draft:null,state:'human'},
    {fixture_key:'demo-c',customer_label:'Sample customer C',tag:'Opening hours',
      messages:['Are you open on Saturdays?'],
      draft:'I will check the approved opening hours before answering.',state:'review'}
  ]);
  const rows=key=>tenants.get(key)||[];
  const now=()=>new Date().toISOString();
  function paint(){panel.innerHTML=inbox.render();}
  async function api(path,options={}){
    if(path!=='/api/colzo-whatsapp-inbox')throw Error('Unknown simulated API');
    const tenant=principal;
    if(!tenant)throw Error('Authentication required');
    const method=options.method||'GET';
    if(method==='GET'){
      const response={mode:'synthetic_persistent',items:clone(rows(tenant))};
      if(holdRead){
        holdRead=false;
        return new Promise(resolve=>{heldRead=()=>resolve(response);});
      }
      return response;
    }
    if(!mfa)throw Error('Multi-factor authentication is required');
    if(method==='POST'){
      if(options.body!=='{}')throw Error('Synthetic fixture seeding accepts no payload');
      if(!tenants.has(tenant))tenants.set(tenant,FIXTURES.map(x=>({...clone(x),updated_at:now(),received_at:now()})));
      return {mode:'synthetic_persistent',inserted:tenants.get(tenant).length};
    }
    if(method==='PATCH'){
      const input=JSON.parse(options.body);
      const item=rows(tenant).find(x=>x.fixture_key===input.fixture_key);
      if(!item||item.state!=='review'||item.updated_at!==input.expected_updated_at)
        throw Error('Conversation changed. Refresh before trying again.');
      item.state='human';item.draft=null;item.updated_at=now();
      return {mode:'synthetic_persistent',item:clone(item)};
    }
    throw Error('Method not permitted');
  }
  panel.parentElement.addEventListener('click',event=>{
    const element=event.target.closest('button[data-wa-action]');
    if(!element)return;
    const action=element.getAttribute('data-wa-action');
    Promise.resolve(inbox.act(action,api)).then(paint).catch(paint);
  });
  window.fixture=Object.freeze({
    switchAccount(key){principal=key;mfa=true;inbox.reset();paint();},
    setMfa(value){mfa=Boolean(value);},
    getRows(key){return clone(rows(key));},
    holdNextRead(){holdRead=true;},
    releaseHeldRead(){const resolve=heldRead;heldRead=null;if(resolve)resolve();}
  });
  paint();
})();
