import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const v=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
test('every route has a safe, minimally invasive Referrer Policy and nosniff header',()=>{
 const global=v.headers.find(rule=>rule.source==='/(.*)');
 assert.ok(global,'Vercel global headers needed');
 const headers=new Map(global.headers.map(({key,value})=>[key.toLowerCase(),value]));
 assert.equal(headers.get('x-content-type-options'),'nosniff');
 assert.equal(headers.get('referrer-policy'),'strict-origin-when-cross-origin');
 assert.equal(headers.has('content-security-policy'),false,'CSP needs separate third-party compatibility audit');
 assert.equal(headers.has('x-frame-options'),false,'existing public customer widget may be embedded');
 assert.equal(headers.has('permissions-policy'),false,'microphone/camera need separate product acceptance');
});
test('existing legal headers, customer routes and marketing scheduler stay unchanged',()=>{
 const legal=v.headers.find(rule=>rule.source==='/legal/(.*)');
 assert.ok(legal);
 assert.ok(legal.headers.some(h=>h.key==='X-Robots-Tag'&&h.value.includes('noindex')));
 const rewrite=(source)=>v.rewrites.find(route=>route.source===source)?.destination;
 assert.equal(rewrite('/customer/account'),'/index.html');
 assert.equal(rewrite('/customer'),'/index.html');
 assert.equal(rewrite('/api/public-config'),'/api/operations?operation=public-config');
 assert.equal(rewrite('/api/health'),'/api/operations?operation=health');
 assert.ok(v.crons.some(item=>item.path==='/api/marketing-scheduler'));
});
