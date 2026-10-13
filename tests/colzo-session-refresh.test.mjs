import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('owner can refresh authorised enquiries, bookings and actions without any writes',async()=>{
 const [html,js,css]=await Promise.all(['colzo-readonly.html','assets/colzo-readonly.js','assets/colzo-readonly.css'].map(read));
 assert.match(html,/id="colzoRefreshData" type="button" aria-label="Refresh authorised business data"/);
 assert.match(html,/id="colzoRefreshStatus"[^>]+aria-live="polite"/);
 assert.match(js,/\$\('colzoRefreshData'\)\.addEventListener\('click',refreshData\)/);
 assert.match(js,/const refreshed=await readEnquiries\(currentToken,currentGeneration\)/);
 assert.match(js,/await loadWorkData\(\)/);
 assert.match(js,/renderHome\(\);renderSearchList\(\);renderWork\(\)/);
 assert.match(css,/#colzoRefreshData\{/);
 assert.doesNotMatch(js,/method:'POST'|method:'PATCH'|method:'DELETE'|localStorage|sessionStorage/);
});
test('session generation invalidates old in-flight responses after owner exits',async()=>{
 const js=await read('assets/colzo-readonly.js');
 assert.match(js,/let verificationGeneration = 0/);
 assert.match(js,/verificationGeneration\+\+;/);
 assert.match(js,/if\(!expectedToken \|\| expectedGeneration!==verificationGeneration\)return false/);
 assert.match(js,/if\(token!==expectedToken\|\|verificationGeneration!==expectedGeneration\)return false/);
 assert.match(js,/if\(token!==currentToken\|\|verificationGeneration!==currentGeneration\)return/);
 assert.match(js,/const oldClient=client;/);
 assert.match(js,/oldClient\.auth\.signOut\(\{scope:'local'\}\)/);
});
test('refresh guards overlapping taps, expired authentication and unexpected server errors',async()=>{
 const js=await read('assets/colzo-readonly.js');
 assert.match(js,/if\(!token\|\|refreshBusy\)return/);
 assert.match(js,/button\.disabled=true/);
 assert.match(js,/refreshBusy=false/);
 assert.match(js,/Your original account session has expired/);
 assert.match(js,/Refresh unavailable\. Previously loaded records are unchanged/);
 assert.match(js,/if\(!Array\.isArray\(data\.items\)\)throw new Error/);
});
test('updated app shell remains non-overlapping with the header refresh controls',async()=>{
 const css=await read('assets/colzo-readonly.css');
 assert.match(css,/\.colzo-explore-body\{[\s\S]*?overflow-y:auto!important/);
 assert.match(css,/\.colzo-explore-nav\{[\s\S]*?position:relative!important/);
 assert.match(css,/\.colzo-refresh-status:not\(\[hidden\]\)\{/);
});
