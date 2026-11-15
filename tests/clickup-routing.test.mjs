import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const jsapi=readdirSync(new URL('../api/',import.meta.url)).filter(f=>f.endsWith('.js'));
const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const dispatcher=readFileSync(new URL('../api/operations.js',import.meta.url),'utf8');
test('Vercel Hobby function ceiling is not exceeded',()=>{
  assert.ok(jsapi.length<=12,'Serverless files must remain at 12 or fewer, got '+jsapi.length);
  assert.equal(jsapi.includes('clickup.js'),false);
  assert.equal(jsapi.includes('clickup-callback.js'),false);
});
test('existing operations router dispatches both ClickUp handlers',()=>{
  assert.match(dispatcher,/clickupHandler/);
  assert.match(dispatcher,/clickupCallbackHandler/);
  assert.match(dispatcher,/clickup:\s*clickupHandler/);
  assert.match(dispatcher,/"clickup-callback":\s*clickupCallbackHandler/);
});
test('public ClickUp paths rewrite to the existing operations function',()=>{
  const routes=vercel.rewrites.filter(x=>x.source==='/api/clickup'||x.source==='/api/clickup-callback');
  assert.deepEqual(routes,[{source:'/api/clickup',destination:'/api/operations?operation=clickup'},{source:'/api/clickup-callback',destination:'/api/operations?operation=clickup-callback'}]);
});

