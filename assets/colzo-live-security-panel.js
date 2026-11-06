/* Read-only, explicit Development QA. Never display or persist credentials/records. */
(function(){
 'use strict';
 const allowedHost='business-ai-git-feature-colzo-preview-self-daffcb-buisness-ai1.vercel.app';
 if(location.protocol!=='https:'||location.hostname!==allowedHost||new URLSearchParams(location.search).get('qaSecurity')!=='1')return;
 const box=document.createElement('section');box.id='colzoQaSecurity';box.setAttribute('aria-label','Development security acceptance');
 box.style.cssText='position:fixed;inset:auto 12px 12px;z-index:99999;background:#151a22;color:#f5f7fa;padding:16px;border:1px solid #c8ff2e;border-radius:12px;max-height:45dvh;overflow:auto;font:14px system-ui';
 const title=document.createElement('strong');title.textContent='Development — read-only AAL1 checks';
 const note=document.createElement('p');note.textContent='Uses this signed-in account. No MFA setup, writes, logout, provider calls or tenant record contents are displayed. This does not verify AAL2 tenant isolation or replay.';
 const button=document.createElement('button');button.type='button';button.textContent='Run read-only checks';
 const output=document.createElement('pre');output.setAttribute('role','status');output.style.whiteSpace='pre-wrap';
 box.append(title,note,button,output);document.body.appendChild(box);
 button.addEventListener('click',async()=>{
  button.disabled=true;output.textContent='Checking QA prerequisites…';
  try{
   const configResponse=await fetch('/api/public-config',{cache:'no-store'});if(!configResponse.ok)throw Error('config');
   const config=await configResponse.json();
   const origin='https://mvwseobgkexzpmmkgcxe.supabase.co';
   if(config.supabaseUrl!==origin||config.pilotAccess?.approvalRequired!==true||config.pilotAccess?.fictionalDataOnly!==true||!config.supabaseAnonKey)throw Error('config');
   const client=typeof supabaseClient==='undefined'?null:supabaseClient;
   const sessionResult=await client?.auth.getSession();if(sessionResult?.error||!sessionResult?.data?.session?.access_token)throw Error('session');
   const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();if(assurance.error||assurance.data?.currentLevel!=='aal1')throw Error('assurance');
   // Credentials stay in this closure, follow normal app transport, and are never reported.
   const token=sessionResult.data.session.access_token;
   const signedHeaders=config.previewAuthTransportEnabled===true?{'X-Colzo-Supabase-Authorization':'Bearer '+token}:{Authorization:'Bearer '+token};
   const apiPaths=['/api/bookings','/api/operations?operation=leads','/api/colzo-records?resource=clients'];
   const results=[];
   for(const path of apiPaths){
    for(const signed of [false,true]){
     const response=await fetch(path,{method:'GET',headers:signed?signedHeaders:{},cache:'no-store',redirect:'error'});
     const data=await response.json().catch(()=>null);
     const passed=signed?response.status===403&&data?.code==='MFA_REQUIRED':response.status===401;
     results.push((passed?'PASS':'FAIL')+' '+(signed?'issued AAL1':'anonymous')+' '+path+' HTTP '+response.status+(data?.code==='MFA_REQUIRED'?' MFA_REQUIRED':''));
    }
   }
   for(const table of ['bookings','leads','colzo_clients']){
    const response=await fetch(origin+'/rest/v1/'+table+'?select=id&limit=1',{method:'GET',headers:{apikey:config.supabaseAnonKey,Authorization:'Bearer '+token},cache:'no-store',redirect:'error'});
    const rows=await response.json().catch(()=>null);
    const passed=response.status===200&&Array.isArray(rows)&&rows.length===0;
    results.push((passed?'PASS':'FAIL')+' issued AAL1 Data API '+table+' HTTP '+response.status+' empty='+String(Array.isArray(rows)&&rows.length===0));
   }
   output.textContent=results.filter(x=>x.startsWith('PASS')).length+'/9 checks passed\n'+results.join('\n');
  }catch{output.textContent='Checks unavailable: a valid signed-in AAL1 session on the approved fictional-only Development candidate is required. No acceptance pass recorded.';}
  finally{button.disabled=false;}
 });
})();
