import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('Colzo preview serves its local API handlers and never rewrites to the pilot backend',async()=>{
 const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.ok(!config.rewrites.some(r=>r.source==='/colzo-backend/:path*'));
 assert.ok(!config.rewrites.some(r=>/^https?:\/\//.test(String(r.destination))));
 assert.ok(config.rewrites.some(r=>r.source==='/api/public-config'));
 assert.ok(config.rewrites.some(r=>r.source==='/api/colzo-records'));
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/assets\/colzo-backend-bridge\.js/);
 assert.match(html,/window\.colzoBackendFetch\('\/api\/public-config'\)/);
 assert.match(html,/window\.colzoBackendFetch\(url,\{\.\.\.options,headers\}\)/);
 for(const file of ['../assets/customer-portal.js','../assets/security-center.js']){
   assert.match(await readFile(new URL(file,import.meta.url),'utf8'),/window\.colzoBackendFetch\(/);
 }
});

test('Bridge sends same-origin API calls to this deployment and preserves method, auth and query',async()=>{
 const source=await readFile(new URL('../assets/colzo-backend-bridge.js',import.meta.url),'utf8');
 const calls=[];
 const window={location:{origin:'https://colzo.example'},fetch:async(...args)=>{calls.push(args);return {ok:true};}};
 const context={window,URL,Request};
 vm.runInNewContext(source,context);
 const auth={Authorization:'Bearer opaque-test-token'};
 await window.colzoBackendFetch('/api/business-onboarding',{headers:auth});
 assert.equal(calls[0][0],'/api/business-onboarding');
 assert.equal(calls[0][1].headers,auth);
 await window.colzoBackendFetch('/api/bookings?filter=all',{method:'GET'});
 assert.equal(calls[1][0],'/api/bookings?filter=all');
 await window.colzoBackendFetch('/api/colzo-records?resource=clients');
 assert.equal(calls[2][0],'/api/colzo-records?resource=clients');
 await window.colzoBackendFetch('https://mvwseobgkexzpmmkgcxe.supabase.co/auth/v1/user');
 assert.equal(calls[3][0],'https://mvwseobgkexzpmmkgcxe.supabase.co/auth/v1/user');
 await window.colzoBackendFetch('/assets/logo.png');
 assert.equal(calls[4][0],'/assets/logo.png');
 assert.equal(window.colzoBackendUrl('/api/settings?tab=team'),'/api/settings?tab=team');
});

test('Only approved Preview dashboard strings use the same-origin dispatcher and preserve request options',async()=>{
 const source=await readFile(new URL('../assets/colzo-backend-bridge.js',import.meta.url),'utf8');
 const calls=[];
 const window={location:{origin:'https://fixture.vercel.app'},colzoPreviewAuthTransportEnabled:true,
   fetch:async(...args)=>{calls.push(args);return {ok:true}}};
 vm.runInNewContext(source,{window,URL,Request});
 const options={method:'PATCH',headers:{'X-Colzo-Supabase-Authorization':'Bearer synthetic-only'},body:'{"id":1}'};
 await window.colzoBackendFetch('/api/leads?filter=open&operation=team',options);
 assert.equal(calls[0][0],'/api/operations?filter=open&operation=leads');
 assert.equal(calls[0][1],options,'never clone or drop body/auth/method');
 for(const route of ['pipeline','settings']){
   const target=new URL(window.colzoBackendUrl('/api/'+route+'?tab=all'),window.location.origin);
   assert.equal(target.origin,window.location.origin);assert.equal(target.pathname,'/api/operations');
   assert.equal(target.searchParams.get('operation'),route);assert.equal(target.searchParams.get('tab'),'all');
 }
 for(const input of ['/api/team','/api/leads-extra','https://external.invalid/api/leads','//external.invalid/api/settings','/assets/logo.png']){
   assert.equal(window.colzoBackendUrl(input),input);
 }
 const request=new Request('https://fixture.vercel.app/api/leads');
 assert.equal(window.colzoBackendUrl(request),request,'unhandled Request objects retain native fetch semantics');
 for(const flag of [false,undefined,'true']){
   window.colzoPreviewAuthTransportEnabled=flag;
   assert.equal(window.colzoBackendUrl('/api/leads'),'/api/leads','no routing change outside enabled Preview');
 }
 window.colzoPreviewAuthTransportEnabled=true;window.location.origin='http://fixture.invalid';
 assert.equal(window.colzoBackendUrl('/api/leads'),'/api/leads','HTTPS is required');
});
