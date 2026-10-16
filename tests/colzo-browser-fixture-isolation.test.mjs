import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const smokeScripts=[
 'colzo-auth-browser.cjs',
 'colzo-records-save-browser.cjs',
 'colzo-mfa-browser.cjs',
 'colzo-native-browser.cjs',
 'colzo-lead-save-browser.cjs',
 'colzo-settings-browser.cjs',
 'colzo-security-methods-browser.cjs',
 'colzo-workflows-browser.cjs',
 'colzo-safe-shell-browser.cjs'
];
for(const script of smokeScripts){
 test(`Colzo synthetic browser QA uses local preview APIs: ${script}`,async()=>{
  const source=await readFile(new URL(`../scripts/${script}`,import.meta.url),'utf8');
  assert.doesNotMatch(source,/colzo-backend\//,'obsolete Pilot proxy fixtures cannot verify isolated Preview routes');
  assert.match(source,/\/api\/public-config/,'the auth bootstrap must be intercepted with a synthetic public config');
  assert.match(source,/\.route\(/,'browser smoke must intercept network requests before navigation');
 });
}
test('Saved-record browser QA models guarded update_at contract',async()=>{
 const source=await readFile(new URL('../scripts/colzo-records-save-browser.cjs',import.meta.url),'utf8');
 assert.match(source,/expected_updated_at/,'browser fixture must assert optimistic concurrency on PATCH');
 assert.match(source,/updated_at/,'fixture records must include a server-provided updated_at');
 assert.match(source,/\b409\b/,'stale concurrent updates must be rejected');
});
