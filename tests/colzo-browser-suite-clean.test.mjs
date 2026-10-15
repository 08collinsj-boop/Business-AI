import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

const runner = new URL('../scripts/colzo-browser-suite-clean.cjs',import.meta.url);
test('Colzo clean synthetic browser runner enumerates all twelve recognised browser fixtures',()=>{
 const proc=spawnSync(process.execPath,[runner.pathname,'--list'],{encoding:'utf8'});
 assert.equal(proc.status,0,proc.stderr);
 const names=proc.stdout.trim().split('\n');
 assert.equal(names.length,12);
 assert.equal(new Set(names).size,12);
 for(const name of names) assert.match(name,/^colzo-[a-z-]+\.cjs$/);
});
test('Colzo browser runner refuses unknown QA scripts without executing them',()=>{
 const proc=spawnSync(process.execPath,[runner.pathname,'--only=not-a-fixture.cjs'],{encoding:'utf8'});
 assert.equal(proc.status,2);
 assert.match(proc.stderr,/Invalid --only selection/);
});
test('Colzo QA runner enforces fresh local ports and bounded cleanup, not browser access to live services',async()=>{
 const source=await readFile(runner,'utf8');
 assert.match(source,/server\.listen\(0,'127\.0\.0\.1'/);
 assert.match(source,/killGroup\(child,'SIGTERM'\)/);
 assert.match(source,/COLZO_BROWSER_TIMEOUT_MS/);
 assert.doesNotMatch(source,/https?:\/\/(?:.*supabase\.co|.*vercel\.app)/);
 assert.doesNotMatch(source,/process\.env\.(?:STRIPE_|SUPABASE_SERVICE_ROLE_KEY)/i);
});
