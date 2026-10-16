import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pg=readFileSync(new URL('../scripts/colzo-whatsapp-postgres-qa.py',import.meta.url),'utf8');
const sdk=readFileSync(new URL('../scripts/colzo-whatsapp-twilio-signature-qa.mjs',import.meta.url),'utf8');
const sql=readFileSync(new URL('../docs/sql-proposals/colzo_whatsapp_tenant_shadow_receipts.sql',import.meta.url),'utf8');
test('local DB runner refuses external database credentials and requires explicit consent',()=>{
 assert.match(pg,/COLZO_WA_LOCAL_PG_QA/);
 assert.match(pg,/colzo_wa_sandbox_/);
 assert.match(pg,/host\.startswith\('\/'\)/);
 assert.match(pg,/inet_server_addr\(\) IS NULL/);
 assert.doesNotMatch(pg,/supabase\.co|api\.twilio\.com/i);
});
test('real SQL QA covers sender ownership, restricted access and atomic message de-dup',()=>{
 for(const needle of ['SET ROLE authenticated','SET ROLE anon','duplicate key','foreign key constraint',
 'owner A sees only own','member denied','ThreadPoolExecutor','ON CONFLICT(provider_account_sid,message_sid) DO NOTHING RETURNING id'])
  assert.ok(pg.includes(needle),'missing required QA: '+needle);
 assert.match(sql,/constraint whatsapp_sender_binding_phone_globally_unique\s+unique\s*\(\s*whatsapp_address\s*\)/i);
});
test('official SDK parity fixture is strictly synthetic and offline',()=>{
 assert.match(sdk,/Twilio\.getExpectedTwilioSignature/);
 assert.match(sdk,/Twilio\.validateRequest/);
 assert.match(sdk,/verifyTwilioWhatsAppSignature/);
 assert.match(sdk,/synthetic-not-a-real-twilio-token/);
 assert.doesNotMatch(sdk,/\.messages\.create\s*\(|TWILIO_AUTH_TOKEN/);
});
