import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=()=>readFileSync(new URL('../scripts/verify-colzo-clickup-sql-native.mjs',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/pilot-verify.yml',import.meta.url),'utf8');

test('ClickUp migration rehearsal requires socket-only disposable PostgreSQL and strips inherited connection credentials',()=>{
 const script=source();
 assert.match(script,/COLZO_PG_BIN/);
 assert.match(script,/COLZO_PG_CLIENT_MODULE/);
 assert.match(script,/!k\.startsWith\('PG'\)/);
 assert.match(script,/listen_addresses=''|listen_addresses=\\'\\'/);
 assert.match(script,/mkdtempSync/);
 assert.doesNotMatch(script,/DATABASE_URL|SUPABASE_DB_PASSWORD|SUPABASE_SERVICE_ROLE_KEY/);
});

test('ClickUp migration rehearsal creates fictional archive, applies exact SQL and restores independent baseline',()=>{
 const script=source();
 assert.match(script,/20261112013500_add_clickup_connections\.sql/);
 assert.match(script,/pg_dump/);
 assert.match(script,/pg_restore/);
 assert.match(script,/colzo_clickup_oauth_states/);
 assert.match(script,/colzo_clickup_connections/);
 assert.match(script,/has_table_privilege/);
 assert.match(script,/restore/i);
 assert.match(script,/RLS|row level security/i);
});

test('Pilot Verification runs the isolated migration and backup restore without any hosted connection',()=>{
 assert.match(workflow,/Verify isolated ClickUp SQL and synthetic backup restore/);
 assert.match(workflow,/node scripts\/verify-colzo-clickup-sql-native\.mjs/);
});
