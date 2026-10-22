import test from 'node:test';
import assert from 'node:assert/strict';
import { isApprovedSupabaseTarget } from '../lib/public-config-handler.js';
import enquiryHandler from '../api/enquiry.js';

const devRef = 'mvwseobgkexzpmmkgcxe';
const devUrl = 'https://' + devRef + '.supabase.co';
const keys = ['VERCEL_ENV','VERCEL_GIT_COMMIT_REF','SUPABASE_URL','COLZO_EXPECTED_SUPABASE_PROJECT_REF'];
function withPreview(branch, url, fn) {
  const old = keys.map(key => process.env[key]);
  try {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = branch;
    process.env.SUPABASE_URL = url;
    delete process.env.COLZO_EXPECTED_SUPABASE_PROJECT_REF;
    return fn();
  } finally {
    keys.forEach((key,i) => old[i] === undefined ? delete process.env[key] : process.env[key] = old[i]);
  }
}

for (const branch of [
  'feature/colzo-account-journey-graphite-volt-20261016',
  'fix/colzo-composio-first-protected-writes-20261015',
  'qa/colzo-preview-target-20261022'
]) {
  test('Colzo preview ' + branch + ' must reject another Supabase project', () =>
    withPreview(branch, 'https://fxpultshnyvbfjjgaxwv.supabase.co', () =>
      assert.equal(isApprovedSupabaseTarget(), false)));
  test('Colzo preview ' + branch + ' permits its approved Dev project', () =>
    withPreview(branch, devUrl, () =>
      assert.equal(isApprovedSupabaseTarget(), true)));
}

test('Unrelated preview retains legacy compatibility without an explicit expected ref', () =>
  withPreview('feature/unrelated-branch', 'https://other-project.supabase.co', () =>
    assert.equal(isApprovedSupabaseTarget(), true)));

test('Production is not implicitly pinned to the Development database', () => {
  const old=process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV='production';
    withPreview('feature/colzo-other-feature', 'https://other-project.supabase.co', () => {
      process.env.VERCEL_ENV='production';
      assert.equal(isApprovedSupabaseTarget(), true);
    });
  } finally {
    old === undefined ? delete process.env.VERCEL_ENV : process.env.VERCEL_ENV=old;
  }
});

test('Anonymous enquiry on another Colzo preview fails closed before provider calls', async () => {
  const old = keys.map(key=>process.env[key]);
  try {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF='fix/colzo-composio-first-protected-writes-20261015';
    process.env.SUPABASE_URL='https://fxpultshnyvbfjjgaxwv.supabase.co';
    delete process.env.COLZO_EXPECTED_SUPABASE_PROJECT_REF;
    const res={code:0,body:null,status(c){this.code=c;return this;},json(b){this.body=b;return this;}};
    await enquiryHandler({method:'POST',body:{message:'Synthetic test only'}}, res);
    assert.equal(res.code,503);
    assert.equal(res.body.error,'Enquiries are temporarily unavailable');
  } finally {
    keys.forEach((key,i)=>old[i]===undefined?delete process.env[key]:process.env[key]=old[i]);
  }
});
