/* Colzo preview uses the API handlers deployed alongside this page.
 * Never forward authenticated development traffic to Colzo Pilot.
 * The local backend uses the branch-scoped development environment. */
(function(){
  'use strict';
  const nativeFetch=window.fetch.bind(window);
  window.colzoBackendUrl=function(input){
    if(window.colzoPreviewAuthTransportEnabled!==true||typeof input!=='string')return input;
    let url;
    try{url=new URL(input,window.location.origin)}catch{return input}
    if(url.origin!==window.location.origin||url.protocol!=='https:'||url.username||url.password)return input;
    const operation={'/api/leads':'leads','/api/pipeline':'pipeline','/api/settings':'settings'}[url.pathname];
    if(!operation)return input;
    // Physical legacy API files may be resolved before same-path rewrites.
    // Address the existing local dispatcher explicitly: it restores the scoped
    // Preview transport, then performs the unchanged Supabase/tenant checks.
    url.pathname='/api/operations';
    url.searchParams.set('operation',operation);
    return url.pathname+url.search;
  };
  window.colzoBackendFetch=function(input,init){return nativeFetch(window.colzoBackendUrl(input),init)};
})();
