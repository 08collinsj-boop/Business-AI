import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('site/index.html','utf8');

test('approved combined homepage and artwork are present',()=>{
 assert.match(source,/id="concept-hybrid"/);
 assert.match(source,/class="concept hybrid active"/);
 assert.match(source,/class="hybrid-product"/);
 assert.match(source,/class="hybrid-floating"/);
 assert.match(source,/data:image\/webp;base64,[A-Za-z0-9+/=]+/);
 assert.doesNotMatch(source,/class="review-bar"|class="concept-button"/);
});
test('pilot and support links are real and no paid signup is introduced',()=>{
 for(const path of ['/pilot/','/about/','/contact/','/resources/','/how-to-use/#how-to-use']) assert.ok(source.includes('href="'+path+'"'),path);
 assert.match(source,/does not convert automatically.*paid subscription/);
 assert.match(source,/data-colzo-app-link/);
});
test('fictional tabs are present and require no server writes',()=>{
 for(const key of ['enquiries','bookings','followups']) assert.match(source,new RegExp('data-tab="'+key+'"'));
 assert.match(source,/Fictional workspace/);
 assert.match(source,/Illustrative interface and fictional data/);
 assert.match(source,/const mock=/);
});
