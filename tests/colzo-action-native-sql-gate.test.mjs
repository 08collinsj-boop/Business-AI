import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const file=name=>readFileSync(new URL(name,root),'utf8');
test('staged task assignment SQL is rehearsed in an isolated native PostgreSQL 17 harness, never against hosted Dev',()=>{
 assert.ok(existsSync(new URL('scripts/verify-colzo-assignment-sql-native.mjs',root)));
 const js=file('scripts/verify-colzo-assignment-sql-native.mjs');
 assert.match(js,/COLZO_PG_BIN/);
 assert.match(js,/listen_addresses=''/);
 assert.match(js,/COLZO_PG_CLIENT_MODULE/);
 assert.match(js,/COLZO_ACTION_ASSIGNMENT_NOT_APPLIED\.sql/);
 assert.match(js,/foreign|cross-tenant/i);
 assert.match(js,/membership/i);
 assert.match(file('docs/staged-sql/COLZO_ACTION_ASSIGNMENT_NOT_APPLIED.sql'),/ON DELETE SET NULL\s*\(assignee_user_id\)/i);
 assert.doesNotMatch(js,/mvwseobgkexzpmmkgcxe\.supabase\.co/);
});
test('full pilot CI runs assignment SQL rehearsal after ClickUp synthetic backup, with no production credentials',()=>{
 const yaml=file('.github/workflows/pilot-verify.yml');
 assert.match(yaml,/Verify isolated assignment SQL membership constraints/);
 assert.match(yaml,/node scripts\/verify-colzo-assignment-sql-native\.mjs/);
 assert.match(yaml,/Verify Pilot/);
});
