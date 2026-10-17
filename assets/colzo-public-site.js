// Keep Dev navigation in the verified preview. Public-domain routing is unchanged.
(()=>{
 const preview=location.hostname.endsWith('.vercel.app')||['localhost','127.0.0.1'].includes(location.hostname);
 if(preview)document.querySelectorAll('[data-colzo-app-link]').forEach(link=>{link.href='/';});
})();
