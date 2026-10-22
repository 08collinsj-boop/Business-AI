import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmConfigurationSave} from '../lib/colzo-configuration-confirmation.js';
const tenant='tenant-alpha';
const patch={onboarding_step:'services', description:'Synthetic description', enabled_modules:{enquiries:true,bookings:true,actions:true,voice:false}, faqs:[{question:'Hours?',answer:'Monday'}]};
const saved={business_id:tenant,...patch,updated_at:'2026-10-19T12:00:00.000Z'};
test('confirm configuration save validates a single matched tenant and all requested fields',()=>{
 assert.equal(confirmConfigurationSave([saved],tenant,patch).status,200);
 assert.equal(confirmConfigurationSave([{...saved,enabled_modules:{...saved.enabled_modules}}],tenant,patch).status,200);
});
test('missing and invalid representation cannot report configuration saved',()=>{
 assert.equal(confirmConfigurationSave([],tenant,patch).status,404);
 for(const value of [null,{},[null],[saved,saved],false])assert.equal(confirmConfigurationSave(value,tenant,patch).status,503);
});
test('foreign tenant and missing saved fields fail closed',()=>{
 assert.equal(confirmConfigurationSave([{...saved,business_id:'tenant-beta'}],tenant,patch).status,503);
 assert.equal(confirmConfigurationSave([{business_id:tenant}],tenant,patch).status,503);
});
test('contradictory saved text and JSON fail closed without success',()=>{
 assert.equal(confirmConfigurationSave([{...saved,description:'Old'}],tenant,patch).status,503);
 assert.equal(confirmConfigurationSave([{...saved,enabled_modules:{enquiries:true,bookings:true,actions:true,voice:true}}],tenant,patch).status,503);
 assert.equal(confirmConfigurationSave([{...saved,faqs:[]}],tenant,patch).status,503);
});
test('normalised database timestamp may represent same onboarding instant',()=>{
 const when='2026-10-19T12:00:00.123Z';
 assert.equal(confirmConfigurationSave([{business_id:tenant,onboarding_completed_at:'2026-10-19T12:00:00.123+00:00'}],tenant,{onboarding_completed_at:when}).status,200);
 assert.equal(confirmConfigurationSave([{business_id:tenant,onboarding_completed_at:null}],tenant,{onboarding_completed_at:when}).status,503);
});
