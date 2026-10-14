/* Colzo development browser-to-existing-backend bridge.
 * Avoid Vercel filesystem precedence at /api/*; preserve the original
 * authenticated Business AI API contract without copying server secrets.
 */
(function(){
  'use strict';
  const nativeFetch=window.fetch.bind(window);
  const backendPrefix='/colzo-backend';
  const internalApiPrefix='/api/';

  function backendUrl(input){
    const value=input instanceof Request?input.url:input instanceof URL?input.href:String(input);
    const url=new URL(value,window.location.origin);
    if(url.origin!==window.location.origin||!url.pathname.startsWith(internalApiPrefix))return null;
    return backendPrefix+url.pathname.slice('/api'.length)+url.search+url.hash;
  }

  window.colzoBackendUrl=function(input){
    return backendUrl(input)||input;
  };
  window.colzoBackendFetch=function(input,init){
    const remapped=backendUrl(input);
    if(remapped===null)return nativeFetch(input,init);
    if(input instanceof Request)return nativeFetch(new Request(new URL(remapped,window.location.origin),input),init);
    return nativeFetch(remapped,init);
  };
})();
