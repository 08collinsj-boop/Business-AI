import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Colzo preview uses the existing Business AI server while keeping all original code and config',async()=>{
 const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.deepEqual(config.rewrites[0],{source:'/colzo-backend/:path*',destination:'https://business-ai-pilot.vercel.app/api/:path*'});
 assert.ok(config.rewrites.some(r=>r.source==='/api/public-config'&&r.destination==='/api/operations?operation=public-config'));
 assert.ok(config.rewrites.some(r=>r.source==='/api/business-profile'));
 assert.ok(config.rewrites.some(r=>r.source==='/customer/account'));
 assert.ok(config.crons?.some(c=>c.path==='/api/marketing-scheduler'));
 const frontend=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(frontend,/initializeAuthentication\(\)/);
 assert.match(frontend,/colzoBackendFetch\('\/api\/public-config'\)/);
 assert.match(frontend,/supabaseClient\.auth\.signInWithPassword/);
 const auth=await readFile(new URL('../lib/auth.js',import.meta.url),'utf8');
 assert.match(auth,/requireBusinessMember/);
});
