import test from 'node:test';
import assert from 'node:assert/strict';
import { isApprovedSupabaseTarget } from '../lib/public-config-handler.js';
test('new UI implementation Preview cannot inherit another Supabase project',()=>{
 const keys=['VERCEL_ENV','VERCEL_GIT_COMMIT_REF','COLZO_EXPECTED_SUPABASE_PROJECT_REF','SUPABASE_URL'];
 const previous=keys.map(k=>process.env[k]);
 try{
  process.env.VERCEL_ENV='preview';
  process.env.VERCEL_GIT_COMMIT_REF='feature/colzo-complete-ui-motion-20261017';
  delete process.env.COLZO_EXPECTED_SUPABASE_PROJECT_REF;
  process.env.SUPABASE_URL='https://wrong-project.supabase.co';
  assert.equal(isApprovedSupabaseTarget(),false);
  process.env.SUPABASE_URL='https://mvwseobgkexzpmmkgcxe.supabase.co';
  assert.equal(isApprovedSupabaseTarget(),true);
 }finally{keys.forEach((k,i)=>previous[i]===undefined?delete process.env[k]:process.env[k]=previous[i]);}
});
