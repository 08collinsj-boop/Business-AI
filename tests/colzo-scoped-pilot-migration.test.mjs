import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../docs/colzo-pilot-review/scoped-pilot-access.STAGED.sql',import.meta.url),'utf8');
test('pilot table has exact expiry, RLS and no direct browser privileges, without touching paid billing',()=>{
 assert.match(sql,/CREATE TABLE public\.colzo_pilot_access/);
 assert.match(sql,/business_id uuid PRIMARY KEY REFERENCES public\.businesses/);
 assert.match(sql,/expires_at = activated_at \+ interval '14 days'/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON TABLE public\.colzo_pilot_access FROM PUBLIC, anon, authenticated/);
 assert.doesNotMatch(sql,/ALTER TABLE public\.business_billing_accounts/i);
 assert.doesNotMatch(sql,/INSERT\s+INTO/i);
});
