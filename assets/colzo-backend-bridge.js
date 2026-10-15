/* Colzo preview uses the API handlers deployed alongside this page.
 * Never forward authenticated development traffic to Business AI Pilot.
 * The local backend uses the branch-scoped development environment. */
(function(){
  'use strict';
  const nativeFetch=window.fetch.bind(window);
  window.colzoBackendUrl=function(input){return input};
  window.colzoBackendFetch=function(input,init){return nativeFetch(input,init)};
})();
