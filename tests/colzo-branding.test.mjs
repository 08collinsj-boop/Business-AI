import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, stat } from 'node:fs/promises';
const read = path => readFile(new URL('../'+path,import.meta.url),'utf8');
test('installed Business AI PWA updates in place to Colzo branding',async()=>{
  const manifest=JSON.parse(await read('manifest.webmanifest'));
  assert.equal(manifest.name,'Colzo');assert.equal(manifest.short_name,'Colzo');
  assert.equal(manifest.id,'/');assert.equal(manifest.start_url,'/');
  assert.equal(manifest.theme_color,'#15181d');
  for(const icon of manifest.icons){assert.match(icon.src,/colzo-\d+\.png/);await stat(new URL('..'+icon.src,import.meta.url));}
});
test('Colzo name, Graphite and Volt identity appear across the actual app shell',async()=>{
  const [html,theme,worker]=await Promise.all(['index.html','assets/colzo-theme.css','sw.js'].map(read));
  assert.match(html,/<title>Colzo<\/title>/);
  assert.match(html,/apple-mobile-web-app-title" content="Colzo"/);
  assert.match(html,/<h1 class="app-splash-brand">Colzo<\/h1>/);
  assert.match(html,/<h1 id="brandName">Colzo<\/h1>/);
  assert.match(html,/id="customerPortalScreen"/);
  assert.match(html,/id="publicDirectoryScreen"/);
  assert.match(html,/\/assets\/colzo-theme\.css/);
  assert.match(theme,/#c8ff2e/i);assert.match(theme,/#15181d/i);
  assert.match(worker,/colzo-static-v1/);assert.doesNotMatch(worker,/business-ai-192\.png/);
});
test('existing legal agreements and technical session identifiers are preserved',async()=>{
  const [html,terms]=await Promise.all(['index.html','legal/terms.html'].map(read));
  assert.match(html,/Business AI Pilot terms/);
  assert.match(html,/Business AI processes customer enquiry data/);
  assert.match(terms,/Business AI/i);
  assert.match(html,/business-ai-enquiry-conversation/);
  const portal=await read('assets/customer-portal.js');
  assert.match(portal,/\/api\/customer-portal/);
});
test('all new icons exist and brand remains separate from legal and payment infrastructure',async()=>{
  const manifest=JSON.parse(await read('manifest.webmanifest'));
  for(const icon of manifest.icons){await stat(new URL('..'+icon.src,import.meta.url));}
  for(const size of [16,32,180])await stat(new URL(`../assets/icons/colzo-${size}.png`,import.meta.url));
  await stat(new URL('../assets/icons/colzo-mark.svg',import.meta.url));
  const html=await read('index.html');
  assert.match(html,/\/assets\/icons\/colzo-mark\.svg/);
});
