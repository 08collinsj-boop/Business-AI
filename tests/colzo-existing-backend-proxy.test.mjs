import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Colzo development preview cannot proxy requests into Business AI Pilot',async()=>{
 const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(config.rewrites.some(r=>/^https:\/\/business-ai-pilot\.vercel\.app\/api\//.test(String(r.destination))),false);
 assert.equal(config.rewrites.some(r=>r.source==='/colzo-backend/:path*'),false);
 assert.ok(config.rewrites.some(r=>r.source==='/api/public-config'&&r.destination==='/api/operations?operation=public-config'));
 assert.ok(config.rewrites.some(r=>r.source==='/api/business-profile'));
 assert.ok(config.rewrites.some(r=>r.source==='/api/colzo-records'));
 assert.ok(config.rewrites.some(r=>r.source==='/customer/account'));
 const frontend=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(frontend,/initializeAuthentication\(\)/);
 assert.match(frontend,/colzoBackendFetch\('\/api\/public-config'\)/);
 assert.match(frontend,/supabaseClient\.auth\.signInWithPassword/);
 const auth=await readFile(new URL('../lib/auth.js',import.meta.url),'utf8');
 assert.match(auth,/requireBusinessMember/);
});
