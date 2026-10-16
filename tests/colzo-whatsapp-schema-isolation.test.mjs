import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const schema=readFileSync(new URL('../docs/sql-proposals/colzo_whatsapp_tenant_shadow_receipts.sql',import.meta.url),'utf8');
const stripped=schema.replace(/--[^\n]*/g,'');
const tables=['whatsapp_provider_connections','whatsapp_sender_bindings','whatsapp_inbound_receipts'];

test('WhatsApp schema remains a review-only, append-only migration',()=>{
 assert.match(schema,/REVIEW ONLY/i);
 assert.match(schema,/DO NOT APPLY to Pilot or Production/i);
 for(const table of tables)assert.match(schema,new RegExp('create table if not exists public\\.'+table+'\\b','i'));
 assert.doesNotMatch(stripped,/\b(?:drop table|drop column|truncate|delete from|update public\.businesses|alter table public\.leads)\b/i);
});

test('Globally unique account plus WhatsApp sender, and atomic message ID receipts',()=>{
 assert.match(stripped,/unique\s*\(\s*provider_account_sid\s*,\s*whatsapp_address\s*\)/i);
 assert.match(stripped,/unique\s*\(\s*provider_account_sid\s*,\s*message_sid\s*\)/i);
 assert.match(stripped,/foreign key\s*\(\s*connection_id\s*,\s*business_id\s*,\s*provider_account_sid\s*\)/i);
 assert.match(stripped,/foreign key\s*\(\s*sender_binding_id\s*,\s*business_id\s*,\s*provider_account_sid\s*\)/i);
 assert.match(stripped,/constraint whatsapp_sender_binding_verified_check/i);
 assert.match(stripped,/owner_approved_at is not null/i);
});

test('All WhatsApp tables deny anonymous and authenticated direct inserts',()=>{
 for(const table of tables){
  assert.match(stripped,new RegExp('alter table public\\.'+table+' enable row level security','i'));
  assert.match(stripped,new RegExp('create policy "admins read whatsapp [^"]+"\\s+on public\\.'+table+' for select to authenticated','i'));
 }
 assert.match(stripped,/revoke all on public\.whatsapp_provider_connections,[\s\S]*?from anon, authenticated;/i);
 assert.match(stripped,/grant select on public\.whatsapp_provider_connections,[\s\S]*?to authenticated;/i);
 assert.doesNotMatch(stripped,/create policy[^;]+\bfor (?:insert|update|delete|all)\b/i);
 assert.doesNotMatch(stripped,/grant\s+(?:all|insert|update|delete)[^;]*to (?:anon|authenticated)/i);
 assert.equal((stripped.match(/membership\.role in \('owner', 'admin'\)/g)||[]).length,3);
});

test('Receipt schema never saves plain customer WhatsApp number, chat text or credential',()=>{
 assert.match(stripped,/customer_reference_hmac text not null/i);
 assert.doesNotMatch(stripped,/\b(?:customer_phone|message_body|raw_body|chat_text|auth_token|service_role_key)\s+(?:text|varchar|jsonb)/i);
 assert.match(schema,/Never plain SHA256/i);
});
