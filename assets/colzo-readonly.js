/* Colzo preview-only verification. Never persists tokens or sends a password
 * to any endpoint except the original Supabase Auth service via its JS SDK. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const status = (message, kind = '') => {const el = $('status'); el.textContent = message; el.className = 'status ' + kind;};
  const button = $('verifyButton');
  const form = $('originalLogin');
  let client = null;
  let token = null;
  const source = '/api/colzo-original-readonly';

  async function configure() {
    try {
      const response = await fetch(`${source}?kind=config`, {cache:'no-store',headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('Original authentication service could not be verified');
      const config = await response.json();
      if (typeof window.supabase?.createClient !== 'function') throw new Error('The sign-in library could not be loaded');
      client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
      });
      status('Ready to verify your original account. Nothing will be changed.');
      button.disabled = false;
    } catch {status('This test is not available yet. Use the original app while we check the preview.', 'warning');}
  }
  function render(items, truncated) {
    const list = $('enquiriesList');list.replaceChildren();
    $('resultsDescription').textContent = items.length
      ? `Signed in to the original account. ${items.length} enquiry record${items.length===1?'':'s'} returned for your authorised business${truncated?' (first 100 shown)':''}. No records were changed.`
      : 'Signed in successfully. No enquiries were returned for the business linked to this account.';
    if (!items.length) return;
    for (const item of items) {
      const card=document.createElement('div');card.className='enquiry';
      const avatar=document.createElement('span');avatar.className='initials';avatar.textContent=String(item.name||'E').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
      const copy=document.createElement('span');copy.className='copy';
      const name=document.createElement('strong');name.textContent=item.name||'Unnamed enquiry';
      const service=document.createElement('small');service.textContent=item.job_type||'General enquiry';
      const stage=document.createElement('span');stage.className='stage';stage.textContent=item.status||'New';
      copy.append(name,service);card.append(avatar,copy,stage);list.append(card);
    }
  }
  async function readEnquiries() {
    const response = await fetch(`${source}?kind=enquiries`, {
      method:'GET',cache:'no-store',headers:{Accept:'application/json',Authorization:`Bearer ${token}`}
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(response.status===401||response.status===403?'The original app could not authorise this session.':'The original app could not return enquiries right now.');
    render(Array.isArray(data.items)?data.items:[],Boolean(data.truncated));
    $('results').hidden=false;
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!client)return;
    const email=$('originalEmail').value.trim(),password=$('originalPassword').value;
    if(!email||!password)return;
    button.disabled=true;status('Verifying against the original Business AI authentication service…');
    try {
      const result=await client.auth.signInWithPassword({email,password});
      $('originalPassword').value=''; // clear input immediately after the Auth request
      if (result.error) throw result.error;
      token=result.data?.session?.access_token||null;
      if(!token)throw new Error('No confirmed session');
      status('Original account sign-in successful. Loading authorised enquiries…','success');
      await readEnquiries();
      status('Read-only verification completed. Your customer records were not changed.','success');
    } catch(error){
      $('originalPassword').value='';
      const code=String(error?.code||'');
      status(code==='invalid_credentials'?'The original authentication service did not accept those sign-in details.':code==='email_not_confirmed'?'Your email needs verification before you can sign in.':'Verification could not complete. Check the original app and try again.', 'warning');
    } finally{button.disabled=false;}
  });
  $('endCheck').addEventListener('click',()=>{token=null;client=null;$('results').hidden=true;$('enquiriesList').replaceChildren();form.reset();button.disabled=true;status('This verification session has ended. Reload the page to start another.');});
  button.disabled=true;
  configure();
})();
