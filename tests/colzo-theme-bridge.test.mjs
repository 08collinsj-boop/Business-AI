import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('Colzo theme bridge is last loaded and scoped to authenticated owner legacy mode',async()=>{
 const [html,css]=await Promise.all([read('index.html'),read('assets/colzo-legacy-theme.css')]);
 assert.ok(html.includes('/assets/colzo-legacy-theme.css?v='));
 assert.ok(html.indexOf('/assets/colzo-legacy-theme.css?v=')>html.indexOf('/assets/colzo-native.css?v='));
 assert.match(css,/body\.colzo-owner-enabled\.auth-ready\.colzo-legacy-mode/);
 assert.doesNotMatch(css, /body\.(?:public-enquiry|customer-account|auth-required)/);
 assert.doesNotMatch(css, /@import|url\(https?:|\/api\/|@font-face/);
 assert.match(css, /--panel:#20272d/);
 assert.match(css, /--accent-blue:#c8ff2e/);
 assert.match(css, /#dashboardApp \.marketing-workspace/);
 assert.match(css, /#dashboardApp \.billing-plan/);
});
test('Colzo legacy theme keeps billing danger action distinct and return route above mobile nav',async()=>{
 const css=await read('assets/colzo-legacy-theme.css');
 assert.match(css, /\.billing-action:not\(\.primary\):not\(\.danger-soft\)/);
 assert.match(css, /#cnReturnToColzo:not\(\[hidden\]\)/);
 assert.match(css, /bottom:calc\(90px \+ env\(safe-area-inset-bottom\)\)/);
 assert.match(css, /:focus-visible/);
 assert.doesNotMatch(css, /pointer-events:\s*none/);
});
test('Owner labels use Colzo without rewriting the existing legal and customer workflow',async()=>{
 const html=await read('index.html');
 assert.match(html, /<h3>Test Colzo properly<\/h3>/);
 assert.match(html, /<h3>What Colzo would do<\/h3>/);
 assert.match(html, /<h3>Colzo impact<\/h3>/);
 assert.match(html, /data-customer-account-link/);
 assert.match(html, /api\('\/api\/billing/);
 assert.match(html, /id="loginForm"/);
});
