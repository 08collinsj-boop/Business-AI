import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {withoutScopedPilotGuards} from './helpers/reviewed-auth.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

// Preserve reviewed original code outside explicitly tested scoped-pilot denials.
// The customer-portal handler now has a separately tested, intentional Dev-only
// security fix; it must not be incorrectly represented as byte-identical.
const frozen={
 'api/leads.js':'9efdf1759c41ffbdd561f9e43eaa1be1828fa97e4e17e6360381ef7029828888'
};
test('unchanged leads module preserves its original reviewed bytes',async()=>{
 for(const [path,expected] of Object.entries(frozen)){
  const contents=await readFile(new URL('../'+path,import.meta.url));
  assert.equal(createHash('sha256').update(contents).digest('hex'),expected,`Production backend unexpectedly modified: ${path}`);
 }
});
test('authentication preserves original reviewed bytes outside two scoped-pilot denial guards',async()=>{
 const source=withoutScopedPilotGuards(await read('lib/auth.js'));
 assert.equal(createHash('sha256').update(source).digest('hex'),'9ac5a0bc7def893469dfd9773136146490a5c32a6c892f220aa6a7536f2276d8');
});
test('billing preserves every original reviewed byte outside the isolated scoped-pilot guard',async()=>{
 const source=await read('lib/billing-handler.js');
 const scopedImport='import {isScopedPilotRequested} from "./colzo-scoped-pilot.js";\n';
 const start=source.indexOf('  if (isScopedPilotRequested()) {\n');
 const end=source.indexOf('  if (isPilotFreeStarterMarketingEnabled()) {\n',start);
 assert.ok(start>source.indexOf('if (!auth.enforced)'), 'owner authentication must precede pilot handling');
 assert.ok(end>start, 'pilot guard must end before the legacy billing path');
 assert.equal(source.split(scopedImport).length,2);
 const original=(source.slice(0,start)+source.slice(end)).replace(scopedImport,'');
 assert.equal(createHash('sha256').update(original).digest('hex'),
  '410689630b152cf363dc4e2083aed09753f34ba38fb122078913890d6f2758f5',
  'Original billing logic or security safeguards unexpectedly modified');
});
test('intentional Development customer portal change enforces cross-tenant joins and race-safe profiles',async()=>{
 const source=await read('lib/customer-portal-handler.js');
 assert.match(source,/lead\.business_id !== link\.business_id/);
 assert.match(source,/business\.business_id !== link\.business_id/);
 assert.match(source,/row\.business_id !== lead\.business_id/);
 assert.match(source,/resolution=ignore-duplicates,return=representation/);
 // The accompanying executed tests supply synthetic mismatches and
 // a duplicate-profile race, not just static source assertions.
 const matrix=await read('tests/colzo-customer-portal-tenant-joins.test.mjs');
 assert.match(matrix,/accessBusiness:B,leadBusiness:A/);
 assert.match(matrix,/reviewBusiness:B/);
 assert.match(matrix,/parallel first visits/);
});
test('Colzo visual-only shell preserves the five original Business AI navigation actions and working authentication',async()=>{
 const html=await read('index.html');
 assert.match(html,/<body class="auth-pending app-loading colzo-safe-shell colzo-interface"/);
 assert.match(html,/id="dashboardView"[\s\S]*?class="colzo-command-hero"/);
 assert.match(html,/colzo-hero-art[\s\S]{0,200}colzo-mark\.svg/);
 assert.match(html,/colzo-dashboard-section-title/);
 assert.match(html,/colzo-hero-primary[^>]*>View enquiries/);
 assert.match(html,/href="\/assets\/colzo-dashboard-visual\.css\?v=/);
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
 const visuals=await read('assets/colzo-dashboard-visual.css');
 assert.match(visuals,/colzo-command-hero/);
 assert.match(visuals,/colzo-interface\.auth-ready \.bottom-nav/);
 assert.match(visuals,/settings-hub-card/);
 assert.match(visuals,/leadList \.lead-card/);
 assert.doesNotMatch(visuals,/#pilotProgressCard\{display:none!important/);
 assert.doesNotMatch(visuals,/#firstRunGuide\{display:none!important/);
});
