import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
const marketingPages=['about','contact','resources','resources/ai-lead-capture-trades','resources/automate-website-enquiries-small-business','resources/ai-website-receptionist-small-business','ai-receptionist','ai-for-trades','teesside','small-business-ai','ai-marketing','ai-marketing-small-business','customer-enquiry-management'];
const homepage=readFileSync('site/index.html','utf8');
const build=readFileSync('scripts/build-colzo-react.mjs','utf8');
test('Colzo release retains existing public marketing and support URLs',()=>{
 for(const route of marketingPages){
  assert.ok(existsSync(`site/${route}/index.html`),`Missing ${route}/ from the staged website`);
 }
 for(const file of ['seo.css','robots.txt','sitemap.xml','llms.txt']) assert.ok(existsSync(`site/${file}`),file);
});
test('previous supporting pages are branded Colzo instead of Business AI',()=>{
 for(const route of marketingPages){
  const page=readFileSync(`site/${route}/index.html`,'utf8');
  assert.match(page,/Colzo/i,route);
  assert.doesNotMatch(page, /<title>[^<]*Business AI|<meta[^>]*(?:title|site_name)[^>]*Business AI/i,route);
 }
});
test('standalone Vercel site includes preserved marketing routes in its output',()=>{
 assert.match(build,/Preserve legacy search and contact routes/);
 assert.match(build,/out \+ '\/' \+ route/);
 assert.match(build,/\['about', 'contact', 'resources'/);
});
test('Colzo homepage continues to offer About, Contact and Resources',()=>{
 for(const url of ['/about/','/contact/','/resources/']) assert.ok(homepage.includes(`href="${url}"`),url);
});
