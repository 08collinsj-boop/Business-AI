import test from 'node:test';
import assert from 'node:assert/strict';
import operations from '../api/operations.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { withoutScopedPilotGuards } from './helpers/reviewed-auth.mjs';

const lockedAuthHash='9ac5a0bc7def893469dfd9773136146490a5c32a6c892f220aa6a7536f2276d8';
const branch='feature/colzo-complete-ui-motion-20261017';
const devUrl='https://mvwseobgkexzpmmkgcxe.supabase.co';
const keys=['VERCEL_ENV','VERCEL_GIT_COMMIT_REF','SUPABASE_URL','FRONTEND_AUTH_ENABLED','SUPABASE_PUBLISHABLE_KEY','COLZO_EXPECTED_SUPABASE_PROJECT_REF'];

function env(t, overrides) {
  const old=keys.map(k=>process.env[k]);
  for(const name of keys) delete process.env[name];
  Object.assign(process.env,{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch,FRONTEND_AUTH_ENABLED:'true',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_only',SUPABASE_URL:devUrl},overrides);
  t.after(()=>keys.forEach((key,i)=>old[i]===undefined?delete process.env[key]:process.env[key]=old[i]));
}
function request(operation='public-config') {
  const req={method:'GET',query:{operation},headers:{}};
  const res={statusCode:200,body:null,headersSent:false,status(c){this.statusCode=c;return this;},json(obj){this.body=obj;this.headersSent=true;return this;},setHeader(){}};
  return {req,res};
}

test('wrong Supabase project blocks Colzo preview dispatcher without backend request',{concurrency:false},async t=>{
  env(t,{SUPABASE_URL:'https://another-project.supabase.co'});
  const oldFetch=globalThis.fetch, calls=[];
  globalThis.fetch=async url=>{calls.push(url);throw Error('should not fetch');};
  t.after(()=>globalThis.fetch=oldFetch);
  const {req,res}=request('public-config');
  await operations(req,res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body?.error,'Colzo development environment unavailable');
  assert.deepEqual(calls,[]);
});

test('valid Dev project preserves public-config operation on Colzo preview',{concurrency:false},async t=>{
  env(t);
  const {req,res}=request('public-config');
  await operations(req,res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body?.supabaseUrl,devUrl);
  assert.equal(res.body?.frontendAuthEnabled,true);
});

test('other previews are unaffected when no project constraint is configured',{concurrency:false},async t=>{
  env(t,{VERCEL_GIT_COMMIT_REF:'feature/other-branch',SUPABASE_URL:'https://another-project.supabase.co'});
  const {req,res}=request('public-config');
  await operations(req,res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body?.frontendAuthEnabled,true);
});

test('legacy authentication source remains byte-identical outside scoped-pilot denials',{concurrency:false},async()=>{
  const data=withoutScopedPilotGuards(await readFile(new URL('../lib/auth.js',import.meta.url),'utf8'));
  assert.equal(createHash('sha256').update(data).digest('hex'),lockedAuthHash);
});

