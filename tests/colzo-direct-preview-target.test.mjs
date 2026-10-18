import test from 'node:test';
import assert from 'node:assert/strict';

const routes=['leads','bookings','actions','history','pipeline','settings','business-onboarding','business-configuration','voice'];
function environment(t, extra={}) {
  const vars={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/colzo-complete-ui-motion-20261017',SUPABASE_URL:'https://wrong-project.supabase.co',TENANCY_AUTH_ENABLED:'true',...extra};
  const previous=Object.fromEntries(Object.keys(vars).map(k=>[k,process.env[k]]));
  Object.assign(process.env,vars);
  t.after(()=>Object.entries(previous).forEach(([k,v])=>v===undefined?delete process.env[k]:process.env[k]=v));
}
for (const route of routes) test(`${route} rejects wrong Preview database before authentication or provider access`,async t=>{
  environment(t);
  const calls=[],oldFetch=globalThis.fetch;
  globalThis.fetch=async (...args)=>{calls.push(args);throw Error('Unexpected backend request');};
  t.after(()=>globalThis.fetch=oldFetch);
  const handler=(await import(`../api/${route==='leads'?'operations':route}.js`)).default;
  const res={code:200,status(c){this.code=c;return this;},json(b){this.body=b;return this;},setHeader(){}};
  await handler({method:'GET',headers:{authorization:'Bearer synthetic-invalid'},query:{operation:route==='leads'?'leads':'status'}},res);
  assert.equal(res.code,503);
  assert.equal(res.body.error,'Colzo development environment unavailable');
  assert.deepEqual(calls,[]);
});
test('Stripe webhook rejects wrong Preview database before reading payload',async t=>{
  environment(t);
  const {default:handler}=await import('../api/stripe-webhook.js');
  let read=false;
  const result=await handler.fetch({method:'POST',text(){read=true;throw Error('Unexpected payload read');}});
  assert.equal(result.status,503);
  assert.equal((await result.json()).error,'Colzo development environment unavailable');
  assert.equal(read,false);
});

test('immutable Leads public paths use the guarded dispatcher',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {rewrites}=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 for(const source of ['/api/leads','/api/leads.js']) assert.ok(rewrites.some(r=>r.source===source&&r.destination==='/api/operations?operation=leads'));
});
