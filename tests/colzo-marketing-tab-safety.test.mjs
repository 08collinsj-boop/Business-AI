import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Colzo compatibility checks current tab parent before moving old Marketing tab',async()=>{
 const source=await readFile(new URL('../assets/final-showcase.js',import.meta.url),'utf8');
 assert.match(source,/if\(cal&&lib&&lib\.parentNode===tabs&&cal!==lib\)tabs\.insertBefore\(cal,lib\)/);
 assert.doesNotMatch(source,/if\(cal&&lib\)tabs\.insertBefore/);
});
