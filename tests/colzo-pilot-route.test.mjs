import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const home=readFileSync('site/index.html','utf8');
const build=readFileSync('scripts/build-colzo-react.mjs','utf8');
const pilot='site/pilot/index.html';
test('homepage links to the existing /pilot/ path',()=>{
  assert.match(home,/href="\/pilot\/"/);
  assert.doesNotMatch(home,/href="mailto:support@getbusiness-ai\.com\?subject=Colzo%20pilot%20interest"/);
});
test('standalone public-site build includes the /pilot/ page',()=>{
  assert.match(build,/cp\('site\/pilot',\s*out\s*\+\s*'\/pilot'/);
});
test('pilot page accurately explains no payment or immediate account',()=>{
  assert.ok(existsSync(pilot),'pilot path required');
  const html=readFileSync(pilot,'utf8');
  assert.match(html,/<title>Free 14-day pilot \| Colzo<\/title>/);
  assert.match(html,/not an instant account or a subscription/i);
  assert.match(html,/no card or contract/i);
  assert.match(html,/does not answer telephone calls/i);
  assert.doesNotMatch(html,/£3\.99|regular 7-day trial|instant onboarding|guaranteed results/i);
});
test('pilot contact works without form submission or JavaScript',()=>{
  assert.ok(existsSync(pilot),'pilot path required');
  const html=readFileSync(pilot,'utf8');
  assert.match(html,/href="mailto:support@getbusiness-ai\.com\?subject=Colzo%20pilot%20interest/);
  assert.match(html,/Nothing is submitted until you send the message/i);
  assert.match(html,/href="\/legal\/privacy\.html"/);
  assert.doesNotMatch(html,/<form\b|<script\b/i);
});
