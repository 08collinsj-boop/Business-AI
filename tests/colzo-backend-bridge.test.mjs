import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('Colzo uses a non-filesystem API prefix mapped to the existing Business AI backend',async()=>{
 const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.deepEqual(config.rewrites[0],{source:'/colzo-backend/:path*',destination:'https://business-ai-pilot.vercel.app/api/:path*'});
 assert.ok(!config.rewrites.some(r=>r.source==='/api/:path*'));
 assert.ok(config.rewrites.some(r=>r.source==='/api/public-config'));
 assert.ok(config.rewrites.some(r=>r.source==='/customer/account'));
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/assets\/colzo-backend-bridge\.js/);
 assert.match(html,/window\.colzoBackendFetch\('\/api\/public-config'\)/);
 assert.match(html,/window\.colzoBackendFetch\(url,\{\.\.\.options,headers\}\)/);
 for(const file of ['../assets/customer-portal.js','../assets/security-center.js']){
   assert.match(await readFile(new URL(file,import.meta.url),'utf8'),/window\.colzoBackendFetch\(/);
 }
});

test('Bridge forwards same-origin API calls, preserves auth and query, leaves Supabase and other paths alone',async()=>{
 const source=await readFile(new URL('../assets/colzo-backend-bridge.js',import.meta.url),'utf8');
 const calls=[];
 const window={location:{origin:'https://colzo.example'},fetch:async(...args)=>{calls.push(args);return {ok:true};}};
 const context={window,URL,Request};
 vm.runInNewContext(source,context);
 const auth={Authorization:'Bearer opaque-test-token'};
 await window.colzoBackendFetch('/api/business-onboarding',{headers:auth});
 assert.equal(calls[0][0],'/colzo-backend/business-onboarding');
 assert.equal(calls[0][1].headers,auth);
 await window.colzoBackendFetch('/api/bookings?filter=all',{method:'GET'});
 assert.equal(calls[1][0],'/colzo-backend/bookings?filter=all');
 await window.colzoBackendFetch('/api/colzo-records?resource=clients');
 assert.equal(calls[2][0],'/api/colzo-records?resource=clients','Colzo records must execute on this deployment, not proxy to the legacy backend');
 await window.colzoBackendFetch('https://mvwseobgkexzpmmkgcxe.supabase.co/auth/v1/user');
 assert.equal(calls[3][0],'https://mvwseobgkexzpmmkgcxe.supabase.co/auth/v1/user');
 await window.colzoBackendFetch('/assets/logo.png');
 assert.equal(calls[4][0],'/assets/logo.png');
});
