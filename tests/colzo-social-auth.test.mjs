import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import handler from '../lib/public-config-handler.js';
const saved={...process.env};
const response=()=>({code:null,body:null,setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;return this;}});
test('OAuth providers default disabled unless explicitly enabled by server environment',()=>{
 for(const key of ['COLZO_AUTH_APPLE_ENABLED','COLZO_AUTH_GOOGLE_ENABLED','COLZO_AUTH_MICROSOFT_ENABLED'])delete process.env[key];
 process.env.FRONTEND_AUTH_ENABLED='true';process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_ANON_KEY='test-publishable';
 let res=response();handler({},res);assert.equal(res.code,200);
 assert.deepEqual(res.body.oauthProviders,{apple:false,google:false,azure:false});
 process.env.COLZO_AUTH_GOOGLE_ENABLED='true';res=response();handler({},res);assert.equal(res.body.oauthProviders.google,true);
 assert.equal('SUPABASE_SERVICE_ROLE_KEY' in res.body,false);
});
test('Colzo social sign-in buttons use real Supabase OAuth only when an approved provider is configured',async()=>{
 const ui=await readFile(new URL('../assets/colzo-workspace.js',import.meta.url),'utf8');
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(ui,/signInWithOAuth/);assert.match(ui,/window\.colzoOauthProviders\?\.\[provider\]/);assert.match(ui,/provider==='azure'/);
 for(const provider of ['apple','google','azure'])assert.match(html,new RegExp('data-colzo-oauth="'+provider+'"'));
 assert.match(html,/window\.colzoOauthProviders=Object\.freeze/);
 assert.match(ui,/sign-in is not connected yet/i);
});
test.after(()=>{for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);});
