/* Read-only, explicit Development QA. Never display or persist credentials/records. */
(function(){
 'use strict';
 const allowedHost='business-ai-git-feature-colzo-preview-self-daffcb-buisness-ai1.vercel.app';
 if(location.protocol!=='https:'||location.hostname!==allowedHost||new URLSearchParams(location.search).get('qaSecurity')!=='1')return;
 const box=document.createElement('section');box.id='colzoQaSecurity';box.setAttribute('aria-label','Development security acceptance');
 box.style.cssText='position:relative;margin:12px;background:#151a22;color:#f5f7fa;padding:16px;border:1px solid #c8ff2e;border-radius:12px;max-height:45dvh;overflow:auto;font:14px system-ui';
 const exit=document.createElement('a');exit.href='/';exit.textContent='Close QA panel — return to workspace';exit.style.cssText='display:block;color:#c8ff2e;margin-bottom:12px';
 const title=document.createElement('strong');title.textContent='Development — read-only session checks';
 const note=document.createElement('p');note.textContent='Uses this signed-in account. No MFA setup, writes, logout, paid-provider calls or tenant record contents are displayed. Checks one direction only; roles, replay and independent second-account acceptance remain separate.';
 const button=document.createElement('button');button.type='button';button.textContent='Run read-only checks';
 const output=document.createElement('pre');output.setAttribute('role','status');output.style.whiteSpace='pre-wrap';
 box.append(exit,title,note,button,output);document.body.appendChild(box);
 button.addEventListener('click',async()=>{
  button.disabled=true;output.textContent='Checking QA prerequisites…';
  try{
   const configResponse=await fetch('/api/public-config',{cache:'no-store'});if(!configResponse.ok)throw Error('config');
   const config=await configResponse.json();
   const origin='https://mvwseobgkexzpmmkgcxe.supabase.co';
   if(config.supabaseUrl!==origin||config.pilotAccess?.approvalRequired!==true||config.pilotAccess?.fictionalDataOnly!==true||!config.supabaseAnonKey)throw Error('config');
   const client=typeof supabaseClient==='undefined'?null:supabaseClient;
   const sessionResult=await client?.auth.getSession();if(sessionResult?.error||!sessionResult?.data?.session?.access_token)throw Error('session');
   const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();if(assurance.error||!['aal1','aal2'].includes(assurance.data?.currentLevel))throw Error('assurance');
   // Credentials stay in this closure, follow normal app transport, and are never reported.
   const token=sessionResult.data.session.access_token;
   const signedHeaders=config.previewAuthTransportEnabled===true?{'X-Colzo-Supabase-Authorization':'Bearer '+token}:{Authorization:'Bearer '+token};
   const apiPaths=['/api/bookings','/api/operations?operation=leads','/api/colzo-records?resource=clients'];
   const results=[];
   if(assurance.data.currentLevel==='aal2'){
    const user=await client.auth.getUser();if(user.error||!user.data?.user?.id||user.data.user.id!==sessionResult.data.session.user?.id)throw Error('user');
    const restHeaders={apikey:config.supabaseAnonKey,Authorization:'Bearer '+token};
    const membershipResponse=await fetch(origin+'/rest/v1/business_memberships?select=business_id,user_id,role&user_id=eq.'+encodeURIComponent(user.data.user.id)+'&limit=2',{method:'GET',headers:restHeaders,cache:'no-store',redirect:'error'});
    const memberships=await membershipResponse.json().catch(()=>null);
    const businesses=['6da33602-1b8f-474d-84a6-e003d1c713fd','433f135d-720f-4687-8114-3dffe7361675'];
    if(membershipResponse.status!==200||!Array.isArray(memberships)||memberships.length!==1||memberships[0]?.user_id!==user.data.user.id||memberships[0]?.role!=='owner'||!businesses.includes(memberships[0]?.business_id))throw Error('membership');
    const own=memberships[0].business_id,foreign=businesses.find(id=>id!==own);
    const scopedRows=data=>Array.isArray(data)&&data.every(row=>row&&row.business_id===own);
    const summary=(label,response,data,passed)=>{
     const candidate=data?.code??data?.error?.code;
     const code=typeof candidate==='string'&&/^[A-Z][A-Z0-9_]{0,63}$/.test(candidate)?' '+candidate:'';
     results.push((passed?'PASS':'FAIL')+' '+label+' HTTP '+response.status+code);
    };
    const read=async(path,headers)=>{
     const response=await fetch(path,{method:'GET',headers,cache:'no-store',redirect:'error'});
     return [response,await response.json().catch(()=>null)];
    };
    for(const path of apiPaths){
     const [anonymous,anonymousData]=await read(path,{});summary('anonymous '+path,anonymous,anonymousData,anonymous.status===401);
     const [response,data]=await read(path,signedHeaders);
     summary('issued AAL2 own '+path,response,data,response.status===200&&scopedRows(data)&&(path.includes('clients')||data.length>0));
    }
    for(const table of ['bookings','leads','colzo_clients']){
     const [response,data]=await read(origin+'/rest/v1/'+table+'?select=id,business_id&business_id=eq.'+foreign+'&limit=1',restHeaders);
     const permissionDenied=response.status===403;
     summary('foreign Data API '+table+(permissionDenied?' (table permission denial)':''),response,data,(response.status===200&&Array.isArray(data)&&data.length===0)||permissionDenied);
    }
    const [manipulated,manipulatedRows]=await read('/api/colzo-records?resource=clients&business_id='+foreign,signedHeaders);
    summary('business-ID manipulation stays in own tenant',manipulated,manipulatedRows,manipulated.status===200&&scopedRows(manipulatedRows));
    // Existing fictional QA customer, independently read before this code change.
    // Only the original owner's session treats this as a foreign-record probe.
    if(own===businesses[0]){
     const [response,data]=await read('/api/colzo-records?resource=clients&id=08f9a189-8b40-433b-b783-f0718463aa2d',signedHeaders);
     summary('foreign customer record',response,data,response.status===404);
    }
    for(const path of ['/api/incident-controls','/api/audit-log']){
     const [response,data]=await read(path,signedHeaders);
     const shape=path.includes('audit-log')?Array.isArray(data):data?.controls&&data?.effective&&data?.platform;
     summary('issued AAL2 '+path,response,data,response.status===200&&Boolean(shape));
    }
    output.textContent=results.filter(x=>x.startsWith('PASS')).length+'/'+results.length+' read-only AAL2 checks passed (one-direction only)\n'+results.join('\n');
    return;
   }
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
  }catch{output.textContent='Checks unavailable: a valid issued session and the expected fictional-only Development account are required. No acceptance pass recorded.';}
  finally{button.disabled=false;}
 });
})();
