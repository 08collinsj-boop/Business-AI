import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
const read=async path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
test('custom public domain serves the dedicated marketing homepage',async()=>{const config=JSON.parse(await read('vercel.json'));const rule=config.rewrites.find(item=>item.source==='/'&&item.destination==='/marketing.html');assert.ok(rule);assert.deepEqual(rule.has,[{type:'host',value:'getbusiness-ai.com'}]);});
test('marketing homepage keeps app and legal destinations separate',async()=>{const html=await read('marketing.html');assert.match(html,/https:\/\/app\.getbusiness-ai\.com\//);assert.match(html,/support@getbusiness-ai\.com/);assert.match(html,/\/legal\/privacy\.html/);assert.match(html,/\/legal\/terms\.html/);assert.match(html,/Your business,[\s\S]*always available\./);});
test('marketing animation respects reduced-motion preference',async()=>{const css=await read('assets/marketing-site.css');assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/animation:none!important/);});
