import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const native = await readFile(new URL('../assets/colzo-native.js', import.meta.url), 'utf8');
const form = await readFile(new URL('../src/colzo/RecordForm.jsx', import.meta.url), 'utf8');

test('QA F07: owner forms use product language instead of database implementation notes', () => {
  assert.doesNotMatch(native, /Company and location fields are not yet stored by the current customer API/);
  assert.doesNotMatch(form, /Company and location fields are not yet stored by the current customer API/);
  assert.doesNotMatch(native, /Projects are stored as tenant-scoped Colzo records/);
  assert.match(native, /Customer profiles save contact details and private notes/);
});

test('QA F05: analytics and enquiry details use the same public source vocabulary', () => {
  assert.match(native, /\['directory','Colzo directory'\]/);
  assert.match(native, /\['website_widget','Website widget'\]/);
  assert.match(native, /\['direct','Direct customer link'\]/);
  assert.match(native, /\['untracked','Not recorded'\]/);
});
