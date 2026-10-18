import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../lib/public-config-handler.js';
const jwt=role=>['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({role,ref:'mvwseobgkexzpmmkgcxe'})).toString('base64url'),'synthetic-signature'].join('.');
function run(t,key,secret='sb_secret_synthetic_only') {
 const vars={FRONTEND_AUTH_ENABLED:'true',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_PUBLISHABLE_KEY:key,SUPABASE_SERVICE_ROLE_KEY:secret};
 const old=Object.fromEntries(Object.keys(vars).map(k=>[k,process.env[k]]));Object.assign(process.env,vars);
 t.after(()=>Object.entries(old).forEach(([k,v])=>v===undefined?delete process.env[k]:process.env[k]=v));
 const res={code:200,headers:{},setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(b){this.body=b;return this}}; handler({},res); return res;
}
for (const [name,key] of [['secret API key','sb_secret_synthetic_only'],['service role JWT',jwt('service_role')],['user JWT',jwt('authenticated')],['malformed JWT','eyJx.not-json.signature'],['arbitrary text','invalid-key']]) test(`public config refuses ${name}`,t=>{
 const res=run(t,key);assert.equal(res.code,503);assert.equal(res.body.supabaseAnonKey,undefined);assert.equal(res.headers['Cache-Control'],'no-store');
});
test('public config refuses a key equal to the configured server key',t=>{assert.equal(run(t,'sb_publishable_synthetic_only','sb_publishable_synthetic_only').code,503);});
for (const [name,key] of [['publishable','sb_publishable_synthetic_only'],['legacy anon',jwt('anon')]]) test(`public config accepts ${name} key shape`,t=>{const res=run(t,key);assert.equal(res.code,200);assert.equal(res.body.supabaseAnonKey,key);});
