import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../docs/sql-proposals/colzo_whatsapp_demo_inbox_development.sql',import.meta.url),'utf8');

test('development-only synthetic WhatsApp inbox schema is tenant keyed and entirely separate from provider receipts',()=>{
 assert.match(sql,/create table if not exists public\.colzo_whatsapp_demo_threads/i);
 assert.match(sql,/primary key\s*\(business_id,\s*fixture_key\)/i);
 assert.match(sql,/references public\.businesses\(id\)/i);
 assert.match(sql,/check \(synthetic\)/i);
 assert.doesNotMatch(sql,/create table if not exists public\.whatsapp_inbound_receipts/i);
});
test('RLS denies anonymous and all authenticated writes, owner/admin alone can read',()=>{
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/revoke all on public\.colzo_whatsapp_demo_threads from anon, authenticated/i);
 assert.match(sql,/grant select on public\.colzo_whatsapp_demo_threads to authenticated/i);
 assert.match(sql,/for select to authenticated/i);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/membership\.role in \('owner', 'admin'\)/i);
 assert.doesNotMatch(sql,/grant (insert|update|delete|all) on public\.colzo_whatsapp_demo_threads to authenticated/i);
});
test('database constraints forbid outbound-like/real customer data and human drafts',()=>{
 assert.match(sql,/fixture_key in \('demo-a', 'demo-b', 'demo-c'\)/);
 assert.match(sql,/check \(state in \('review','human'\)\)/);
 assert.match(sql,/state <> 'human' or draft is null/i);
 assert.doesNotMatch(sql,/customer_phone|whatsapp_address|provider_account_sid/i);
});
