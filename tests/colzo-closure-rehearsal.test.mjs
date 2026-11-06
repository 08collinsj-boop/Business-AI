import test from 'node:test';
import assert from 'node:assert/strict';
import {rehearseClosure} from '../scripts/rehearse-colzo-closure.mjs';
test('isolated closure rehearsal verifies rollback, holds, other tenant, shared identity and file-outbox boundaries',async()=>{
 const result=await rehearseClosure();assert.equal(result.syntheticOnly,true);assert.equal(result.liveClosureAccepted,false);assert.equal(result.storageBytesDeleted,false);assert.equal(result.authAccountDeleted,false);assert.equal(result.checks.length,12);
});
