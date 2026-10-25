import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const correct='https://www.facebook.com/1369934002862359';
for(const page of ['site/index.html','site/pilot/index.html'])test(`${page} points to the verified Colzo Facebook Page`,()=>{
 const html=readFileSync(page,'utf8');
 assert.match(html,new RegExp(correct.replaceAll('.','\\.')));
 assert.match(html,/Colzo on Facebook/);
 assert.doesNotMatch(html,/Business\.AI on Facebook|Business AI on Facebook/);
});
