import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/colzo-native.css',import.meta.url),'utf8');
const autom=readFileSync(new URL('../lib/marketing-automation-handler.js',import.meta.url),'utf8');
const imageHandler=readFileSync(new URL('../lib/marketing-image-handler.js',import.meta.url),'utf8');
const policy=readFileSync(new URL('../lib/marketing-automation.js',import.meta.url),'utf8');
test('marketing image inspector only reads tenant-scoped existing media',()=>{
 const start=js.indexOf('async function inspectMarketingMedia(id)');
 const end=js.indexOf('function marketing(){',start);
 assert.ok(start>0&&end>start);
 const body=js.slice(start,end);
 assert.match(body,/api\('\/api\/marketing-images\?generation_id='\+encodeURIComponent\(draft\.id\)\)/);
 assert.match(body,/if\(result\.image&&String\(result\.image\.generation_id\)!==String\(draft\.id\)\)/);
 assert.doesNotMatch(body,/method:'POST'|method:'PATCH'|method:'DELETE'/);
 assert.match(imageHandler,/return res\.status\(200\)\.json\(\{\s*image: await getMarketingImage\(auth\.businessId, id\)/);
});
test('image presentation refuses unsafe media URLs and never calls provider or posts',()=>{
 assert.match(js,/img\?\.status==='completed'/);
 assert.match(js,/^\s*['"]?$/m); // no-op formatting smoke
 assert.match(js,/new URL\(img\.image_url\)/);
 assert.match(js,/if\(!url\.username&&!url\.password&&!url\.port\)/);
 assert.match(js,/referrerpolicy="no-referrer"/);
 assert.match(js,/data-marketing-media-close/);
 assert.match(css,/#colzoOwner \.cn-marketing-media-preview/);
});
test('owner-only pause cannot enable automation or run it',()=>{
 const begin=js.indexOf('async function pauseNativeMarketingAutomation()');
 const end=js.indexOf('async function saveNativeMarketingStrategy',begin);
 assert.ok(begin>0&&end>begin);
 const body=js.slice(begin,end);
 assert.match(body,/data\?\.can_pause!==true/);
 assert.match(body,/settings\?\.enabled!==true/);
 assert.match(body,/window\.confirm\(/);
 assert.match(body,/enabled:false,mode:'approval_required'/);
 assert.match(body,/image_enabled:false/);
 assert.match(body,/api\('\/api\/marketing-automation',\{method:'PATCH'/);
 assert.match(body,/result\.settings\.enabled!==false\|\|result\.settings\.mode!=='approval_required'/);
 assert.doesNotMatch(body,/run_now|method:'POST'|fully_automated/);
});
test('server preserves owner-only PATCH, kill switch and documented pause capability',()=>{
 assert.match(autom,/requireBusinessMember\(req, req\.method === 'GET' \? null : \['owner'\]\)/);
 assert.match(autom,/can_pause: auth\.role === 'owner'/);
 assert.match(policy,/Disabling should never retain a latent fully-automated mode/);
 assert.match(policy,/settings = requested\.enabled \? requested : \{ \.\.\.requested, mode: 'approval_required' \}/);
});
test('read-only screens retain Graphite & Volt scope',()=>{
 assert.match(js,/data-marketing-media=/);
 assert.match(js,/data-automation-pause/);
 assert.match(css,/#colzoOwner \.cn-automation-pause/);
 assert.doesNotMatch(css,/#authScreen|#customerPortalScreen/);
});
