import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
const ua='33333333-3333-4333-8333-333333333333', ub='44444444-4444-4444-8444-444444444444';
const sa='55555555-5555-4555-8555-555555555555', sb='66666666-6666-4666-8666-666666666666';
test('direct pilot RLS requires MFA and a live matching session without changing non-pilot access', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
      CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT current_setting('request.jwt.claims',true)::jsonb$$;
      CREATE TABLE auth.sessions(id uuid,user_id uuid,not_after timestamptz);
      CREATE TABLE public.business_memberships(business_id uuid,user_id uuid);
      CREATE TABLE public.colzo_pilot_access(business_id uuid,status text,activated_at timestamptz,expires_at timestamptz);
      CREATE TABLE public.leads(id integer,business_id uuid,name text);
      ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
      GRANT SELECT ON public.leads TO authenticated;
      CREATE POLICY member_read ON public.leads TO authenticated USING (EXISTS(SELECT 1 FROM public.business_memberships m WHERE m.business_id=leads.business_id AND m.user_id=auth.uid()));
      GRANT SELECT ON public.business_memberships TO authenticated;`);
    await db.query('INSERT INTO public.business_memberships VALUES ($1,$2),($3,$4)',[a,ua,b,ub]);
    await db.query("INSERT INTO public.colzo_pilot_access VALUES ($1,'active',now()-interval '1 hour',now()+interval '335 hours')",[a]);
    await db.query("INSERT INTO auth.sessions VALUES ($1,$2,NULL),($3,$4,now()+interval '1 hour')",[sa,ua,sb,ub]);
    await db.query("INSERT INTO public.leads VALUES (1,$1,'Fictional A'),(2,$2,'Fictional B')",[a,b]);
    await db.exec(await readFile(new URL('../docs/colzo-pilot-review/pilot-expiry-enforcement.STAGED.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../docs/colzo-pilot-review/DIRECT_PILOT_SESSION_POLICY_PREVIEW.STAGED.sql',import.meta.url),'utf8'));
    async function read(user,claims){
      await db.exec('RESET ROLE');
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[user,JSON.stringify(claims)]);
      await db.exec('SET ROLE authenticated');
      return (await db.query('SELECT id FROM public.leads ORDER BY id')).rows.map(x=>x.id);
    }
    assert.deepEqual(await read(ua,{aal:'aal1',session_id:sa}),[], 'AAL1 must not read pilot records');
    assert.deepEqual(await read(ua,{aal:'aal2',session_id:sa}),[1]);
    for (const session_id of [sb,'malformed',null]) assert.deepEqual(await read(ua,{aal:'aal2',session_id}),[]);
    // Non-pilot member keeps the original policy behavior, never A's records.
    assert.deepEqual(await read(ub,{aal:'aal1'}),[2]);
    await db.exec('RESET ROLE');
    await db.query('DELETE FROM auth.sessions WHERE id=$1',[sa]);
    assert.deepEqual(await read(ua,{aal:'aal2',session_id:sa}),[], 'retained token denied after session removal');
    await db.exec('RESET ROLE');
    await db.query("INSERT INTO auth.sessions VALUES ($1,$2,now()-interval '1 second')",[sa,ua]);
    assert.deepEqual(await read(ua,{aal:'aal2',session_id:sa}),[], 'expired session denied');
    await db.exec('RESET ROLE');
    await db.query('UPDATE auth.sessions SET not_after=NULL WHERE id=$1',[sa]);
    assert.deepEqual(await read(ua,{aal:'aal2',session_id:sa}),[1], 'fresh usable session remains valid');
    await db.exec('RESET ROLE');
    await db.exec('DROP TABLE auth.sessions');
    await assert.rejects(read(ua,{aal:'aal2',session_id:sa}), /sessions|relation|exist/i, 'unavailable session validation cannot allow access');
  } finally {await db.close();}
});
