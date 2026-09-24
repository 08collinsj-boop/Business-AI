(() => {
  const form=document.getElementById('pilotFeedbackForm'); if(!form)return;
  const status=document.getElementById('pilotFeedbackStatus'),button=document.getElementById('pilotFeedbackSubmit');
  form.addEventListener('submit',async event=>{
    event.preventDefault();button.disabled=true;status.textContent='Sending feedback…';
    try{
      const active=document.querySelector('.view.active');
      const appVersion=document.querySelector('meta[name="app-version"]')?.content||'';
      await api('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category:document.getElementById('pilotFeedbackCategory').value,page:active?.id||'unknown',message:document.getElementById('pilotFeedbackMessage').value,app_version:appVersion})});
      document.getElementById('pilotFeedbackMessage').value='';status.textContent='Thanks — your Pilot feedback was saved.';toast('Feedback sent');
    }catch(error){status.textContent=error.message||'Could not send feedback.';}finally{button.disabled=false;}
  });
})();
