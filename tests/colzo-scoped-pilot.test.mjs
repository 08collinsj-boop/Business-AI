import test from 'node:test';
import assert from 'node:assert/strict';
import {scopedPilotEntitlement,isScopedPilotEligibleTarget,SCOPED_PILOT_DURATION_MS} from '../lib/colzo-scoped-pilot.js';
const a='11111111-1111-4111-8111-111111111111';
const row={business_id:a,status:'active',activated_at:'2026-10-24T10:00:00.000Z',expires_at:'2026-11-07T10:00:00.000Z'};
const inside=new Date('2026-10-25T12:00:00Z');
test('pilot access is limited to Development Preview with broad pilot disabled',()=>{
 const env={COLZO_SCOPED_PILOT_ACCESS:'true',VERCEL_ENV:'preview',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',PILOT_FREE_STARTER_MARKETING:'false'};
 assert.equal(isScopedPilotEligibleTarget(env),true);
 for(const change of [{VERCEL_ENV:'production'},{SUPABASE_URL:'https://wrong.supabase.co'},{PILOT_FREE_STARTER_MARKETING:'true'},{COLZO_SCOPED_PILOT_ACCESS:'false'}])assert.equal(isScopedPilotEligibleTarget({...env,...change}),false);
});
test('valid approved grant lasts exactly 14 days and has bounded Starter access',()=>{
 assert.equal(SCOPED_PILOT_DURATION_MS,1209600000);
 const e=scopedPilotEntitlement(row,6,inside,a);
 assert.equal(e.active,true);assert.equal(e.plan,'starter');assert.equal(e.enquiriesRemaining,244);
 assert.equal(e.staffAllowance,2);assert.equal(e.trialExpiresAt,row.expires_at);
 assert.equal(e.currentPeriodStartedAt,row.activated_at);
 assert.equal(e.pilotFreeAccess,true);assert.equal(e.cancelAtPeriodEnd,false);
});
test('no grant, wrong tenant, invalid period or revoked grant cannot access pilot',()=>{
 const cases=[null,{...row,business_id:'22222222-2222-4222-8222-222222222222'},{...row,status:'revoked'},{...row,expires_at:'2026-11-08T10:00:00Z'},{...row,activated_at:null}];
 for(const grant of cases){const e=scopedPilotEntitlement(grant,0,inside,a);assert.equal(e.active,false);assert.equal(e.enquiriesRemaining,0);}
});
test('pilot expires exactly on deadline and cannot start early',()=>{
 for(const when of [new Date(row.expires_at),new Date('2026-10-24T09:59:59Z')])assert.equal(scopedPilotEntitlement(row,0,when,a).active,false);
});
test('invalid usage and exhaustion deny further enquiries without payment conversion',()=>{
 for(const used of [250,999,'invalid',Infinity]){const e=scopedPilotEntitlement(row,used,inside,a);assert.equal(e.enquiriesRemaining,0);assert.equal(e.stripeCustomerId,undefined);}
});
