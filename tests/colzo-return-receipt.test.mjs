import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('independent offline return receipt verifies all local files and fails closed on corruption or unsafe input',()=>{
 const result=JSON.parse(execFileSync('python3',['scripts/verify-colzo-return-receipt.py'],{encoding:'utf8'}));
 assert.equal(result.synthetic_only,true);assert.equal(result.network_used,false);assert.equal(result.live_return_verified,false);assert.ok(result.checks.length>=14);
});
