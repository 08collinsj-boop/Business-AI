import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('offline attachment return matches record references and rejects incomplete or unsafe bundles',()=>{
 const result=JSON.parse(execFileSync('python3',['scripts/verify-colzo-attachment-return.py'],{encoding:'utf8'}));
 assert.equal(result.synthetic_only,true);
 assert.equal(result.network_used,false);
 assert.equal(result.live_return_verified,false);
 assert.ok(result.checks.length>=12);
 assert.equal(result.file_count,4);
});
