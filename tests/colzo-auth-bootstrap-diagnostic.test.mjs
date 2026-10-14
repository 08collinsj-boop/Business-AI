import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Colzo business bootstrap reports only failing API endpoint and status safely',async()=>{
 const source=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(source,/let colzoLoginFailure=null/);
 assert.match(source,/colzoLoginFailure=\{path:requestUrl\.pathname,status:response\.status\}/);
 assert.match(source,/Your business access is unavailable\. Diagnostic:/);
 assert.match(source,/colzoLoginFailure\.status/);
 assert.match(source,/clearPrivateState\(\)/);
 assert.doesNotMatch(source,/Diagnostic:.*access_token/);
 assert.match(source,/supabaseClient\.auth\.signInWithPassword/);
});
