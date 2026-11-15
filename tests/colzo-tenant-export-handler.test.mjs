import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTenantExportHandler, isFictionalTenantExportEnabled} from '../lib/colzo-tenant-export-handler.js';
const tenant='10000000-0000-4000-8000-000000000001';
const other='20000000-0000-4000-8000-000000000002';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-connected-workspace-20261112',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',TENANCY_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'true',COLZO_TENANT_EXPORT_PREVIEW_ENABLED:'true',COLZO_TENANT_EXPORT_FIXTURE_BUSINESS_ID:tenant};
const response=()=>({statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v},status(code){this.statusCode=code;return this},json(b){this.body=b;return this}});
const request=(method='GET',query={})=>({method,query});
const fixture=({envOverride={},role='owner',mfa='aal2',businessId=tenant,auditOk=true,throwAt=null}={})=>{
  const calls=[];
  const handler=makeTenantExportHandler({env:{...env,...envOverride},approvedTarget:()=>true,
    authMember:async (_req,roles)=>{calls.push(['roles',roles]);if(role!=='owner')throw Object.assign(Error('not owner'),{status:403});return {enforced:true,userId:'fictional-owner',businessId,role}},
    authAal2:async ()=>{calls.push(['mfa',mfa]);if(mfa!=='aal2')throw Object.assign(Error('MFA required'),{status:403});return {enforced:true,userId:'fictional-owner'}},
    readPage:async ({table,businessId,fields,offset,limit})=>{calls.push(['page',table,businessId,fields,offset,limit]);if(throwAt===table)throw Error('database unavailable');return table==='leads'?[{id:1,business_id:businessId,name:'FICTIONAL customer'}]:[]},
    audit:async info=>{calls.push(['audit',info.action,info.metadata]);return auditOk}
  });return {handler,calls};
};

test('route stays disabled without explicit exact fictional-target opt-in',async()=>{
 for(const envOverride of [{COLZO_TENANT_EXPORT_PREVIEW_ENABLED:'false'},{VERCEL_ENV:'production'},{SUPABASE_URL:'https://other.supabase.co'},{VERCEL_GIT_COMMIT_REF:'main'},{COLZO_TENANT_EXPORT_FIXTURE_BUSINESS_ID:''},{TENANCY_AUTH_ENABLED:'false'}]){
  const x=fixture({envOverride});const res=response();await x.handler(request(),res);
  assert.equal(res.statusCode,503);assert.deepEqual(x.calls,[]);
 }
 assert.equal(isFictionalTenantExportEnabled({}),false);
});

test('handler never accepts DELETE or POST, even if preview gate enabled',async()=>{
 for(const method of ['DELETE','POST','PATCH']){
  const x=fixture(),res=response();await x.handler(request(method),res);
  assert.equal(res.statusCode,405);assert.deepEqual(x.calls,[]);
 }
});

test('rejects caller-selected business ID before any data read',async()=>{
 const x=fixture(),res=response();await x.handler(request('GET',{business_id:other}),res);
 assert.equal(res.statusCode,400);assert.deepEqual(x.calls,[]);
});

test('only independently authorised owner and MFA may read their fictional business',async()=>{
 for(const args of [{role:'member'},{mfa:'aal1'},{businessId:other}]){
  const x=fixture(args),res=response();await x.handler(request(),res);
  assert.equal(res.statusCode,403);assert.ok(x.calls.every(c=>c[0]!=='page'));
 }
});

test('fictional partial export requires audit, remains no-store and marked incomplete',async()=>{
 const x=fixture(),res=response();await x.handler(request(),res);
 assert.equal(res.statusCode,200);assert.equal(res.headers['Cache-Control'],'private, no-store');
 assert.equal(res.body.export_complete,false);assert.equal(res.body.data.leads[0].name,'FICTIONAL customer');
 assert.ok(x.calls.some(c=>c[0]==='audit'&&c[1]==='data_exit.draft_export'));
 assert.ok(x.calls.filter(c=>c[0]==='page').every(c=>c[2]===tenant));
});

test('audit failure and database errors produce no export payload',async()=>{
 for(const args of [{auditOk:false},{throwAt:'bookings'}]){
  const x=fixture(args),res=response();await x.handler(request(),res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.data,undefined);
 }
});
