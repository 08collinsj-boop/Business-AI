import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const build=readFileSync('scripts/build-colzo-react.mjs','utf8');
test('static Colzo build publishes the CSS required by legal pages',()=>{
 assert.ok(existsSync('assets/colzo-customer-stitch.css'));
 assert.match(build,/colzo-customer-stitch\.css/);
});
test('legacy informational routes retain their scripts while showing the Colzo icon',()=>{
 for(const path of ['site/ai-marketing-small-business/index.html','site/customer-enquiry-management/index.html']){
  const html=readFileSync(path,'utf8');
  assert.doesNotMatch(html,/\/business-ai-(?:icon\.svg|mark\.webp)/);
  assert.doesNotMatch(html,/src="\/site\.js"/);
  assert.match(html,/\/assets\/icons\/colzo-mark\.svg/);
  assert.match(html,/\/legacy-site\.js/);
 }
 assert.ok(existsSync('site/legacy-site.js'));
 assert.match(build,/legacy-site\.js/);
});
