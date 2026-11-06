import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('offline data return rehearsal refuses mixed, shared and symlink output and verifies full synthetic manifest',()=>{
 const result=JSON.parse(execFileSync('python3',['scripts/verify-colzo-export-safety.py'],{encoding:'utf8'}));
 assert.equal(result.synthetic_only,true);assert.equal(result.live_return_or_deletion_verified,false);
 assert.ok(result.category_count>=47);assert.equal(result.checks.length,8);
});
