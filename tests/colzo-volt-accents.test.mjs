import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const styleFiles=[
 'index.html',
 'assets/premium-ui.css',
 'assets/premium-v2.css',
 'assets/final-showcase.css',
 'assets/mock-v3.css',
 'assets/customer-portal.css',
 'assets/marketing.css',
 'assets/marketing-site.css',
 'assets/security-center.css',
 'assets/colzo-native.css',
 'site/site.css',
 'site/seo.css'
];
// Strong blue accent values, excluding muted slate and nearly black graphite surfaces.
function vividBlue(r,g,b){
 const min=Math.min(r,g,b);
 return b>=90 && b>r*1.18 && b>g*1.05 && b-min>38;
}
function remainingBlueAccents(source){
 const hits=[];
 for(const m of source.matchAll(/#([\da-f]{6})(?![\da-f])/gi)){
  const n=Number.parseInt(m[1],16);
  if(vividBlue(n>>>16&255,n>>>8&255,n&255))hits.push(m[0]);
 }
 for(const m of source.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)/gi)){
  if(vividBlue(Number(m[1]),Number(m[2]),Number(m[3])))hits.push(m[0]);
 }
 return hits;
}
test('Colzo legacy and public UI styles use Volt green rather than vivid blue accents',async()=>{
 const issues=[];
 for(const path of styleFiles){
  const source=await read(path);
  const leftovers=remainingBlueAccents(source);
  if(leftovers.length)issues.push(path+': '+[...new Set(leftovers)].slice(0,5).join(', '));
 }
 assert.deepEqual(issues,[],'Brand accents should not regress to blue');
});
test('Colzo Volt tokens and illustrated dashboard chart share the new palette',async()=>{
 const [html,styles,chart]=await Promise.all([
  read('index.html'),read('assets/colzo-surfaces.css'),read('assets/final-showcase.js')
 ]);
 assert.match(html,/--blue:#c8ff2e/i);
 assert.match(html,/--accent-blue:#c8ff2e/i);
 assert.match(styles,/--cz-volt:#c8ff2e/i);
 assert.doesNotMatch(chart,/#347dff/i);
 assert.match(chart,/stop-color="#c8ff2e"/i);
});
