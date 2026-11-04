import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import configHandler, {isColzoRecordVersionEnabled,isColzoPreviewAuthTransportEnabled} from '../lib/public-config-handler.js';
const keys=['VERCEL_ENV','VERCEL_GIT_COMMIT_REF','SUPABASE_URL','COLZO_EXPECTED_SUPABASE_PROJECT_REF','FRONTEND_AUTH_ENABLED','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY'];
const saved=keys.map(k=>[k,process.env[k]]);
test.after(()=>{for(const[k,v]of saved)v===undefined?delete process.env[k]:process.env[k]=v});
function setup(changes={}){
 for(const k of keys)delete process.env[k];
 Object.assign(process.env,{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'fix/colzo-pilot-release-gates-20261026',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',FRONTEND_AUTH_ENABLED:'true',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'},changes);
}
test('pilot config enables record versions without changing the authentication transport',()=>{
 setup();assert.equal(isColzoRecordVersionEnabled(),true);assert.equal(isColzoPreviewAuthTransportEnabled(),false);
 const res={setHeader(){},status(n){this.code=n;return this},json(body){this.body=body;return this}};
 configHandler({},res);assert.equal(res.code,200);assert.equal(res.body.recordVersionsEnabled,true);
 assert.equal(res.body.previewAuthTransportEnabled,undefined);
 const html=readFileSync('index.html','utf8');assert.match(html,/window\.colzoRecordVersionsEnabled=config\.recordVersionsEnabled===true;/);
});
test('work versions preserve Production and unrelated branches and reject wrong Development target',()=>{
 for(const changes of [{VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'main'},{SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co'}]){
  setup(changes);assert.equal(isColzoRecordVersionEnabled(),false);
 }
 setup({VERCEL_GIT_COMMIT_REF:'feature/colzo-complete-ui-motion-20261017'});
 assert.equal(isColzoRecordVersionEnabled(),true);assert.equal(isColzoPreviewAuthTransportEnabled(),true);
});
test('legacy work updater sends exact loaded versions with the independent pilot flag',()=>{
 const html=readFileSync('index.html','utf8');const start=html.indexOf('function colzoWorkUpdateBody('),end=html.indexOf('\nfunction editAction(',start);
 assert.ok(start>=0&&end>start);
 for(const resource of ['bookings','actions']){
  const version='2026-10-31T10:00:00.123456+00:00';
  const context={window:{colzoRecordVersionsEnabled:true,colzoPreviewAuthTransportEnabled:false},bookings:[{id:11,updated_at:version}],businessActions:[{id:11,updated_at:version}],resource};
  const body=runInNewContext(html.slice(start,end)+'\ncolzoWorkUpdateBody(resource,11,{status:"cancelled"})',context);
  assert.equal(body.expected_updated_at,version);
  context.bookings=[];context.businessActions=[];
  assert.throws(()=>runInNewContext(html.slice(start,end)+'\ncolzoWorkUpdateBody(resource,11,{status:"cancelled"})',context),/Reload/);
 }
});
