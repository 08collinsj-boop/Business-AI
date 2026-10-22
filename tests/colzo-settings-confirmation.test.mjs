import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmSettingsSave } from '../lib/colzo-settings-confirmation.js';
const current = {id: 7, business_id: 'test-business', business_name: 'Before'};
const updates = {business_name: 'After', review_requests_enabled: false, automatic_follow_up_hours: 24};
const saved = {...current, ...updates};
test('confirmed settings save accepts exactly the correct persisted row', () => {
  assert.equal(confirmSettingsSave([saved],current,'test-business',updates).status,200);
});
test('confirmed settings save rejects empty and multi-row responses', () => {
  assert.equal(confirmSettingsSave([],current,'test-business',updates).status,409);
  assert.equal(confirmSettingsSave([saved,saved],current,'test-business',updates).status,503);
});
test('confirmed settings save rejects other businesses and incorrect record IDs', () => {
  assert.equal(confirmSettingsSave([{...saved,business_id:'other'}],current,'test-business',updates).status,503);
  assert.equal(confirmSettingsSave([{...saved,id:8}],current,'test-business',updates).status,503);
});
test('confirmed settings save rejects uncommitted or incorrect field values', () => {
  assert.equal(confirmSettingsSave([{...saved,business_name:'Before'}],current,'test-business',updates).status,503);
  assert.equal(confirmSettingsSave([{...saved,automatic_follow_up_hours:72}],current,'test-business',updates).status,503);
});
test('confirmed settings save rejects unusable database shapes and missing returned fields', () => {
  for(const data of [null,{},[null],[{...current}],false])
    assert.notEqual(confirmSettingsSave(data,current,'test-business',updates).status,200);
});
