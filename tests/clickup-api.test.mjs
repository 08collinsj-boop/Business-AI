import test from 'node:test';
import assert from 'node:assert/strict';
import clickup from '../api/clickup.js';
import callback from '../api/clickup-callback.js';
import {clickupConfig, clickupAuthUrl, createClickupState} from '../lib/clickup-provider.js';

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(key,value) { this.headers[key.toLowerCase()]=value;return this; },
    status(code) {this.statusCode=code;return this;},
    json(body) {this.body=body;return this;},
    end(body='') {this.body=body;return this;}
  };
}
function environment(values,action) {
  const keys=Object.keys(values);
  const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  for(const [k,v] of Object.entries(values))v===null?delete process.env[k]:process.env[k]=v;
  return Promise.resolve().then(action).finally(()=>{
    for(const k of keys)previous[k]===undefined?delete process.env[k]:process.env[k]=previous[k];
  });
}
const safeEnv={
  SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',
  VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-connected-workspace-20261112',
  CLICKUP_INTEGRATION_ENABLED:'false',
  TENANCY_AUTH_ENABLED:'false',COLZO_SCOPED_PILOT_ACCESS:'false'
};
test('API never returns tenant data if tenancy authentication is off',async()=>{
  await environment(safeEnv,async()=>{
    const res=response();
    await clickup({method:'GET',query:{},headers:{}},res);
    assert.equal(res.statusCode,403);
    assert.equal(res.body.error,'You are not authorised for this action');
    assert.equal(res.headers['cache-control'],'no-store, private');
  });
});
test('API rejects unapproved and unsupported calls without reaching provider',async()=>{
  await environment(safeEnv,async()=>{
    const res=response();
    await clickup({method:'POST',query:{},headers:{},body:{action:'create_task',title:'hello',approved:true}},res);
    assert.equal(res.statusCode,403);
    const unsupported=response();
    await clickup({method:'PATCH',query:{},headers:{}},unsupported);
    assert.equal(unsupported.statusCode,405);
  });
});
test('OAuth callback is disabled unless the integration has complete configuration',async()=>{
  await environment(safeEnv,async()=>{
    const res=response();
    await callback({method:'GET',headers:{},query:{}},res);
    assert.equal(res.statusCode,503);
    assert.equal(res.headers['set-cookie'].includes('Max-Age=0'),true);
  });
});
test('OAuth callback does not accept a mismatched cookie/state before any storage read',async()=>{
  await environment({...safeEnv,CLICKUP_INTEGRATION_ENABLED:'true',
    CLICKUP_CLIENT_ID:'fictional-client',CLICKUP_CLIENT_SECRET:'fictional-secret',
    CLICKUP_REDIRECT_URI:'https://preview.example.org/api/clickup-callback',
    CLICKUP_TOKEN_ENCRYPTION_KEY:'f'.repeat(64)},async()=>{
    assert.equal(clickupConfig().configured,true);
    const res=response();
    await callback({method:'GET',headers:{cookie:'colzo_clickup_state='+('A'.repeat(43))},
      query:{state:'B'.repeat(43),code:'fictional-code'}},res);
    assert.equal(res.statusCode,400);
    assert.match(res.body,/could not be verified/i);
  });
});
test('OAuth URL has a client id, exact redirect and strong random state, not secrets',()=>{
  const state=createClickupState();
  const url=new URL(clickupAuthUrl(state.state,{configured:true,clientId:'fictional-app-id',redirectUri:'https://preview.example.org/api/clickup-callback'}));
  assert.equal(url.hostname,'app.clickup.com');
  assert.equal(url.searchParams.get('state'),state.state);
  assert.equal(url.searchParams.get('redirect_uri'),'https://preview.example.org/api/clickup-callback');
  assert.equal(url.searchParams.get('client_id'),'fictional-app-id');
  assert.equal(url.searchParams.has('client_secret'),false);
});

