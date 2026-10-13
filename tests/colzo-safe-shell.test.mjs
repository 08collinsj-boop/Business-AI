import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

// Exact unmodified modules from live Business AI SHA 91b0d6ef: no hidden backend switch.
const frozen={
 'lib/auth.js':'9ac5a0bc7def893469dfd9773136146490a5c32a6c892f220aa6a7536f2276d8',
 'api/operations.js':'ce90d1bbc7ff68bf7982143d46833b52b4f9003444e65c08e71728bbc6c3ca50',
 'api/leads.js':'9efdf1759c41ffbdd561f9e43eaa1be1828fa97e4e17e6360381ef7029828888',
 'lib/billing-handler.js':'410689630b152cf363dc4e2083aed09753f34ba38fb122078913890d6f2758f5',
 'lib/customer-portal-handler.js':'e514567ae43b5fcab6356ad42c800cd09b392ab42b283dc26626a6e3cb708c34'
};
test('auth, owner/customer data APIs, billing and customer portal handlers remain byte-identical to current live release',async()=>{
 for(const [path,expected] of Object.entries(frozen)){
  const contents=await readFile(new URL('../'+path,import.meta.url));
  assert.equal(createHash('sha256').update(contents).digest('hex'),expected,`Production backend unexpectedly modified: ${path}`);
 }
});
test('Colzo visual-only shell preserves the five original Business AI navigation actions and working authentication',async()=>{
 const html=await read('index.html');
 assert.match(html,/<body class="auth-pending app-loading colzo-safe-shell"/);
 assert.match(html,/<title>Colzo \| Business workspace<\/title>/);
 assert.match(html,/href="\/assets\/colzo-safe-shell\.css\?v=/);
 assert.match(html,/class="app-splash-brand">Colzo<\/h1>/);
 assert.match(html,/id="brandName">Colzo<\/h1>/);
 assert.match(html,/class="auth-shared-brand"[\s\S]{0,210}<h1><span>Colzo<\/span><\/h1>/);
 for(const view of ['dashboard','leads','actions','bookings','settings']){
  assert.match(html,new RegExp(`class="nav-btn[^\"]*"[^>]*data-view="${view}"[^>]*onclick="showView\\('${view}'\\)"`));
 }
 assert.match(html,/\/api\/public-config/);
 assert.match(html,/supabaseClient\.auth\.signInWithPassword/);
 assert.match(html,/\/api\/business-onboarding/);
 assert.match(html,/\/api\/billing/);
 assert.doesNotMatch(html,/\/api\/colzo\/projects/);
});
test('PWA Colzo icons exist and the service worker still caches only static allowlisted, non-sensitive files',async()=>{
 const manifest=JSON.parse(await read('manifest.webmanifest'));
 const sw=await read('sw.js');const css=await read('assets/colzo-safe-shell.css');
 assert.equal(manifest.name,'Colzo');assert.equal(manifest.id,'/');assert.equal(manifest.start_url,'/');
 for(const size of [16,32,180,192,512]){
  const file=new URL(`../assets/icons/colzo-${size}.png`,import.meta.url);
  assert.ok((await stat(file)).size>100,`Missing local PWA icon ${size}`);
  assert.match(sw,new RegExp(`"/assets/icons/colzo-${size}\\.png"`));
 }
 assert.match(sw,/if \(url\.origin !== self\.location\.origin \|\| request\.mode === "navigate" \|\| url\.pathname\.startsWith\("\/api\/"\)\) return/);
 assert.doesNotMatch(sw,/Authorization|access_token|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|\/api\/.*cache\.put/);
 assert.match(css,/#c8ff2e/i);assert.match(css,/#15181d/i);
});
