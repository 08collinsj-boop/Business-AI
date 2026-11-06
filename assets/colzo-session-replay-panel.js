/* Explicit Development-only logout/replay acceptance. No credential output/storage. */
(function(){
 'use strict';
 const host='business-ai-git-feature-colzo-preview-self-daffcb-buisness-ai1.vercel.app';
 if(location.protocol!=='https:'||location.hostname!==host||new URLSearchParams(location.search).get('qaReplay')!=='1')return;
 const box=document.createElement('section');box.id='colzoQaReplay';box.setAttribute('aria-label','Development logout replay acceptance');
 box.style.cssText='position:relative;margin:12px;background:#151a22;color:#f5f7fa;padding:16px;border:1px solid #ffb36b;border-radius:12px;width:min(440px,calc(100vw - 56px));max-height:40dvh;overflow:auto;font:14px system-ui';
 const exit=document.createElement('a');exit.href='/';exit.textContent='Close QA panel — return to workspace';exit.style.cssText='display:block;color:#c8ff2e;margin-bottom:12px';
 const title=document.createElement('strong');title.textContent='Development — logout-token replay';
 const note=document.createElement('p');note.textContent='This separate test ends only this browser session. It keeps its issued access token briefly in memory to test rejection after logout. Other sessions are not signed out. A private sign-in will be needed afterwards.';
 const button=document.createElement('button');button.type='button';button.textContent='Test logout replay — ends this session';
 const recheck=document.createElement('button');recheck.type='button';recheck.textContent='Recheck retained token once — no sign-in';recheck.disabled=true;recheck.setAttribute('data-replay-recheck','');
 let recheckOnce=null,recheckDeadline=0;
 const output=document.createElement('pre');output.setAttribute('role','status');output.style.whiteSpace='pre-wrap';
 box.append(exit,title,note,button,recheck,output);document.body.appendChild(box);
 recheck.addEventListener('click',async()=>{
  recheck.disabled=true;
  const run=recheckOnce;recheckOnce=null;
  if(!run||Date.now()>=recheckDeadline){output.textContent='Retained-token window expired; test inconclusive. No replay pass recorded.';return;}
  try{await run();}catch{output.textContent='Retained-token recheck inconclusive. No replay pass recorded.';}
 });
 button.addEventListener('click',async()=>{
  button.disabled=true;output.textContent='Checking issued-session prerequisites before logout…';
  try{
   const configResponse=await fetch('/api/public-config',{method:'GET',cache:'no-store',redirect:'error'});
   if(!configResponse.ok)throw Error('config');
   const config=await configResponse.json(),origin='https://mvwseobgkexzpmmkgcxe.supabase.co';
   if(config.supabaseUrl!==origin||!config.supabaseAnonKey||config.pilotAccess?.approvalRequired!==true||config.pilotAccess?.fictionalDataOnly!==true)throw Error('config');
   const client=typeof supabaseClient==='undefined'?null:supabaseClient;
   const sessionResult=await client?.auth.getSession(),session=sessionResult?.data?.session;
   if(sessionResult?.error||!session?.access_token)throw Error('session');
   const token=session.access_token; // Deliberately never exported, displayed or persisted.
   const user=await client.auth.getUser(token),assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
   if(user.error||!user.data?.user?.id||user.data.user.id!==session.user?.id||assurance.error||assurance.data?.currentLevel!=='aal2')throw Error('assurance');
   const encoded=token.split('.')[1]?.replace(/-/g,'+').replace(/_/g,'/');
   const claims=JSON.parse(atob(encoded));
   if(claims.sub!==user.data.user.id||typeof claims.exp!=='number'||claims.exp*1000<Date.now()+120000||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(claims.session_id||''))throw Error('token');
   const headers=config.previewAuthTransportEnabled===true?{'X-Colzo-Supabase-Authorization':'Bearer '+token}:{Authorization:'Bearer '+token};
   const restHeaders={apikey:config.supabaseAnonKey,Authorization:'Bearer '+token};
   const read=async(path,requestHeaders)=>{
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
    try{
     const response=await fetch(path,{method:'GET',headers:requestHeaders,cache:'no-store',redirect:'error',signal:controller.signal});
     return [response,await response.json().catch(()=>null)];
    }finally{clearTimeout(timeout);}
   };
   const [membershipResponse,memberships]=await read(origin+'/rest/v1/business_memberships?select=business_id,user_id,role&user_id=eq.'+encodeURIComponent(user.data.user.id)+'&limit=2',restHeaders);
   const allowed=['6da33602-1b8f-474d-84a6-e003d1c713fd','433f135d-720f-4687-8114-3dffe7361675'];
   if(membershipResponse.status!==200||!Array.isArray(memberships)||memberships.length!==1||memberships[0]?.user_id!==user.data.user.id||memberships[0]?.role!=='owner'||!allowed.includes(memberships[0]?.business_id))throw Error('membership');
   const own=memberships[0].business_id;
   const paths=['/api/bookings','/api/operations?operation=leads'];
   const direct=origin+'/rest/v1/bookings?select=id,business_id&business_id=eq.'+own+'&limit=1';
   for(const path of [...paths,direct]){
    const [response,rows]=await read(path,path===direct?restHeaders:headers);
    if(response.status!==200||!Array.isArray(rows)||rows.length===0||!rows.every(row=>row&&row.business_id===own))throw Error('positive baseline');
   }
   // The two positive API reads and direct row read use this exact issued JWT.
   // Local scope revokes only its Auth session, preserving other devices/sessions.
   const logout=await client.auth.signOut({scope:'local'});
   if(logout?.error)throw Error('logout');
   const checkRetainedToken=async()=>{
    if(claims.exp*1000<=Date.now())throw Error('expired before test');
    const results=[];
    for(const path of paths){
     const [response]=await read(path,headers);
     results.push((response.status===401?'PASS':'FAIL')+' retained-token API '+path+' HTTP '+response.status);
    }
    const [response,rows]=await read(direct,restHeaders);
    const denied=response.status===401||response.status===403||(response.status===200&&Array.isArray(rows)&&rows.length===0);
    results.push((denied?'PASS':'FAIL')+' retained-token Data API HTTP '+response.status+' empty='+String(Array.isArray(rows)&&rows.length===0));
    if(claims.exp*1000<=Date.now())throw Error('expired during test');
    output.textContent='Local logout completed; JWT remained unexpired throughout.\n'+results.join('\n')+'\nOther-session and fresh-session acceptance require separate observations.';
   };
   await checkRetainedToken();
   // Permit one backend-deployment recheck without copying or persisting JWTs.
   // Do not reload this page; doing so intentionally loses this private state.
   recheckDeadline=Math.min(Date.now()+600000,claims.exp*1000);
   recheckOnce=checkRetainedToken;recheck.disabled=false;
   setTimeout(()=>{recheckOnce=null;recheck.disabled=true;},Math.max(0,recheckDeadline-Date.now()));
  }catch{output.textContent='Test inconclusive: prerequisites, positive baseline, confirmed logout or unexpired-token condition failed. No replay pass recorded; inspect current sign-in state before continuing.';}
  // Never enable a second logout attempt from this same test execution.
 });
})();
