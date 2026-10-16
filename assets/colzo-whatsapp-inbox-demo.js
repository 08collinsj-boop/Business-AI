/* Colzo - synthetic WhatsApp inbox, development DEMO only.
 * No Twilio, no network, no accounts, no customer data, no browser storage.
 */
(()=>{
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const SEED=[
  {id:'demo-a',name:'Sample customer A',initial:'A',time:'09:41',state:'review',tag:'Booking request',
   messages:['Hi, could I book a visit for Friday?','Do you have availability in the afternoon?'],
   draft:'Thanks for reaching out. A team member can confirm available appointment times.'},
  {id:'demo-b',name:'Sample customer B',initial:'B',time:'Yesterday',state:'human',tag:'Human handover',
   messages:['Could somebody call me back about my enquiry?'],draft:null},
  {id:'demo-c',name:'Sample customer C',initial:'C',time:'Wednesday',state:'review',tag:'Opening hours',
   messages:['Are you open on Saturdays?'],draft:'I will check the approved opening hours before answering.'}
 ];
 let threads,activeId,filter,announcement,persisted=false,persistentError="",busy=false;
 const button=(label,action,cls,extra='')=>
  '<button type="button" class="'+esc(cls)+'" data-wa-action="'+esc(action)+'" '+extra+'>'+esc(label)+'</button>';
 function reset(){threads=SEED.map(t=>({...t,messages:t.messages.slice()}));activeId='demo-a';filter='all';announcement='';persisted=false;persistentError='';}
 reset();
 const current=()=>threads.find(t=>t.id===activeId)||threads[0];
 function render(){
  const selected=current();
  const shown=threads.filter(t=>filter==='all'||t.state===filter);
  const filters=[['all','All'],['review','Needs review'],['human','Human']].map(([id,label])=>
   button(label,'filter:'+id,'cn-wa-filter'+(filter===id?' selected':''),'aria-pressed="'+(filter===id)+'"')).join('');
  const rows=shown.map(t=>'<button type="button" class="cn-wa-thread'+(t.id===activeId?' selected':'')+
    '" data-wa-action="open:'+t.id+'" aria-pressed="'+(t.id===activeId)+'">'+
    '<span class="cn-wa-avatar" aria-hidden="true">'+esc(t.initial)+'</span>'+
    '<span class="cn-wa-thread-main"><strong>'+esc(t.name)+'</strong><small>'+
    esc(t.messages.at(-1))+'</small></span><span class="cn-wa-thread-meta"><small>'+esc(t.time)+
    '</small><i class="cn-wa-indicator '+t.state+'" aria-hidden="true"></i></span></button>').join('');
  const chat=selected.messages.map(message=>
    '<div class="cn-wa-bubble customer"><span class="cn-wa-sr-only">Fictional customer: </span>'+
    esc(message)+'</div>').join('');
  const draft=selected.state==='human'?
    '<p class="cn-wa-handover-text">This fictional chat is assigned to a person. Automatic replies are paused.</p>':
    '<p>'+esc(selected.draft||'A human needs to review this sample request.')+'</p>'+
    '<p class="cn-wa-draft-foot">Nothing is sent. AI and WhatsApp are not connected.</p>';
  return '<section class="cn-wa-inbox" aria-label="WhatsApp inbox demonstration">'+
    '<header class="cn-wa-head"><div><span class="cn-kicker">MESSAGING · DEVELOPMENT PREVIEW</span>'+
    '<h1>WhatsApp inbox</h1><p>A single place to review conversations and AI suggestions.</p></div>'+
    '<span class="cn-wa-status"><i aria-hidden="true"></i>Not connected</span></header>'+
    '<aside class="cn-wa-demo-notice" role="status"><span class="cn-wa-demo-icon" aria-hidden="true">◎</span>'+
    '<div><strong>'+(persisted?'Saved fictional conversations':'Demo only - fictional messages')+'</strong><p>WhatsApp is not connected. No real enquiries or sent replies.'+(persisted?' These sample records are stored in development only.':'')+'</p></div></aside>'+
    (persistentError?'<p class="cn-wa-empty" role="status">'+esc(persistentError)+'</p>':'')+
    '<div class="cn-wa-metrics"><article><span>Sample chats</span><strong>'+threads.length+'</strong></article>'+
    '<article><span>Needs review</span><strong>'+threads.filter(t=>t.state==='review').length+'</strong></article>'+
    '<article><span>Human handover</span><strong>'+threads.filter(t=>t.state==='human').length+'</strong></article></div>'+
    '<div class="cn-wa-layout"><section class="cn-wa-list-wrap" aria-label="Sample conversations">'+
    '<div class="cn-wa-title-line"><h2>Conversations</h2><span>Local preview</span></div>'+
    '<div class="cn-wa-filters" role="group" aria-label="Filter sample conversations">'+filters+'</div>'+
    '<div class="cn-wa-list">'+(rows||'<p class="cn-wa-empty">No fictional chats in this filter.</p>')+'</div></section>'+
    '<section class="cn-wa-conversation" aria-label="Selected sample conversation">'+
    '<header class="cn-wa-conversation-head"><span class="cn-wa-avatar">'+esc(selected.initial)+'</span>'+
    '<span><strong>'+esc(selected.name)+'</strong><small>'+esc(selected.tag)+'</small></span>'+
    '<span class="cn-wa-state '+selected.state+'">'+(selected.state==='human'?'Human':'Review')+'</span></header>'+
    '<div class="cn-wa-chat" role="log" aria-label="Fictional customer messages">'+
    '<p class="cn-wa-chat-date">Example conversation</p>'+chat+'</div>'+
    '<div class="cn-wa-draft"><div class="cn-wa-draft-label"><span>✦ AI suggestion</span><span>REVIEW ONLY</span></div>'+
    draft+'<div class="cn-wa-actions">'+
    button('Mark for human','handover:'+selected.id,'cn-wa-primary',selected.state==='human'?'disabled':'')+
    button(persisted?'View local demo':'Reset demo','reset','cn-wa-secondary')+'</div></div></section></div>'+
    (persisted?'':'<div class="cn-wa-actions">'+button('Load saved demo','persist:load','cn-wa-secondary')+button('Save fictional chats','persist:seed','cn-wa-secondary')+'</div>')+
    '<p class="cn-wa-footnote">'+(persisted?'Fictional development records only. Nothing is sent to WhatsApp.':'Temporary fictional content only. Reload or sign out to reset; saving is optional and requires business authentication.')+'</p>'+
    '<p class="cn-wa-sr-only" role="status" aria-live="polite">'+esc(announcement)+'</p></section>';
 }
 function handleClick(el){
  const action=el?.getAttribute?.('data-wa-action');
  if(!action)return false;
  if(action==='reset'){reset();announcement='Fictional demo reset';return true;}
  const [command,id]=action.split(':');
  if(command==='filter'&&['all','review','human'].includes(id)){
   filter=id;
   if(filter!=='all'&&current().state!==filter)activeId=threads.find(t=>t.state===filter)?.id||activeId;
   announcement='Filtered fictional conversations';return true;
  }
  const thread=threads.find(t=>t.id===id);if(!thread)return false;
  if(command==='open'&&(filter==='all'||thread.state===filter)){
   activeId=id;announcement='Opened fictional conversation';return true;
  }
  if(command==='handover'){
   thread.state='human';thread.draft=null;activeId=id;filter='all';
   announcement='Marked fictional conversation for human review';return true;
  }
  return false;
 }
 function hydrate(result){
  if(result?.mode!=='synthetic_persistent'||!Array.isArray(result.items)||
      !result.items.length||result.items.length>SEED.length)throw Error('Saved demo is unavailable or empty.');
  const seen=new Set();
  const next=result.items.map(item=>{
   if(!SEED.some(x=>x.id===item.fixture_key)||seen.has(item.fixture_key)||
      !['review','human'].includes(item.state)||
      typeof item.customer_label!=='string'||item.customer_label.length>80||
      typeof item.tag!=='string'||item.tag.length>80||
      !Array.isArray(item.messages)||!item.messages.length||item.messages.length>4||
      item.messages.some(m=>typeof m!=='string'||m.length>2000)||
      (item.draft!==null&&(typeof item.draft!=='string'||item.draft.length>900))||
      typeof item.updated_at!=='string')throw Error('Saved demo contains invalid records.');
   seen.add(item.fixture_key);
   return {id:item.fixture_key,name:item.customer_label,initial:item.customer_label[0]||'?',
    time:'Saved',state:item.state,tag:item.tag,messages:[...item.messages],
    draft:item.draft,updatedAt:item.updated_at};
  });
  threads=next;activeId=next.some(t=>t.id===activeId)?activeId:next[0].id;
  filter='all';persisted=true;persistentError='';
 }
 async function act(action,api){
  const isPersistentAction=action==='persist:load'||action==='persist:seed'||
   (persisted&&action.startsWith('handover:'));
  if(!isPersistentAction)
   return handleClick({getAttribute:name=>name==='data-wa-action'?action:null});
  if(busy)return false;
  busy=true;persistentError='';
  try{
   if(typeof api!=='function')throw Error('Secure development API is unavailable.');
   if(action==='persist:seed'){
    await api('/api/colzo-whatsapp-inbox',{
     method:'POST',headers:{'Content-Type':'application/json'},body:'{}'
    });
   }else if(action.startsWith('handover:')){
    const id=action.slice('handover:'.length),current=threads.find(t=>t.id===id);
    if(!current||current.state!=='review')return false;
    await api('/api/colzo-whatsapp-inbox',{
     method:'PATCH',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({fixture_key:id,state:'human',expected_updated_at:current.updatedAt})
    });
   }
   hydrate(await api('/api/colzo-whatsapp-inbox'));
   announcement='Saved fictional conversations loaded';
  }catch(err){
   persistentError=String(err?.message||'Saved demo unavailable. Check development access.');
   announcement='Could not update saved demo';
  }finally{busy=false;}
  return true;
 }
 window.ColzoWhatsAppDemo=Object.freeze({render,handleClick,reset,act,isPersisted:()=>persisted});
})();
