// Keep Dev navigation in the verified app Preview. Public-domain routing is unchanged.
(()=>{
 const preview=location.hostname.endsWith('.vercel.app')||['localhost','127.0.0.1'].includes(location.hostname);
 if(!preview)return;
 const sitePreview=location.hostname.startsWith('business-ai-site-');
 let target=sitePreview?null:'/';
 if(sitePreview){
  try{
   const url=new URL(document.querySelector('meta[name="colzo-app-preview-url"]')?.content||'');
   if(url.protocol==='https:'&&url.hostname.endsWith('.vercel.app')&&!url.hostname.startsWith('business-ai-site-')&&!url.username&&!url.password&&!url.port&&url.pathname==='/'&&!url.search&&!url.hash)target=url.href;
  }catch{}
 }
 document.querySelectorAll('[data-colzo-app-link]').forEach(link=>{
  if(target){link.href=target;return;}
  link.removeAttribute('href');link.setAttribute('aria-disabled','true');link.textContent='App preview unavailable';
 });
})();
