import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import handler,{validateColzoClient} from '../lib/colzo-clients-handler.js';
const original={...process.env},origFetch=globalThis.fetch;
const businessId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',userId='cccccccc-cccc-4ccc-8ccc-cccccccccccc',clientId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const respond=(data,status=200)=>({ok:status<400,status,text:async()=>JSON.stringify(data),json:async()=>data});
const res=()=>({code:null,data:null,setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
const setup=fake=>{process.env.TENANCY_AUTH_ENABLED='true';process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='service-test';globalThis.fetch=async(url,options={})=>{const u=String(url);if(u.includes('/auth/v1/user'))return respond({id:userId});if(u.includes('/business_memberships?'))return respond([{business_id:businessId,role:'owner'}]);return fake(u,options);};};
test('client validation rejects forged tenants, identifiers and unsafe email addresses',()=>{
 assert.deepEqual(validateColzoClient({full_name:'Test Client',email:'client@example.com'}),{full_name:'Test Client',email:'client@example.com'});
 assert.equal(validateColzoClient({full_name:'Test Client',business_id:businessId}),null);
 assert.equal(validateColzoClient({full_name:'Test Client',id:clientId}),null);
 assert.equal(validateColzoClient({full_name:'A'}),null);
 assert.equal(validateColzoClient({full_name:'Test Client',email:'foo@not-real'}),null);
 assert.equal(validateColzoClient({full_name:'Test Client',phone:'x'.repeat(81)}),null);
 assert.deepEqual(validateColzoClient({id:clientId,phone:'01234'},true),{phone:'01234'});
});
test('client GET requires verified tenant identity and adds an explicit business ID filter', {concurrency:false},async()=>{
 let path='';setup(url=>{if(url.includes('/colzo_clients?')){path=url;return respond([]);}throw Error(url);});
 const response=res();await handler({method:'GET',headers:{authorization:'Bearer test'}},response);
 assert.equal(response.code,200);assert.deepEqual(response.data.clients,[]);assert.match(path,/business_id=eq\.bbbbbbbb/);
});
test('client POST derives business ID server side and writes no secret or unapproved fields', {concurrency:false},async()=>{
 let stored;
 setup((url,options)=>{if(url.endsWith('/colzo_clients')&&options.method==='POST'){stored=JSON.parse(options.body);return respond([{id:clientId,...stored}]);}if(url.includes('business_audit_events'))return respond([]);throw Error(url);});
 const response=res();await handler({method:'POST',headers:{authorization:'Bearer test'},body:{full_name:'A Client',email:'person@example.com'}},response);
 assert.equal(response.code,201);assert.equal(stored.business_id,businessId);assert.equal(stored.full_name,'A Client');assert.equal(stored.email,'person@example.com');
});
test('cross-tenant client update fails closed', {concurrency:false},async()=>{
 setup((url,options)=>{if(url.includes('/colzo_clients?')&&options.method==='PATCH')return respond([]);throw Error(url);});
 const response=res();await handler({method:'PATCH',headers:{authorization:'Bearer test'},body:{id:clientId,phone:'0123'}},response);
 assert.equal(response.code,404);
});
test('new client records stay private and navigation leads to working forms',async()=>{
 const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
 const [migration,operations,html,ui]=await Promise.all(['supabase/migrations/20261012235500_add_colzo_projects_quotes.sql','api/operations.js','index.html','assets/colzo-workspace.js'].map(read));
 assert.match(migration,/create table if not exists public\.colzo_clients/);assert.match(migration,/alter table public\.colzo_clients enable row level security/);
 assert.match(migration,/revoke all on public\.colzo_clients from public,anon,authenticated/);
 assert.match(operations,/"colzo-clients": colzoClientsHandler/);
 assert.match(html,/id="colzoAddClient"/);assert.match(html,/id="colzoClientsList"/);
 assert.match(ui,/\/api\/colzo\/clients/);assert.match(ui,/await request\(url,/);
});
test.after(()=>{globalThis.fetch=origFetch;for(const key of Object.keys(process.env))if(!(key in original))delete process.env[key];Object.assign(process.env,original);});
