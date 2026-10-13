import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');

test('Colzo app shell uses a real flex dock and independent scrollable content, not an overlay',async()=>{
 const css=await read('assets/colzo-readonly.css');
 const final=css.slice(css.lastIndexOf('/* v5 — true app-shell layout'));
 assert.ok(final.length>2500,'Final dock override is present');
 assert.match(final,/\.screen\.colzo-preview-active\s*\{[\s\S]*?height:100dvh!important;[\s\S]*?overflow:hidden!important/);
 assert.match(final,/\.colzo-explore:not\(\[hidden\]\)\s*\{[\s\S]*?display:flex!important;[\s\S]*?flex-direction:column!important/);
 assert.match(final,/\.colzo-explore-body\s*\{[\s\S]*?flex:1 1 auto!important;[\s\S]*?min-height:0!important;[\s\S]*?overflow-y:auto!important/);
 assert.match(final,/\.colzo-explore-nav\s*\{[\s\S]*?position:relative!important;[\s\S]*?inset:auto!important;[\s\S]*?transform:none!important;[\s\S]*?flex:0 0 auto!important/);
 assert.doesNotMatch(final,/\.colzo-explore-nav\s*\{[^}]*position:fixed/);
 assert.match(final,/padding:0 17px max\(8px,env\(safe-area-inset-bottom\)\)!important/);
});

test('real scheduled work is shown before any native-project disclaimer and inactive category tabs removed',async()=>{
 const html=await read('colzo-readonly.html');
 const project=html.slice(html.indexOf('<section id="colzoExploreProjects"'),html.indexOf('<section id="colzoExploreMore"'));
 assert.ok(project.length>500);
 assert.ok(project.indexOf('class="colzo-real-work"')<project.indexOf('class="colzo-empty-feature"'));
 assert.ok(project.indexOf('class="colzo-work-tabs"')<project.indexOf('class="colzo-empty-feature"'));
 assert.doesNotMatch(project,/aria-label="Project categories"/);
 assert.match(project,/data-colzo-work="bookings"/);
 assert.match(project,/data-colzo-work="actions"/);
 assert.match(project,/not completed Colzo project records/);
});

test('tab changes reset only the inner scroll area without bringing the page beneath browser chrome',async()=>{
 const js=await read('assets/colzo-readonly.js');
 assert.match(js,/const scroller=\$\('colzoExplore'\)\.querySelector\('\.colzo-explore-body'\);/);
 assert.match(js,/if\(scroller\)scroller\.scrollTop=0/);
 assert.doesNotMatch(js,/\$\('colzoExplore'\)\.scrollIntoView\(/);
});

test('reference Home becomes more compact to show actual quick actions at common iPhone sizes',async()=>{
 const css=await read('assets/colzo-readonly.css');
 const final=css.slice(css.lastIndexOf('/* v5 — true app-shell layout'));
 assert.match(final,/\.colzo-mini-stat\{min-height:98px!important/);
 assert.match(final,/\.colzo-trend-panel svg\{height:117px!important/);
 assert.match(final,/\.colzo-quick-grid button\{min-height:83px!important/);
 assert.match(final,/@media\(max-height:670px\)/);
 assert.match(final,/@media\(max-width:390px\)/);
});
